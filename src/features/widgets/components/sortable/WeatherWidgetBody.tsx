import {
  getWeatherIcon,
  getWeatherText,
  getWindDirectionText,
  openExternalUrl,
} from '../../utils/widgetFormatters';
import type { SortableWidgetController } from '../../hooks/useSortableWidgetController';
import type { SortableWidgetProps } from './SortableWidget.types';
import styles from './WeatherWidget.module.css';

interface WeatherWidgetBodyProps {
  props: SortableWidgetProps;
  controller: SortableWidgetController;
}

export const WeatherWidgetBody = ({ props, controller }: WeatherWidgetBodyProps) => {
  const { widget } = props;
  const {
    openInNewTab,
    setWeatherRefreshKey,
    startDrag,
    weatherCustomLocation,
    weatherLocationMode,
    weatherNow,
    weatherStatus,
    weatherUpdatedAt,
    weatherUrl,
  } = controller;

  if (widget.type !== 'weather') return null;
  const isLoading = weatherStatus.startsWith('正在');
  const placeLabel = weatherLocationMode === 'custom'
    ? weatherCustomLocation?.name ?? '未设置城市'
    : weatherNow?.place ?? '当前位置';

  return (
    <div className={styles.weatherBody} aria-live="polite" onPointerDown={startDrag}>
      <div className={styles.weatherMain}>
        <div className={styles.weatherHero}>
          <div className={styles.weatherIcon}>{weatherNow ? getWeatherIcon(weatherNow.code, weatherNow.isDay) : '📍'}</div>
          <div className={styles.weatherSummary}>
            <div className={styles.weatherTempRow}>
              <span className={styles.weatherTemp}>{weatherNow ? `${weatherNow.temp}°` : '--°'}</span>
              <span className={styles.weatherDesc}>{weatherNow ? getWeatherText(weatherNow.code) : weatherStatus}</span>
            </div>
            <span className={styles.weatherCityLabel} title="右键天气组件可设置所在地或自定义城市">{placeLabel}</span>
          </div>
        </div>
        {weatherNow ? (
          <div className={styles.weatherDetails}>
            <span>体感 {weatherNow.feelsLike}°</span>
            <span>湿度 {weatherNow.humidity}%</span>
            <span>{getWindDirectionText(weatherNow.windDirection)}风 {weatherNow.windSpeed} km/h</span>
            <span>降水 {weatherNow.precipitation} mm</span>
          </div>
        ) : null}
      </div>

      <div className={styles.weatherFooter}>
        <span className={styles.weatherUpdatedAt}>
          {weatherUpdatedAt
            ? `更新 ${weatherUpdatedAt.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit', hour12: false })}`
            : '右键组件可设置天气位置'}
        </span>
        <div className={styles.weatherActions} onPointerDown={(event) => event.stopPropagation()}>
          <button
            type="button"
            className={styles.weatherRefresh}
            disabled={isLoading}
            onClick={() => setWeatherRefreshKey((value) => value + 1)}
            aria-label="刷新天气"
            title="刷新天气"
          >↻</button>
          <button
            type="button"
            className={styles.weatherDetailButton}
            onClick={() => openExternalUrl(weatherUrl, openInNewTab)}
            aria-label="在 Windy 查看详细天气"
            title="在 Windy 查看风场、台风和详细天气"
          >↗</button>
        </div>
      </div>
    </div>
  );
};
