import React from 'react';
import type { ImportedWeWaterWavesEffect } from '@/features/theme/utils/wallpaperEngineImportedScene';
import { WeImageEffectLayer } from './WeImageEffectLayer';

interface WeWaterWavesLayerProps {
    src: string;
    effects: Array<ImportedWeWaterWavesEffect & {
        maskUrl: string | null;
        timeOffsetUrl: string | null;
    }>;
    className: string;
    style: React.CSSProperties;
    dataSource: string;
    dataTiming?: string;
    timeOriginMs: number;
}

/**
 * Compatibility adapter kept for callers outside the main renderer. New WE
 * image-space effects should use WeImageEffectLayer so ordered multi-pass
 * chains share one ping-pong pipeline.
 */
export const WeWaterWavesLayer: React.FC<WeWaterWavesLayerProps> = ({ effects, ...props }) => (
    <WeImageEffectLayer
        {...props}
        effects={effects.map((effect) => ({ kind: 'waterWaves' as const, ...effect }))}
    />
);
