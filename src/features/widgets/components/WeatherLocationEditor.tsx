import { useState } from 'react';
import { createPortal } from 'react-dom';
import { getWeatherLocationLabel, useWeatherCitySearch } from '../hooks/useWeatherCitySearch';
import type { WeatherLocationMode, WidgetLayout } from '../types/widget';
import styles from './WeatherLocationEditor.module.css';

interface WeatherLocationEditorProps {
  widget: WidgetLayout;
  anchorRect: DOMRect;
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<WidgetLayout>) => void;
}

const getPosition = (anchorRect: DOMRect) => {
  const width = Math.min(360, window.innerWidth - 24);
  const height = Math.min(430, window.innerHeight - 24);
  const gap = 14;
  const rightSideLeft = anchorRect.right + gap;
  const left = rightSideLeft + width <= window.innerWidth - 12
    ? rightSideLeft
    : Math.max(12, anchorRect.left - width - gap);
  const top = Math.min(
    Math.max(12, anchorRect.top + anchorRect.height / 2 - height / 2),
    Math.max(12, window.innerHeight - height - 12),
  );
  return { left, top, width, maxHeight: height };
};

export const WeatherLocationEditor = ({ widget, anchorRect, onClose, onUpdate }: WeatherLocationEditorProps) => {
  const initialMode: WeatherLocationMode = widget.weatherLocationMode ?? 'current';
  const [mode, setMode] = useState<WeatherLocationMode>(initialMode);
  const citySearch = useWeatherCitySearch(mode === 'custom', widget.weatherCustomLocation?.name ?? '');
  const position = getPosition(anchorRect);

  const useCurrentLocation = () => {
    onUpdate(widget.id, { weatherLocationMode: 'current' });
    onClose();
  };

  return createPortal(
    <div
      className={styles.clickAway}
      data-page-scroll-lock="true"
      data-modal="true"
      onMouseDown={onClose}
      onWheel={(event) => event.stopPropagation()}
    >
      <section
        className={styles.editor}
        style={position}
        role="dialog"
        aria-modal="true"
        aria-label="设置天气城市"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <div>
            <h3>天气位置</h3>
            <p>选择使用浏览器所在地，或为这个天气组件固定一个城市。</p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="关闭天气位置设置">×</button>
        </header>

        <div className={styles.modeSwitch} role="group" aria-label="天气位置模式">
          <button
            type="button"
            className={mode === 'current' ? styles.activeMode : ''}
            onClick={() => setMode('current')}
          >所在地</button>
          <button
            type="button"
            className={mode === 'custom' ? styles.activeMode : ''}
            onClick={() => setMode('custom')}
          >自定义城市</button>
        </div>

        {mode === 'current' ? (
          <div className={styles.currentLocationCard}>
            <strong>跟随所在地</strong>
            <span>使用浏览器定位。切换网络或位置后，刷新天气即可更新。</span>
            <button type="button" onClick={useCurrentLocation}>使用所在地</button>
          </div>
        ) : (
          <div className={styles.customArea}>
            {widget.weatherCustomLocation ? (
              <div className={styles.selectedCity}>
                <span>当前自定义城市</span>
                <strong>{getWeatherLocationLabel(widget.weatherCustomLocation)}</strong>
              </div>
            ) : null}
            <label className={styles.searchField}>
              <span>搜索城市</span>
              <input
                value={citySearch.query}
                onChange={(event) => citySearch.setQuery(event.target.value)}
                placeholder="例如：上海 / Tokyo / Paris"
                autoFocus
              />
            </label>
            <div className={styles.results} data-widget-scrollable="true">
              {citySearch.results.map((location) => (
                <button
                  type="button"
                  key={`${location.latitude}-${location.longitude}-${location.name}`}
                  onClick={() => {
                    onUpdate(widget.id, { weatherLocationMode: 'custom', weatherCustomLocation: location });
                    onClose();
                  }}
                >
                  <strong>{location.name}</strong>
                  <span>{getWeatherLocationLabel(location)}</span>
                </button>
              ))}
              {!citySearch.results.length ? <p>{citySearch.status}</p> : null}
            </div>
          </div>
        )}
      </section>
    </div>,
    document.body,
  );
};
