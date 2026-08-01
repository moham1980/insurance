'use client';
import * as React from 'react';
import { cn } from '@insurance/ui-utils';
import { UploadCloud, X, FileText } from 'lucide-react';

export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  url?: string;
}

export interface FileUploaderProps {
  accept?: string;
  multiple?: boolean;
  maxSize?: number;
  label?: string;
  description?: string;
  onUpload?: (files: File[]) => void | Promise<void>;
  onRemove?: (fileId: string) => void;
  uploadedFiles?: UploadedFile[];
  className?: string;
  disabled?: boolean;
}

export function FileUploader({
  accept,
  multiple = false,
  maxSize = 10 * 1024 * 1024,
  label = 'فایل را اینجا رها کنید یا کلیک کنید',
  description = 'حداکثر حجم فایل ۱۰ مگابایت',
  onUpload,
  onRemove,
  uploadedFiles = [],
  className,
  disabled,
}: FileUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setError(null);
    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      if (file.size > maxSize) {
        setError(`حجم فایل ${file.name} بیش از حد مجاز است`);
        continue;
      }
      validFiles.push(file);
    }
    if (validFiles.length > 0 && onUpload) {
      await onUpload(validFiles);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn('w-full', className)}>
      <div
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (!disabled) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={cn(
          'flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
          isDragging ? 'border-brand-primary bg-brand-primary/5' : 'border-border-default bg-bg-subtle',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-brand-primary'
        )}
      >
        <UploadCloud className="h-8 w-8 text-text-muted" />
        <p className="mt-2 text-sm font-medium text-text-primary">{label}</p>
        <p className="mt-1 text-xs text-text-muted">{description}</p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>

      {error && (
        <p className="mt-2 text-sm text-danger" role="alert">{error}</p>
      )}

      {uploadedFiles.length > 0 && (
        <ul className="mt-3 space-y-2">
          {uploadedFiles.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between rounded-md border border-border-default bg-bg-raised px-3 py-2"
            >
              <span className="flex items-center gap-2 text-sm text-text-primary">
                <FileText className="h-4 w-4 text-text-muted" />
                <span>{file.name}</span>
                <span className="text-xs text-text-muted">({formatSize(file.size)})</span>
              </span>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(file.id)}
                  className="rounded p-1 text-text-muted hover:bg-bg-subtle hover:text-danger"
                  aria-label={`حذف ${file.name}`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
