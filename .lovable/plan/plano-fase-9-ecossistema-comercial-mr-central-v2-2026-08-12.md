# Plano Fase 9 — Ecossistema Comercial MR CENTRAL V2

O objetivo é transformar o MR CENTRAL em uma plataforma comercial profissional e autônoma, consolidando a experiência para Ultra Admin, Revendedor e Cliente Final, mantendo o financeiro em Sandbox.

## 1. Schema e Banco de Dados (Supabase)
- **Extensões e Downloads**: Criar/Ajustar tabelas para metadados de extensões (slug, sigla, versão, changelog, arquivos).
- **Trials**: Criar `extensao_trials` para gerenciar limites de uso gratuito por dispositivo/extensão.
- **HWID Reset**: Implementar log de auditoria para trocas de dispositivo.
- **API Keys**: Ajustar `api_keys` para revendedores com suporte a hashes e logs.

## 2. Ultra Admin (Painel de Controle Total)
- **Dashboard Operacional**: Cards de métricas reais (sem mocks) de clientes, licenças, vendas e produtos.
- **Gestão de Extensões**: Interface para upload de releases, controle de versões e changelogs.
- **Gestão de Planos**: Cadastro flexível de planos (tempo, dispositivos, features).
- **Gestão de Revenda**: Controle de créditos, ranking e logs de auditoria comercial.
- **Monitoramento**: Painel de saúde do sistema (webhooks, fulfillment, erros de API).

## 3. Site Público e Catálogo
- **Home & Catálogo**: Vitrine de extensões com cards modernos, preços iniciais e botões de ação (Ver detalhes, Comprar, Testar).
- **Página de Detalhes**: Screenshots, recursos, compatibilidade e downloads.
- **Checkout Sandbox**: Fluxo de compra simulado via Mercado Pago/Pix Sandbox.

## 4. Portal do Cliente Final
- **Minha Conta**: Centralização de licenças, dispositivos ativos e downloads.
- **Autogestão**: Fluxo de reset de HWID com cooldown e limites configuráveis.

## 5. Portal do Revendedor
- **Dashboard Profissional**: Saldo de créditos, ranking e desempenho.
- **Geração de Licenças**: Fluxo atômico (Débito de Crédito + Geração) com padrão `<SIGLA>-MR-XXXX...`.
- **Gestão de Clientes**: CRM básico para acompanhar licenças vendidas pelo revendedor.
- **API para Revendedores**: Gestão de chaves para integração externa.

## 6. Segurança e Isolamento
- **RLS (Row Level Security)**: Garantir que revendedores e clientes acessem apenas seus próprios dados.
- **CSPRNG**: Padrão de licenças de alta entropia.
- **Idempotência**: Proteção contra duplicidade em fulfillments e débitos de créditos.

## Technical Details
- **Framework**: TanStack Start v1 (React 19).
- **Backend**: TanStack Server Functions + Supabase (PostgreSQL/RLS).
- **Styling**: Tailwind CSS v4 (Glassmorphism / Neon Theme).
- **Security**: SHA-256 para hashes de API keys, CSPRNG para licenças.

## Verificação e Testes
- Teste E2E de compra em Sandbox -> Fulfillment -> Geração de Licença.
- Verificação de isolamento de dados entre perfis.
- Validação de responsividade (Mobile/Desktop).

---
*Status Financeiro: Permanecerá em modo SANDBOX durante toda a Fase 9.*
