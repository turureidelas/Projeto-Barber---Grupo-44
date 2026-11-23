# CLAUDE.md — Na Régua (Painel Web)

Guia de referência para todas as sessões. Leia antes de qualquer alteração.

## Produto

**Na Régua** é um sistema de agendamento para barbearias pequenas e médias (1 a 8 cadeiras, incluindo barbeiros autônomos que alugam cadeira). Projeto integrador — Tecnologia em Análise e Desenvolvimento de Sistemas (SENAC).

- Problema: agenda de papel/WhatsApp → horários sobrepostos, faltas sem aviso, interrupções e nenhum indicador de gestão.
- Produto completo: app mobile do cliente (fora deste repo) + **painel web responsivo para profissional e gestor (ESTE repo)**. Ambos consumirão a mesma API.
- **O backend ainda não existe.** O painel roda sobre repositórios in-memory (persistidos em `localStorage`) atrás de portas; depois trocamos por HTTP sem mexer em regra nem em tela.

### Perfis (RBAC)

| Perfil (código)                 | Pode                                                                                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Gestor / Proprietário (`OWNER`) | Tudo: agenda de todos, serviços, profissionais, escalas, clientes, relatórios, configurações, política de cancelamento                                       |
| Profissional (`PROFESSIONAL`)   | Própria agenda, bloquear/liberar horários pontuais, registrar atendimento, ver a própria produtividade e comissão. **Não** edita a própria escala            |
| Recepcionista (`RECEPTIONIST`)  | Agenda de todos, confirmar/remarcar/cancelar, registrar comparecimento e pagamento, cadastro de clientes. **Sem** relatórios financeiros e sem configurações |

### Persona — Ricardo Almeida (34)

Dono da "Barbearia Nova Era" (3 cadeiras, 2 funcionários). Consulta a agenda no celular entre atendimentos, às vezes com a mão molhada e em ambiente barulhento. Familiaridade com tecnologia intermediária para baixo: abandona o que parece burocrático. Quer saber faturamento, ocupação, faltas e comissão sem interpretar gráficos complexos.

## Regras de UX (obrigatórias)

- A agenda do dia (home) mostra o essencial em segundos: **próximo cliente**, horários do dia, ações rápidas.
- Alvos de toque **≥ 44×44px**, contraste alto, pouca informação por tela, ações principais com 1 toque.
- pt-BR simples, sem jargão: "Cliente faltou" (não "No-show"), "Bloquear horário" (não "Criar indisponibilidade").
- **Mobile-first** na agenda; tela larga aproveitada em cadastros e relatórios.
- Relatórios: cartões com números grandes + no máximo barras/linhas simples (feitos à mão com SVG + Tailwind, **sem lib de gráfico**).
- Acessibilidade: HTML semântico, `label` em todo input, foco visível, navegação por teclado, `aria-*` quando necessário.
- Toda tela tem estados de **loading, vazio e erro**.
- Remarcar/agendar mostra **apenas horários válidos** (calculados pelo motor), em vez de deixar errar.

## Regras de negócio

### Motor de disponibilidade (coração do sistema — `domain/services`)

- **Nunca** sobrepor agendamentos ativos do mesmo profissional.
- Horário disponível ⇔ dentro da escala do profissional **E** fora de intervalos/bloqueios **E** `[início, início + duração do serviço/combo)` não colide com agendamento ativo.
- Intervalos são semiabertos `[start, end)`: terminar 10:00 e começar 10:00 **não** colide.
- Agendamentos ativos: `SCHEDULED`, `CONFIRMED`, `IN_SERVICE`. Cancelar ou remarcar libera o horário anterior imediatamente.
- Grade de horários de **15 em 15 minutos**.
- Lógica pura (sem React, sem I/O). Domínio e aplicação **não usam `new Date()`/`Date.now()`** (barrado no lint): o domínio recebe `now` por parâmetro e os casos de uso obtêm da porta `Clock`. Cobertura do domínio: **100%** (exigida em `npm run coverage`).
- Implementação: `src/domain/services/AvailabilityService.ts` → `checkSlot` (retorna motivo), `assertSlotAvailable` (lança erro tipado), `listAvailableSlots` (grade de 15 min).

### Status do agendamento

`SCHEDULED` (Agendado) → `CONFIRMED` (Confirmado) → `IN_SERVICE` (Em atendimento, "compareceu") → `COMPLETED` (Concluído, gera `ServiceRecord`).
Saídas: `CANCELLED` (Cancelado), `NO_SHOW` (Cliente faltou). Tabela completa em `domain/entities/AppointmentStatus.ts` (`ALLOWED_TRANSITIONS`):

- Concluir é permitido direto de `SCHEDULED`/`CONFIRMED` (1 toque), não só de `IN_SERVICE`.
- `NO_SHOW` → `IN_SERVICE` permitido (desfaz "faltou" quando o cliente chega atrasado).
- Remarcar mantém a duração, pode trocar de profissional e volta para `SCHEDULED`.
- Cancelar/remarcar só a partir de `SCHEDULED`/`CONFIRMED`.

### Políticas

- **Cancelamento/remarcação:** antecedência mínima (horas, padrão 2h) configurável. Vale para mudanças **feitas pelo cliente**. Gestor/recepcionista podem cancelar fora do prazo, mas a UI avisa e exige motivo.
- **Falta:** tolerância configurável (padrão 15 min após o início) antes de permitir "Cliente faltou". Histórico do cliente mostra o número de faltas.
- **Comissão:** percentual por profissional, calculado sobre o **valor efetivamente pago**. Autônomo que aluga cadeira também é modelado só por % na v1.
- **Ocupação:** minutos agendados (exceto cancelados) ÷ (minutos de escala − bloqueios).
- Formas de pagamento: dinheiro, Pix, débito, crédito.

### Modelo de domínio (código em inglês)

Entidades **imutáveis** (cada mudança devolve nova instância; `create`/`restore` validam invariantes; `toProps()` para persistência):

- `Barbershop` (contém `CancellationPolicy`), `User` (role `OWNER` | `PROFESSIONAL` | `RECEPTIONIST`; `PROFESSIONAL` exige `professionalId`), `Professional` (foto, especialidade, `commission: Percentage`, `schedule: WorkSchedule`), `Service` (`kind: SINGLE | COMBO`; combo = ≥2 serviços simples, duração/preço próprios), `Client` (consentimento LGPD), `Appointment`, `TimeBlock`.
- **Escala** = value object `WorkSchedule` dentro de `Professional` (por dia da semana: `hours` + `breaks`).
- **Atendimento** = `ServiceRecord` embutido no `Appointment` ao concluir (valor pago, forma de pagamento, horário).
- IDs com tipo próprio (`ClientId`, `ProfessionalId`…) via `toId<T>()`; gerados fora do domínio.

Value objects: `Money` (centavos), `Percentage` (inteiro 0–100), `Duration` (minutos), `TimeRange` (instantes, `[start, end)`), `TimeOfDay`/`TimeWindow` (horário de parede), `LocalDate` (data em São Paulo), `Phone` (com `masked()`), `Email` (com `masked()`), `CancellationPolicy`, `WorkSchedule`.
RBAC em `domain/services/access-control.ts` (`hasPermission`, `canManageAgendaOf`…). Erros em `domain/errors` com `code` estável (`DOMAIN_ERROR_CODES`) para a UI traduzir.
Builders de teste em `src/domain/testing/builders.ts` (dia de referência: quarta 18/11/2026).
Todas as entidades têm `barbershopId` (UI v1 opera uma barbearia só, dados já preparados para várias).

### Aplicação e dados de demonstração

- Casos de uso em `src/application/use-cases` (classe com `execute(input)`), contrato completo no tipo `UseCases` (`use-cases/index.ts`) e montagem em `createUseCases(deps)`. Cada caso de uso declara as dependências que usa com `Pick<ApplicationDependencies, ...>`.
- **Entrada e saída primitivas:** IDs `string`, instantes ISO 8601, datas `"yyyy-MM-dd"`, dinheiro em centavos. Saída sempre em **DTOs** (`application/dto`), nunca entidades. Telefone/e-mail saem mascarados.
- O usuário que age é resolvido da **sessão** (`requireActor`), nunca recebido da UI. Permissão checada em todo caso de uso.
- Erros: `DomainError` e `ApplicationError` (`NOT_FOUND`, `NOT_AUTHENTICATED`, `INVALID_CREDENTIALS`, `RESOURCE_INACTIVE`, `ALREADY_EXISTS`); `errorCodeOf(error)` dá o código para a UI traduzir.
- Mock: `InMemoryDatabase` (linhas JSON em `localStorage`, chave `na-regua:demo-db:v1`, latência artificial de 150 ms) + mappers linha⇄entidade em `infrastructure/mappers` (reaproveitáveis para a API). Sessão em `na-regua:session` (só `userId` + validade).
- Dados de demonstração gerados por `createDemoSeed(now)` (determinístico; 3 semanas de histórico + hoje + 10 dias à frente, validados pelo motor). Contas (senha `demo123`): `ricardo@novaera.demo` (gestor), `bruno@novaera.demo` e `diego@novaera.demo` (profissionais), `camila@novaera.demo` (recepcionista).
- Composition root: `src/main/container.ts` (`createContainer`); a UI recebe os casos de uso via `UseCasesProvider` / `useUseCases()`.
- Testes de casos de uso usam `createTestApp()` (`src/main/testing`): app real em memória com fixture pequena e `FixedClock` (quarta 18/11/2026 08:00). Só arquivos `*.test.ts` de `application` podem importar `@main` (exceção no lint).

### Interface (presentation)

- Tokens de design em `presentation/styles/index.css` (`@theme`): `bg`, `surface`(-2/-3), `line`/`line-strong` (bordas de campo ≥ 3:1), `fg`/`fg-muted`, `accent` (dourado) + `accent-fg`, `success`/`warning`/`danger`/`info`. Só tema escuro na v1.
- Componentes em `components/ui`: `Button`/`IconButton` (`buttonClasses()` para links), `TextField`/`SelectField` (label + hint/erro via `aria-describedby`), `Card`, `Badge`, `Avatar`, `Modal` (`<dialog>` nativo; gaveta inferior no celular), `PageHeader` (o único `<h1>`), `Table`/`Th`/`Td`, `LoadingState`/`EmptyState`/`ErrorState`, toasts (`useToast()`).
- Rotas em `app/routes.ts` (`paths`, `ROUTE_PERMISSIONS`, `navItemsFor(user)`); URLs em pt-BR (`/entrar`, `/semana`, `/clientes`, `/relatorios`…). `RequireAuth` (rota-layout) e `RequirePermission` (tela "Sem acesso").
- Layout `AppShell`: menu lateral no desktop (`lg:`), barra superior + menu inferior (até 4 itens + "Mais") no celular.
- Estado de servidor com TanStack Query (`app/query-client.ts`: só erro `UNEXPECTED` é repetido; `NOT_AUTHENTICATED` encerra a sessão). Chaves em `hooks/query-keys.ts`. Sessão: `useSession`/`useCurrentUser`/`useSignIn`/`useSignOut`.
- Mensagens de erro: `errorMessage(error)` (`i18n/errors.ts`) → `ptBR.errors[code]`.
- `eslint-plugin-jsx-a11y` (strict) ativo em todo `.tsx` (instalado com `overrides` no `package.json` porque ainda não declara suporte ao ESLint 10).
- Testes de tela: `renderApp({ route, as, app })` (`src/main/testing/renderApp.tsx`) renderiza o app inteiro sobre os casos de uso reais; `createTestApp({ dataset: 'demo' })` usa o seed completo. jsdom ganha polyfill de `showModal`/`close` em `vitest.setup.ts`.
- Relógio da UI: `ClockContext` (mesmo `Clock` dos casos de uso, injetado pelo `main`); use `useNow()`/`useToday()` — nunca `new Date()` direto em tela.
- **Agenda do dia** (`pages/today`): dia e profissional na URL (`?dia=yyyy-MM-dd&profissional=<id>`); "Próximo cliente" em destaque (`SpotlightCard`), "Em atendimento agora" compacto (`InServiceList`), resumo (`DaySummary`), lista com bloqueios e cancelados ocultos por padrão. Ações de 1 toque em `components/agenda/AppointmentActionButtons` + `hooks/useAgenda.ts` (toasts; "Faltou" com **Desfazer** no toast em vez de diálogo de confirmação). Concluir: `CompleteDialog` (valor pré-preenchido, Pix pré-selecionado).
- **Agenda da semana** (`pages/week`): `GetWeeklyAgenda` (7 dias de um profissional com horário de trabalho, agendamentos e bloqueios). URL `?semana=<segunda>&profissional=<id>&dia=<dia no celular>`. Mesmo DOM para celular (abas de dia, só o dia escolhido) e desktop (7 colunas, `lg:`). Cartão abre `AppointmentDetailsDialog` → Confirmar / Remarcar (`RescheduleDialog` + `SlotPicker`, só horários livres) / Cancelar (`CancelDialog`: motivo obrigatório quando `now > changeDeadline`). `BlockTimeDialog`, `NewAppointmentDialog` (busca de cliente com debounce) e liberar bloqueio via `ConfirmDialog`. Mutações em `useAgendaManagement()`.
- `AppointmentDTO.changeDeadline` e `noShowAllowedFrom` vêm do servidor: a UI só compara com `useNow()`, não recalcula regra.
- Componentes compartilhados da agenda em `components/agenda` (`filters.tsx` com `PeriodNavigator`/`ProfessionalFilter`, `timeline.ts`). Conteúdo largo: `main` vai até `max-w-7xl`; a agenda do dia limita a si mesma a `max-w-3xl`.
- Dinheiro digitado: `parseMoneyInput`/`formatMoneyInput` (`shared/money.ts`). Datas: `startOfWeek`, `localDateTimeToIso`, `isoToLocalDate`, `formatDateTime` (`shared/format.ts`).
- **Cadastros** (só o gestor, exceto clientes que a recepção também gerencia):
  - Serviços (`pages/services`): tabela + `ServiceFormDialog` (serviço ou combo; combo mostra quanto custaria separado). Casos de uso `CreateService`/`UpdateService`/`SetServiceActive`.
  - Equipe (`pages/professionals`): cartões com comissão e escala; `ProfessionalFormDialog` e `ScheduleDialog` (um intervalo por dia na UI; o domínio aceita vários). Novo profissional abre a escala em seguida. Mudar a escala **não** mexe em agendamentos já marcados.
  - Clientes (`pages/clients`): lista mascarada com busca, ficha `/clientes/:id` (telefone completo, consentimento, números de `summarizeClientHistory`, histórico). Cadastro exige consentimento LGPD (`CURRENT_TERMS_VERSION`) e telefone único (`ALREADY_EXISTS`). "Total gasto" só para quem vê relatórios. Cadastro rápido dentro do Novo agendamento (`QuickClientForm`, sem `<form>` aninhado).
- Dados de demonstração: 360 clientes fictícios; o gerador prefere clientes sem visita nos últimos 10 dias (retorno realista).
- **Relatórios** (`pages/reports`, rota `/relatorios`; o profissional vê "Meus números"):
  - Métricas puras em `domain/services/reports.ts` (`buildPeriodReport` + `revenueOf`, `noShowRate`, `occupancyOf`, `rankServices`, `paymentBreakdown`, `clientReturn`, `periodDates`). Período de no máximo 366 dias.
  - Definições: faturamento = soma do valor pago nos concluídos; comissão = `commissionOn(faturamento do profissional)`; ocupação = minutos marcados (exceto cancelados; falta conta) ÷ (escala − intervalos − bloqueios, bloqueios sobrepostos contados uma vez), limitada a 100%; faltas = faltas ÷ (concluídos + faltas); serviços mais pedidos = agendamentos não cancelados; retorno = clientes com atendimento concluído no período que já tinham vindo nos 12 meses anteriores (`RETURN_LOOKBACK_DAYS`) + média de `summarizeClientHistory().averageDaysBetweenVisits`.
  - Caso de uso `GetReport({ from, to, professionalId? })` → `ReportDTO` (centavos, percentuais inteiros ou `null`). Gestor: barbearia toda (`scope: 'BARBERSHOP'`) ou um profissional; profissional: sempre os próprios números, ignorando o `professionalId` enviado; recepção: `PERMISSION_DENIED`. Profissional inativo só aparece se teve agendamento no período.
  - URL: `?periodo=hoje|semana|mes|datas&de=yyyy-MM-dd&ate=yyyy-MM-dd` (padrão: semana). "Esta semana" e "Este mês" vão **até hoje** (o futuro não dilui os números). Lógica em `pages/reports/period.ts`.
  - Gráficos feitos à mão em `components/reports/charts.tsx` (`Meter`, `BarList` em SVG decorativo; o valor sempre aparece como texto). Chave de cache `queryKeys.report` fica sob o prefixo `agenda`, então qualquer mudança de agendamento atualiza os números.
- A tela da fase 8 (configurações) ainda é placeholder em `pages/placeholders.tsx`; ganha sua pasta quando for construída.

### LGPD

Coletar só o necessário; mascarar telefone/e-mail em listagens; **nenhum dado pessoal em `console.*` nem em URL** (use IDs); registro de consentimento do cliente (data, versão do termo, canal).

## Stack

React 19 + TypeScript (strict) + Vite · Tailwind CSS v4 (`@tailwindcss/vite`) · React Router (modo declarativo) · TanStack Query (estado de servidor) + hooks do React (estado local, sem Redux) · React Hook Form + Zod (`@hookform/resolvers`) · date-fns + `@date-fns/tz` (pt-BR, fuso `America/Sao_Paulo`) · Vitest + Testing Library + jsdom · ESLint + Prettier · `lucide-react`.
Componentes de UI próprios em `presentation/components/ui`. **Nenhuma dependência nova sem perguntar ao usuário.**

## Arquitetura (Clean Architecture)

Dependências apontam **para dentro**. Garantido por `no-restricted-imports` no `eslint.config.js`.

```
src/
├── domain/          # entidades, value objects, erros, serviços de domínio (puro)
├── application/     # use-cases/, ports/ (interfaces), dto/ — só importa domain
├── infrastructure/  # repositories/in-memory, repositories/http, http/, auth/ — implementa ports
├── presentation/    # app/, pages/, components/(ui|feature), hooks/, i18n/, styles/
├── main/            # composition root: monta implementações e injeta via Context; config/env
└── shared/          # utilitários sem regra de negócio; não importa nenhuma camada
```

| Camada           | Pode importar                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------- |
| `domain`         | `shared`, `date-fns`, `@date-fns/tz`                                                                           |
| `application`    | `domain`, `shared`                                                                                             |
| `infrastructure` | `application`, `domain`, `shared`                                                                              |
| `presentation`   | `application` (casos de uso, DTOs), `domain` (tipos/erros para exibição), `shared`. **Nunca** `infrastructure` |
| `main`           | tudo                                                                                                           |
| `shared`         | nada do projeto                                                                                                |

Aliases: `@domain`, `@application`, `@infrastructure`, `@presentation`, `@main`, `@shared` (use-os entre camadas; relativo dentro da mesma camada).

## Convenções

- Código, nomes de arquivos e identificadores em **inglês**; textos de UI em **pt-BR** centralizados em `presentation/i18n/pt-BR.ts`.
- Sem `any`; sem `enum` TS (use `as const` + union); funções pequenas; SOLID.
- Sem lógica de negócio em componente — componente chama hook → hook chama caso de uso.
- Dinheiro sempre em centavos (inteiro). Datas sempre com fuso explícito (`America/Sao_Paulo`).
- Erros de domínio tipados (ex.: `ScheduleConflictError`) → mapeados para mensagem amigável na UI.
- Testes ao lado do código (`*.test.ts(x)`). Domínio e casos de uso: unitários. Componentes críticos: Testing Library.
- Commits pequenos, Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`, `refactor:`).
- Env via `import.meta.env` (somente em `main/config/env.ts`); ver `.env.example`.
- Mock (`VITE_USE_MOCKS=true`) inclui botão "Resetar dados de demonstração" e um simulador de ações do cliente (cancelar/remarcar) para demonstrar notificações.

## Comandos

```bash
npm run dev          # servidor de desenvolvimento
npm run build        # typecheck + build de produção
npm run typecheck    # tsc sem emitir
npm run lint         # ESLint
npm run format       # Prettier (escreve)
npm run test         # Vitest (uma execução)
npm run test:watch   # Vitest em watch
npm run coverage     # cobertura
```

## Fluxo de trabalho

Uma fase por vez. Ao fim de cada fase: `lint`, `typecheck`, `coverage` (ou `test`) verdes → commit → resumo (o que foi feito, como testar no navegador, próximo passo) → **esperar o ok do usuário**. Decisão ambígua: escolher a opção mais simples que respeite a arquitetura e avisar em uma linha.

### Fases

0. Setup ✅ · 1. Domínio ✅ · 2. Aplicação + infra mock ✅ · 3. Shell da UI ✅ · 4. Agenda do dia ✅ · 5. Agenda semanal ✅ · 6. Cadastros ✅ · 7. Relatórios ✅ · 8. Configurações + notificações · 9. Polimento
