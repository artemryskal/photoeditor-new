import { memo, useMemo, type FC, type ReactNode } from 'react';
import { Cross2Icon } from '@radix-ui/react-icons';

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
      <div className={css.ModalWrapper}>
        <div className={css.ModalContent} onClick={contentClick}>
          {memoizedChildren}
        </div>
        {onClose && (
          <button className={css.CloseButton} onClick={onClose} aria-label="Закрыть">
            <Cross2Icon />
          </button>
        )}
      </div>
    </dialog>
  );
});
