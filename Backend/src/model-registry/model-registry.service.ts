import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import {
  ModelVersion,
  ModelVersionDocument,
} from '../schemas/model-version.schema';

type ArtifactSummaryRow = {
  scope: 'GLOBAL' | 'BOAT_TYPE';
  boatType: string | null;
  modelPath: string;
  metadataPath: string;
  modelExists: boolean;
  selectedModel: string | null;
  rowsUsed: number;
  dataset: string | null;
  target: string | null;
  metrics: {
    mape: number | null;
    mae: number | null;
    rmse: number | null;
    r2: number | null;
  };
  cvBestModel: string | null;
  cvMetrics: {
    mape: number | null;
    mae: number | null;
    rmse: number | null;
    r2: number | null;
  };
  verificationMethod: string | null;
  metricsUsed: string[];
  updatedAt: string | null;
};

@Injectable()
export class ModelRegistryService {
  constructor(
    @InjectModel(ModelVersion.name)
    private versionModel: Model<ModelVersionDocument>,
  ) {}

  // Called automatically after a training job completes
  private resolveArtifactPath(
    scope: 'GLOBAL' | 'BOAT_TYPE',
    algorithmType: string,
    modelVersionId: string,
    boatType?: string,
  ): string {
    const backendRoot = process.cwd();
    const repoRoot =
      path.basename(backendRoot).toLowerCase() === 'backend'
        ? path.resolve(backendRoot, '..')
        : backendRoot;
    const root = path.resolve(
      repoRoot,
      'model',
      'cost_prediction',
      'models',
      'fishtripcost',
    );
    const algorithm = String(algorithmType || 'unknown')
      .toLowerCase()
      .replace(/\s+/g, '_');
    const target =
      scope === 'BOAT_TYPE' && boatType
        ? path.join(
            root,
            'boat_type',
            String(boatType).trim().toUpperCase(),
            algorithm,
            modelVersionId,
          )
        : path.join(root, 'global', algorithm, modelVersionId);

    fs.mkdirSync(target, { recursive: true });
    return target;
  }

  private getFishTripCostModelRoot() {
    const backendRoot = process.cwd();
    const repoRoot =
      path.basename(backendRoot).toLowerCase() === 'backend'
        ? path.resolve(backendRoot, '..')
        : backendRoot;

    return path.resolve(
      repoRoot,
      'model',
      'cost_prediction',
      'models',
      'fishtripcost',
    );
  }

  private asNumberOrNull(value: unknown) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private countCsvRows(csvPath?: string | null) {
    if (!csvPath || !fs.existsSync(csvPath)) {
      return 0;
    }

    const content = fs.readFileSync(csvPath, 'utf8').trim();
    if (!content) {
      return 0;
    }

    return Math.max(content.split(/\r?\n/).length - 1, 0);
  }

  private readArtifactSummary(
    scope: 'GLOBAL' | 'BOAT_TYPE',
    artifactDir: string,
    boatType: string | null,
  ): ArtifactSummaryRow | null {
    const metadataPath = path.join(artifactDir, 'metadata.json');
    const modelPath = path.join(artifactDir, 'fuel_model.pkl');

    if (!fs.existsSync(metadataPath) && !fs.existsSync(modelPath)) {
      return null;
    }

    let metadata: any = {};
    if (fs.existsSync(metadataPath)) {
      try {
        metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
      } catch {
        metadata = {};
      }
    }

    const selectedModel =
      metadata.selected_model ||
      metadata.best_model ||
      metadata.algorithm ||
      null;
    const ranking = Array.isArray(metadata.ranking) ? metadata.ranking : [];
    const selectedRanking =
      ranking.find((row: any) => row?.model === selectedModel) ||
      ranking[0] ||
      {};
    const crossValidation = Array.isArray(metadata.cross_validation)
      ? metadata.cross_validation
      : [];
    const cvBestModel =
      metadata.cv_best_model ||
      crossValidation
        .slice()
        .sort(
          (a: any, b: any) =>
            Number(a?.CV_MAPE_MEAN ?? Number.POSITIVE_INFINITY) -
            Number(b?.CV_MAPE_MEAN ?? Number.POSITIVE_INFINITY),
        )[0]?.model ||
      null;
    const selectedCvRanking =
      crossValidation.find((row: any) => row?.model === cvBestModel) ||
      crossValidation[0] ||
      {};

    const statsPath = fs.existsSync(metadataPath)
      ? metadataPath
      : fs.existsSync(modelPath)
        ? modelPath
        : null;

    const rowsUsed =
      Number(metadata.rows_used || metadata.dataset_rows || 0) ||
      this.countCsvRows(metadata.dataset);

    return {
      scope,
      boatType,
      modelPath,
      metadataPath,
      modelExists: fs.existsSync(modelPath),
      selectedModel,
      rowsUsed,
      dataset: metadata.dataset || null,
      target: metadata.target || null,
      metrics: {
        mape: this.asNumberOrNull(selectedRanking.MAPE ?? selectedRanking.mape),
        mae: this.asNumberOrNull(selectedRanking.MAE ?? selectedRanking.mae),
        rmse: this.asNumberOrNull(selectedRanking.RMSE ?? selectedRanking.rmse),
        r2: this.asNumberOrNull(selectedRanking.R2 ?? selectedRanking.r2),
      },
      cvBestModel,
      cvMetrics: {
        mape: this.asNumberOrNull(
          selectedCvRanking.CV_MAPE_MEAN ?? selectedCvRanking.mape,
        ),
        mae: this.asNumberOrNull(
          selectedCvRanking.CV_MAE_MEAN ?? selectedCvRanking.mae,
        ),
        rmse: this.asNumberOrNull(
          selectedCvRanking.CV_RMSE_MEAN ?? selectedCvRanking.rmse,
        ),
        r2: this.asNumberOrNull(
          selectedCvRanking.CV_R2_MEAN ?? selectedCvRanking.r2,
        ),
      },
      verificationMethod: metadata.verification_method || null,
      metricsUsed: Array.isArray(metadata.metrics_used)
        ? metadata.metrics_used
        : [],
      updatedAt: statsPath ? fs.statSync(statsPath).mtime.toISOString() : null,
    };
  }

  async getArtifactSummary() {
    const root = this.getFishTripCostModelRoot();
    const artifacts: ArtifactSummaryRow[] = [];

    const globalArtifact = this.readArtifactSummary(
      'GLOBAL',
      path.join(root, 'global', 'best_model'),
      null,
    );
    if (globalArtifact) {
      artifacts.push(globalArtifact);
    }

    const boatTypeRoot = path.join(root, 'boat_type');
    if (fs.existsSync(boatTypeRoot)) {
      fs.readdirSync(boatTypeRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .forEach((entry) => {
          const artifact = this.readArtifactSummary(
            'BOAT_TYPE',
            path.join(boatTypeRoot, entry.name, 'best_model'),
            entry.name.toUpperCase(),
          );

          if (artifact) {
            artifacts.push(artifact);
          }
        });
    }

    return {
      root,
      artifacts,
    };
  }

  async registerModelsFromTraining(
    trainingJobId: string,
    mlMetrics: any,
    options?: { scope?: 'GLOBAL' | 'BOAT_TYPE'; boatType?: string },
  ) {
    const scope = options?.scope || 'GLOBAL';
    const boatType = options?.boatType
      ? String(options.boatType).trim().toUpperCase()
      : undefined;

    // If Python returned per-algorithm results, register each one
    const algorithms = mlMetrics?.modelResults || [];

    if (algorithms.length === 0) {
      // Fallback: register a single entry from the overall metrics
      const version = await this.versionModel.create({
        trainingJobId,
        algorithmType: 'default',
        scope,
        boatType,
        metrics: mlMetrics,
        selectionScore:
          mlMetrics?.mape || mlMetrics?.averagePredictionError || 999,
        selectionRank: 1,
        quality: 'GOOD',
        status: 'CANDIDATE',
      });

      version.artifactReference = this.resolveArtifactPath(
        scope,
        'default',
        version._id.toString(),
        boatType,
      );
      await version.save();
      return;
    }

    // Register each algorithm as a separate model version
    const versions = [];
    for (const algo of algorithms) {
      versions.push({
        trainingJobId,
        algorithmType: algo.name || algo.algorithmType || 'unknown',
        scope,
        boatType,
        metrics: algo.metrics || algo,
        selectionScore: algo.metrics?.mape || algo.mape || 999,
        quality: 'PENDING',
        status: 'CANDIDATE',
      });
    }

    const saved = await this.versionModel.insertMany(versions);

    // Auto-rank: sort by selectionScore (lowest MAPE = best)
    const sorted = saved.sort((a, b) => a.selectionScore - b.selectionScore);
    for (let i = 0; i < sorted.length; i++) {
      sorted[i].selectionRank = i + 1;
      sorted[i].quality = i === 0 ? 'GOOD' : 'BAD';
      sorted[i].artifactReference = this.resolveArtifactPath(
        scope,
        sorted[i].algorithmType,
        sorted[i]._id.toString(),
        boatType,
      );
      await sorted[i].save();
    }
  }

  // Admin: get all model versions
  async getAllVersions() {
    return this.versionModel.find().sort({ createdAt: -1 }).exec();
  }

  // Admin: get versions for a specific training job
  async getVersionsByJob(jobId: string) {
    return this.versionModel
      .find({ trainingJobId: jobId })
      .sort({ selectionRank: 1 })
      .exec();
  }

  // Admin: promote a model version to ACTIVE
  async promote(versionId: string, adminId: string) {
    const version = await this.versionModel.findById(versionId).exec();
    if (!version) throw new NotFoundException('Model version not found');
    if (version.quality !== 'GOOD') {
      throw new BadRequestException(
        'Only GOOD (rank 1) models can be promoted.',
      );
    }

    const activeScopeQuery: any = { status: 'ACTIVE', scope: version.scope };
    if (version.scope === 'BOAT_TYPE') {
      activeScopeQuery.boatType = version.boatType;
    }

    // Retire only active model within same scope and same boat type (for BOAT_TYPE scope)
    await this.versionModel.updateMany(activeScopeQuery, { status: 'RETIRED' });

    // Promote this one
    version.status = 'ACTIVE';
    version.promotedBy = adminId;
    version.promotedAt = new Date();
    await version.save();

    return version;
  }

  // Admin: rollback to previous active model
  async rollback(adminId: string) {
    // Find the most recently retired GLOBAL model for safe default rollback
    const previous = await this.versionModel
      .findOne({ status: 'RETIRED', scope: 'GLOBAL' })
      .sort({ promotedAt: -1 })
      .exec();

    if (!previous)
      throw new BadRequestException('No previous model to rollback to.');

    // Retire current active GLOBAL model only
    await this.versionModel.updateMany(
      { status: 'ACTIVE', scope: 'GLOBAL' },
      { status: 'RETIRED' },
    );

    // Re-activate the previous
    previous.status = 'ACTIVE';
    previous.promotedBy = adminId;
    previous.promotedAt = new Date();
    await previous.save();

    return previous;
  }

  // Get the currently active model
  async getActiveModel() {
    return this.versionModel
      .findOne({ status: 'ACTIVE', scope: 'GLOBAL' })
      .exec();
  }

  // Boat-type aware lookup with global fallback
  async getActiveModelForBoatType(boatType?: string) {
    if (boatType) {
      const scoped = await this.versionModel
        .findOne({
          status: 'ACTIVE',
          scope: 'BOAT_TYPE',
          boatType: String(boatType).toUpperCase(),
        })
        .exec();

      if (scoped) {
        return scoped;
      }
    }

    return this.versionModel
      .findOne({ status: 'ACTIVE', scope: 'GLOBAL' })
      .exec();
  }
}
