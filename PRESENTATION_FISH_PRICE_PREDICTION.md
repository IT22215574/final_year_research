# Fish Market Price Prediction — Final Year Research Presentation
### Smart Fisher Lanka · Module: Fish Price Forecasting
**Presenter:** IT22215574 | Branch: `anushanka-mergedev`

---

## CONTEXT BLOCK

| Field | Detail |
|---|---|
| **Domain / Organization / Setting** | Fisheries & Aquaculture — Sri Lanka coastal fishing communities; data sourced from NARA-aligned weekly fish market price records (2020–2025) |
| **Primary Users** | Sri Lankan small-scale fishermen who sell catch at local fish markets |
| **Secondary Users** | Fish market traders, boat owners, fishery cooperative managers |
| **Decision Makers** | Fishery cooperative leaders, NARA policymakers, fishing business investors |
| **Observed Issue** | Fishermen have no reliable way to forecast market prices before a trip — resulting in poor timing decisions, selling at price troughs, and average revenue loss estimated at **15–25% per catch** |
| **Why It Matters** | A single price misjudgement on a 48–72 hr deep-sea trip costs Rs. 5,000–25,000 in foregone revenue; multiply by ~200,000 active fishermen in Sri Lanka → systemic economic impact |
| **Gap** | Existing solutions (WhatsApp groups, phone calls to middlemen) offer no forward-looking intelligence, no seasonality awareness, and no explainability — fishermen cannot understand *why* a price is expected to rise or fall |
| **Main Objective** | Deliver a production-ready mobile prediction service that forecasts the selling price of any of 32 Sri Lankan fish species for a user-selected date with ≥90% accuracy (1 − normalized MAE), a 31-day trend series, and human-readable XAI explanations — deployed end-to-end by March 2026 |
| **Solution Summary** | A Random Forest + XGBoost ensemble model (trained on 5 years of weekly market data enriched with weather, fuel prices, religious calendars, and fishing season flags) served via FastAPI and consumed directly from a React Native mobile app |
| **Key Features** | FR1 — Predict price (Rs.) for any fish species on any date with confidence interval; FR2 — 31-day price trend chart; FR3 — Up to 5 XAI reason cards explaining the prediction; FR4 — Fish recommendation engine (by budget & preference); FR5 — User feedback loop to track real-world accuracy |
| **Non-Functional Focus** | Response time < 500 ms per prediction; offline-tolerant mobile UX; model retrains on updated CSVs without code changes |
| **Completion Status** | ~92% complete — model trained, API live, mobile screens integrated; pending: UI polish & live weather data connector |

---

## SLIDE 1 — Problem & Motivation *(speak for 30–45 sec)*

> **Cue card:**

**Context:** Sri Lanka has over 200,000 active fishermen. Every trip decision — which fish to target, when to sell, which port to land at — directly affects household income.

**Observed Pain:**
- Fishermen decide on 2–3 day trips **without knowing current or upcoming market prices**
- Market prices swing **20–40% week-on-week** due to Poya holidays, fishing bans (awaragam/waragam seasons), monsoon weather, and fuel cost spikes
- No structured price intelligence tool exists for local fishermen in Sinhala

**Impact (measurable):**
- Estimated **Rs. 5,000–25,000 revenue loss per trip** from poor timing
- Fish spoilage risk rises when fishermen wait at port hoping for a better price

**Stakeholders who lose:** Fisherman (income), trader (supply chain reliability), government (food security)

---

## SLIDE 2 — Proposed Solution Overview *(speak for 45–60 sec)*

> **Cue card:**

**One-sentence pitch:**
> *"An AI-powered fish price forecasting service embedded in a mobile app that tells Sri Lankan fishermen what price their catch will fetch — before they leave the harbour."*

**Solution summary:**
- **Input:** Fish species (any of 32 species in Sinhala) + target date
- **Output:** Predicted price in Rs., 90% confidence interval, 31-day trend chart, up to 5 plain-language XAI reasons

**Key Functional Requirements delivered:**

| # | Feature | Status |
|---|---|---|
| FR1 | Price prediction with confidence interval ±8% | ✅ Done |
| FR2 | 31-day trend series chart | ✅ Done |
| FR3 | XAI reason cards (weather / season / fuel / holiday effects) | ✅ Done |
| FR4 | Fish recommendation by budget & preference | ✅ Done |
| FR5 | User feedback loop & accuracy tracker | ✅ Done |

**Non-functional focus:** < 500 ms end-to-end prediction, Sinhala-language fish names, graceful fallback if API is unreachable

---

## SLIDE 3 — System Architecture & Integration *(speak for 60–90 sec)*

> **Cue card (walk through the diagram below):**

```
┌──────────────────────────────────────────────────────────┐
│               REACT NATIVE MOBILE APP                    │
│          (Expo · TypeScript · NativeWind)                │
│   Screen: Fish Price → services/fishPriceService.ts      │
│           Owner: IT22215574                              │
└──────────────────┬───────────────────────────────────────┘
                   │  POST /predict  { fish_id, date }
                   │  POST /recommend { budget, preference }
                   ▼
┌──────────────────────────────────────────────────────────┐
│          FISH PRICE API  —  Port 8000                    │
│          model/api_server.py  (FastAPI v1.0.0)           │
│   Endpoints: /fish · /predict · /recommend · /feedback   │
│          Owner: IT22215574                               │
└──────────────────┬───────────────────────────────────────┘
                   │  loads .pkl at startup
                   ▼
┌──────────────────────────────────────────────────────────┐
│          ENSEMBLE ML MODEL  (trained offline)            │
│  Random Forest (200 trees, depth 20)                     │
│  + XGBoost / GradientBoosting (200 trees, depth 7)       │
│  Final price = (RF + XGB) / 2                            │
│  Metrics: R², MAE, RMSE, MAPE — 5-fold CV               │
│  Features: 33 (season flags, weather, fuel lag, holiday) │
│          Owner: IT22215574                               │
└──────────────────┬───────────────────────────────────────┘
                   │  trained on
                   ▼
┌──────────────────────────────────────────────────────────┐
│          OFFLINE ML PIPELINE                             │
│  run_excel_pipeline.py                                   │
│  Steps: Excel→CSV → Feature Engineering → Train →       │
│         Build Future Features → Pre-compute Forecasts    │
│  Dataset: 5 years (2020–2025) weekly NARA market prices  │
│           + weather · fuel · festivals · fishing seasons │
│          Owner: IT22215574                               │
└──────────────────────────────────────────────────────────┘

INTEGRATION WITH OTHER MODULES:
  ┌──────────────────────────────────────────────────────┐
  │  Fish Zone Module (Other Member)                     │
  │  → Provides expectedCatchKg per species              │
  │  → Fish price API provides marketPricePerKg          │
  │  → Cross-module: profitability = catchKg × price     │
  └──────────────────────────────────────────────────────┘
  ┌──────────────────────────────────────────────────────┐
  │  DATCIE Trip Cost Engine (IT22215574 — co-owned)     │
  │  → consumes marketPricePerKg for revenue projection  │
  │  → full profitability = revenue − trip cost          │
  └──────────────────────────────────────────────────────┘
  ┌──────────────────────────────────────────────────────┐
  │  Fish Quality / Grading Module (Other Member)        │
  │  → quality grade adjusts effective price             │
  └──────────────────────────────────────────────────────┘
```

**Integration points (APIs / data formats):**
- `POST /predict` → JSON `{ fish_id: int, date: "YYYY-MM-DD" }` → returns `{ predicted, min_price, max_price, series[], reasons[] }`
- `POST /recommend` → JSON `{ budget: number, date, preference: "popular"|"profitable" }` → ranked fish list
- All inter-module contracts: JSON over HTTP (REST)

**Deployment / runtime setup:**
- Single developer machine (localhost) for demo; production path → Docker container on cloud VM (DigitalOcean / AWS EC2 t3.small)
- Python venv, FastAPI + Uvicorn; `.pkl` models loaded at startup (< 2 s cold start)

---

## SLIDE 4 — Commercialization *(speak for 60–90 sec)*

> **Cue card:**

**Target Users / Market:**
- **Primary:** ~200,000 registered fishermen in Sri Lanka (NARA database)
- **Secondary:** ~5,000 fish market traders; ~300 fishing cooperatives
- **Tertiary:** Fishery export companies needing price trend analytics

**Value Proposition — why better than alternatives:**

| Alternative | Gap | Our Solution |
|---|---|---|
| WhatsApp price groups | Backward-looking, no forecast | 31-day forward-looking trend |
| Phone calls to middlemen | Biased, no seasonality | Unbiased ML with season & weather flags |
| Generic commodity apps | No Sri Lanka fish data, no Sinhala | Trained on 5-yr Sri Lanka NARA data, Sinhala names |
| Manual notebook records | No pattern recognition | XAI explanations fishermen can trust |

**Cost & Feasibility:**

| Item | Estimate |
|---|---|
| Model training (one-time, local GPU) | Rs. 0 (researcher's machine) |
| Cloud hosting (API + DB) | ~$15/month (DigitalOcean Droplet) |
| Mobile app distribution (Expo OTA) | Free during pilot |
| Data pipeline refresh (monthly NARA CSV) | 2 hr technician time/month |
| **Break-even at** | ~120 paid subscriptions @ Rs. 300/month |

**Adoption Plan / Next Steps:**

1. **Pilot (Month 1–2):** 50 fishermen in Negombo district — free access, collect feedback through `/feedback` endpoint
2. **Validation (Month 3):** Compare predicted vs actual prices; target MAPE < 10% in live conditions
3. **Rollout (Month 4–6):** Onboard NARA partnership for official data feed; launch on Google Play (Expo EAS build)
4. **Monetisation (Month 6+):** Freemium — basic price free, premium (31-day trend + XAI + recommendation) Rs. 299/month
5. **Scale:** White-label API to fishing cooperatives at Rs. 5,000/month for bulk access

---

## SLIDE 5 — Demo Plan + Roles *(speak for 30–45 sec)*

> **Cue card:**

**Demo Flow (end-to-end, ~3 minutes):**

```
Step 1 → Open mobile app · Log in as fisherman
         [IT22215574 drives]

Step 2 → Tap "Fish Price" · Select species "හුරුල්ලා" (Herrings)
         · Choose date 3 days from today
         [IT22215574 drives]

Step 3 → Show predicted price (Rs. X), confidence band (±8%),
         31-day trend chart
         [IT22215574 drives — highlight seasonal dip / Poya spike]

Step 4 → Tap XAI reason cards — explain:
         "⬆ Price likely up — Poya day increases demand"
         "⬇ Supply high — waragam west season active"
         [IT22215574 explains]

Step 5 → Switch to "Recommend" tab · Enter budget Rs. 500
         → Show top 3 fish by profitability ranking
         [IT22215574 drives]

Step 6 → Submit feedback "Correct" → accuracy ticks up
         → Show /accuracy endpoint response in Postman as proof
         [IT22215574 drives]
```

**Where each member takes over:**

| Member | Module presented |
|---|---|
| IT22215574 | Fish Price Prediction API + Mobile UI (Slides 1–5 + Demo) |
| [Other Member A] | Fish Zone / Catch Location Module |
| [Other Member B] | Fish Quality / Grading Module |
| [Other Member C] | DATCIE Trip Cost Engine + Trip Analytics |

**Backup Plan:**
- Recorded screen-capture video of full demo flow stored in `assets/demo_recording.mp4`
- Pre-run `/predict` JSON response screenshots in `assets/screenshots/`
- Test data CSV with 10 sample fish + dates ready in `model/dataset/test_inputs.csv`
- Postman collection exported to `model/test_api.py` for live terminal demo if mobile app fails

**What to watch for (key features + metrics):**
- Response time < 500 ms per API call (show browser DevTools Network tab)
- R² score ≥ 0.88 on validation set (show training output in terminal)
- XAI reason cards correctly flip between "up" / "down" icons based on season
- 31-day chart clearly shows festival spikes (Sinhala & Tamil New Year, Vesak, Christmas)
- Recommendation reorders correctly when budget is changed

---

## QUICK REFERENCE CARD *(keep on desk during presentation)*

| Section | Key numbers to mention |
|---|---|
| Problem | 200,000 fishermen · Rs. 5K–25K loss per trip · 20–40% weekly price swing |
| Model | Random Forest + XGBoost ensemble · 33 features · 5-yr training data · ±8% CI |
| Architecture | 4 layers: Mobile → FastAPI → Ensemble Model → Offline Pipeline |
| Commercialization | Rs. 299/month · $15/month hosting · break-even at 120 users |
| Demo | 6-step flow · 3 minutes · IT22215574 drives all steps |
| Metrics | R², MAE, RMSE, MAPE · 5-fold CV · < 500 ms response |
