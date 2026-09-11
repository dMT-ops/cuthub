-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE tipo_usuario AS ENUM ('admin_supremo', 'owner', 'cliente', 'profissional');
CREATE TYPE status_agendamento AS ENUM ('pendente', 'confirmado', 'concluido', 'cancelado');
CREATE TYPE tipo_lancamento AS ENUM ('entrada', 'saida');

-- Tabelas
CREATE TABLE barbearia (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE usuario_perfil (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tipo tipo_usuario NOT NULL DEFAULT 'cliente',
    barbearia_id UUID REFERENCES barbearia(id) ON DELETE SET NULL,
    nome VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE cliente (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbearia_id UUID NOT NULL REFERENCES barbearia(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    telefone VARCHAR(20),
    email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'ativo',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE profissional (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbearia_id UUID NOT NULL REFERENCES barbearia(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'ativo',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE servico (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbearia_id UUID NOT NULL REFERENCES barbearia(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    duracao_minutos INT NOT NULL,
    preco DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'ativo',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE agendamento (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbearia_id UUID NOT NULL REFERENCES barbearia(id) ON DELETE CASCADE,
    cliente_id UUID NOT NULL REFERENCES cliente(id) ON DELETE CASCADE,
    profissional_id UUID NOT NULL REFERENCES profissional(id) ON DELETE CASCADE,
    data_hora TIMESTAMP WITH TIME ZONE NOT NULL,
    status status_agendamento DEFAULT 'pendente',
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE agendamento_servico (
    agendamento_id UUID NOT NULL REFERENCES agendamento(id) ON DELETE CASCADE,
    servico_id UUID NOT NULL REFERENCES servico(id) ON DELETE CASCADE,
    preco_cobrado DECIMAL(10, 2) NOT NULL,
    PRIMARY KEY (agendamento_id, servico_id)
);

CREATE TABLE lancamento_financeiro (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barbearia_id UUID NOT NULL REFERENCES barbearia(id) ON DELETE CASCADE,
    agendamento_id UUID REFERENCES agendamento(id) ON DELETE SET NULL,
    tipo tipo_lancamento NOT NULL,
    valor DECIMAL(10, 2) NOT NULL,
    descricao VARCHAR(255),
    data_lancamento TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE configuracao_barbearia (
    barbearia_id UUID PRIMARY KEY REFERENCES barbearia(id) ON DELETE CASCADE,
    horario_abertura TIME NOT NULL DEFAULT '09:00:00',
    horario_fechamento TIME NOT NULL DEFAULT '19:00:00',
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Funções auxiliares para RLS
CREATE OR REPLACE FUNCTION is_admin_supremo()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM usuario_perfil
        WHERE id = auth.uid() AND tipo = 'admin_supremo'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_barbearia_do_usuario()
RETURNS UUID AS $$
DECLARE
    v_barbearia_id UUID;
BEGIN
    SELECT barbearia_id INTO v_barbearia_id FROM usuario_perfil WHERE id = auth.uid();
    RETURN v_barbearia_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ativando RLS
ALTER TABLE barbearia ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuario_perfil ENABLE ROW LEVEL SECURITY;
ALTER TABLE cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE profissional ENABLE ROW LEVEL SECURITY;
ALTER TABLE servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE agendamento_servico ENABLE ROW LEVEL SECURITY;
ALTER TABLE lancamento_financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracao_barbearia ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- Barbearia: admin ve tudo, dono so ve a sua
CREATE POLICY "Barbearia visible to owner or admin"
    ON barbearia FOR ALL
    USING (id = get_barbearia_do_usuario() OR is_admin_supremo());

-- Usuario Perfil: o proprio usuario, ou admin ve tudo, ou donos veem usuarios da sua barbearia
CREATE POLICY "Perfil visible to self, admin, or same barbearia"
    ON usuario_perfil FOR ALL
    USING (
        id = auth.uid() 
        OR is_admin_supremo() 
        OR (barbearia_id IS NOT NULL AND barbearia_id = get_barbearia_do_usuario())
    );

-- Políticas padrão para tabelas com barbearia_id:
-- Acesso se for admin supremo ou se a barbearia_id bater com a do usuário logado
CREATE POLICY "Cliente isolated by barbearia" ON cliente FOR ALL USING (barbearia_id = get_barbearia_do_usuario() OR is_admin_supremo());
CREATE POLICY "Profissional isolated by barbearia" ON profissional FOR ALL USING (barbearia_id = get_barbearia_do_usuario() OR is_admin_supremo());
CREATE POLICY "Servico isolated by barbearia" ON servico FOR ALL USING (barbearia_id = get_barbearia_do_usuario() OR is_admin_supremo());
CREATE POLICY "Agendamento isolated by barbearia" ON agendamento FOR ALL USING (barbearia_id = get_barbearia_do_usuario() OR is_admin_supremo());

-- agendamento_servico precisa fazer join pra validar, ou ser verificado de forma simples.
-- Como é uma tabela junção, vamos permitir se o agendamento_id pertencer a uma barbearia válida para o usuário
CREATE POLICY "Agendamento_servico isolated by barbearia" ON agendamento_servico FOR ALL 
USING (
    is_admin_supremo() 
    OR EXISTS (
        SELECT 1 FROM agendamento a 
        WHERE a.id = agendamento_servico.agendamento_id 
        AND a.barbearia_id = get_barbearia_do_usuario()
    )
);

CREATE POLICY "Financeiro isolated by barbearia" ON lancamento_financeiro FOR ALL USING (barbearia_id = get_barbearia_do_usuario() OR is_admin_supremo());
CREATE POLICY "Configuracao isolated by barbearia" ON configuracao_barbearia FOR ALL USING (barbearia_id = get_barbearia_do_usuario() OR is_admin_supremo());

-- Políticas para usuários não logados poderem CRIAR barbearia e usuario_perfil durante o CADASTRO
-- Obs: A política FOR ALL restringe INSERT se não for explicitamente permitida.
-- Como o RLS bloqueia INSERT se a USING expression não bater (em algumas versões do Postgres WITH CHECK é necessário),
-- Para cadastro aberto, precisamos permitir INSERT:
CREATE POLICY "Permitir insercao de barbearia no cadastro" ON barbearia FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir insercao do proprio perfil no cadastro" ON usuario_perfil FOR INSERT WITH CHECK (id = auth.uid());
