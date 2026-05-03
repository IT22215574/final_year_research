import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  TrainingCandidate,
  TrainingCandidateDocument,
} from '../schemas/training-candidate.schema';
import { parse } from 'json2csv';

type ExportRow = Record<string, string | number | boolean | null>;
type DatasetScope = 'ALL' | 'BOAT_TYPE';

export type DatasetCsvFileInfo = {
  filename: string;
  scope: DatasetScope;
  boatTypeSlug: string | null;
  sizeBytes: number;
  rowCount: number;
  updatedAt: string;
};

const normalizeBoatType = (value?: string) =>
  String(value || '')
    .trim()
    .toUpperCase();

const slugifyBoatType = (value: string) =>
  normalizeBoatType(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

@Injectable()
export class TrainingCandidatesService {
  constructor(
    @InjectModel(TrainingCandidate.name)
    private candidateModel: Model<TrainingCandidateDocument>,
  ) {}

  // Mobile App will call this to populate the Data Queue list
  async getPendingCandidates() {
    return this.candidateModel
      .find({ status: 'PENDING' })
      .sort({ createdAt: -1 })
      .exec();
  }

  // Admin clicks 'Approve' or 'Reject' on mobile app
  async updateStatus(id: string, status: string, reason?: string) {
    const updated = await this.candidateModel.findByIdAndUpdate(
      id,
      { status, reviewReason: reason, reviewedAt: new Date() },
      { new: true },
    );

    // Keep CSV artifacts synchronized so notebooks/ops always see latest approved+trained data.
    await this.syncDatasetCsvArtifacts();
    return updated;
  }

  private buildExportQuery(boatType?: string) {
    const query: Record<string, any> = {
      status: { $in: ['APPROVED', 'TRAINED'] },
    };

    if (boatType) {
      query.boatType = {
        $regex: `^${String(boatType)
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        $options: 'i',
      };
    }

    return query;
  }

  private getDatasetOutputDir() {
    return path.resolve(
      process.cwd(),
      '..',
      'model',
      'cost_prediction',
      'training_data',
    );
  }

  private buildFlattenedRows(
    candidates: Array<
      TrainingCandidateDocument & {
        createdAt?: Date;
        updatedAt?: Date;
      }
    >,
  ) {
    const deduped = new Map<string, (typeof candidates)[number]>();

    // Deduplicate by source trip id. Keep latest candidate snapshot for deterministic exports.
    candidates.forEach((doc) => {
      const key = String(doc.sourceTripId || doc._id || '').trim();
      if (!key) {
        return;
      }

      const existing = deduped.get(key);
      const currentTime = new Date(
        doc.updatedAt || doc.createdAt || 0,
      ).getTime();
      const existingTime = existing
        ? new Date(existing.updatedAt || existing.createdAt || 0).getTime()
        : -1;

      if (!existing || currentTime >= existingTime) {
        deduped.set(key, doc);
      }
    });

    const rows: ExportRow[] = [];
    const fieldSet = new Set<string>([
      'boat_type',
      'source_trip_id',
      'boat_id',
    ]);

    Array.from(deduped.values())
      .sort((a, b) =>
        String(a.sourceTripId).localeCompare(String(b.sourceTripId)),
      )
      .forEach((doc) => {
        const features = (doc.featuresSnapshot || {}) as Record<string, any>;
        const labels = (doc.labelSnapshot || {}) as Record<string, any>;

        const row: ExportRow = {
          boat_type: doc.boatType,
          source_trip_id: doc.sourceTripId,
          boat_id: doc.boatId,
        };

        Object.keys(features).forEach((key) => {
          const column = `feature_${key}`;
          row[column] = features[key] ?? null;
          fieldSet.add(column);
        });

        Object.keys(labels).forEach((key) => {
          const column = `label_${key}`;
          row[column] = labels[key] ?? null;
          fieldSet.add(column);
        });

        rows.push(row);
      });

    return {
      rows,
      fields: Array.from(fieldSet),
    };
  }

  // Export approved+trained training candidates as CSV for ML training datasets
  async exportApprovedAsCSV(boatType?: string): Promise<string> {
    const query = this.buildExportQuery(boatType);
    const candidates = await this.candidateModel.find(query).lean().exec();
    const { rows, fields } = this.buildFlattenedRows(candidates as any);

    if (rows.length === 0) {
      return 'boat_type,source_trip_id,boat_id\n';
    }

    return parse(rows, { fields });
  }

  async syncDatasetCsvArtifacts() {
    const outputDir = this.getDatasetOutputDir();

    await fs.mkdir(outputDir, { recursive: true });

    const allCsv = await this.exportApprovedAsCSV();
    const canonicalFiles = new Set<string>(['training_data_all.csv']);
    await fs.writeFile(
      path.join(outputDir, 'training_data_all.csv'),
      allCsv,
      'utf8',
    );

    const distinctBoatTypes = await this.candidateModel.distinct('boatType', {
      status: { $in: ['APPROVED', 'TRAINED'] },
    });

    for (const rawBoatType of distinctBoatTypes) {
      const boatType = String(rawBoatType || '').trim();
      if (!boatType) {
        continue;
      }

      const csv = await this.exportApprovedAsCSV(boatType);
      const slug = slugifyBoatType(boatType) || 'unknown';
      const filename = `training_data_${slug}.csv`;
      canonicalFiles.add(filename);
      await fs.writeFile(path.join(outputDir, filename), csv, 'utf8');
    }

    // Remove stale per-boat files so repeated syncs do not leave duplicate variants.
    const existingFiles = await fs.readdir(outputDir);
    const staleBoatFiles = existingFiles.filter(
      (file) =>
        /^training_data_.+\.csv$/i.test(file) &&
        file.toLowerCase() !== 'training_data_all.csv' &&
        !canonicalFiles.has(file),
    );

    await Promise.all(
      staleBoatFiles.map((file) => fs.unlink(path.join(outputDir, file))),
    );
  }

  async refreshDatasetCsvArtifacts(boatType?: string) {
    await this.syncDatasetCsvArtifacts();

    let targetFile = 'training_data_all.csv';
    const outputDir = this.getDatasetOutputDir();

    if (boatType) {
      const slug = slugifyBoatType(boatType) || 'unknown';
      targetFile = `training_data_${slug}.csv`;
      const csv = await this.exportApprovedAsCSV(boatType);
      await fs.writeFile(path.join(outputDir, targetFile), csv, 'utf8');
    }

    const files = await this.listDatasetCsvFiles();

    return {
      message: boatType
        ? `Boat-type dataset refreshed for ${boatType}`
        : 'All dataset CSV files refreshed',
      targetFile,
      files,
    };
  }

  async listDatasetCsvFiles(): Promise<DatasetCsvFileInfo[]> {
    const outputDir = this.getDatasetOutputDir();
    await fs.mkdir(outputDir, { recursive: true });

    const files = await fs.readdir(outputDir);
    const csvFiles = files
      .filter((file) => /^training_data_[a-z0-9_]+\.csv$/i.test(file))
      .sort((a, b) => a.localeCompare(b));

    const metadata = await Promise.all(
      csvFiles.map(async (filename) => {
        const filePath = path.join(outputDir, filename);
        const [stats, content] = await Promise.all([
          fs.stat(filePath),
          fs.readFile(filePath, 'utf8'),
        ]);

        const filenameLower = filename.toLowerCase();
        const scope: DatasetScope =
          filenameLower === 'training_data_all.csv' ? 'ALL' : 'BOAT_TYPE';

        const boatTypeSlug =
          scope === 'BOAT_TYPE'
            ? filenameLower.replace(/^training_data_/, '').replace(/\.csv$/, '')
            : null;

        const trimmed = content.trim();
        const lineCount = trimmed ? trimmed.split(/\r?\n/).length : 0;

        return {
          filename,
          scope,
          boatTypeSlug,
          sizeBytes: stats.size,
          rowCount: Math.max(lineCount - 1, 0),
          updatedAt: stats.mtime.toISOString(),
        };
      }),
    );

    return metadata;
  }

  async getDatasetCsvContent(filename: string) {
    const safeName = String(filename || '').trim();

    if (!/^training_data_[a-z0-9_]+\.csv$/i.test(safeName)) {
      throw new Error('Invalid dataset filename');
    }

    const outputDir = this.getDatasetOutputDir();
    const filePath = path.join(outputDir, safeName);
    const content = await fs.readFile(filePath, 'utf8');

    return {
      filename: safeName,
      content,
    };
  }
}
