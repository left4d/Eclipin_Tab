import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import styles from '../WidgetPanel.module.css';

interface DayProgressWidgetProps {
  now: Date;
  onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
}

const formatRemaining = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) return `${mins} 分钟`;
  if (mins === 0) return `${hours} 小时`;
  return `${hours} 小时 ${mins} 分`;
};

const getPeriodLabel = (hour: number): string => {
  if (hour < 6) return '夜深了';
  if (hour < 9) return '清晨';
  if (hour < 12) return '上午';
  if (hour < 14) return '中午';
  if (hour < 18) return '下午';
  if (hour < 22) return '晚上';
  return '夜间';
};

export const DayProgressWidget = ({ now, onPointerDown }: DayProgressWidgetProps) => {
  const elapsedMinutes = now.getHours() * 60 + now.getMinutes();
  const remainingMinutes = Math.max(0, 24 * 60 - elapsedMinutes);
  const progress = Math.min(1, elapsedMinutes / (24 * 60));
  const percentage = Math.round(progress * 100);
  const style = { '--day-progress': `${progress * 360}deg` } as CSSProperties;

  return (
    <div className={styles.dayProgressBody} onPointerDown={onPointerDown}>
      <div className={styles.dayProgressRing} style={style} aria-label={`今天已过去 ${percentage}%`}>
        <div className={styles.dayProgressRingInner}>
          <strong>{percentage}%</strong>
          <span>今天</span>
        </div>
      </div>
      <div className={styles.dayProgressSummary}>
        <span className={styles.dayProgressPeriod}>{getPeriodLabel(now.getHours())}</span>
        <strong>还剩 {formatRemaining(remainingMinutes)}</strong>
        <small>{now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' })}</small>
        <div className={styles.dayProgressBar} aria-hidden="true">
          <i style={{ width: `${percentage}%` }} />
        </div>
      </div>
    </div>
  );
};
