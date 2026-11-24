# Na Régua — Painel Web

## Integrantes

| Nome | GitHub |
| :--- | :--- |
| Luan Victor Lira Costa | [@turureidelas](https://github.com/turureidelas) |
| Miguel Melo Pereira | [@ymiguell](https://github.com/ymiguell) |
| Isaac Nascimento Santos | — |
| Diego Ferreira Sousa | [@odiegoferreira](https://github.com/odiegoferreira) |
| Gabriela B da Fonseca | [@gabiifonsceca96](https://github.com/gabiifonsceca96) |
| Thiago Alexandre Ribeiro | [@thiagoalex21](https://github.com/thiagoalex21) |


Painel web responsivo do **Na Régua**, sistema de agendamento para barbearias pequenas e médias (1 a 8 cadeiras),
com uma **área do cliente** para agendar pelo celular.
Projeto integrador — Tecnologia em Análise e Desenvolvimento de Sistemas (SENAC).

**O problema:** agenda de papel ou WhatsApp gera horários sobrepostos, faltas sem aviso, interrupções no meio do
corte e nenhum número para o dono decidir. **A solução:** o cliente agenda sozinho, só em horários livres, na área
do cliente (`/cliente`), e a barbearia acompanha tudo no painel — no celular, entre um atendimento e outro, ou no
computador da recepção.

Enquanto a API não existe, o painel roda com dados de demonstração da fictícia **Barbearia Nova Era** guardados no
navegador. O mesmo código já fala com a API real trocando uma variável de ambiente.

## Como rodar

Requisitos: Node.js 20.19+ ou 22.12+ (desenvolvido com Node 24) e npm 10+.

```bash
npm install
npm run dev            # abre em http://localhost:5173
```

### Contas de demonstração (senha `demo123`)

Nas telas de login há botões de acesso rápido: os da equipe em `/entrar`, o do cliente em `/cliente/entrar`.

| Perfil        | E-mail                 | O que vê                                                           |
| ------------- | ---------------------- | ------------------------------------------------------------------ |
| Gestor (dono) | `ricardo@novaera.demo` | Tudo: agenda, cadastros, relatórios, configurações                 |
| Profissional  | `bruno@novaera.demo`   | Só a própria agenda, bloqueios e "Meus números"                    |
| Profissional  | `diego@novaera.demo`   | Idem                                                               |
| Recepcionista | `camila@novaera.demo`  | Agenda de todos e clientes; sem relatórios nem configurações       |
| Cliente       | `joao@cliente.demo`    | Área do cliente: os próprios horários, agendar, cancelar, remarcar |

Também dá para criar uma conta nova de cliente em `/cliente/criar-conta`.

Os dados são gerados em volta do dia de hoje (3 semanas de histórico e 10 dias à frente). "Resetar dados de
demonstração" (menu lateral ou "Mais") volta tudo ao início.

## Roteiro para a apresentação (≈ 5 min)

1. **Login** como Ricardo (gestor) com um toque.
2. **Agenda de hoje:** o próximo cliente em destaque; marcar "Compareceu", "Concluir" (valor já preenchido, Pix
   selecionado) e "Cliente faltou" — com **Desfazer** no aviso.
3. **Semana:** remarcar um cliente — só aparecem horários livres, calculados pelo motor de disponibilidade.
   Bloquear um horário e tentar agendar em cima dele.
4. **Área do cliente** (outra aba, `/cliente/entrar`, entrar como João): agendar em 4 escolhas (serviço,
   profissional, dia, horário livre), depois cancelar ou remarcar. Voltar ao painel: o **sino** ganha os avisos e o
   horário já aparece na agenda. Um horário em cima da hora não deixa cancelar pelo app (regra da política).
   Atalho sem trocar de conta: **Configurações → Demonstração** simula as ações do cliente.
5. **Relatórios:** faturamento, comissão, ocupação, faltas, serviços mais pedidos e retorno de clientes.
6. **Clientes:** ficha com consentimento LGPD e histórico; "Apagar dados do cliente" (direito de eliminação).
7. Entrar como **Bruno** (profissional): o menu encolhe, o relatório vira "Meus números" e o sino só mostra a
   agenda dele.
8. Mostrar em **largura de celular** (DevTools, ~390px): menu inferior e janelas como gaveta.

Sugestão de prints para os slides: agenda do dia no celular, agenda da semana no desktop, remarcar com os
horários livres, sino com avisos, relatórios e a ficha do cliente.

## Funcionalidades

- **Agenda do dia** (tela inicial): próximo cliente, quem está em atendimento, resumo do dia, ações de 1 toque.
- **Agenda da semana:** 7 colunas no desktop e abas por dia no celular; confirmar, remarcar, cancelar (motivo
  obrigatório em cima da hora), novo agendamento com cadastro rápido de cliente, bloquear e liberar horários.
- **Cadastros:** serviços e combos, equipe com comissão e escala semanal, clientes com busca e ficha completa.
- **Relatórios:** filtro Hoje / Esta semana / Este mês / datas; números grandes e barras simples, sem biblioteca de
  gráfico. O profissional vê apenas os próprios números.
- **Configurações:** dados da barbearia e política de cancelamento (antecedência mínima e tolerância de falta).
- **Avisos:** sino com contador quando o cliente agenda, cancela ou remarca pela área do cliente.
- **Área do cliente** (`/cliente`, mobile-first): criar conta com consentimento LGPD, entrar, "Meus horários"
  (próximo em destaque + histórico), agendar só em horários livres, cancelar/remarcar dentro do prazo e "Minha conta"
  (dados, consentimento, contato e regra de cancelamento da barbearia).

## Regras de negócio principais

- **Motor de disponibilidade** (`src/domain/services/AvailabilityService.ts`): um horário só é oferecido se está na
  escala do profissional, fora de intervalos e bloqueios, e não colide com outro agendamento ativo. Intervalos são
  semiabertos (terminar 10:00 e começar 10:00 não colide). Grade de 15 em 15 minutos.
- **Política de cancelamento:** o cliente só cancela/remarca com a antecedência mínima; a equipe pode fora do prazo,
  com motivo. "Cliente faltou" só depois da tolerância.
- **Comissão** sobre o valor efetivamente pago; **ocupação** = minutos marcados ÷ (escala − bloqueios).

Detalhes de produto, regras e convenções: [CLAUDE.md](CLAUDE.md).

## Arquitetura

Clean Architecture: as dependências apontam sempre para dentro, e o ESLint barra imports na direção errada.

```
src/
├── domain/          # regras puras: entidades imutáveis, value objects, motor de disponibilidade, relatórios
├── application/     # casos de uso + portas (interfaces) + DTOs
├── infrastructure/  # implementações das portas: in-memory (demo) e HTTP (API)
├── presentation/    # React: telas, componentes, hooks, textos pt-BR
├── main/            # composition root: escolhe mock ou API e injeta as dependências
└── shared/          # utilitários sem regra de negócio
```

**Stack:** React 19, TypeScript (strict), Vite, Tailwind CSS v4, React Router, TanStack Query, React Hook Form + Zod,
date-fns, Vitest + Testing Library, ESLint + Prettier, lucide-react.

**Qualidade:** cerca de 520 testes (unitários no domínio e nos casos de uso, de tela com Testing Library e de ponta a
ponta sobre HTTP com uma API falsa). Cobertura exigida: **100% no domínio** e 90% nos casos de uso
(`npm run coverage`). As telas são carregadas sob demanda (cada rota no seu arquivo).

## Ligando na API

| Variável         | Padrão | Descrição                                                   |
| ---------------- | ------ | ----------------------------------------------------------- |
| `VITE_USE_MOCKS` | `true` | `true` usa dados de demonstração; `false` usa a API         |
| `VITE_API_URL`   | —      | URL base da API (obrigatória quando `VITE_USE_MOCKS=false`) |

```bash
cp .env.example .env   # ajuste VITE_API_URL e VITE_USE_MOCKS=false
npm run dev
```

Nenhuma tela nem regra muda: só os repositórios passam a ser HTTP. O contrato esperado (rotas, formato e erros)
está em [docs/api.md](docs/api.md). Sem mocks não há dados de demonstração, botão de reset nem simulador do cliente.

## Acessibilidade

- HTML semântico, um único `<h1>` por tela, `label` em todo campo e erros ligados por `aria-describedby`.
- Alvos de toque com pelo menos 44×44 px; contraste conferido (texto ≥ 6:1, bordas de campo ≥ 3:1).
- Navegação por teclado com foco visível, link "Pular para o conteúdo" e janelas com `<dialog>` nativo (prende o
  foco, fecha com Esc e devolve o foco ao botão que abriu).
- Ao trocar de tela, o foco vai para o título e a aba do navegador ganha o nome da tela.
- Avisos (toasts) anunciados por leitores de tela; gráficos sempre acompanhados do número em texto.
- Respeita `prefers-reduced-motion`. Regras do `eslint-plugin-jsx-a11y` (strict) em todo componente.

## LGPD — checklist

- [x] **Minimização:** do cliente só nome e telefone são obrigatórios; e-mail é opcional.
- [x] **Consentimento registrado** no cadastro (data, versão do termo e canal: app ou balcão). Na área do cliente,
      criar conta exige marcar o consentimento.
- [x] **Mascaramento:** telefone e e-mail aparecem mascarados em listas e na agenda; o número completo só na ficha.
- [x] **Sem dado pessoal em URL:** rotas usam IDs; na API, telefone/e-mail/busca vão no corpo de `POST`.
- [x] **Sem dado pessoal em log:** `console.*` é proibido pelo lint.
- [x] **Sessão mínima:** o navegador guarda só o ID do usuário, a validade e (com API) o token.
- [x] **Dinheiro restrito:** "Total gasto" do cliente e relatórios financeiros só para quem tem permissão.
- [x] **Cliente só vê o que é dele:** a conta de cliente não tem nenhuma permissão do painel (nem busca de clientes);
      agendamento de outra pessoa responde "não encontrado".
- [x] **Direito de eliminação:** "Apagar dados do cliente" (só o gestor) apaga nome, telefone, e-mail e consentimento;
      os atendimentos ficam para os números da barbearia, sem identificar a pessoa, e os agendamentos futuros são
      cancelados.
- [ ] Na API (fora deste repositório): HTTPS, guarda segura de senhas, prazo de retenção e registro de quem
      acessou dados pessoais.

## Scripts

| Comando              | O que faz                             |
| -------------------- | ------------------------------------- |
| `npm run dev`        | Servidor de desenvolvimento           |
| `npm run build`      | Checagem de tipos + build de produção |
| `npm run preview`    | Serve o build de produção localmente  |
| `npm run typecheck`  | Checagem de tipos (TypeScript strict) |
| `npm run lint`       | ESLint (inclui regras de arquitetura) |
| `npm run format`     | Formata o código com Prettier         |
| `npm run test`       | Roda os testes uma vez (Vitest)       |
| `npm run test:watch` | Testes em modo watch                  |
| `npm run coverage`   | Relatório de cobertura em `coverage/` |
