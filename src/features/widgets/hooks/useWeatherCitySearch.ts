import { useEffect, useMemo, useState } from 'react';
import type { WeatherCustomLocation } from '../types/widget';

interface OpenMeteoGeocodingItem {
  name?: string;
  latitude?: number;
  longitude?: number;
  country?: string;
  admin1?: string;
  timezone?: string;
}

interface OpenMeteoGeocodingResponse {
  results?: OpenMeteoGeocodingItem[];
}

const toLocation = (item: OpenMeteoGeocodingItem): WeatherCustomLocation | null => {
  if (!item.name || !Number.isFinite(item.latitude) || !Number.isFinite(item.longitude)) return null;
  return {
    name: item.name,
    country: item.country,
    admin1: item.admin1,
    latitude: Number(item.latitude),
    longitude: Number(item.longitude),
    timezone: item.timezone,
  };
};

export const getWeatherLocationLabel = (location: WeatherCustomLocation): string => (
  [location.name, location.admin1, location.country]
    .filter((part, index, items) => Boolean(part) && items.indexOf(part) === index)
    .join(' · ')
);

export const useWeatherCitySearch = (enabled: boolean, initialQuery = '') => {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<WeatherCustomLocation[]>([]);
  const [status, setStatus] = useState('输入城市名称开始搜索');

  useEffect(() => {
    if (initialQuery && !query) setQuery(initialQuery);
  }, [initialQuery, query]);

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!enabled) return;
    if (trimmedQuery.length < 2) {
      setResults([]);
      setStatus(trimmedQuery ? '至少输入 2 个字符' : '输入城市名称开始搜索');
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus('正在搜索城市…');
      try {
        const params = new URLSearchParams({
          name: trimmedQuery,
          count: '8',
          language: 'zh',
          format: 'json',
        });
        const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`, {
          signal: controller.signal,
          credentials: 'omit',
          cache: 'no-store',
        });
        if (!response.ok) throw new Error('city search failed');
        const payload = await response.json() as OpenMeteoGeocodingResponse;
        const locations = (payload.results ?? []).map(toLocation).filter((item): item is WeatherCustomLocation => Boolean(item));
        setResults(locations);
        setStatus(locations.length ? `找到 ${locations.length} 个城市` : '没有找到匹配城市');
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setResults([]);
          setStatus('城市搜索失败，请稍后重试');
        }
      }
    }, 360);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [enabled, trimmedQuery]);

  return { query, results, setQuery, status };
};
