import { useState, type FC } from 'react';
import { Box, Modal, type ModalProps } from '@mui/material';

export type RendererProps = Omit<ModalProps, 'open' | 'onClose'>;

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  border: '2px solid #000',
  boxShadow: 24,
  p: 4,
};

export const useModal = () => {
  const [isOpen, setIsOpen] = useState(false);

  const open = () => setIsOpen(true);
  const close = () => setIsOpen(false);
  const toggle = () => setIsOpen((prev) => !prev);

  const Renderer: FC<RendererProps> = ({ children, ...props }) => {
    return (
      <Modal open={isOpen} onClose={() => setIsOpen(false)} {...props}>
        <Box sx={style}>{children}</Box>
      </Modal>
    );
  };

  return { isOpen, open, close, toggle, Modal: Renderer };
};
