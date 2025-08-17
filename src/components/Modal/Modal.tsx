import { memo, useMemo, type FC, type ReactNode } from 'react';

import css from './Modal.module.scss';

export interface ModalProps {
  children: ReactNode;
  active: boolean;
  onClose?: () => void;
}

export const Modal: FC<ModalProps> = memo(({ children, active, onClose }) => {
  const memoizedChildren = useMemo(() => children, [children]);

  const contentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
  };

  if (!active) return null;

  return (
    <dialog open={active || undefined} className={css.Modal} onClick={onClose}>
      <div className={css.ModalContent} onClick={contentClick}>
        {memoizedChildren}
      </div>
    </dialog>
  );
});
