import React from 'react';
import styles from './AddIcon.module.css';

interface AddIconProps {
  onClick: (rect?: DOMRect) => void;
}

export const AddIcon: React.FC<AddIconProps> = ({ onClick }) => {
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick(event.currentTarget.getBoundingClientRect());
  };

  return (
    <button
      type="button"
      className={styles.addIcon}
      onClick={handleClick}
      data-add-icon
      aria-label="添加快捷网站"
      title="添加快捷网站"
    >
      <span className={styles.icon} aria-hidden="true">
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 8V24M8 16H24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    </button>
  );
};
