# Contrato da API usado pelo painel

Este é o contrato que o painel espera quando roda com `VITE_USE_MOCKS=false`. As chamadas estão em
`src/infrastructure/repositories/http/http-repositories.ts` e `src/infrastructure/auth/HttpAuthGateway.ts`.
A API falsa usada nos testes (`src/main/testing/fakeApi.ts`) implementa as mesmas rotas.

## Regras gerais

- Base: `VITE_API_URL` (ex.: `https://api.naregua.com.br/api`). JSON nos dois sentidos.
- Autenticação: `Authorization: Bearer <token>` em todas as rotas, exceto `POST /auth/sessions`.
- **Corpo das mensagens = as mesmas "linhas" do mock** (`src/infrastructure/mappers/rows.ts`): instantes em ISO 8601,
  dinheiro em centavos (inteiro), horários de parede em `"HH:mm"`, telefone só com dígitos.
- **LGPD:** a query string leva só IDs, instantes e limites. Telefone, e-mail e texto de busca vão sempre no
  corpo de um `POST`, para nunca aparecerem em URLs nem em logs de servidor.
- **A API precisa validar tudo de novo** (permissões do perfil, motor de disponibilidade, política de cancelamento).
  O painel aplica as regras para dar uma resposta rápida e amigável, mas o servidor não pode confiar no navegador.

## Erros

| Situação                    | Resposta esperada                                    | O painel mostra                        |
| --------------------------- | ---------------------------------------------------- | -------------------------------------- |
| Regra de negócio quebrada   | `4xx` com `{ "code": "SCHEDULE_CONFLICT", ... }`     | A mensagem do código (`i18n/pt-BR.ts`) |
| Sessão ausente ou vencida   | `401` (com ou sem `{ "code": "NOT_AUTHENTICATED" }`) | Volta para a tela de login             |
| Item não existe             | `404`                                                | `null` nas buscas por ID; senão, erro  |
| Qualquer outra coisa / rede | `5xx`, HTML, sem resposta                            | "Algo deu errado. Tente de novo."      |

Códigos aceitos: os de `DOMAIN_ERROR_CODES` (`src/domain/errors/DomainError.ts`) e de `APPLICATION_ERROR_CODES`
(`src/application/errors.ts`). Código desconhecido vira `UNEXPECTED`.

## Rotas

### Sessão

| Método   | Rota                     | Corpo                 | Resposta                                    |
| -------- | ------------------------ | --------------------- | ------------------------------------------- |
| `POST`   | `/auth/sessions`         | `{ email, password }` | `201 { userId, expiresAt, token }` ou `401` |
| `DELETE` | `/auth/sessions/current` | —                     | `204`                                       |

O navegador guarda só `userId`, `expiresAt` e `token` (nada de nome, e-mail ou telefone).

### Leitura e gravação por ID

`GET /<recurso>/:id` (404 = não existe) e `PUT /<recurso>/:id` com a linha completa (cria ou substitui).
Recursos: `barbershops`, `users` (só `GET`), `professionals`, `services`, `clients`, `appointments`, `time-blocks`
(também `DELETE` = liberar horário), `notifications`.

### Listas e buscas

| Método | Rota                                                      | Observação                                           |
| ------ | --------------------------------------------------------- | ---------------------------------------------------- |
| `GET`  | `/barbershops/:id/professionals`                          | Todos, ativos e inativos                             |
| `GET`  | `/barbershops/:id/services`                               | Todos, ativos e inativos                             |
| `GET`  | `/barbershops/:id/appointments?from=&to=&professionalId=` | Que se sobrepõem a `[from, to)`; qualquer status     |
| `GET`  | `/barbershops/:id/time-blocks?from=&to=&professionalId=`  | Idem                                                 |
| `GET`  | `/barbershops/:id/notifications?limit=`                   | Mais recentes primeiro                               |
| `GET`  | `/clients/:id/appointments`                               | Histórico completo do cliente                        |
| `POST` | `/clients/batch` `{ ids }`                                | Vários clientes por ID                               |
| `POST` | `/barbershops/:id/clients/lookup` `{ phone }`             | Cliente com esse telefone ou `404`                   |
| `POST` | `/barbershops/:id/clients/search` `{ query, limit }`      | Nome (sem acento/caixa) ou dígitos; sem anonimizados |
| `POST` | `/users/lookup` `{ email }`                               | Usuário com esse e-mail ou `404`                     |
