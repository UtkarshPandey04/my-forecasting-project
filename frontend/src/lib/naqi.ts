/**
 * Indian Central Pollution Control Board (CPCB) National Air Quality Index (NAQI) Standard
 * Piecewise linear sub-index calculation and categorical breakpoints.
 * Matches backend/app/services/aqi.py exactly.
 */

export interface Breakpoint {
  bLo: number;
  bHi: number;
  iLo: number;
  iHi: number;
}

export const BREAKPOINTS: Record<string, Breakpoint[]> = {
  pm25: [
    { bLo: 0, bHi: 30, iLo: 0, iHi: 50 },
    { bLo: 30.1, bHi: 60, iLo: 51, iHi: 100 },
    { bLo: 60.1, bHi: 90, iLo: 101, iHi: 200 },
    { bLo: 90.1, bHi: 120, iLo: 201, iHi: 300 },
    { bLo: 120.1, bHi: 250, iLo: 301, iHi: 400 },
    { bLo: 250.1, bHi: 500, iLo: 401, iHi: 500 },
  ],
  pm10: [
    { bLo: 0, bHi: 50, iLo: 0, iHi: 50 },
    { bLo: 50.1, bHi: 100, iLo: 51, iHi: 100 },
    { bLo: 100.1, bHi: 250, iLo: 101, iHi: 200 },
    { bLo: 250.1, bHi: 350, iLo: 201, iHi: 300 },
    { bLo: 350.1, bHi: 430, iLo: 301, iHi: 400 },
    { bLo: 430.1, bHi: 600, iLo: 401, iHi: 500 },
  ],
  no2: [
    { bLo: 0, bHi: 40, iLo: 0, iHi: 50 },
    { bLo: 40.1, bHi: 80, iLo: 51, iHi: 100 },
    { bLo: 80.1, bHi: 180, iLo: 101, iHi: 200 },
    { bLo: 180.1, bHi: 280, iLo: 201, iHi: 300 },
    { bLo: 280.1, bHi: 400, iLo: 301, iHi: 400 },
    { bLo: 400.1, bHi: 800, iLo: 401, iHi: 500 },
  ],
  so2: [
    { bLo: 0, bHi: 40, iLo: 0, iHi: 50 },
    { bLo: 40.1, bHi: 80, iLo: 51, iHi: 100 },
    { bLo: 80.1, bHi: 380, iLo: 101, iHi: 200 },
    { bLo: 380.1, bHi: 800, iLo: 201, iHi: 300 },
    { bLo: 800.1, bHi: 1600, iLo: 301, iHi: 400 },
    { bLo: 1600.1, bHi: 2000, iLo: 401, iHi: 500 },
  ],
  co: [
    { bLo: 0, bHi: 1.0, iLo: 0, iHi: 50 },
    { bLo: 1.01, bHi: 2.0, iLo: 51, iHi: 100 },
    { bLo: 2.01, bHi: 10.0, iLo: 101, iHi: 200 },
    { bLo: 10.01, bHi: 17.0, iLo: 201, iHi: 300 },
    { bLo: 17.01, bHi: 34.0, iLo: 301, iHi: 400 },
    { bLo: 34.01, bHi: 50.0, iLo: 401, iHi: 500 },
  ],
  o3: [
    { bLo: 0, bHi: 50, iLo: 0, iHi: 50 },
    { bLo: 50.1, bHi: 100, iLo: 51, iHi: 100 },
    { bLo: 100.1, bHi: 168, iLo: 101, iHi: 200 },
    { bLo: 168.1, bHi: 208, iLo: 201, iHi: 300 },
    { bLo: 208.1, bHi: 748, iLo: 301, iHi: 400 },
    { bLo: 748.1, bHi: 1000, iLo: 401, iHi: 500 },
  ],
  nh3: [
    { bLo: 0, bHi: 200, iLo: 0, iHi: 50 },
    { bLo: 200.1, bHi: 400, iLo: 51, iHi: 100 },
    { bLo: 400.1, bHi: 800, iLo: 101, iHi: 200 },
    { bLo: 800.1, bHi: 1200, iLo: 201, iHi: 300 },
    { bLo: 1200.1, bHi: 1800, iLo: 301, iHi: 400 },
    { bLo: 1800.1, bHi: 2400, iLo: 401, iHi: 500 },
  ],
  pb: [
    { bLo: 0, bHi: 0.5, iLo: 0, iHi: 50 },
    { bLo: 0.51, bHi: 1.0, iLo: 51, iHi: 100 },
    { bLo: 1.01, bHi: 2.0, iLo: 101, iHi: 200 },
    { bLo: 2.01, bHi: 3.0, iLo: 201, iHi: 300 },
    { bLo: 3.01, bHi: 3.5, iLo: 301, iHi: 400 },
    { bLo: 3.51, bHi: 5.0, iLo: 401, iHi: 500 },
  ],
};

export function calculateSubIndex(pollutant: string, concentration: number | null | undefined): number | null {
  if (concentration === null || concentration === undefined || isNaN(concentration)) {
    return null;
  }
  const key = pollutant.toLowerCase().replace('.', '');
  const bpList = BREAKPOINTS[key];
  if (!bpList) return null;

  const c = Math.round(concentration * 100) / 100;
  for (const bp of bpList) {
    if (c >= bp.bLo && c <= bp.bHi) {
      return Math.round(((bp.iHi - bp.iLo) / (bp.bHi - bp.bLo)) * (c - bp.bLo) + bp.iLo);
    }
  }

  if (c > bpList[bpList.length - 1].bHi) {
    return 500;
  }
  return null;
}

export function getAqiCategory(aqiValue: number): { category: string; color: string } {
  if (aqiValue <= 50) {
    return { category: 'Good', color: '#10b981' };
  } else if (aqiValue <= 100) {
    return { category: 'Satisfactory', color: '#84cc16' };
  } else if (aqiValue <= 200) {
    return { category: 'Moderate', color: '#eab308' };
  } else if (aqiValue <= 300) {
    return { category: 'Poor', color: '#f97316' };
  } else if (aqiValue <= 400) {
    return { category: 'Very Poor', color: '#ef4444' };
  } else {
    return { category: 'Severe', color: '#7c3aed' };
  }
}

export function calculateAqiFromPm25(pm25: number | null | undefined): { aqi: number; category: string; color: string } {
  const subIdx = calculateSubIndex('pm25', pm25);
  const aqi = subIdx !== null ? subIdx : 100;
  const { category, color } = getAqiCategory(aqi);
  return { aqi, category, color };
}

export function calculateNaqi(measurements: Record<string, number | null | undefined>): {
  aqi: number | null;
  category: string | null;
  color: string | null;
  prominent_pollutant: string | null;
  sub_indices: Record<string, number>;
} {
  const subIndices: Record<string, number> = {};
  for (const [p, val] of Object.entries(measurements)) {
    if (val !== null && val !== undefined) {
      const idx = calculateSubIndex(p, val);
      if (idx !== null) {
        subIndices[p.toLowerCase()] = idx;
      }
    }
  }

  const validPollutants = Object.keys(subIndices);
  if (validPollutants.length === 0) {
    return {
      aqi: null,
      category: null,
      color: null,
      prominent_pollutant: null,
      sub_indices: subIndices,
    };
  }

  let maxPollutant = validPollutants[0];
  let maxAqi = subIndices[maxPollutant];
  for (const p of validPollutants) {
    if (subIndices[p] > maxAqi) {
      maxAqi = subIndices[p];
      maxPollutant = p;
    }
  }

  const { category, color } = getAqiCategory(maxAqi);
  return {
    aqi: maxAqi,
    category,
    color,
    prominent_pollutant: maxPollutant.toUpperCase(),
    sub_indices: subIndices,
  };
}

/**
 * US EPA (AirNow / aqicn.org / aqi.in default) AQI calculation standard
 */
export const EPA_PM25_BREAKPOINTS = [
  { cLo: 0.0, cHi: 12.0, iLo: 0, iHi: 50, cat: 'Good', color: '#00e400' },
  { cLo: 12.1, cHi: 35.4, iLo: 51, iHi: 100, cat: 'Moderate', color: '#ffff00' },
  { cLo: 35.5, cHi: 55.4, iLo: 101, iHi: 150, cat: 'Unhealthy for Sensitive Groups', color: '#ff7e00' },
  { cLo: 55.5, cHi: 150.4, iLo: 151, iHi: 200, cat: 'Unhealthy', color: '#cc0033' },
  { cLo: 150.5, cHi: 250.4, iLo: 201, iHi: 300, cat: 'Very Unhealthy', color: '#8f3f97' },
  { cLo: 250.5, cHi: 500.4, iLo: 301, iHi: 500, cat: 'Hazardous', color: '#7e0023' },
];

export function calculateEpaAqiFromPm25(pm25: number): {
  aqi: number;
  category: string;
  color: string;
} {
  const c = Math.round(pm25 * 10) / 10;
  for (const bp of EPA_PM25_BREAKPOINTS) {
    if (c >= bp.cLo && c <= bp.cHi) {
      const aqi = Math.round(((bp.iHi - bp.iLo) / (bp.cHi - bp.cLo)) * (c - bp.cLo) + bp.iLo);
      return { aqi, category: bp.cat, color: bp.color };
    }
  }
  if (c > 500.4) {
    return { aqi: 500, category: 'Hazardous', color: '#7e0023' };
  }
  return { aqi: 0, category: 'Good', color: '#00e400' };
}

