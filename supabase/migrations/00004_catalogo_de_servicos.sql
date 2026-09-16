CREATE TYPE categoria_servico AS ENUM
  ('corte','barba','combo','quimica','estetica','infantil','outro');

ALTER TABLE servico
  ADD COLUMN IF NOT EXISTS categoria categoria_servico NOT NULL DEFAULT 'outro',
  ADD COLUMN IF NOT EXISTS descricao TEXT,
  ADD COLUMN IF NOT EXISTS imagem_url TEXT,
  ADD COLUMN IF NOT EXISTS ordem INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS atualizado_em TIMESTAMPTZ DEFAULT NOW();

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('servicos', 'servicos', true, 2097152, '{image/jpeg,image/png,image/webp}')
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Leitura publica de imagens de servicos"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'servicos');

CREATE POLICY "Escrita de imagens de servicos por usuarios"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'servicos' AND public.get_barbearia_do_usuario() IS NOT NULL);
