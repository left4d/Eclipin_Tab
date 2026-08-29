import { useEffect, useState } from 'react';
import type { SortableWidgetProps, WeatherNow } from '../components/sortable/SortableWidget.types';
import type { WeatherLocationMode } from '../types/widget';

const WEATHER_FIELDS = 'temperature_2m,relative_humidity_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,is_day';

const fetchWeather = async (
  location: { latitude: number; longitude: number; place: string; timezone?: string },
  signal: AbortSignal,
): Promise<WeatherNow> => {
  const lat = Number(location.latitude.toFixed(4));
  const lon = Number(location.longitude.toFixed(4));
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    current: WEATHER_FIELDS,
    timezone: location.timezone || 'auto',
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`, { signal });
  if (!response.ok) throw new Error('weather request failed');
  const data = await response.json();
  return {
    lat,
    lon,
    temp: Math.round(data.current.temperature_2m),
    feelsLike: Math.round(data.current.apparent_temperature),
    humidity: Math.round(data.current.relative_humidity_2m),
    precipitation: Number(data.current.precipitation ?? 0),
    windSpeed: Math.round(data.current.wind_speed_10m),
    windDirection: Math.round(data.current.wind_direction_10m),
    code: Number(data.current.weather_code),
    isDay: Number(data.current.is_day),
    place: location.place,
  };
};

export const useWidgetWeather = (widget: SortableWidgetProps['widget']) => {
  const [weatherNow, setWeatherNow] = useState<WeatherNow | null>(null);
  const [weatherStatus, setWeatherStatus] = useState('正在定位…');
  const [weatherUpdatedAt, setWeatherUpdatedAt] = useState<Date | null>(null);
  const [weatherRefreshKey, setWeatherRefreshKey] = useState(0);
  const weatherLocationMode: WeatherLocationMode = widget.weatherLocationMode ?? 'current';
  const weatherCustomLocation = widget.weatherCustomLocation;

  useEffect(() => {
    if (widget.type !== 'weather') return;
    let cancelled = false;
    const controller = new AbortController();

    const applyWeather = async (location: { latitude: number; longitude: number; place: string; timezone?: string }) => {
      try {
        setWeatherStatus('正在获取天气…');
        const nextWeather = await fetchWeather(location, controller.signal);
        if (cancelled) return;
        setWeatherNow(nextWeather);
        setWeatherUpdatedAt(new Date());
        setWeatherStatus('');
      } catch (error) {
        if (!cancelled && !(error instanceof DOMException && error.name === 'AbortError')) {
          setWeatherStatus('天气获取失败，可点击重试');
        }
      }
    };

    if (weatherLocationMode === 'custom') {
      if (!weatherCustomLocation) {
        setWeatherNow(null);
        setWeatherStatus('请选择自定义城市');
      } else {
        void applyWeather({
          latitude: weatherCustomLocation.latitude,
          longitude: weatherCustomLocation.longitude,
          timezone: weatherCustomLocation.timezone,
          place: weatherCustomLocation.name,
        });
      }
      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    if (!navigator.geolocation) {
      setWeatherNow(null);
      setWeatherStatus('浏览器不支持定位，可切换自定义城市');
      return () => controller.abort();
    }

    setWeatherStatus('正在定位…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled) return;
        void applyWeather({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          place: '当前位置',
        });
      },
      () => {
        if (!cancelled) {
          setWeatherNow(null);
          setWeatherStatus('定位未授权，可切换自定义城市');
        }
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 30 * 60 * 1000 },
    );

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [weatherCustomLocation, weatherLocationMode, weatherRefreshKey, widget.type]);

  const weatherUrl = weatherNow ? `https://www.windy.com/?wind,${weatherNow.lat},${weatherNow.lon},8` : 'https://www.windy.com/';

  return {
    setWeatherRefreshKey,
    weatherCustomLocation,
    weatherLocationMode,
    weatherNow,
    weatherStatus,
    weatherUpdatedAt,
    weatherUrl,
  };
};
