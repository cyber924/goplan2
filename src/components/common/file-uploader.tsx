
'use client';

import { useState, useCallback, type ChangeEvent, type DragEvent } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { UseFormSetValue } from 'react-hook-form';

interface FileUploaderProps {
  setValue: UseFormSetValue<any>;
  name: string;
}

export default function FileUploader({ setValue, name }: FileUploaderProps) {
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const selectedFile = acceptedFiles[0];
      setFile(selectedFile);
      setValue(name, selectedFile, { shouldValidate: true });
    } else if (rejectedFiles && rejectedFiles.length > 0) {
        setFile(null);
        setValue(name, null, { shouldValidate: true });
    }
  }, [setValue, name]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 
        'application/pdf': ['.pdf'],
        'image/png': ['.png'],
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/webp': ['.webp'],
    },
    multiple: false,
  });

  const handleRemoveFile = () => {
    setFile(null);
    setValue(name, null, { shouldValidate: true });
  };

  return (
    <div
      {...getRootProps()}
      className={cn(
        'relative group w-full p-6 border-2 border-dashed rounded-xl transition-colors duration-300 cursor-pointer',
        isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-primary'
      )}
    >
      <input {...getInputProps()} />
      {file ? (
        <div className="flex flex-col items-center justify-center text-center">
            <FileText className="w-12 h-12 text-primary" />
            <p className="mt-2 text-sm font-medium text-foreground">{file.name}</p>
            <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-7 w-7 rounded-full"
              onClick={(e) => {
                e.stopPropagation();
                handleRemoveFile();
              }}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">파일 제거</span>
            </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center">
          <UploadCloud className="w-12 h-12 text-muted-foreground group-hover:text-primary transition-colors" />
          <p className="mt-4 text-base font-medium text-foreground">PDF 또는 이미지 파일을 여기로 드래그하거나 클릭하여 업로드하세요</p>
          <p className="mt-1 text-sm text-muted-foreground">(최대 5MB)</p>
        </div>
      )}
    </div>
  );
}
