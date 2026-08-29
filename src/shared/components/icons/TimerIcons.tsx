import React from 'react';

interface TimerIconProps {
  size?: number;
  className?: string;
}

const baseProps = (size: number, className?: string) => ({
  width: size,
  height: size,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  className,
  'aria-hidden': true,
  focusable: false,
});

export const TimerIcon: React.FC<TimerIconProps> = ({ size = 18, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M9 2h6" />
    <path d="M12 6V3" />
    <circle cx="12" cy="14" r="7" />
    <path d="M12 10v4l2.6 1.6" />
  </svg>
);

export const FocusModeIcon: React.FC<TimerIconProps> = ({ size = 18, className }) => (
  <svg {...baseProps(size, className)}>
    <circle cx="12" cy="12" r="7.5" />
    <circle cx="12" cy="12" r="2.5" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2" />
  </svg>
);

export const BreakModeIcon: React.FC<TimerIconProps> = ({ size = 18, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M5 8h11v5.5A4.5 4.5 0 0 1 11.5 18h-2A4.5 4.5 0 0 1 5 13.5V8Z" />
    <path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16" />
    <path d="M7 4c0 1 1 1.2 1 2.2M11 4c0 1 1 1.2 1 2.2" />
  </svg>
);

export const PlayIcon: React.FC<TimerIconProps> = ({ size = 18, className }) => (
  <svg {...baseProps(size, className)} fill="currentColor" stroke="none">
    <path d="M8 5.8c0-1.05 1.15-1.7 2.05-1.15l8.2 5.05a1.35 1.35 0 0 1 0 2.3l-8.2 5.05A1.35 1.35 0 0 1 8 15.9V5.8Z" />
  </svg>
);

export const PauseIcon: React.FC<TimerIconProps> = ({ size = 18, className }) => (
  <svg {...baseProps(size, className)} fill="currentColor" stroke="none">
    <rect x="6.5" y="5" width="4" height="14" rx="1.2" />
    <rect x="13.5" y="5" width="4" height="14" rx="1.2" />
  </svg>
);

export const ResetIcon: React.FC<TimerIconProps> = ({ size = 18, className }) => (
  <svg {...baseProps(size, className)}>
    <path d="M5.4 7.2A8 8 0 1 1 4 14" />
    <path d="M4 4.5v4h4" />
  </svg>
);
