# AeroSense — Physics-Guided AI for Coupled Air-Pollution & Weather Forecasting
**Delhi NCR Focus • Smart India Hackathon 2026 (Problem Statement SIH26082)**

AeroSense is a research-oriented operational forecasting system combining continuous ambient air quality observations (CPCB CAAQMS), coupled boundary-layer meteorology (Open-Meteo/IMD), NASA FIRMS active fire telemetry, and physics-guided machine learning (XGBoost) to deliver explainable 72-hour pollution forecasts.

---

## Key Capabilities (Phase 1 & Phase 2)

### 1. Coupled Air Quality & Meteorological Ingestion
- **40 Real CAAQMS Stations:** Comprehensive network spanning Delhi NCT, Noida, Ghaziabad, Gurugram, and Faridabad with official coordinates, operating agency, and land-use categorization.
- **8 Criteria Pollutants:** Continuous tracking of $\text{PM}_{2.5}$, $\text{PM}_{10}$, $\text{NO}_2$, $\text{SO}_2$, $\text{CO}$, $\text{O}_3$, $\text{NH}_3$, and $\text{Pb}$.
- **Coupled Dispersion Drivers:** 10m wind speed & direction vectors ($u, v$), ambient temperature, relative humidity, surface pressure, precipitation, and Planetary Boundary Layer Height ($\text{PBLH}$).
- **Indian NAQI Calculation:** Piecewise linear interpolation strictly compliant with CPCB guidelines, mandatory 3-pollutant rule, and prominent pollutant logic.

### 2. Atmospheric Regime Intelligence Engine
Classifies atmospheric state into 6 physics-guided regimes with confidence scoring and physical rationale:
- `NORMAL`: Standard diurnal urban mixing.
- `STAGNATION`: Calm surface winds and compressed mixing volume trapping ground emissions.
- `STRONG_INVERSION`: Nocturnal surface radiative cooling capping pollutants beneath a thermal ceiling.
- `HIGH_VENTILATION`: Vigorous convective and advective dilution.
- `RAIN_WASHOUT`: Wet scavenging and particulate washout from precipitation.
- `REGIONAL_TRANSPORT`: North-Westerly advective alignment carrying upstream agricultural smoke plumes into Delhi NCR.

### 3. Derived Meteorological Dispersion Indices
- **Ventilation Index ($VI = \text{WS} \times \text{PBLH}$):** Rates airshed dispersion volume into Critical ($< 2000\,\text{m}^2/\text{s}$), Moderate, and High bands.
- **Stagnation Index ($SI \in [0, 100]$):** Quantifies surface calm and vertical compression with precipitation dampening.
- **Inversion Risk Score ($IRS \in [0, 100]$):** Evaluates nocturnal cooling, shallow mixing depths, absence of wind shear, and relative humidity.
- **Wind Transport Indicator ($WTI \in [0, 100]$):** Evaluates advection alignment from the North-West agricultural burning corridor ($285^\circ - 330^\circ$) weighted by active fire intensity.

### 4. NASA FIRMS Regional Active Fire Integration
- Ingests active fire telemetry (Fire Radiative Power $\text{FRP}$, coordinates, confidence, brightness) from MODIS/VIIRS satellites across Punjab, Haryana, and Delhi NCR.
- Supports both `LIVE` (NASA FIRMS API) and `DEMO` (physics-consistent seasonal agricultural cluster simulation) modes with zero secret leakage to the frontend.

### 5. Wind Transport Corridor Modeling
- Projects prevailing wind advection vectors and estimated transit time from active agricultural fire clusters into the Delhi NCR airshed.
- Explicitly labeled: *"Estimated atmospheric transport trajectory and relative influence based on prevailing wind advection; not an exact chemical source apportionment."*

### 6. Explainable Forecast Attribution ("Why is pollution expected to change?")
- Breaks down physical and meteorological drivers behind each station's 72-hour forecast:
  - Primary driver callout (e.g. nocturnal boundary layer compression to $210\,\text{m}$).
  - Secondary driver callout (e.g. calm surface wind $< 1.2\,\text{m/s}$).
  - Atmospheric factor percentage contribution breakdown.

---

## Architecture

```
[CPCB API / Demo AQ]  [Open-Meteo / IMD Wx]  [NASA FIRMS / Demo Fires]
          │                     │                     │
          ▼                     ▼                     ▼
   ┌─────────────────────────────────────────────────────────┐
   │                  FastAPI Backend Layer                  │
   │  - Ingestion & Normalization Service                    │
   │  - Atmospheric Regime & Derived Indices Engine          │
   │  - Indian NAQI Piecewise Linear Calculator              │
   │  - XGBoost 72-Hour Recursive Time-Series Forecaster     │
   │  - SQLite with WAL Concurrency                          │
   └────────────────────────────┬────────────────────────────┘
                                │ Typed JSON REST APIs
                                ▼
   ┌─────────────────────────────────────────────────────────┐
   │             Next.js 16 Operations Console               │
   │  - Interactive MapLibre GL Map (40 Stations, Fires, Wx) │
   │  - Layer Toggles: Fires, Wind Vectors, Corridors, Risk  │
   │  - Recharts 72-Hour PM2.5 Forecast with NAAQS Limits    │
   │  - "Why is pollution changing?" Feature Explainer       │
   │  - Atmospheric Regime & Derived Indices Grid            │
   └─────────────────────────────────────────────────────────┘
```

---

## Getting Started

### 1-Click Unified Start & Stop

#### On Windows:
- **To Start Full System:** Double-click `start_all.bat` (or run in terminal)
- **To Stop Full System:** Double-click `stop_all.bat`

#### On Linux / macOS:
- **To Start Full System:** `./start_all.sh`
- **To Stop Full System:** `./stop_all.sh`

---

### Manual Start

#### 1. Backend (FastAPI)
```bash
cd backend
venv\Scripts\activate          # On Linux/macOS: source venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000   # Or from project root: python -m uvicorn backend.app.main:app --reload --port 8000
```
- Interactive Swagger API Docs: `http://127.0.0.1:8000/docs`
- Health Endpoint:             `http://127.0.0.1:8000/api/v1/health`

#### 2. Frontend (Next.js 16)
```bash
cd frontend
npm install
npm run dev
```
- Operations Console: `http://localhost:3000`

---

## Configuration (`.env`)

Copy `.env.example` to `.env` in the root directory:

| Variable | Default | Description |
| :--- | :--- | :--- |
| `APP_MODE` | `DEMO` | `DEMO` uses deterministic physics-guided simulation; `LIVE` connects to live APIs without fabricating data. |
| `DATABASE_URL` | `sqlite:///./data/aerosense.db` | Local SQLite database file with WAL mode. |
| `CPCB_API_KEY` | `""` | Free API key from [data.gov.in](https://data.gov.in) (Required only for LIVE CPCB ingestion). |
| `FIRMS_MAP_KEY`| `""` | Free MAP_KEY from [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov) (Required only for LIVE satellite fires). |
| `BACKEND_PORT` | `8000` | Port for FastAPI backend service. |
| `FRONTEND_URL` | `http://localhost:3000` | Allowed CORS origin. |
| `LOG_LEVEL`    | `INFO` | Logging level. |

---

## Running Automated Tests

AeroSense includes a comprehensive test suite covering NAQI calculations, feature engineering (lags, rolling statistics, wind decomposition), normalization, provider fallbacks, atmospheric regimes, and REST APIs:

```bash
backend\venv\Scripts\pytest tests\ -v
```
- **92 Automated Tests** passing across all modules.

---

## Scientific Documentation
- **Atmospheric Regimes & Derived Indices:** [`docs/atmospheric_indices.md`](docs/atmospheric_indices.md)
- **CPCB NAQI Breakpoints & Rules:** [`docs/aqi_methodology.md`](docs/aqi_methodology.md)
- **System Architecture:** [`docs/architecture.md`](docs/architecture.md)

---

## Roadmap
- **Phase 1 (Complete):** Next.js Console, FastAPI, 40 Delhi Stations, CPCB/IMD providers, XGBoost baseline, 72h forecast, CPCB NAQI calculator.
- **Phase 2 (Complete):** Atmospheric Regime Engine, Derived Indices ($VI, SI, IRS, WTI$), NASA FIRMS fire integration, Wind Transport Corridors, and Forecast Explainer.
- **Phase 3 (Next):** Physics-Guided GNN (Spatio-Temporal Graph Neural Network) modeling inter-station advection.
- **Phase 4:** High-resolution numerical WRF-Chem chemical transport model integration.

---

## License
MIT License. Developed for Smart India Hackathon 2026.
