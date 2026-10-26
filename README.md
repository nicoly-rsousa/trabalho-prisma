# Sistema de Chamados

API NestJS + Prisma + MySQL que implementa as regras de `.docs/Sistema de Chamados_ Regras de Negócio.docx`.

## Rodar

Requer o MySQL instalado na máquina (serviço MySQL84). Ajuste usuário e senha em `.env`
(`DATABASE_URL="mysql://USUARIO:SENHA@localhost:3306/chamados"`); o banco `chamados` é criado pelo `migrate deploy`.

```
npm install --legacy-peer-deps
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```

## Rotas

| Método | Rota | Ação |
|---|---|---|
| POST/GET | `/pessoas` | cadastra / lista (`tipo`: SOLICITANTE ou TECNICO) |
| GET/PATCH/DELETE | `/pessoas/:id` | consulta / edita (inclui `ativo`) / remove (409 se já envolvida em chamado) |
| POST/GET | `/tipos-problema` | cadastra / lista |
| GET/PATCH/DELETE | `/tipos-problema/:id` | consulta / edita (inclui `ativo`) / remove (409 se já usado) |
| POST | `/chamados` | abre chamado (`titulo`, `descricao`, `prioridade?`, `tipoProblemaId`, `solicitanteId`) |
| GET | `/chamados?situacao=&prioridade=&tipoProblemaId=&tecnicoId=` | lista com filtros |
| GET | `/chamados/:id` | chamado com a conversa completa |
| PATCH | `/chamados/:id` | edita título, descrição ou prioridade |
| POST | `/chamados/:id/designar` | `{ "tecnicoId": 1 }` — designa e inicia o atendimento |
| POST | `/chamados/:id/situacao` | `{ "situacao": "RESOLVIDO" }` — segue o fluxo permitido |
| POST | `/chamados/:id/comentarios` | `{ "autorId": 1, "texto": "..." }` |

Situações: `ABERTO`, `EM_ATENDIMENTO`, `RESOLVIDO`, `FECHADO`, `CANCELADO`. Prioridades: `BAIXA`, `MEDIA`, `ALTA`, `CRITICA`.

Erros: 400 (dados inválidos), 404 (não encontrado), 409 (regra de negócio violada).

Testes das regras: `npm test`.
