# PROMPT DE EXECUÇÃO — FASE 0: MENU LATERAL RETRÁTIL

## CONTEXTO

Projeto: **CutHub** — SaaS de agendamento e gestão para barbearias.
Stack: Vite + React + TypeScript + Supabase + Tailwind + shadcn/ui + React Router.

O dashboard possui sete seções: **Dashboard, Agenda, Clientes, Profissionais, Serviços, Financeiro, Configurações**.

O menu lateral atual ocupa permanentemente espaço horizontal fixo, reduzindo a área útil das telas de conteúdo denso — Agenda (visualizações semanal e mensal), Financeiro (tabelas) e Dashboard (gráficos) são as mais prejudicadas.

Esta fase é independente das demais: não depende do banco de dados nem da camada de dados, e pode ser executada em paralelo às Fases −1A e −1B.

## PROBLEMA

Espaço horizontal desperdiçado de forma permanente em telas que precisam de largura.

## OBJETIVO

Menu lateral que permanece recolhido por padrão, exibindo apenas ícones, e se expande revelando os rótulos quando o usuário interage com ele. A expansão não deve deslocar o conteúdo da página.

## DECISÃO DE UX — LEIA ANTES DE IMPLEMENTAR

A solicitação original foi "expandir ao passar o mouse". Implementar **apenas** hover produziria duas falhas conhecidas:

1. **Dispositivos de toque não possuem hover.** Barbearias frequentemente operam a recepção em tablet. Em touch, o menu ficaria permanentemente recolhido, com o usuário vendo apenas ícones sem rótulo.
2. **Navegação por teclado não dispara hover.** Usuários de teclado e leitores de tela não conseguiriam acessar os rótulos.

Portanto, a especificação define **três formas de acionamento complementares**, sem remover o comportamento de hover pedido:

- **Hover** — expande automaticamente (comportamento principal em desktop)
- **Foco por teclado** — expande ao receber foco via Tab
- **Botão de fixar (pin)** — mantém o menu expandido permanentemente, com a preferência persistida

Em telas pequenas, o padrão muda para drawer sobreposto acionado por botão, pois menu lateral fixo é inadequado em largura reduzida.

## ANÁLISE OBRIGATÓRIA ANTES DE ALTERAR QUALQUER COISA

1. Localize o componente de menu lateral atual e o componente de layout do dashboard.
2. Identifique como as rotas estão declaradas e como a rota ativa é determinada hoje.
3. Verifique quais componentes shadcn/ui estão disponíveis em `src/components/ui/` — em especial `tooltip`, `sheet`, `separator` e `button`.
4. Verifique se `lucide-react` está instalado (biblioteca de ícones padrão do shadcn/ui).
5. Identifique os tokens de cor e espaçamento definidos no Tailwind do projeto, para não introduzir valores arbitrários.
6. Verifique se existe suporte a tema claro/escuro já implementado.

**Reporte o resultado antes de escrever código.**

## REQUISITOS FUNCIONAIS

### Estados do menu

| Estado | Largura | Conteúdo visível |
|---|---|---|
| Recolhido (padrão) | 64px | Apenas ícones, centralizados |
| Expandido | 240px | Ícone + rótulo |
| Fixado | 240px | Ícone + rótulo, permanente |

### Comportamento

- **Padrão:** recolhido
- **Hover:** expande após atraso de ~150ms na entrada; recolhe após ~300ms na saída. Os atrasos evitam expansão acidental ao mover o cursor pela lateral da tela e recolhimento indesejado ao deslizar entre itens
- **Foco por teclado:** expande imediatamente, sem atraso
- **Pin:** botão no topo do menu alterna entre fixado e automático. Enquanto fixado, hover e foco não alteram a largura
- **Persistência:** o estado do pin é salvo e restaurado entre sessões
- **Tooltip:** quando recolhido, cada ícone exibe o rótulo em tooltip ao receber hover ou foco. Quando expandido, o tooltip é suprimido (o rótulo já está visível)
- **Item ativo:** a seção correspondente à rota atual é destacada visualmente em ambos os estados — o indicador não pode depender do rótulo, pois no estado recolhido ele não existe

### Comportamento em telas pequenas (< 768px)

- O menu lateral não é exibido
- Um botão no cabeçalho abre um drawer sobreposto, sempre com ícone e rótulo
- O drawer fecha ao selecionar um item e ao tocar fora
- A preferência de pin é ignorada nesta faixa

## ARQUITETURA

O menu é um componente de shell da aplicação. Mantenha-o simples e sem dependências de dados.

```
src/
  components/
    layout/
      Sidebar.tsx           ← menu lateral
      SidebarItem.tsx       ← item individual
      DashboardLayout.tsx   ← layout que compõe sidebar + conteúdo
      navigation.config.ts  ← definição declarativa das seções
  hooks/
    useSidebarState.ts      ← estado de expansão, pin e persistência
```

**`navigation.config.ts`** deve ser a fonte única das seções:

```ts
export const navigationItems = [
  { label: 'Dashboard',     icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Agenda',        icon: Calendar,        path: '/dashboard/agenda' },
  { label: 'Clientes',      icon: Users,           path: '/dashboard/clientes' },
  { label: 'Profissionais', icon: Scissors,        path: '/dashboard/profissionais' },
  { label: 'Serviços',      icon: Tag,             path: '/dashboard/servicos' },
  { label: 'Financeiro',    icon: Wallet,          path: '/dashboard/financeiro' },
  { label: 'Configurações', icon: Settings,        path: '/dashboard/configuracoes' },
] as const
```

Adicionar ou remover uma seção deve exigir alterar apenas este arquivo. Ajuste os caminhos conforme as rotas reais identificadas na análise.

## REQUISITOS TÉCNICOS

### O conteúdo não pode deslocar

A expansão deve sobrepor o conteúdo, não empurrá-lo. Se o menu empurrar a página, toda a tela sofre reflow e a experiência fica instável — especialmente grave em tabelas e gráficos.

Implementação: o container do conteúdo mantém margem esquerda fixa de 64px; o menu expande sobre ele com `position: fixed` e `z-index` adequado. No estado fixado, a margem do conteúdo passa a 240px, pois nesse caso o deslocamento é intencional e estável.

### Animação

- Transição de largura de ~200ms com easing suave
- Rótulos com fade-in curto, ligeiramente atrasado em relação à largura, para evitar texto comprimido durante a transição
- Respeite `prefers-reduced-motion`: quando ativo, aplique a mudança de estado sem animação

### Acessibilidade

- `<nav>` semântico com `aria-label` descritivo
- Todos os itens alcançáveis e acionáveis por teclado (Tab, Enter)
- Item ativo marcado com `aria-current="page"`
- Botão de pin com `aria-pressed` e rótulo acessível
- Anel de foco visível em todos os elementos interativos
- Contraste mínimo 4.5:1 para texto e 3:1 para ícones, em tema claro e escuro
- Estado recolhido: cada item precisa de nome acessível mesmo sem rótulo visível (`aria-label`)

### Performance

- Nenhum listener de `mousemove` global
- Use apenas `onMouseEnter`/`onMouseLeave` no container do menu
- Limpe os timers de atraso no unmount do componente, evitando atualização de estado em componente desmontado

## UX / UI

- Mantenha a identidade visual já existente; não redesenhe o menu
- Use exclusivamente tokens do Tailwind do projeto; nenhum valor arbitrário de cor
- Ícones de tamanho consistente (recomendado 20px)
- Item ativo: indicador que funcione sem texto — barra lateral, fundo destacado ou ambos
- Hover em item: feedback visual distinto do estado ativo
- Transições suaves; nenhum salto de layout

## EDGE CASES

- Rota atual não corresponde a nenhum item da navegação → nenhum item destacado, sem erro
- Usuário move o cursor rapidamente entrando e saindo → o atraso deve evitar piscar; garanta que os timers sejam corretamente cancelados
- Janela redimensionada de desktop para mobile com o menu expandido → transição correta para o modo drawer
- Preferência de pin persistida indisponível ou corrompida → recorrer ao padrão sem quebrar
- Tab navegando para fora do menu → recolher se não estiver fixado
- Rótulo longo no estado expandido → truncar com reticências, tooltip disponível

## TESTES E VALIDAÇÃO

Execute e reporte:

1. `tsc --noEmit` — zero erros
2. Lint — zero erros
3. `npm run build` — sucesso
4. **Navegação por teclado:** percorrer todo o menu usando apenas Tab e Enter; confirmar expansão ao foco e navegação funcional
5. **Responsividade:** validar em 1920px, 1280px, 768px e 375px
6. **Pin:** fixar, recarregar a página, confirmar persistência
7. **Rota ativa:** navegar por todas as sete seções e confirmar destaque correto em ambos os estados
8. **`prefers-reduced-motion`:** ativar no sistema e confirmar ausência de animação
9. **Sem deslocamento:** abrir uma tela com tabela ou grade, expandir o menu por hover e confirmar que o conteúdo não se move

## CRITÉRIOS DE ACEITE

- [ ] Menu recolhido por padrão, exibindo apenas ícones
- [ ] Expande por hover, com atrasos de entrada e saída aplicados
- [ ] Expande ao receber foco por teclado
- [ ] Botão de pin funcional, com preferência persistida entre sessões
- [ ] Conteúdo da página não se desloca durante a expansão por hover
- [ ] Tooltips presentes no estado recolhido e suprimidos no expandido
- [ ] Item da rota ativa destacado visualmente em ambos os estados
- [ ] Drawer funcional abaixo de 768px
- [ ] Navegação completa por teclado, com foco visível
- [ ] `prefers-reduced-motion` respeitado
- [ ] Seções definidas exclusivamente em `navigation.config.ts`
- [ ] `tsc --noEmit`, lint e build sem erros

## RESTRIÇÕES

- **NÃO** altere o conteúdo, a lógica ou o layout interno de nenhuma página do dashboard. O escopo é exclusivamente o shell de navegação
- **NÃO** faça chamadas ao banco de dados nesta fase
- **NÃO** instale bibliotecas de menu de terceiros; use shadcn/ui e Tailwind já presentes
- **NÃO** implemente hover como único meio de acionamento
- **NÃO** use `position: absolute` com valores mágicos; use os tokens de espaçamento do projeto
- **NÃO** redesenhe a identidade visual do menu

## SE VOCÊ DISCORDAR DESTA ESPECIFICAÇÃO

Se durante a análise identificar problema arquitetural, de acessibilidade, de performance ou alternativa significativamente melhor, não execute cegamente. Explique o motivo técnico e proponha a abordagem mais adequada antes de continuar.

Reporte obrigatoriamente antes de prosseguir se encontrar: componente de menu com lógica de negócio acoplada, rotas divergentes das sete seções listadas, ou ausência dos componentes shadcn/ui necessários.
