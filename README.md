# Na Régua — Painel Web

Painel web responsivo do **Na Régua**, sistema de agendamento para barbearias pequenas e médias (1 a 8 cadeiras).
Projeto integrador — Tecnologia em Análise e Desenvolvimento de Sistemas (SENAC).

O painel é usado por **gestor**, **profissional (barbeiro)** e **recepcionista**. O app mobile do cliente e a API ficam em outros repositórios. Enquanto a API não existe, o painel roda com dados de demonstração (Barbearia Nova Era) guardados no navegador.

## Requisitos

- Node.js 20.19+ (desenvolvido com Node 24)
- npm 10+

## Como rodar

```bash
npm install
cp .env.example .env   # opcional: os padrões já usam dados de demonstração
npm run dev            # abre em http://localhost:5173
```

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

## Variáveis de ambiente

| Variável         | Padrão | Descrição                                                   |
| ---------------- | ------ | ----------------------------------------------------------- |
| `VITE_USE_MOCKS` | `true` | `true` usa dados de demonstração; `false` usa a API         |
| `VITE_API_URL`   | —      | URL base da API (obrigatória quando `VITE_USE_MOCKS=false`) |

## Arquitetura

Clean Architecture: as dependências apontam sempre para dentro. O ESLint barra imports na direção errada.

```
src/
├── domain/          # regras puras: entidades, value objects, motor de disponibilidade
├── application/     # casos de uso + portas (interfaces)
├── infrastructure/  # implementações das portas (in-memory hoje, HTTP depois)
├── presentation/    # React: telas, componentes, hooks, textos pt-BR
├── main/            # composition root (injeção de dependências, config)
└── shared/          # utilitários sem regra de negócio
```

**Stack:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router, TanStack Query, React Hook Form + Zod, date-fns, Vitest + Testing Library, ESLint + Prettier, lucide-react.

Detalhes de produto, regras de negócio e convenções estão em [CLAUDE.md](CLAUDE.md).

## LGPD

- Coletamos apenas os dados necessários do cliente (nome, telefone, e-mail opcional).
- Telefone e e-mail aparecem mascarados nas listagens.
- Nenhum dado pessoal em logs (`console.*` é bloqueado pelo lint) nem em URLs (rotas usam IDs).
- O cadastro do cliente registra o consentimento (data, versão do termo, canal).
