import { type FC, type ReactNode } from 'react';

import css from './Modal.module.scss';

export interface ModalProps {
  children: ReactNode;
  active: boolean;
  onClose?: () => void;
}

export const Modal: FC<ModalProps> = ({ children, active, onClose }) => {
  const contentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  return (
    <dialog open={active || undefined} className={css.Modal} onClick={onClose}>
      <div className={css.ModalContent} onClick={contentClick}>
        {children}
      </div>
    </dialog>
  );
};
