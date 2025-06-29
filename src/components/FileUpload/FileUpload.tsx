import type { ChangeEvent, FC, ReactNode } from 'react';

import { useRef } from 'react';
import { Button } from '@radix-ui/themes';
import { UploadIcon } from '@radix-ui/react-icons';

interface FileUploadProps {
  children: ReactNode;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export const FileUpload: FC<FileUploadProps> = ({ children, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Button onClick={() => inputRef.current?.click()}>
      <input ref={inputRef} type="file" onChange={onChange} className="visually-hidden" />
      <UploadIcon />
      {children}
    </Button>
  );
};
