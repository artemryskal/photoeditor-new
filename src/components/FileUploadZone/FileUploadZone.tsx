'use no memo';

import type { FC } from 'react';
import { useState } from 'react';
import { useFilePicker } from 'use-file-picker';
import { UploadIcon, FileIcon } from '@radix-ui/react-icons';
import styles from './FileUploadZone.module.scss';

interface FileUploadZoneProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  maxSizeMB?: number;
}

export const FileUploadZone: FC<FileUploadZoneProps> = ({ onFileSelect, accept = 'image/*', maxSizeMB = 10 }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const { openFilePicker } = useFilePicker({
    accept: accept,
    multiple: false,
    readAs: 'DataURL',
    onFilesSelected: ({ plainFiles }) => {
      const file = plainFiles?.[0];
      if (file) {
        if (validateFile(file)) {
          setSelectedFile(file);
          onFileSelect(file);
        }
      }
    },
  });

  const validateFile = (file: File): boolean => {
    if (!file.type.startsWith('image/')) {
      alert('Пожалуйста, выберите файл изображения');
      return false;
    }

    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      alert(`Файл слишком большой. Максимальный размер: ${maxSizeMB}MB`);
      return false;
    }

    return true;
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      onFileSelect(file);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={`${styles.dropZone} ${isDragging ? styles.dragging : ''}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={openFilePicker}
    >
      {!selectedFile ? (
        <div className={styles.dropZoneContent}>
          <UploadIcon className={styles.uploadIcon} />
          <div className={styles.dropZoneText}>
            <p className={styles.mainText}>
              Перетащите файл сюда или <span className={styles.clickText}>нажмите для выбора</span>
            </p>
            <p className={styles.subText}>Максимальный размер: {maxSizeMB}MB</p>
          </div>
        </div>
      ) : (
        <div className={styles.fileInfo}>
          <FileIcon className={styles.fileIcon} />
          <div className={styles.fileDetails}>
            <p className={styles.fileName}>{selectedFile.name}</p>
            <p className={styles.fileSize}>{formatFileSize(selectedFile.size)}</p>
          </div>
        </div>
      )}
    </div>
  );
};
