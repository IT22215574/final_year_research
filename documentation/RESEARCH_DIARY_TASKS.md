# Fish Trip Cost Research Diary - Task List (35-40 Tasks)

## 📊 PHASE 1: BACKEND ARCHITECTURE & API DESIGN (Tasks 1-8)

### Task 1: Design Fish Trip Cost Model Schema

**Description:** Create comprehensive database schema for fish trip cost tracking including boat type, fuel consumption, crew costs, equipment maintenance, and catch value. Define relationships between trips, boats, costs, and revenue streams. Document field validations and constraints.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 2: Implement Training Job Management Endpoints

**Description:** Build REST API endpoints for creating, updating, and retrieving training jobs. Include job status tracking (PENDING, IN_PROGRESS, COMPLETED, FAILED), error logging, and result storage. Support batch job creation for multiple boat types.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 3: Create Dataset Upload & Validation Pipeline

**Description:** Design and implement file upload endpoints supporting CSV format validation. Include automatic schema validation, duplicate detection, row counting (manual vs uploaded vs total). Generate upload reports with statistics. Handle failed uploads gracefully with detailed error messages.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 4: Build Model Artifact Summary Service

**Description:** Develop service to read and summarize trained model artifacts from `model/cost_prediction/models/fishtripcost` directory. Extract and surface metrics: selected model name, rows used, MAPE, MAE, RMSE, R², and artifact timestamps. Support Colab-trained model metadata prioritization.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 5: Implement Boat-wise Dataset Statistics Endpoint

**Description:** Create endpoint to aggregate and return per-boat statistics including manual rows, uploaded rows, total training rows, and rows used in models. Support filtering by boat type and date range. Include data source tracking (mobile app vs manual upload).
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 6: Develop Training Candidates Assessment Logic

**Description:** Build service to evaluate candidate training datasets and models based on completeness, quality metrics, and row count thresholds. Implement logic to prefer Colab artifact metrics over generic registry candidates. Flag suboptimal candidates with recommendations.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 7: Create Comprehensive Error Handling Middleware

**Description:** Implement standardized error handling across all endpoints. Return clear, structured error messages instead of empty console objects. Handle authorization failures by clearing auth tokens and providing redirect paths. Support graceful degradation for optional analytics endpoints.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 8: Build Trip Analytics Aggregation Service

**Description:** Create service to separate and aggregate three distinct analytics streams: app-recorded trips, training dataset rows, and geographic coverage metrics. Support time-series querying and boat-type filtering. Generate summary statistics for dashboard visualization.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

## 📱 PHASE 2: DATA MODEL & TRAINING PIPELINE (Tasks 9-18)

### Task 9: Design Colab Training Notebook Architecture

**Description:** Establish standardized structure for all Colab training notebooks (IMUI, MTRP, OFRP, IDAT, Global). Define notebook cell organization: imports → config → data loading → preprocessing → training → evaluation → artifact saving. Document metadata output format (rows_used, training_mode, metrics).
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

```
Colab Notebook Flow:
┌─────────────────┐
│ 1. Config Setup │
└────────┬────────┘
         │
┌────────▼──────────────┐
│ 2. Load training_data │ (from model/cost_prediction/training_data/)
│    CSV Files         │
└────────┬──────────────┘
         │
┌────────▼────────────────┐
│ 3. Validate Min Rows    │
│    (Threshold Check)    │
└────────┬────────────────┘
         │
┌────────▼──────────────┐
│ 4. Feature Engineering│
│    & Preprocessing   │
└────────┬──────────────┘
         │
┌────────▼──────────────┐
│ 5. Train Model       │
│    (Boat-type or     │
│     Global)          │
└────────┬──────────────┘
         │
┌────────▼──────────────┐
│ 6. Evaluate Metrics  │
│    (MAPE, MAE, RMSE, R²)
└────────┬──────────────┘
         │
┌────────▼──────────────────┐
│ 7. Save to fishtripcost/  │
│    + Metadata Output      │
└──────────────────────────┘
```

---

### Task 10: Implement Minimum Row Validation in Notebooks

**Description:** Add row count validation logic before training each boat-type model. Define minimum row thresholds (suggest 100+ rows for robust models). Skip training with warning if below threshold. Log row counts to cell outputs for audit trail.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 11: Create Standardized Training Data CSV Structure

**Description:** Define canonical format for training CSVs in `model/cost_prediction/training_data/`. Include field names, data types, units, and missing value handling. Create training_data_all.csv for global model and boat-type-specific CSVs (training_data_IMUI.csv, training_data_MTRP.csv, etc.).
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 12: Implement Feature Export Pipeline

**Description:** Build pipeline to extract and export engineered features from training datasets. Create feature\_\*.csv files (feature_sst, feature_currents, feature_catch_quality) referenced in notebooks. Document feature definitions and transformation logic.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 13: Add Metadata Output to Colab Notebooks

**Description:** Modify all boat-type notebooks (IMUI, MTRP, OFRP, IDAT) and global notebook to output metadata JSON including: rows_used, training_mode ("colab_trained"), model_name, metrics (MAPE, MAE, RMSE, R²), timestamp, boat_type, and feature_versions used.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 14: Remove Legacy Fallback Datasets

**Description:** Audit all active boat-type notebooks and remove hardcoded fallback datasets. Ensure notebooks exclusively reference CSV files from model/cost_prediction/training_data/. Document any notebooks still using generated/mock data for later cleanup.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** Medium | Low

---

### Task 15: Implement Model Output Standardization

**Description:** Ensure all model artifacts saved to model/cost*prediction/models/fishtripcost/ follow consistent naming: `{boat_type}*{timestamp}.pkl`, `{boat*type}*{timestamp}\_metadata.json`. Include scaler files, feature lists, and training parameters. Validate outputs before closing notebooks.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 16: Create Global Model Training Flow

**Description:** Develop unified training flow for global model using training*data_all.csv and exported feature*\* columns. Define how boat-type-specific features are aggregated. Document weighting strategy (equal vs proportional by boat type). Test on full dataset.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 17: Build Artifact Retrieval & Validation Service

**Description:** Create Python service to programmatically read model artifacts from fishtripcost directory, validate integrity, extract metadata, and compute summary statistics. Support both direct file reading and API-based retrieval for frontend use.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 18: Implement Notebook Validation Tests

**Description:** Create validation suite to verify all Colab notebooks are valid JSON, all code cells parse as valid Python, and all referenced data files exist. Run after each notebook modification. Generate validation report.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

## 🎨 PHASE 3: FRONTEND IMPLEMENTATION - WEB (Tasks 19-26)

### Task 19: Build Dataset Data Admin Page

**Description:** Create interactive page at `/admin/dataset-data` to display all uploaded datasets with filtering, sorting, and search. Show columns: dataset name, upload date, boat type, row count, validation status, and action buttons (view, delete, download). Implement pagination for large datasets.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

```
Dataset Data Page Flow:
┌──────────────────────┐
│ Load Datasets        │
│ from Backend API     │
└─────────┬────────────┘
          │
┌─────────▼────────────────────┐
│ Filter & Sort Options        │
│ (Boat Type, Date, Status)    │
└─────────┬────────────────────┘
          │
┌─────────▼──────────────┐
│ Display Table Grid    │
│ with Pagination      │
└─────────┬──────────────┘
          │
      ┌───┴────────────────────┬──────────────┬──────────┐
      │                        │              │          │
┌─────▼──┐          ┌──────────▼──┐ ┌────────▼──┐ ┌─────▼────┐
│ View   │          │ Delete Data │ │ Download  │ │ Re-train │
│ Details│          │ (Confirm)   │ │ CSV       │ │ Model    │
└────────┘          └─────────────┘ └───────────┘ └──────────┘
```

---

### Task 20: Implement Delete Functionality for Dataset Records

**Description:** Add delete button to dataset data table that triggers confirmation dialog. Backend removes dataset record and associated training data. Clear related cache entries. Log deletion event. Refresh table after successful deletion with success notification.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 21: Create Dataset Upload Management Page

**Description:** Build `/admin/dataset-uploads` page to manage dataset uploads: show pending uploads, upload progress, validation results, and upload history. Include drag-and-drop upload interface, file preview before submission, and bulk upload capability.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 22: Build Enhanced Trip Analytics Dashboard

**Description:** Redesign `/admin/fish-trip/analytics` page with three separate charts: (1) App-recorded trips over time, (2) Training rows added per boat type, (3) Geographic coverage by region. Include drill-down filters by boat type and date range. Show summary KPIs.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

```
Analytics Dashboard Layout:
┌─────────────────────────────────────────────────┐
│       Fish Trip Cost Analytics Dashboard        │
├─────────────────────────────────────────────────┤
│  [Filter by Boat Type] [Date Range] [Refresh]  │
├─────────────────────────────────────────────────┤
│ KPI Cards:                                      │
│ Total Trips | Total Rows | Models Trained | Avg MAE
├─────────────────────────────────────────────────┤
│ ┌──────────────────┐  ┌──────────────────┐   │
│ │ App Trips Chart  │  │ Training Rows    │   │
│ │ (Line Chart)     │  │ (Bar by Boat)    │   │
│ └──────────────────┘  └──────────────────┘   │
├─────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────┐       │
│ │ Geographic Coverage Map              │       │
│ │ (Heatmap by District/Region)         │       │
│ └──────────────────────────────────────┘       │
└─────────────────────────────────────────────────┘
```

---

### Task 23: Implement Model Artifact Display Component

**Description:** Create reusable component to display model artifact metadata: boat type, rows used, MAPE, MAE, RMSE, R², selected model name, and training timestamp. Add comparison view to show current vs previous model metrics. Support metric badges with color coding (good/acceptable/needs improvement).
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 24: Add Error Boundary & Graceful Degradation

**Description:** Implement error boundaries on analytics page to prevent crashes if metadata endpoints fail. Show warning messages instead of empty states. Display cached data if available. Add "Retry" button for failed requests. Log errors to monitoring service.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 25: Create API Integration Layer

**Description:** Build utility functions in `/lib/api.ts` for dataset operations, training management, and analytics queries. Implement request/response interceptors, error handling, token refresh logic, and request cancellation. Support optimistic updates for UI responsiveness.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 26: Add Authentication & Authorization Checks

**Description:** Implement role-based access control for dataset pages (admin-only). Add authorization check before data loads. Clear auth tokens on unauthorized responses (401/403). Redirect to login with return URL. Handle session expiration gracefully with user notification.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

## 📱 PHASE 4: FRONTEND IMPLEMENTATION - MOBILE (Tasks 27-32)

### Task 27: Build Mobile Dataset Upload Interface

**Description:** Create mobile-friendly upload screen with file picker, camera upload option, manual entry form. Show upload progress with visual feedback. Display validation errors inline. Support offline queueing with automatic retry when connection restored.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 28: Implement Mobile Boat Analytics View

**Description:** Build boat-specific analytics screen showing: training rows, uploaded rows, manual rows, rows used in models, selected model name, MAPE, and R². Include line charts for row growth over time. Add comparison with other boat types. Support date range filtering.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 29: Create Mobile Model Registry Promotion UI

**Description:** Design interface for Fisher Admins to review and promote models from training candidates to production. Show boat type scope clarity, metrics comparison, and risk assessment. Include confirmation workflow with justification field.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** Medium | High

---

### Task 30: Update Mobile API Service Paths

**Description:** Audit and fix all API paths in mobile services: `trainingCandidateService.ts`, `modelManagementService.ts`, `tripService.ts`. Update from legacy `/api/trips` to `/api/v1/trips` endpoints. Ensure consistency across all service files. Test API calls.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 31: Implement Mobile Service Methods for Analytics

**Description:** Add new methods to mobile services for fetching boat-wise dataset stats and model artifact summaries. Create `getBoatDatasetStats()`, `getModelArtifactSummary()`, `getTrainingMetrics()`. Include error handling and data caching.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 32: Build Mobile Error Handling & User Feedback

**Description:** Implement toast notifications for upload success/failure, API errors, and warnings. Show detailed error messages to users in understandable language. Add retry buttons for failed operations. Log non-blocking failures to analytics without disrupting UX.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

## ✅ PHASE 5: TESTING, VALIDATION & DEPLOYMENT (Tasks 33-40)

### Task 33: Create Integration Tests for Training Pipeline

**Description:** Write end-to-end tests simulating complete training flow: dataset upload → validation → training job creation → model artifact generation → metric extraction. Verify metrics accuracy. Test with various dataset sizes and boat types.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 34: Validate All Notebook JSON & Python Syntax

**Description:** Run comprehensive validation on all Colab notebooks: parse as valid JSON, verify all code cells are valid Python syntax. Check for missing imports, undefined variables, and unreachable code. Generate validation report with any issues found.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 35: Perform End-to-End System Testing

**Description:** Execute comprehensive system tests: upload datasets via web and mobile, verify backend processing, check metric accuracy, promote model to production, verify consumption in trip cost predictions. Test across multiple boat types and scenarios.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

```
E2E Test Flow:
┌─────────────────────────┐
│ 1. Upload Dataset       │
│    (Web/Mobile)         │
└────────────┬────────────┘
             │
┌────────────▼──────────────┐
│ 2. Validate CSV Format   │
│    & Row Count           │
└────────────┬──────────────┘
             │
┌────────────▼──────────────┐
│ 3. Create Training Job   │
│    in Backend            │
└────────────┬──────────────┘
             │
┌────────────▼──────────────┐
│ 4. Trigger Colab         │
│    Notebook Training     │
└────────────┬──────────────┘
             │
┌────────────▼──────────────┐
│ 5. Verify Model Artifact │
│    Generated & Metrics OK│
└────────────┬──────────────┘
             │
┌────────────▼──────────────┐
│ 6. Promote Model &       │
│    Update in Use         │
└────────────┬──────────────┘
             │
┌────────────▼──────────────┐
│ 7. Test Prediction API   │
│    with New Model        │
└──────────────────────────┘
```

---

### Task 36: Run Focused Lint & Type Checks

**Description:** Execute TypeScript type checking on all modified web and mobile files. Run ESLint on TypeScript files. Check for any unused imports or variables. Fix warnings and errors. Ensure clean build output.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** High | Medium | Low

---

### Task 37: Document API Endpoints & Data Schemas

**Description:** Create comprehensive API documentation including all new endpoints: dataset upload, deletion, validation, analytics queries, model artifact retrieval. Document request/response formats, error codes, authentication requirements, and example usage.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** Medium | High

---

### Task 38: Create Training Workflow Documentation

**Description:** Write detailed guide for training new boat-type models: prerequisites, dataset requirements, row count recommendations, Colab notebook steps, expected training time, metric interpretation, and troubleshooting. Include screenshots and video walkthrough.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** Medium | High

---

### Task 39: Set Up Monitoring & Logging for Training Jobs

**Description:** Implement centralized logging for all training jobs: start time, dataset validation results, training progress, model metrics, artifact location, and completion status. Create dashboard to monitor ongoing training jobs. Set up alerts for failed trainings.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** Medium | High

---

### Task 40: Perform Performance Testing & Optimization

**Description:** Benchmark dataset upload speeds, model training performance by boat type and row count, metric calculation efficiency, and analytics query response times. Identify and optimize bottlenecks. Document performance baselines and improvement targets.
**Status:** [ ] Not Started | [ ] In Progress | [ ] Completed
**Priority:** Medium | High

---

## 📋 TASK SUMMARY BY PRIORITY

### 🔴 High Priority (Complete First)

Tasks: 1, 2, 3, 4, 5, 6, 7, 8, 10, 11, 13, 15, 16, 18, 19, 20, 22, 23, 25, 26, 27, 28, 30, 31, 33, 34, 35, 36

### 🟡 Medium Priority (Complete After High Priority)

Tasks: 9, 12, 14, 17, 21, 24, 29, 37, 38, 39, 40

### 🟢 Low Priority (Nice to Have)

Tasks: 32

---

## 📞 COMMUNICATION & SHARING OPTIONS

### Share Diary with Team

- **Email**: Export as PDF with task completion screenshots
- **Slack**: Post weekly summary using task status emojis
- **GitHub Issues**: Create issues for each task with subtasks
- **Notion/OneNote**: Sync task list with cloud note-taking app
- **Google Drive**: Share collaborative spreadsheet for team tracking

### Update Methods

- **Manual Entry**: Update status in this markdown file daily
- **Git Commits**: Reference tasks in commit messages (e.g., "#Task-5: Implement endpoint...")
- **Pull Requests**: Link PRs to specific tasks in description
- **Weekly Review**: Scheduled reflection on completed tasks and blockers

### Recommended Weekly Review

```
Monday: Review completed tasks from previous week
Wednesday: Mid-week check-in on priority tasks
Friday: Summary of accomplishments and next week plan
```

---

**Last Updated:** May 4, 2026
**Total Tasks:** 40
**Estimated Duration:** 6-8 weeks (depending on team size and complexity)
