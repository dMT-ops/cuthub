# CutHub (Vite + React + Supabase)

Este é o MVP do Cuthub, uma aplicação SPA usando Vite, React, e Tailwind/shadcn, totalmente integrada ao Supabase pelo cliente.

## Simplificações Assumidas

1. **Cliente vs Usuário**: O `cliente` (tabela que guarda a ficha de agendamento na barbearia) e o `usuario_perfil` (conta real de login com `tipo='cliente'`) são entidades separadas por enquanto.
2. **Autenticação**: Foi reduzida ao mínimo. Não exigimos confirmação de e-mail e não há fluxos complexos de recuperação de senha por enquanto.
3. **RLS (Row Level Security)**: Foi implementado o isolamento total baseado no `barbearia_id`. Usuários do tipo `admin_supremo` contornam a restrição e enxergam tudo.

## Como Rodar

1. Inicie o Supabase localmente na raiz do projeto (necessita Docker):
   ```bash
   npx supabase start
   ```

2. As migrações (`00001_initial_schema.sql`) e o `seed.sql` rodarão automaticamente, criando o banco de dados, ativando RLS e inserindo o usuário Admin.

3. Instale as dependências e rode o frontend:
   ```bash
   npm install
   npm run dev
   ```

## Credenciais do Admin

Foi criado um script de Seed (`supabase/seed.sql`) que insere automaticamente a conta Admin Supremo no Auth do Supabase:

- **E-mail**: `admin@cuthub.com`
- **Senha**: `admin123`

Use essas credenciais na tela de Login inicial para acessar o sistema. Módulos futuros podem ser copiados do modelo construído na página `Clientes.tsx`.
