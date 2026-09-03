## Cadências em fases

Transformar uma cadência em um "trilho" composto por várias cadências existentes (fases). O lead percorre fase a fase; ao avançar, as atividades da fase anterior somem da fila e só aparecem as da fase atual.

### Banco de dados

1. **`cadences`** — novo campo `phases jsonb default '[]'`
   - Formato: `[{ id, cadenceId, name }, ...]`
   - Se vazio → cadência funciona como hoje (modo simples).
   - Se preenchido → vira "cadência mãe" e ignora `days` próprios; usa os `days` da cadência referenciada na fase atual.

2. **`leads`** — novo campo `phase_index integer default 0`
   - Aponta para a fase atual dentro de `cadence.phases`.

3. **`activity_completions`** — novo campo `phase_index integer default 0`
   - Permite registrar conclusões por fase sem conflito.
   - A chave de "atividade concluída" passa a incluir `phase_index`.

### UI — Editor de Cadência (`CadenceDetail.tsx`)

- Nova seção **"Fases"** no topo:
  - Toggle: *Cadência simples* vs *Cadência em fases*.
  - Em modo fases: lista ordenável de fases. Cada item tem `Nome` + select da cadência referenciada (busca em `cadences` que sejam simples).
  - Botões: Adicionar fase, remover, reordenar.
- Quando em modo fases, esconder o editor de dias (os dias vêm das cadências referenciadas).

### UI — Execução (`Execucao.tsx`)

- Para cada lead, resolver a cadência efetiva:
  - Se a cadência tem `phases` → usar `phases[lead.phase_index].cadenceId` para buscar os `days`.
  - Senão → comportamento atual.
- Filtro de completions usa `phase_index` do lead.
- No card da atividade atual, mostrar badge **"Fase X de N — Nome da fase"**.
- Novo botão **"Avançar fase ➜"** ao lado de Concluir/Ganho (só aparece se a cadência tem fases e não é a última).
  - Confirma em modal, incrementa `lead.phase_index`, mostra toast.
- **Avanço automático**: quando todas as atividades da fase atual ficam concluídas/ignoradas e existe uma próxima fase, incrementa automaticamente `phase_index` (executado no `useEffect` após mudanças em completions).
- "Marcar como Ganho" continua funcionando em qualquer fase (sem mudança).

### UI — Lead (`LeadDetail.tsx`)

- Mostrar fase atual e progresso (Fase 2 de 3 — "Qualificação").
- Botão "Avançar fase" também disponível aqui para o gestor.

### Arquivos a editar

- `supabase/migrations/...` — adicionar colunas + manter RLS atual.
- `src/lib/cadences-store.ts` — tipos + campo `phases`.
- `src/lib/leads-store.ts` — tipo + `phaseIndex`, função `advancePhase(leadId)`.
- `src/lib/completions-store.ts` — incluir `phaseIndex` na chave e payload.
- `src/pages/CadenceDetail.tsx` — editor de fases.
- `src/pages/Execucao.tsx` — resolver cadência efetiva, badge de fase, botão avançar, avanço automático.
- `src/pages/LeadDetail.tsx` — exibir fase atual + botão avançar.

### Compatibilidade

- Leads existentes ficam com `phase_index = 0`.
- Cadências existentes ficam com `phases = []` (modo simples — comportamento inalterado).
- Conclusões antigas ficam com `phase_index = 0`, consistentes com leads em fase 0.
