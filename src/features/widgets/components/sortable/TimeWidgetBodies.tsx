import { getBuiltInFontFamily } from '@/shared/constants/builtInFonts';
import {
  ANALOG_CLOCK_CENTER,
  ANALOG_CLOCK_COLOR,
  ANALOG_CLOCK_OUTLINE_EXTRA_WIDTH,
  ANALOG_CLOCK_STROKE_WIDTH,
} from '../../config/widgetCatalog';
import {
  getAnalogHandEnd,
  getCountdownDays,
  getMonthCells,
  getThemeAwareDrawingColor,
  parseLocalDate,
  toLocalDateKey,
} from '../../utils/widgetFormatters';
import type { SortableWidgetController } from '../../hooks/useSortableWidgetController';
import type { SortableWidgetProps } from './SortableWidget.types';
import styles from '../WidgetPanel.module.css';
import utilityStyles from './CalendarCountdownWidget.module.css';

export const renderTimeWidgetBody = (props: SortableWidgetProps, controller: SortableWidgetController) => {
  const { widget, onUpdate } = props;
  const {
    calendarMonth,
    isEditMode,
    now,
    setCalendarMonth,
    startDrag,
    theme,
  } = controller;
    if (widget.type === 'clock') {
      return (
        <div
          className={styles.clockBody}
          aria-live="off"
          onPointerDown={startDrag}
          style={{ fontFamily: getBuiltInFontFamily(widget.fontFamily) }}
        >
          <div className={styles.clockTime}>
            {now.toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit', hour12: false })}
            <span className={styles.clockSeconds}>:{String(now.getSeconds()).padStart(2, '0')}</span>
          </div>
          <div className={styles.clockDateRow}>
            <span className={styles.clockDate}>{now.toLocaleDateString('zh-HK', { weekday: 'long', month: 'long', day: 'numeric' })}</span>
            <span className={styles.clockYear}>{now.getFullYear()}</span>
          </div>
        </div>
      );
    }

    if (widget.type === 'analogClock') {
      const secondsWithFraction = now.getSeconds() + now.getMilliseconds() / 1000;
      const minuteAngle = (now.getMinutes() + secondsWithFraction / 60) * 6;
      const hourAngle = ((now.getHours() % 12) + now.getMinutes() / 60 + secondsWithFraction / 3600) * 30;
      const minuteEnd = getAnalogHandEnd(minuteAngle, 78);
      const hourEnd = getAnalogHandEnd(hourAngle, 56);
      const resolvedLineColor = getThemeAwareDrawingColor(ANALOG_CLOCK_COLOR, theme);
      const outlineWidth = ANALOG_CLOCK_STROKE_WIDTH + ANALOG_CLOCK_OUTLINE_EXTRA_WIDTH;
      const timeLabel = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });

      return (
        <div
          className={styles.analogClockBody}
          aria-label={`圆形时钟，当前时间 ${timeLabel}`}
          onPointerDown={startDrag}
        >
          <svg
            className={styles.analogClockSvg}
            viewBox="0 0 240 240"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-hidden="true"
          >
            <circle
              cx={ANALOG_CLOCK_CENTER}
              cy={ANALOG_CLOCK_CENTER}
              r="104"
              fill="none"
              stroke="var(--color-sticker-stroke, #FFFFFF)"
              strokeWidth={outlineWidth}
            />
            <circle
              cx={ANALOG_CLOCK_CENTER}
              cy={ANALOG_CLOCK_CENTER}
              r="104"
              fill="none"
              stroke={resolvedLineColor}
              strokeWidth={ANALOG_CLOCK_STROKE_WIDTH}
            />
            <line
              x1={ANALOG_CLOCK_CENTER}
              y1={ANALOG_CLOCK_CENTER}
              x2={hourEnd.x}
              y2={hourEnd.y}
              stroke="var(--color-sticker-stroke, #FFFFFF)"
              strokeWidth={outlineWidth}
              strokeLinecap="round"
            />
            <line
              x1={ANALOG_CLOCK_CENTER}
              y1={ANALOG_CLOCK_CENTER}
              x2={hourEnd.x}
              y2={hourEnd.y}
              stroke={resolvedLineColor}
              strokeWidth={ANALOG_CLOCK_STROKE_WIDTH}
              strokeLinecap="round"
            />
            <line
              x1={ANALOG_CLOCK_CENTER}
              y1={ANALOG_CLOCK_CENTER}
              x2={minuteEnd.x}
              y2={minuteEnd.y}
              stroke="var(--color-sticker-stroke, #FFFFFF)"
              strokeWidth={outlineWidth}
              strokeLinecap="round"
            />
            <line
              x1={ANALOG_CLOCK_CENTER}
              y1={ANALOG_CLOCK_CENTER}
              x2={minuteEnd.x}
              y2={minuteEnd.y}
              stroke={resolvedLineColor}
              strokeWidth={ANALOG_CLOCK_STROKE_WIDTH}
              strokeLinecap="round"
            />
          </svg>
        </div>
      );
    }

    if (widget.type === 'calendar') {
      const cells = getMonthCells(calendarMonth);
      const todayKey = toLocalDateKey(now);
      return (
        <div className={utilityStyles.calendarBody} onPointerDown={startDrag}>
          <div className={utilityStyles.calendarToolbar}>
            <button
              type="button"
              onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}
              aria-label="上一个月"
              title="上一个月"
            >
              ‹
            </button>
            <strong>{calendarMonth.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' })}</strong>
            <button
              type="button"
              onClick={() => setCalendarMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}
              aria-label="下一个月"
              title="下一个月"
            >
              ›
            </button>
          </div>
          <div className={utilityStyles.calendarWeekdays} aria-hidden="true">
            {['一', '二', '三', '四', '五', '六', '日'].map((label) => <span key={label}>{label}</span>)}
          </div>
          <div className={utilityStyles.calendarGrid}>
            {cells.map((cell) => {
              const key = toLocalDateKey(cell.date);
              return (
                <span
                  key={key}
                  className={`${cell.currentMonth ? '' : utilityStyles.calendarOtherMonth} ${key === todayKey ? utilityStyles.calendarToday : ''}`}
                  aria-label={cell.date.toLocaleDateString('zh-CN')}
                >
                  {cell.day}
                </span>
              );
            })}
          </div>
          <button
            type="button"
            className={utilityStyles.calendarTodayButton}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1))}
          >
            回到本月
          </button>
        </div>
      );
    }

    if (widget.type === 'countdown') {
      const target = parseLocalDate(widget.countdownDate);
      const days = target ? getCountdownDays(target, now) : null;
      const countdownFontFamily = getBuiltInFontFamily(widget.fontFamily);
      return (
        <div className={utilityStyles.countdownBody} style={{ fontFamily: countdownFontFamily }} onPointerDown={startDrag}>
          {isEditMode ? (
            <div className={utilityStyles.countdownEditor} onPointerDown={(event) => event.stopPropagation()}>
              <label>
                <span>日期</span>
                <input
                  type="date"
                  value={widget.countdownDate ?? ''}
                  onChange={(event) => onUpdate(widget.id, { countdownDate: event.target.value || undefined })}
                />
              </label>
            </div>
          ) : target && days !== null ? (
            <>
              <div className={`${utilityStyles.countdownNumber} ${days < 0 ? utilityStyles.countdownPast : ''}`}>
                {days === 0 ? '今天' : Math.abs(days)}
              </div>
              <div className={utilityStyles.countdownUnit}>{days > 0 ? '天后' : days < 0 ? '天前' : target.toLocaleDateString('zh-CN')}</div>
              {days !== 0 && <div className={utilityStyles.countdownDate}>{target.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}</div>}
            </>
          ) : (
            <div className={utilityStyles.countdownEmpty}>
              <strong>还没有目标日期</strong>
              <span>开启编辑模式后填写日期</span>
            </div>
          )}
        </div>
      );
    }

    return null;
};
