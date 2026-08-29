import type { ReactNode } from 'react';
import { TimerIcon } from '@/shared/components/icons/TimerIcons';
import type { WidgetType } from '../types/widget';

export const widgetMeta: Record<WidgetType, { name: string; icon: ReactNode }> = {
  clock: { name: '时钟', icon: '🕐' },
  analogClock: { name: '圆形时钟', icon: '◷' },
  weather: { name: '天气', icon: '🌤' },
  translate: { name: '翻译', icon: '译' },
  link: { name: '快捷链接', icon: '🔗' },
  notes: { name: '便签', icon: '📝' },
  todo: { name: '计算器', icon: '🧮' },
  pomodoro: { name: '番茄钟', icon: <TimerIcon size={16} /> },
  calendar: { name: '月历', icon: '▦' },
  countdown: { name: '倒数日', icon: 'D−' },
  gtrend: { name: '空白容器', icon: '□' },
  embed: { name: '网页嵌入', icon: '🧩' },
  space: { name: '空间网站', icon: '▦' },
  bookmarks: { name: '书签', icon: '★' },
  openTabs: { name: '打开的标签页', icon: '▤' },
};
