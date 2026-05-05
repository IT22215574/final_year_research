import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
  TrainingJob,
  TrainingJobDocument,
} from '../schemas/training-job.schema';
import {
  TrainingCandidate,
  TrainingCandidateDocument,
} from '../schemas/training-candidate.schema';
import { BoatType, BoatTypeDocument } from '../schemas/boat-type.schema';
import { ModelRegistryService } from '../model-registry/model-registry.service';
import { TrainingCandidatesService } from '../training-candidates/training-candidates.service';

const BOAT_TYPE_LABELS: Record<string, string> = {
  IMUI: 'Indigenous Multi-Day Ultra Light',
  IDAT: 'Indigenous Day Boats',
  OFRP: 'Offshore Fishing Vessel',
  MTRP: 'Multi-day Trawler/Boat',
};

const normalizeBoatType = (value?: string) =>
  String(value || '')
    .trim()
    .toUpperCase();

type BoatTypeAnalyticsRow = {
  boatType: string;
  displayName: string;
  isConfigured: boolean;
  totalCandidates: number;
  approvedCandidates: number;
  trainedCandidates: number;
  pendingCandidates: number;
  rejectedCandidates: number;
  trainingJobs: number;
  successfulJobs: number;
  failedJobs: number;
  recordsProcessed: number;
  backlog: number;
  coveragePercent: number;
  jobSuccessRate: number;
  lastTrainingAt: string | null;
};

@Injectable()
export class TrainingJobsService {
  constructor(
    @InjectModel(TrainingJob.name) private jobModel: Model<TrainingJobDocument>,
    @InjectModel(TrainingCandidate.name)
    private candidateModel: Model<TrainingCandidateDocument>,
    @InjectModel(BoatType.name) private boatTypeModel: Model<BoatTypeDocument>,
    private httpService: HttpService,
    private configService: ConfigService,
    private registryService: ModelRegistryService,
    private trainingCandidatesService: TrainingCandidatesService,
  ) {}

  async triggerTraining(
    adminId: string,
    options?: { scope?: 'GLOBAL' | 'BOAT_TYPE'; boatType?: string },
  ) {
    const scope = options?.scope || 'GLOBAL';
    const boatType = options?.boatType
      ? String(options.boatType).trim()
      : undefined;

    if (scope === 'BOAT_TYPE' && !boatType) {
      throw new BadRequestException(
        'boatType is required when scope is BOAT_TYPE.',
      );
    }

    // 1. Securely fetch ONLY datasets the Admin approved
    const candidateQuery: any = { status: 'APPROVED' };
    if (scope === 'BOAT_TYPE') {
      candidateQuery.boatType = {
        $regex: `^${boatType.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`,
        $options: 'i',
      };
    }

    const candidates = await this.candidateModel
      .find(candidateQuery)
      .sort({ updatedAt: -1, createdAt: -1 })
      .exec();

    // Keep only one dataset row per trip to avoid duplicate training samples.
    const dedupedByTrip = new Map<string, (typeof candidates)[number]>();
    candidates.forEach((candidate) => {
      const key = String(candidate.sourceTripId || candidate._id || '').trim();
      if (!key || dedupedByTrip.has(key)) {
        return;
      }

      dedupedByTrip.set(key, candidate);
    });

    const uniqueCandidates = Array.from(dedupedByTrip.values());

    if (uniqueCandidates.length === 0) {
      throw new BadRequestException(
        'There are no Approved dataset candidates sitting in the queue to train with.',
      );
    }

    // 2. Create the Training Job Record
    const job = await this.jobModel.create({
      startedBy: adminId,
      scope,
      boatType,
      status: 'PENDING',
      recordsProcessed: uniqueCandidates.length,
    });

    // 3. Prepare features for Python ML pipeline
    const learningData = uniqueCandidates.map((c) => ({
      boatId: c.boatId,
      boatType: c.boatType,
      tripId: c.sourceTripId || c._id.toString(),
      predictedFuelLiters: c.featuresSnapshot?.predictedFuelLiters || 0,
      actualFuelLiters: c.labelSnapshot?.actualFuelLiters || 0,
      speed: c.featuresSnapshot?.speed || 10,
      weatherSeverityIndex: c.featuresSnapshot?.weatherSeverityIndex || 0,
      distanceKm: c.featuresSnapshot?.distanceKm || 0,
      engineHP: c.featuresSnapshot?.engineHP || 85,
      fishingHours: c.featuresSnapshot?.fishingHours || 8,
      numberOfDays: c.featuresSnapshot?.numberOfDays || 1,
    }));

    // 4. Send to Python API
    const baseUrl =
      this.configService.get<string>('ML_SERVICE_BASE_URL') ||
      'http://localhost:5001';

    try {
      const response = await firstValueFrom(
        this.httpService.post(`${baseUrl}/learning/batch-update`, {
          trips: learningData,
          scope,
          boatType,
        }),
      );

      // Save mathematical success metrics from Python!
      job.status = 'SUCCESS';
      job.mlMetrics = response.data;
      await job.save();

      // Auto-register and rank model versions
      await this.registryService.registerModelsFromTraining(
        job._id.toString(),
        response.data,
        { scope, boatType },
      );

      // Automatically upgrade status to TRAINED so they aren't trained twice
      await this.candidateModel.updateMany(candidateQuery, {
        status: 'TRAINED',
      });

      await this.trainingCandidatesService.syncDatasetCsvArtifacts();

      return job;
    } catch (error: any) {
      // Catch python errors securely
      job.status = 'FAILED';
      job.mlMetrics = { error: error.message };
      await job.save();
      throw new BadRequestException(
        'Python ML Service failed to train model: ' + error.message,
      );
    }
  }

  async getRecentJobs() {
    return this.jobModel.find().sort({ createdAt: -1 }).limit(10).exec();
  }

  async getBoatTypeAnalytics() {
    const [configuredBoatTypes, candidates, trainingJobs] = await Promise.all([
      this.boatTypeModel.find().sort({ name: 1 }).lean().exec(),
      this.candidateModel
        .find({}, 'boatType status createdAt')
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
      this.jobModel
        .find(
          { scope: 'BOAT_TYPE' },
          'boatType status recordsProcessed createdAt',
        )
        .sort({ createdAt: -1 })
        .lean()
        .exec(),
    ]);

    const rows = new Map<string, BoatTypeAnalyticsRow>();
    const aliasIndex = new Map<string, string>();

    const registerRow = (
      key: string,
      displayName: string,
      isConfigured: boolean,
    ) => {
      if (!rows.has(key)) {
        rows.set(key, {
          boatType: key,
          displayName,
          isConfigured,
          totalCandidates: 0,
          approvedCandidates: 0,
          trainedCandidates: 0,
          pendingCandidates: 0,
          rejectedCandidates: 0,
          trainingJobs: 0,
          successfulJobs: 0,
          failedJobs: 0,
          recordsProcessed: 0,
          backlog: 0,
          coveragePercent: 0,
          jobSuccessRate: 0,
          lastTrainingAt: null,
        });
      }

      return rows.get(key)!;
    };

    const addAlias = (alias: string, key: string) => {
      const normalizedAlias = normalizeBoatType(alias);
      if (normalizedAlias) {
        aliasIndex.set(normalizedAlias, key);
      }
    };

    configuredBoatTypes.forEach((boatType) => {
      const rawName = String(boatType.name || '').trim();
      const normalizedName = normalizeBoatType(rawName);
      const displayName = BOAT_TYPE_LABELS[normalizedName] || rawName;
      const row = registerRow(normalizedName || rawName, displayName, true);

      addAlias(rawName, row.boatType);
      addAlias(displayName, row.boatType);
      addAlias(normalizedName, row.boatType);
      addAlias(boatType.name, row.boatType);
    });

    const resolveRow = (boatType?: string) => {
      const rawValue = String(boatType || '').trim();
      const normalizedValue = normalizeBoatType(rawValue);

      if (!normalizedValue) {
        return registerRow('UNKNOWN', 'UNKNOWN', false);
      }

      const configuredKey = aliasIndex.get(normalizedValue);
      if (configuredKey) {
        return registerRow(
          configuredKey,
          rows.get(configuredKey)?.displayName || configuredKey,
          true,
        );
      }

      return registerRow(normalizedValue, rawValue || normalizedValue, false);
    };

    candidates.forEach((candidate) => {
      const row = resolveRow(candidate.boatType);
      row.totalCandidates += 1;

      switch (candidate.status) {
        case 'APPROVED':
          row.approvedCandidates += 1;
          break;
        case 'TRAINED':
          row.trainedCandidates += 1;
          break;
        case 'REJECTED':
          row.rejectedCandidates += 1;
          break;
        default:
          row.pendingCandidates += 1;
          break;
      }
    });

    trainingJobs.forEach((job) => {
      const row = resolveRow(job.boatType);
      row.trainingJobs += 1;

      if (job.status === 'SUCCESS') {
        row.successfulJobs += 1;
      } else if (job.status === 'FAILED') {
        row.failedJobs += 1;
      }

      row.recordsProcessed += Number(job.recordsProcessed || 0);

      const createdAtRaw = (job as any)?.createdAt;
      if (createdAtRaw) {
        const createdAt = new Date(createdAtRaw).toISOString();
        if (!row.lastTrainingAt || createdAt > row.lastTrainingAt) {
          row.lastTrainingAt = createdAt;
        }
      }
    });

    rows.forEach((row) => {
      const eligibleCandidates = row.approvedCandidates + row.trainedCandidates;
      row.backlog = row.approvedCandidates;
      row.coveragePercent =
        eligibleCandidates > 0
          ? Math.round(
              (row.trainedCandidates / eligibleCandidates) * 1000,
            ) / 10
          : 0;
      row.jobSuccessRate =
        row.trainingJobs > 0
          ? Math.round((row.successfulJobs / row.trainingJobs) * 1000) / 10
          : 0;
    });

    const boatTypeRows = Array.from(rows.values()).sort((a, b) => {
      if (a.isConfigured !== b.isConfigured) {
        return a.isConfigured ? -1 : 1;
      }

      return b.approvedCandidates - a.approvedCandidates;
    });

    const summary = boatTypeRows.reduce(
      (acc, row) => {
        acc.totalBoatTypes += 1;
        acc.approvedCandidates += row.approvedCandidates;
        acc.trainedCandidates += row.trainedCandidates;
        acc.pendingCandidates += row.pendingCandidates;
        acc.rejectedCandidates += row.rejectedCandidates;
        acc.trainingJobs += row.trainingJobs;
        acc.successfulJobs += row.successfulJobs;
        acc.failedJobs += row.failedJobs;
        acc.recordsProcessed += row.recordsProcessed;

        if (row.lastTrainingAt && row.lastTrainingAt > acc.lastTrainingAt) {
          acc.lastTrainingAt = row.lastTrainingAt;
        }

        return acc;
      },
      {
        totalBoatTypes: 0,
        approvedCandidates: 0,
        trainedCandidates: 0,
        pendingCandidates: 0,
        rejectedCandidates: 0,
        trainingJobs: 0,
        successfulJobs: 0,
        failedJobs: 0,
        recordsProcessed: 0,
        lastTrainingAt: '',
      },
    );

    const summaryEligibleCandidates =
      summary.approvedCandidates + summary.trainedCandidates;

    const overallCoverage =
      summaryEligibleCandidates > 0
        ? Math.round(
            (summary.trainedCandidates / summaryEligibleCandidates) * 1000,
          ) / 10
        : 0;

    const overallJobSuccessRate =
      summary.trainingJobs > 0
        ? Math.round((summary.successfulJobs / summary.trainingJobs) * 1000) /
          10
        : 0;

    return {
      summary: {
        totalBoatTypes: summary.totalBoatTypes,
        approvedCandidates: summary.approvedCandidates,
        trainedCandidates: summary.trainedCandidates,
        pendingCandidates: summary.pendingCandidates,
        rejectedCandidates: summary.rejectedCandidates,
        trainingJobs: summary.trainingJobs,
        successfulJobs: summary.successfulJobs,
        failedJobs: summary.failedJobs,
        recordsProcessed: summary.recordsProcessed,
        coveragePercent: overallCoverage,
        jobSuccessRate: overallJobSuccessRate,
        lastTrainingAt: summary.lastTrainingAt || null,
      },
      boatTypes: boatTypeRows,
    };
  }
}
