import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  TrainingCandidate,
  TrainingCandidateDocument,
} from '../schemas/training-candidate.schema';
import {
  UploadedDataset,
  UploadedDatasetDocument,
} from '../schemas/uploaded-dataset.schema';
import { parse } from 'json2csv';

type ExportRow = Record<string, string | number | boolean | null>;
type DatasetScope = 'ALL' | 'BOAT_TYPE';
type DatasetRowSource = 'manual' | 'upload';

type DatasetTableRow = ExportRow & {
  __rowKey: string;
  __sourceType: DatasetRowSource;
};

type DatasetTablePayload = {
  columns: string[];
  rows: DatasetTableRow[];
};

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
    @InjectModel(UploadedDataset.name)
    private uploadModel: Model<UploadedDatasetDocument>,
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

  private buildFlattenedRowsFromCandidates(
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

  /**
   * Build flattened rows from uploaded datasets
   * For uploads, source_trip_id is null, but we track uploadSourceId
   */
  private buildFlattenedRowsFromUploads(
    uploads: Array<
      UploadedDatasetDocument & {
        createdAt?: Date;
        updatedAt?: Date;
      }
    >,
  ) {
    const rows: ExportRow[] = [];
    const fieldSet = new Set<string>([
      'boat_type',
      'source_trip_id',
      'boat_id',
    ]);

    uploads.forEach((upload) => {
      const records = upload.records || [];
      records
        .filter((r) => r.validationStatus === 'VALID')
        .forEach((record) => {
          const features = (record.featuresSnapshot || {}) as Record<
            string,
            any
          >;
          const labels = (record.labelSnapshot || {}) as Record<string, any>;

          const row: ExportRow = {
            boat_type: record.boatType,
            source_trip_id: null, // Uploads don't have trip IDs
            boat_id: record.boatId,
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
    });

    return {
      rows,
      fields: Array.from(fieldSet),
    };
  }

  private appendFlattenedSnapshotFields(
    row: ExportRow,
    fieldSet: Set<string>,
    features?: Record<string, any>,
    labels?: Record<string, any>,
  ) {
    Object.keys(features || {}).forEach((key) => {
      const column = `feature_${key}`;
      row[column] = features?.[key] ?? null;
      fieldSet.add(column);
    });

    Object.keys(labels || {}).forEach((key) => {
      const column = `label_${key}`;
      row[column] = labels?.[key] ?? null;
      fieldSet.add(column);
    });
  }

  async getDatasetTableRows(boatType?: string): Promise<DatasetTablePayload> {
    const query = this.buildExportQuery(boatType);
    const candidates = await this.candidateModel.find(query).lean().exec();

    const uploadQuery: any = { status: { $in: ['APPROVED', 'TRAINED'] } };
    if (boatType) {
      uploadQuery.boatType = {
        $regex: `^${String(boatType)
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        $options: 'i',
      };
    }
    const uploads = await this.uploadModel.find(uploadQuery).lean().exec();

    const fieldSet = new Set<string>([
      'boat_type',
      'source_trip_id',
      'boat_id',
    ]);
    const rows: DatasetTableRow[] = [];

    (candidates as any[]).forEach((doc) => {
      const row: DatasetTableRow = {
        __rowKey: `manual:${String(doc._id)}`,
        __sourceType: 'manual',
        boat_type: doc.boatType,
        source_trip_id: doc.sourceTripId,
        boat_id: doc.boatId,
      };

      this.appendFlattenedSnapshotFields(
        row,
        fieldSet,
        doc.featuresSnapshot || {},
        doc.labelSnapshot || {},
      );

      rows.push(row);
    });

    (uploads as any[]).forEach((upload) => {
      (upload.records || []).forEach((record, index) => {
        if (record.validationStatus !== 'VALID') {
          return;
        }

        const row: DatasetTableRow = {
          __rowKey: `upload:${String(upload._id)}:${index}`,
          __sourceType: 'upload',
          boat_type: record.boatType,
          source_trip_id: null,
          boat_id: record.boatId,
        };

        this.appendFlattenedSnapshotFields(
          row,
          fieldSet,
          record.featuresSnapshot || {},
          record.labelSnapshot || {},
        );

        rows.push(row);
      });
    });

    return {
      columns: Array.from(fieldSet),
      rows,
    };
  }

  private parseEditableNumber(value: unknown) {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new BadRequestException(`Invalid numeric value: ${value}`);
    }

    return parsed;
  }

  private applyDatasetRowUpdates(
    target: {
      boatId?: string;
      featuresSnapshot?: Record<string, any>;
      labelSnapshot?: Record<string, any>;
    },
    values: Record<string, unknown>,
  ) {
    Object.entries(values || {}).forEach(([column, value]) => {
      if (column === 'boat_id') {
        const boatId = String(value || '').trim();
        if (!boatId) {
          throw new BadRequestException('boat_id cannot be empty.');
        }
        target.boatId = boatId;
        return;
      }

      if (column.startsWith('feature_')) {
        const key = column.replace(/^feature_/, '');
        target.featuresSnapshot = target.featuresSnapshot || {};
        target.featuresSnapshot[key] = this.parseEditableNumber(value);
        return;
      }

      if (column.startsWith('label_')) {
        const key = column.replace(/^label_/, '');
        target.labelSnapshot = target.labelSnapshot || {};
        target.labelSnapshot[key] = this.parseEditableNumber(value);
      }
    });
  }

  private parseRowKey(rowKey: string) {
    const [sourceType, id, recordIndex] = String(rowKey || '').split(':');
    if (sourceType !== 'manual' && sourceType !== 'upload') {
      throw new BadRequestException('Invalid dataset row key.');
    }

    if (!id) {
      throw new BadRequestException('Dataset row id is required.');
    }

    return {
      sourceType: sourceType as DatasetRowSource,
      id,
      recordIndex:
        recordIndex !== undefined ? Number.parseInt(recordIndex, 10) : null,
    };
  }

  async updateDatasetTableRow(rowKey: string, values: Record<string, unknown>) {
    const parsedKey = this.parseRowKey(rowKey);

    if (parsedKey.sourceType === 'manual') {
      const candidate = await this.candidateModel.findById(parsedKey.id).exec();
      if (!candidate) {
        throw new NotFoundException('Manual training row not found.');
      }

      this.applyDatasetRowUpdates(candidate as any, values);
      candidate.markModified('featuresSnapshot');
      candidate.markModified('labelSnapshot');
      await candidate.save();
      await this.syncDatasetCsvArtifacts();
      return { message: 'Dataset row updated.' };
    }

    if (parsedKey.recordIndex === null || Number.isNaN(parsedKey.recordIndex)) {
      throw new BadRequestException('Upload record index is required.');
    }

    const upload = await this.uploadModel.findById(parsedKey.id).exec();
    if (!upload || !upload.records?.[parsedKey.recordIndex]) {
      throw new NotFoundException('Uploaded dataset row not found.');
    }

    const record = upload.records[parsedKey.recordIndex] as any;
    this.applyDatasetRowUpdates(record, values);
    upload.markModified('records');
    await upload.save();
    await this.syncDatasetCsvArtifacts();
    return { message: 'Dataset row updated.' };
  }

  async deleteDatasetTableRow(rowKey: string) {
    const parsedKey = this.parseRowKey(rowKey);

    if (parsedKey.sourceType === 'manual') {
      const deleted = await this.candidateModel
        .findByIdAndDelete(parsedKey.id)
        .exec();
      if (!deleted) {
        throw new NotFoundException('Manual training row not found.');
      }

      await this.syncDatasetCsvArtifacts();
      return { message: 'Dataset row deleted.' };
    }

    if (parsedKey.recordIndex === null || Number.isNaN(parsedKey.recordIndex)) {
      throw new BadRequestException('Upload record index is required.');
    }

    const upload = await this.uploadModel.findById(parsedKey.id).exec();
    if (!upload || !upload.records?.[parsedKey.recordIndex]) {
      throw new NotFoundException('Uploaded dataset row not found.');
    }

    upload.records.splice(parsedKey.recordIndex, 1);
    upload.rowCount = upload.records.length;
    upload.processedCount = upload.records.filter(
      (record) => record.validationStatus === 'VALID',
    ).length;
    upload.errorCount = upload.records.filter(
      (record) => record.validationStatus === 'INVALID',
    ).length;
    upload.markModified('records');
    await upload.save();
    await this.syncDatasetCsvArtifacts();
    return { message: 'Dataset row deleted.' };
  }

  // Export approved+trained training candidates as CSV for ML training datasets
  async exportApprovedAsCSV(boatType?: string): Promise<string> {
    const query = this.buildExportQuery(boatType);
    const candidates = await this.candidateModel.find(query).lean().exec();

    // Also get approved uploaded datasets
    const uploadQuery: any = { status: { $in: ['APPROVED', 'TRAINED'] } };
    if (boatType) {
      uploadQuery.boatType = {
        $regex: `^${String(boatType)
          .trim()
          .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        $options: 'i',
      };
    }
    const uploads = await this.uploadModel.find(uploadQuery).lean().exec();

    // Flatten manual candidates
    const manualRows = this.buildFlattenedRowsFromCandidates(candidates as any);

    // Flatten uploaded records
    const uploadedRows = this.buildFlattenedRowsFromUploads(uploads as any);

    // Merge rows
    const allRows = [...manualRows.rows, ...uploadedRows.rows];
    const allFields = new Set([...manualRows.fields, ...uploadedRows.fields]);

    if (allRows.length === 0) {
      return 'boat_type,source_trip_id,boat_id\n';
    }

    return parse(allRows, { fields: Array.from(allFields) });
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

    // Get distinct boat types from BOTH candidates and uploads
    const candidateBoatTypes = await this.candidateModel.distinct('boatType', {
      status: { $in: ['APPROVED', 'TRAINED'] },
    });

    const uploadBoatTypes = await this.uploadModel.distinct('boatType', {
      status: { $in: ['APPROVED', 'TRAINED'] },
    });

    const allBoatTypes = new Set<string>([
      ...(candidateBoatTypes || []),
      ...(uploadBoatTypes || []),
    ]);

    for (const rawBoatType of allBoatTypes) {
      const boatType = String(rawBoatType || '').trim();
      if (!boatType) {
        continue;
      }

      const csv = await this.exportApprovedAsCSV(boatType);
      const slug = slugifyBoatType(boatType) || 'unknown';
      const filename = `training_data_${slug}.csv`;
      canonicalFiles.add(filename);
      await fs.writeFile(path.join(outputDir, filename), csv, 'utf8');

      // Mark uploads as synced
      await this.uploadModel.updateMany(
        {
          boatType,
          status: { $in: ['APPROVED', 'TRAINED'] },
        },
        {
          synced: true,
          syncedAt: new Date(),
        },
      );
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

  async getBoatwiseDatasetStats() {
    // Get distinct boat types from both sources
    const candidateBoatTypes = await this.candidateModel.distinct('boatType', {
      status: { $in: ['APPROVED', 'TRAINED'] },
    });

    const uploadBoatTypes = await this.uploadModel.distinct('boatType', {
      status: { $in: ['APPROVED', 'TRAINED'] },
    });

    const allBoatTypes = new Set<string>([
      ...(candidateBoatTypes || []),
      ...(uploadBoatTypes || []),
    ]);

    const stats = await Promise.all(
      Array.from(allBoatTypes).map(async (boatType) => {
        const normalized = String(boatType || '').trim();
        if (!normalized) return null;

        const [manualCount, uploadedCount] = await Promise.all([
          this.candidateModel.countDocuments({
            boatType: normalized,
            status: { $in: ['APPROVED', 'TRAINED'] },
          }),
          this.uploadModel
            .find({
              boatType: normalized,
              status: { $in: ['APPROVED', 'TRAINED'] },
            })
            .lean()
            .then((uploads) =>
              uploads.reduce(
                (count, upload: any) =>
                  count +
                  (upload.records || []).filter(
                    (record) => record.validationStatus === 'VALID',
                  ).length,
                0,
              ),
            ),
        ]);

        const slug = slugifyBoatType(normalized);
        const filename = `training_data_${slug}.csv`;
        const filePath = path.join(this.getDatasetOutputDir(), filename);

        let csvRowCount = 0;
        let csvSize = 0;
        let csvUpdatedAt = null;

        try {
          const stats = await fs.stat(filePath);
          const content = await fs.readFile(filePath, 'utf8');
          const trimmed = content.trim();
          csvRowCount = trimmed ? trimmed.split(/\r?\n/).length - 1 : 0;
          csvSize = stats.size;
          csvUpdatedAt = stats.mtime.toISOString();
        } catch {
          // File doesn't exist yet, that's ok
        }

        return {
          boatType: normalized,
          boatTypeSlug: slug,
          csvFile: filename,
          csvSize: csvSize,
          csvRowCount: Math.max(csvRowCount, 0),
          csvUpdatedAt: csvUpdatedAt,
          manualTripRows: manualCount,
          uploadedDatasetRows: uploadedCount,
          totalRows: manualCount + uploadedCount,
          readyForTraining: manualCount + uploadedCount > 0,
        };
      }),
    );

    return stats.filter((s) => s !== null);
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
