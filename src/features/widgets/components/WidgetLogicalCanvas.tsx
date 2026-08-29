import type { CSSProperties, PropsWithChildren } from 'react';
import { WIDGET_REFERENCE_WIDTH } from '../services/widgetLayoutService';
import styles from './WidgetPanel.module.css';

type WidgetLogicalCanvasProps = PropsWithChildren<{
  height: number;
  scale: number;
  sizeScrollHeight?: boolean;
}>;

/** Render widget coordinates/sizes in a stable 1920-wide logical canvas. */
export const WidgetLogicalCanvas = ({
  children,
  height,
  scale,
  sizeScrollHeight = false,
}: WidgetLogicalCanvasProps) => {
  const content = (
    <div
      className={styles.logicalWidgetCanvas}
      style={{
        width: WIDGET_REFERENCE_WIDTH,
        height,
        '--widget-logical-scale': Math.abs(scale - 1) < 0.001 ? 1 : scale,
      } as CSSProperties}
    >
      {children}
    </div>
  );

  if (!sizeScrollHeight) return content;
  return (
    <div className={styles.logicalWidgetScrollSizer} style={{ height: height * scale }}>
      {content}
    </div>
  );
};
