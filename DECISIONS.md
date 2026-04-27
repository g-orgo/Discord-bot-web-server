# Decisões — raptor-chatbot-server

## MongoDB
Banco de dados escolhido para persistência de usuários e histórico.

## Vínculo Discord ↔ web via `discordUsername`
O campo `discordUsername` em `User` é o elo entre o bot e o usuário web. O bot não autentica com JWT — envia `X-Bot-Secret` + `discordUsername`, e o servidor resolve o `userId`.

## Autenticação do bot por secret header
Bot usa `X-Bot-Secret` em vez de JWT para simplificar a integração sem expor credenciais de usuário.

---

## Escolhido pelo agente AI

- **SSE (`/auth/history/stream`)** para notificar o frontend em tempo real — em vez de WebSocket ou polling.
- **bcryptjs** para hash de senhas.
- **JWT com expiração de 7 dias** (`jsonwebtoken`).
- **ESM (`"type": "module"`)** — `import`/`export` em todo o projeto.
- **Seed de admin no startup** — um usuário admin criado a partir de env vars na inicialização.
