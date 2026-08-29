import type { NavigationBarDefaultIcon } from '../types/navigationBar';

interface IconProps {
  className?: string;
}

export const HomeNavigationIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 10.8 12 4l8 6.8v8.1a1.1 1.1 0 0 1-1.1 1.1h-4.7v-5.8H9.8V20H5.1A1.1 1.1 0 0 1 4 18.9v-8.1Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

export const GridNavigationIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="4" width="6.2" height="6.2" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <rect x="13.8" y="4" width="6.2" height="6.2" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <rect x="4" y="13.8" width="6.2" height="6.2" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <rect x="13.8" y="13.8" width="6.2" height="6.2" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
  </svg>
);

export const CompassNavigationIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <path d="m14.8 9.2-1.7 3.9-3.9 1.7 1.7-3.9 3.9-1.7Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);

export const ArrowNavigationIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 12h13m-4.6-4.6L18 12l-4.6 4.6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const BookmarkNavigationIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 4.2h10a1.2 1.2 0 0 1 1.2 1.2v14.2L12 16.1l-6.2 3.5V5.4A1.2 1.2 0 0 1 7 4.2Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
  </svg>
);

export const StarNavigationIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="m12 3.8 2.35 4.77 5.27.77-3.81 3.71.9 5.24L12 15.81l-4.71 2.48.9-5.24-3.81-3.71 5.27-.77L12 3.8Z" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinejoin="round" />
  </svg>
);

export const EditNavigationIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="m5 16.8-.8 3 3-.8L18.5 7.7l-2.2-2.2L5 16.8Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    <path d="m14.9 6.9 2.2 2.2" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export const PlusNavigationIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const TrashNavigationIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7.2 8.3v10.1c0 .9.7 1.6 1.6 1.6h6.4c.9 0 1.6-.7 1.6-1.6V8.3M5.2 6.2h13.6M9.4 6.2V4.7h5.2v1.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ChevronUpNavigationIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="m7 14 5-5 5 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export const ChevronDownNavigationIcon = ({ className }: IconProps) => (
  <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
);

export const NavigationDefaultIcon = ({ icon, className }: IconProps & { icon: NavigationBarDefaultIcon }) => {
  if (icon === 'home') return <HomeNavigationIcon className={className} />;
  if (icon === 'grid') return <GridNavigationIcon className={className} />;
  if (icon === 'arrow') return <ArrowNavigationIcon className={className} />;
  if (icon === 'bookmark') return <BookmarkNavigationIcon className={className} />;
  if (icon === 'star') return <StarNavigationIcon className={className} />;
  return <CompassNavigationIcon className={className} />;
};
