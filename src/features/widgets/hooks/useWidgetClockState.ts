import { useEffect, useState } from 'react';
import { ensureBuiltInFontLoaded } from '@/shared/constants/builtInFonts';
import type { SortableWidgetProps } from '../components/sortable/SortableWidget.types';

export const useWidgetClockState = (
  widget: SortableWidgetProps['widget'],
) => {
  const [now, setNow] = useState(new Date());
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  useEffect(() => {
    const needsSeconds = widget.type === 'clock' || widget.type === 'analogClock';
    const needsDateTick = widget.type === 'calendar' || widget.type === 'countdown';
    if (!needsSeconds && !needsDateTick) return;
    const timer = window.setInterval(() => setNow(new Date()), needsSeconds ? 1000 : 60_000);
    return () => window.clearInterval(timer);
  }, [widget.type]);

  useEffect(() => {
    if (widget.type === 'clock' || widget.type === 'countdown') {
      void ensureBuiltInFontLoaded(widget.fontFamily);
    }
  }, [widget.fontFamily, widget.type]);

  return { now, calendarMonth, setCalendarMonth };
};
