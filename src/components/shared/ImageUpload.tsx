import React, { useRef, useState } from 'react';
import { X, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useImageUpload } from '@/hooks/useImageUpload';

interface ImageUploadProps {
  bucket: string;
  currentUrl?: string | null;
  onUploadSuccess: (url: string) => void;
  onRemove: () => void;
  className?: string;
  fallbackIcon?: React.ReactNode;
}

export function ImageUpload({ bucket, currentUrl, onUploadSuccess, onRemove, className, fallbackIcon }: ImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadImage, removeImage, isUploading, progress } = useImageUpload({
    bucket,
    onSuccess: (url) => {
      // Se já existia uma imagem e enviou uma nova com sucesso, removemos a antiga
      if (currentUrl) {
        removeImage(currentUrl);
      }
      onUploadSuccess(url);
    }
  });

  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadImage(e.dataTransfer.files[0]);
    }
  };

  // Remove o arquivo do bucket antes de desvincular a URL, evitando órfãos no Storage
  const handleRemove = async () => {
    if (currentUrl) {
      await removeImage(currentUrl);
    }
    onRemove();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await uploadImage(e.target.files[0]);
    }
  };

  return (
    <div className={`relative ${className || ''}`}>
      {isUploading ? (
        <div className="w-full h-full flex flex-col items-center justify-center bg-muted border-2 border-dashed rounded-lg p-4">
          <div className="w-full max-w-[80%] bg-secondary rounded-full h-2.5 mb-2 overflow-hidden">
            <div className="bg-primary h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
          </div>
          <span className="text-xs text-muted-foreground">{progress}% Enviando...</span>
        </div>
      ) : currentUrl ? (
        <div className="relative w-full h-full group rounded-lg overflow-hidden border">
          <img src={currentUrl} alt="Preview" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button size="sm" variant="secondary" onClick={() => fileInputRef.current?.click()}>
              Trocar
            </Button>
            <Button size="sm" variant="destructive" onClick={handleRemove}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={`w-full h-full flex flex-col items-center justify-center bg-muted border-2 border-dashed rounded-lg cursor-pointer transition-colors hover:bg-muted/80 p-4 text-center ${dragActive ? 'border-primary bg-primary/10' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {fallbackIcon || <ImageIcon className="h-8 w-8 text-muted-foreground mb-2" />}
          <span className="text-xs text-muted-foreground">Clique ou arraste uma imagem</span>
          <span className="text-[10px] text-muted-foreground/70 mt-1">PNG, JPG, WEBP até 2MB</span>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg, image/png, image/webp"
        className="hidden"
        onChange={handleChange}
        disabled={isUploading}
      />
    </div>
  );
}
