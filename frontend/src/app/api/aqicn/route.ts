import { NextResponse } from 'next/server';

interface AqicnStationRaw {
  uid: string;
  name: string;
  aqi: number;
  lat: number;
  lon: number;
  time: string;
  utime?: string;
  url?: string;
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

async function scrapeAqicnCluster(): Promise<{ stations: Record<string, AqicnStationRaw>; details: Record<string, any> }> {
  const sources = [
    { url: 'https://aqicn.org/city/delhi/anand-vihar/', defaultSlug: 'anand-vihar' },
    { url: 'https://aqicn.org/city/delhi/punjabi-bagh/', defaultSlug: 'punjabi-bagh' }
  ];

  const stations: Record<string, AqicnStationRaw> = {};
  const details: Record<string, any> = {};

  await Promise.allSettled(
    sources.map(async ({ url, defaultSlug }) => {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
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
                stations[uid] = {
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
