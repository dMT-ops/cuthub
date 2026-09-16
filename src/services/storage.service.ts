import { supabase } from '@/lib/supabase';

export const storageService = {
  /**
   * Faz upload de um arquivo para o bucket especificado.
   * Retorna a URL pública completa.
   */
  async upload(bucket: string, barbeariaId: string, file: File): Promise<string> {
    const ext = file.name.split('.').pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const path = `${barbeariaId}/${fileName}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: false });

    if (error) {
      throw new Error(`Falha ao enviar arquivo: ${error.message}`);
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  },

  /**
   * Remove um arquivo do bucket utilizando a URL pública.
   */
  async removerPorUrl(bucket: string, publicUrl: string): Promise<void> {
    if (!publicUrl) return;

    try {
      // Extrair o path da URL pública
      // Formato típico: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
      const bucketMarker = `/public/${bucket}/`;
      const bucketIndex = publicUrl.indexOf(bucketMarker);
      
      if (bucketIndex === -1) {
        console.warn(`URL inválida para remoção de storage: ${publicUrl}`);
        return;
      }

      const path = publicUrl.substring(bucketIndex + bucketMarker.length);

      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) {
        throw new Error(`Falha ao remover arquivo: ${error.message}`);
      }
    } catch (err: any) {
      console.error('Erro ao remover imagem anterior do Storage:', err.message);
      // Não lançamos o erro adiante porque a remoção do antigo é um cleanup.
      // A falha na limpeza não deve quebrar o fluxo principal da aplicação.
    }
  }
};
