import { useState } from 'react';
import { storageService } from '@/services/storage.service';
import { useAuth } from '@/lib/auth/AuthContext';
import { toast } from 'sonner';

interface UseImageUploadOptions {
  bucket: string;
  /**
   * Teto em bytes, para casar com o limite do bucket.
   *
   * Era fixo em 2 MB, que é o limite do bucket `servicos`. O bucket
   * `barbearia_assets` aceita 5 MB para comportar banner, e sem este parâmetro
   * o cliente recusaria um arquivo que o servidor aceitaria — erro que o
   * usuário não teria como entender. O default mantém o comportamento antigo.
   */
  maxBytes?: number;
  onSuccess?: (url: string) => void;
  onError?: (error: Error) => void;
}

const DOIS_MB = 2 * 1024 * 1024;

export function useImageUpload({
  bucket,
  maxBytes = DOIS_MB,
  onSuccess,
  onError,
}: UseImageUploadOptions) {
  const { barbeariaId } = useAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadImage = async (file: File): Promise<string | null> => {
    if (!barbeariaId) {
      toast.error('Barbearia não identificada.');
      return null;
    }

    // Validações básicas no cliente
    if (file.size > maxBytes) {
      const megas = Math.round((maxBytes / (1024 * 1024)) * 10) / 10;
      const error = new Error(`Imagem maior que ${megas} MB`);
      if (onError) onError(error);
      else toast.error(error.message);
      return null;
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      const error = new Error('Formato inválido. Use JPG, PNG ou WEBP.');
      if (onError) onError(error);
      else toast.error(error.message);
      return null;
    }

    setIsUploading(true);
    setProgress(10); // Start progress

    try {
      // Simulação rápida de progresso
      const progressInterval = setInterval(() => {
        setProgress(p => Math.min(p + 10, 90));
      }, 150);

      const url = await storageService.upload(bucket, barbeariaId, file);
      
      clearInterval(progressInterval);
      setProgress(100);

      if (onSuccess) onSuccess(url);
      
      // Delay reset para mostrar o 100% brevemente
      setTimeout(() => {
        setIsUploading(false);
        setProgress(0);
      }, 500);

      return url;
    } catch (err: any) {
      setIsUploading(false);
      setProgress(0);
      if (onError) onError(err);
      else toast.error(err.message || 'Falha no upload da imagem');
      return null;
    }
  };

  const removeImage = async (publicUrl: string) => {
    try {
      await storageService.removerPorUrl(bucket, publicUrl);
    } catch (err) {
      // Falhas na remoção da imagem anterior não quebram o app
      console.error(err);
    }
  };

  return {
    uploadImage,
    removeImage,
    isUploading,
    progress
  };
}
