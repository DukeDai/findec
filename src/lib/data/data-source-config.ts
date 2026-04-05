/**
 * Data source configuration from environment variables.
 * Controls which data sources are enabled and their priority order.
 */

export type SupportedSource = 'yahoo' | 'finnhub' | 'polygon' | 'mock';

export interface DataSourceConfig {
  sources: SupportedSource[];
  circuitBreakerThreshold: number;
  mockMode: boolean;
  fallbackToMock: boolean;
  // Finnhub config
  finnhubApiKey?: string;
  // Polygon config
  polygonApiKey?: string;
}

function readEnvList(key: string, defaultValue: string[]): string[] {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  return raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

function readEnvInt(key: string, defaultValue: number): number {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  const parsed = parseInt(raw, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

function readEnvBool(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  return raw === '1' || raw === 'true';
}

export function loadDataSourceConfig(): DataSourceConfig {
  const configuredSources = readEnvList('DATA_SOURCES', ['yahoo']);

  const sources: SupportedSource[] = [];
  for (const s of configuredSources) {
    if (s === 'yahoo' || s === 'finnhub' || s === 'polygon' || s === 'mock') {
      if (!sources.includes(s)) {
        sources.push(s);
      }
    }
  }

  // Always ensure mock is last fallback if included
  const nonMockSources = sources.filter((s) => s !== 'mock');
  const hasMock = sources.includes('mock');
  const orderedSources = hasMock ? nonMockSources : sources;

  return {
    sources: orderedSources,
    circuitBreakerThreshold: readEnvInt('DATA_SOURCE_CIRCUIT_BREAKER_THRESHOLD', 3),
    mockMode: readEnvBool('DATA_SOURCE_MOCK_MODE', false),
    fallbackToMock: readEnvBool('DATA_SOURCE_FALLBACK_TO_MOCK', true),
    finnhubApiKey: process.env.FINNHUB_API_KEY,
    polygonApiKey: process.env.POLYGON_API_KEY,
  };
}

export const defaultDataSourceConfig = loadDataSourceConfig();
