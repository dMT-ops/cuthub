-- Remove a política falha de INSERT que não validava o isolamento por pasta
DROP POLICY IF EXISTS "Escrita de imagens de servicos por usuarios" ON storage.objects;

-- Recria a política de INSERT com validação rigorosa de path (primeiro segmento = barbearia_id)
CREATE POLICY "Barbearia insere imagens de servico"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'servicos'
  AND (storage.foldername(name))[1] = get_barbearia_do_usuario()::text
);

-- Cria a política de UPDATE
CREATE POLICY "Barbearia atualiza imagens de servico"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'servicos'
  AND (storage.foldername(name))[1] = get_barbearia_do_usuario()::text
)
WITH CHECK (
  bucket_id = 'servicos'
  AND (storage.foldername(name))[1] = get_barbearia_do_usuario()::text
);

-- Cria a política de DELETE
CREATE POLICY "Barbearia remove imagens de servico"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'servicos'
  AND (storage.foldername(name))[1] = get_barbearia_do_usuario()::text
);
