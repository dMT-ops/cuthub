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

2. As migrações em `supabase/migrations/` rodarão automaticamente, criando o banco de dados, ativando RLS e inserindo os dados de desenvolvimento (`00008_seed_desenvolvimento.sql`).

3. Crie um arquivo `.env.local` na raiz com as credenciais que o `npx supabase status` imprimiu:
   ```
   VITE_SUPABASE_URL=http://127.0.0.1:54321
   VITE_SUPABASE_ANON_KEY=<ANON_KEY do supabase status>
   ```
   Sem essas variáveis o app falha na inicialização com mensagem explícita — não há fallback silencioso.

4. Instale as dependências e rode o frontend:
   ```bash
   npm install
   npm run dev
   ```

## Contas de desenvolvimento

O seed cria três contas (`admin@cuthub.com`, `ownera@cuthub.com`, `ownerb@cuthub.com`), sendo as duas últimas donas de barbearias distintas — é esse par que permite testar o isolamento por RLS.

**Atenção:** o seed insere essas linhas em `auth.users` com apenas `id` e `email`. Sem senha e sem registro em `auth.identities`, o login não funciona (o GoTrue responde `Database error querying schema`). Até que exista um script de seed de desenvolvimento que trate o Auth corretamente, é preciso completar esses registros manualmente no banco local. Senhas de desenvolvimento **não devem** ser gravadas em migrations, que rodam em todos os ambientes.

Módulos futuros podem seguir o modelo das páginas `Clientes.tsx` (tabela + paginação) ou `Servicos.tsx` (grid + filtros).
