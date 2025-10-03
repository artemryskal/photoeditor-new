import { useState, useEffect, useCallback, type FC } from 'react';
import { Modal, type ModalProps } from '@/components/Modal';

export type RendererProps = Pick<ModalProps, 'children'>;

export const useModal = (initialState: boolean = false) => {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', escHandler);
    } else {
      document.body.style.overflow = 'auto';
      document.removeEventListener('keydown', escHandler);
    }
  }, [isOpen, close]);

  const Renderer: FC<RendererProps> = ({ children }) => {
    return (
      <Modal active={isOpen} onClose={close}>
        {children}
      </Modal>
    );
  };

  return { isOpen, open, close, Modal: Renderer };
};
