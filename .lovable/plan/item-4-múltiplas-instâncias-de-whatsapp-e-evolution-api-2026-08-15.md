# ITEM 4 — MÚLTIPLAS INSTÂNCIAS DE WHATSAPP E EVOLUTION API

Este plano descreve a implementação da gestão de instâncias de WhatsApp utilizando a Evolution API, vinculada ao sistema de multiempresa (workspaces) e protegendo credenciais sensíveis no servidor.

## Objetivos
- Implementar interface para criação e gestão de instâncias de WhatsApp vinculadas ao workspace ativo.
- Integrar com a Evolution API via servidor (tRPC) para gerar QR Codes e verificar status.
- Garantir que a `EVOLUTION_API_KEY` e `EVOLUTION_API_URL` padrão residam apenas no servidor.
- Proteger o sistema contra exposição de credenciais e falhas de rede.

## Arquitetura Técnica
- **Frontend**: `src/pages/Home.tsx` (Aba `connections`) consumirá o tRPC `evolutionRouter`.
- **Backend**: `server/routers/evolution.ts` lidará com as requisições para a API externa.
- **Segurança**: Uso de `process.env` no servidor para a API padrão da plataforma. Os campos `apiUrl` e `apiKey` no banco de dados serão usados apenas se o workspace/usuário desejar usar uma API própria (opcional).

## Etapas de Implementação

1. **Backend (tRPC Evolution Router)**:
    - Atualizar `server/routers/evolution.ts` para ler credenciais padrão do `process.env` se não fornecidas no input.
    - Implementar `connectInstance` para forçar geração de QR Code.
    - Implementar `getConnectionState` para pooling de status.
    - Refinar `createInstance` para associar ao `workspaceId` obrigatório.

2. **Frontend (Interface de Gestão)**:
    - Reconstruir a seção `connections` em `src/pages/Home.tsx`.
    - Adicionar modal/formulário limpo para "Nova Instância".
    - Implementar exibição de QR Code (Base64) com botão de "Atualizar".
    - Exibir estados visuais: 🟢 Conectado, 🟡 Aguardando QR, 🔴 Desconectado.

3. **Segurança e Resiliência**:
    - Garantir que o frontend nunca receba a `apiKey` real (já implementado via máscara `••••••••`).
    - Adicionar tratamento de timeout e erros amigáveis.

## Arquivos Afetados
- `server/routers/evolution.ts`: Lógica central de integração.
- `src/pages/Home.tsx`: UI de gerenciamento.
- `server/_core/env.ts`: Adição das variáveis `EVOLUTION_API_URL` e `EVOLUTION_API_KEY`.
- `drizzle/schema.ts`: (Já possui `evolution_instances`).

---
Aguardando autorização explícita: **AUTORIZO ITEM 4 — WHATSAPP**.
