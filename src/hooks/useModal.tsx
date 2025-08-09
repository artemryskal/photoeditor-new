import { useState, type FC } from 'react';
import { Modal, type ModalProps } from '@/components/Modal';

export type RendererProps = Pick<ModalProps, 'children'>;

export const useModal = (initialState: boolean = false) => {
  const [isOpen, setIsOpen] = useState(initialState);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);

  const Renderer: FC<RendererProps> = ({ children }) => {
    return (
      <Modal active={isOpen} onClose={close}>
        {children}
      </Modal>
    );
  };

  return { isOpen, open, close, Modal: Renderer };
};
