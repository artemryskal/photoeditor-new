import type { ChangeEvent } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { useAtom } from '@reatom/npm-react';
import { fileAtom } from '@/stores';

import css from './CanvasUpload.module.scss';

export const CanvasUpload = () => {
  const [, setFile] = useAtom(fileAtom);

  const uploadFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return false;
    setFile(file);
  };

  return (
    <div className={css.CanvasUpload}>
      <FileUpload onChange={uploadFile}>Загрузить изображение</FileUpload>
    </div>
  );
};
