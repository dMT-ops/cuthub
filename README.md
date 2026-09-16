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

2. As migrações em `supabase/migrations/` rodam automaticamente, criando o banco, ativando RLS e inserindo os dados de demonstração (`00008_seed_desenvolvimento.sql`). Em seguida o `supabase/seed.sql` habilita o login das contas de teste (veja abaixo).

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

O ambiente local já sobe pronto para uso. Todas as contas usam a senha `senha123`:

| E-mail | Perfil | Enxerga |
|---|---|---|
| `ownera@cuthub.com` | owner | CutHub Barbearia |
| `ownerb@cuthub.com` | owner | Barbearia Concorrente |
| `admin@cuthub.com` | admin_supremo | todas as barbearias |

As duas contas de owner existem para testar o isolamento por RLS: cada uma enxerga apenas os próprios dados.

### Onde essas credenciais vivem — e por quê

A migration `00008_seed_desenvolvimento.sql` cria as contas em `auth.users` informando apenas `id` e `email`. Isso basta para as foreign keys, mas **não** para o GoTrue autenticar: faltam senha, `instance_id`, `aud`/`role`, o registro em `auth.identities`, e as colunas de token em NULL fazem o login falhar com `Database error querying schema`.

Quem completa essas contas é o `supabase/seed.sql`, que o CLI executa **apenas no ambiente local** (`supabase start` e `supabase db reset`) e nunca em um `db push` ou ambiente remoto. É por isso que a senha de desenvolvimento mora lá e não em uma migration — migration roda em todo lugar, inclusive em produção.

O script é idempotente e pode ser reexecutado à vontade:

```bash
npx supabase db reset
```

## Estrutura

```
src/services/*.service.ts   consultas ao Supabase; lançam erro, nunca engolem
src/hooks/use*.ts           TanStack Query: cache, invalidação e mutações
src/components/<módulo>/    UI de cada domínio
src/pages/dashboard/        composição das telas
src/lib/                    regras puras (disponibilidade, agendamento, financeiro)
```

Módulos novos podem seguir o modelo de `Clientes.tsx` (tabela + paginação) ou `Servicos.tsx` (grid + filtros). Os relatórios `FASE-*.md` registram as decisões técnicas, as validações feitas e as pendências em aberto de cada etapa.
