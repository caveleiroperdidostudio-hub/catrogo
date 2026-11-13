# Nuv

Nuv é um aplicativo de conversas e mensagens, com chamadas, grupos, personalização de chats e recursos de descoberta. A interface prioriza comunicação simples, rápida, acessível e segura.

## Desenvolvimento

```bash
bun install
bun run dev
```

O projeto usa TanStack Start, React, Tailwind CSS e Lovable Cloud. As integrações e credenciais são configuradas pelos segredos do ambiente; nenhuma chave privada deve ser incluída no código do navegador.

## Identidade

O nome atual é **Nuv**. CATROGO e Cosmos Chat são nomes anteriores; Cosmos continua sendo apenas o nome de um tema visual.

A marca aparece em `public/icons` (ícone do app e do navegador) e é reutilizada na interface pelo componente `src/components/BrandMark.tsx`.

## Interface

Base neutra com um único acento azul (o do anel da logo), inspirada em apps de mensagem como WhatsApp e Instagram: cabeçalho da lista com o logo, ações essenciais e menu; abas **Conversas · Status · Chamadas**; conversa com chamadas e opções no cabeçalho e o campo de digitação limpo. Tudo com alvos de toque de 40–44 px, rótulos ARIA nos botões de ícone e foco visível.

A **aparência das conversas** fica em Ajustes → Aparência das conversas: paleta dos balões, formato, arredondamento, densidade, esquema claro/escuro e fundo do histórico. As escolhas são aplicadas pelo componente `ChatView` via atributos `data-chat-*` definidos em `src/lib/chat-appearance.ts` e estilizados no fim de `src/styles.css`.
