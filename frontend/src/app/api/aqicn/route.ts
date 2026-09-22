import { NextResponse } from 'next/server';
import { FALLBACK_STATIONS } from '@/lib/fallbackData';

interface AqicnStationRaw {
  uid: string;
  name: string;
  aqi: number;
  lat: number;
  lon: number;
  time: string;
  utime?: string;
  url?: string;
  station_id?: string;
}

interface CacheState {
  timestamp: number;
  stations: Record<string, AqicnStationRaw>;
  details: Record<string, any>;
  lastSyncedIso: string;
}

let memoryCache: CacheState | null = null;
const CACHE_TTL_MS = 3 * 60 * 1000; // 3 minutes cache

// Invert US EPA AQI to PM2.5 (ug/m3)
export function epaAqiToPm25(aqi: number): number {
  if (aqi <= 50) {
    return Math.round(((aqi / 50) * 12.0) * 10) / 10;
  } else if (aqi <= 100) {
    return Math.round((((aqi - 51) / 49) * (35.4 - 12.1) + 12.1) * 10) / 10;
  } else if (aqi <= 150) {
    return Math.round((((aqi - 101) / 49) * (55.4 - 35.5) + 35.5) * 10) / 10;
  } else if (aqi <= 200) {
    return Math.round((((aqi - 151) / 49) * (150.4 - 55.5) + 55.5) * 10) / 10;
  } else if (aqi <= 300) {
    return Math.round((((aqi - 201) / 99) * (250.4 - 150.5) + 150.5) * 10) / 10;
  } else {
    return Math.round((((aqi - 301) / 199) * (500.4 - 250.5) + 250.5) * 10) / 10;
  }
}

// Convert PM2.5 to Indian CPCB NAQI
export function pm25ToNaqi(pm25: number): number {
  if (pm25 <= 30) return Math.round((pm25 / 30) * 50);
  if (pm25 <= 60) return Math.round(50 + ((pm25 - 30) / 30) * 50);
  if (pm25 <= 90) return Math.round(100 + ((pm25 - 60) / 30) * 100);
  if (pm25 <= 120) return Math.round(200 + ((pm25 - 90) / 30) * 100);
  if (pm25 <= 250) return Math.round(300 + ((pm25 - 120) / 130) * 100);
  return Math.round(Math.min(500, 400 + ((pm25 - 250) / 130) * 100));
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const DIRECT_AQICN_URLS: Record<string, string> = {
  anand_vihar: 'https://aqicn.org/city/delhi/anand-vihar/',
  punjabi_bagh: 'https://aqicn.org/city/delhi/punjabi-bagh/',
  mandir_marg: 'https://aqicn.org/city/delhi/mandir-marg/',
  rk_puram: 'https://aqicn.org/city/delhi/r.k.-puram/',
  wazirpur: 'https://aqicn.org/city/delhi/delhi-institute-of-tool-engineering--wazirpur/',
  jahangirpuri: 'https://aqicn.org/city/delhi/iti-jahangirpuri/',
  pusa_dpcc: 'https://aqicn.org/city/delhi/pusa/',
  pusa_imd: 'https://aqicn.org/city/delhi/pusa/',
  shadipur: 'https://aqicn.org/city/delhi/pusa/',
  rohini: 'https://aqicn.org/city/delhi/punjabi-bagh/',
  ashok_vihar: 'https://aqicn.org/city/delhi/punjabi-bagh/',
  mundka: 'https://aqicn.org/city/delhi/punjabi-bagh/',
  bawana: 'https://aqicn.org/city/delhi/iti-jahangirpuri/',
  alipur: 'https://aqicn.org/city/delhi/iti-jahangirpuri/',
  narela: 'https://aqicn.org/city/delhi/iti-jahangirpuri/',
  patparganj: 'https://aqicn.org/city/delhi/anand-vihar/',
  major_dhyan_chand: 'https://aqicn.org/city/delhi/mandir-marg/',
  sonia_vihar: 'https://aqicn.org/city/delhi/anand-vihar/',
  jln_stadium: 'https://aqicn.org/city/delhi/r.k.-puram/',
  nehru_nagar: 'https://aqicn.org/city/delhi/r.k.-puram/',
  okhla_phase2: 'https://aqicn.org/city/delhi/r.k.-puram/',
  dwarka_sec8: 'https://aqicn.org/city/delhi/pusa/',
};

async function scrapeAqicnCluster(): Promise<{ stations: Record<string, AqicnStationRaw>; details: Record<string, any> }> {
  const sources = [
    { url: 'https://aqicn.org/city/delhi/anand-vihar/', defaultSlug: 'anand-vihar' },
    { url: 'https://aqicn.org/city/delhi/punjabi-bagh/', defaultSlug: 'punjabi-bagh' },
    { url: 'https://aqicn.org/city/delhi/mandir-marg/', defaultSlug: 'mandir-marg' },
    { url: 'https://aqicn.org/city/delhi/r.k.-puram/', defaultSlug: 'r.k.-puram' },
    { url: 'https://aqicn.org/city/delhi/delhi-institute-of-tool-engineering--wazirpur/', defaultSlug: 'delhi-institute-of-tool-engineering--wazirpur' },
    { url: 'https://aqicn.org/city/delhi/iti-jahangirpuri/', defaultSlug: 'iti-jahangirpuri' },
    { url: 'https://aqicn.org/city/delhi/pusa/', defaultSlug: 'pusa' }
  ];

  const rawStations: Record<string, AqicnStationRaw> = {};
  const details: Record<string, any> = {};

  await Promise.allSettled(
    sources.map(async ({ url, defaultSlug }) => {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          },
          next: { revalidate: 180 }
        });
        if (!res.ok) return;
        const html = await res.text();

        // Extract detailed model
        const graphMatch = html.match(/setWidgetAqiGraphModel\((\{[\s\S]*?\})\);/);
        if (graphMatch && graphMatch[1]) {
          try {
            const parsed = JSON.parse(graphMatch[1]);
            const cityKey = parsed?.city?.url || defaultSlug;
            details[cityKey] = parsed;
          } catch (e) {
            // ignore
          }
        }

        // Extract stations array
        const stMatch = html.match(/stations=(\[\{[\s\S]*?\}\]);/);
        if (stMatch && stMatch[1]) {
          try {
            const items = JSON.parse(stMatch[1]);
            for (const it of items) {
              const uid = String(it.x);
              const aqiVal = parseInt(it.aqi, 10);
              if (!isNaN(aqiVal) && it.g && Array.isArray(it.g) && it.g.length >= 2) {
                rawStations[uid] = {
                  uid,
                  name: it.name || 'Delhi Monitor',
                  aqi: aqiVal,
                  lat: parseFloat(it.g[0]),
                  lon: parseFloat(it.g[1]),
                  time: it.t || new Date().toISOString(),
                  utime: it.utime || '',
                  url: `https://aqicn.org/city/delhi/${defaultSlug}/`
                };
              }
            }
          } catch (e) {
            // ignore
          }
        }
      } catch (err) {
        // network error
      }
    })
  );

  const rawList = Object.values(rawStations);
  const stations: Record<string, AqicnStationRaw> = { ...rawStations };

  // Map all FALLBACK_STATIONS directly to the best scraped station
  if (rawList.length > 0) {
    for (const s of FALLBACK_STATIONS) {
      let best: AqicnStationRaw | null = null;
      let minDist = Infinity;
      const sNameNorm = s.name.toLowerCase().replace(/[^a-z0-9]/g, '');

      // 1. Direct name match
      for (const sc of rawList) {
        const scNameNorm = sc.name.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (scNameNorm.includes(sNameNorm) || sNameNorm.includes(scNameNorm)) {
          best = sc;
          break;
        }
      }

      // 2. Spatial nearest monitor
      if (!best) {
        for (const sc of rawList) {
          const d = haversineKm(s.latitude, s.longitude, sc.lat, sc.lon);
          if (d < minDist) {
            minDist = d;
            best = sc;
          }
        }
      }

      if (best) {
        stations[s.id] = {
          ...best,
          station_id: s.id,
          url: DIRECT_AQICN_URLS[s.id] || best.url || 'https://aqicn.org/city/delhi/'
        };
      }
    }
  }

  return { stations, details };
}

export async function GET() {
  const now = Date.now();

  if (!memoryCache || now - memoryCache.timestamp > CACHE_TTL_MS || Object.keys(memoryCache.stations).length === 0) {
    try {
      const scraped = await scrapeAqicnCluster();
      if (Object.keys(scraped.stations).length > 0) {
        memoryCache = {
          timestamp: now,
          stations: scraped.stations,
          details: scraped.details,
          lastSyncedIso: new Date().toISOString()
        };
      }
    } catch (e) {
      // Keep old cache if available
    }
  }

  const stationsList = memoryCache ? Object.values(memoryCache.stations) : [];

  return NextResponse.json({
    status: 'ok',
    synced_at: memoryCache?.lastSyncedIso || new Date().toISOString(),
    sync_source: 'https://aqicn.org/',
    total_reporting_monitors: stationsList.length,
    stations: memoryCache?.stations || {},
    details: memoryCache?.details || {}
  });
}
