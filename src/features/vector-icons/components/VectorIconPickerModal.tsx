import React, { lazy } from 'react';
import { Modal } from '@/shared/components/Modal/Modal';
import type { VectorIconPickerPurpose } from '../types/vectorIcon';
import styles from './VectorIconPickerModal.module.css';

const LazyVectorIconPickerPage = lazy(() => import('./VectorIconPickerPage'));


interface VectorIconPickerModalProps {
  isOpen: boolean;
  purpose: VectorIconPickerPurpose;
  onClose: () => void;
  onChoose: (dataUrl: string, iconName: string) => void | Promise<void>;
}

export const VectorIconPickerModal = ({ isOpen, purpose, onClose, onChoose }: VectorIconPickerModalProps) => (
  <Modal isOpen={isOpen} onClose={onClose} className={styles.modal} zIndex={2_147_483_000}>
    <React.Suspense fallback={<div className={styles.loading}>正在加载 SVG 图标库…</div>}>
      <LazyVectorIconPickerPage purpose={purpose} onBack={onClose} onChoose={onChoose} />
    </React.Suspense>
  </Modal>
);
