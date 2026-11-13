/**
 * IA reserva do Nuv.
 *
 * As IAs do app (Lovable, Jarvis, OpenAI) têm cota e podem ficar sem créditos
 * por algumas horas. Quando todas falham, esta reserva local mantém a Nuv IA
 * respondendo as dúvidas mais comuns e executando ações do próprio app —
 * abrir telas e mudar ajustes. Roda 100% no aparelho, sem custo de créditos.
 */

export type LocalAction =
  | { type: "navigate"; page: "chat" | "ia" | "explore" | "premium" | "profile" }
  | { type: "motion"; enabled: boolean };

export type LocalAnswer = { reply: string; action?: LocalAction };

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

type PageId = "chat" | "ia" | "explore" | "premium" | "profile";

const PAGE_WORDS: { page: PageId; words: string[]; label: string }[] = [
  { page: "profile", words: ["configuracao", "configuracoes", "ajustes", "perfil", "conta"], label: "Configurações" },
  { page: "chat", words: ["chat", "conversa", "conversas", "mensagens"], label: "Chat" },
  { page: "explore", words: ["explorar", "mods", "selos", "atualizacoes", "novidades"], label: "Explorar" },
  { page: "premium", words: ["premium", "assinatura", "ctrg os", "plano"], label: "Premium" },
  { page: "ia", words: ["ia", "assistente", "nuv ia"], label: "Nuv IA" },
];

const OPEN_VERBS = ["abrir", "abra", "abre", "ir para", "vai para", "leva", "levar", "mostra", "mostrar", "entrar em"];

export function localAssistantReply(input: string): LocalAnswer {
  const text = normalize(input);

  // 1. Ligar/desligar animações
  if (/(anima(c|ç)(ao|oes|ão|ões))/.test(text)) {
    const wantsOff = /(desativ|desliga|parar|para|tira|remov|sem)/.test(text);
    const wantsOn = /(ativ|liga|ligar|volta|coloca|com)/.test(text);
    if (wantsOff) {
      return {
        reply: "Pronto — **animações desativadas**. O app fica mais direto, sem movimentos. Para voltar, é só pedir de novo ou usar Configurações → Animações.",
        action: { type: "motion", enabled: false },
      };
    }
    if (wantsOn) {
      return {
        reply: "Animações ativadas de novo. Você também pode criar as suas em **Configurações → Animações → Editar animações**, com vídeo, foto ou som.",
        action: { type: "motion", enabled: true },
      };
    }
    return {
      reply: "Dá para ativar, desativar e até criar animações suas em **Configurações → Animações**. Quer que eu desative agora?",
    };
  }

  // 2. Abrir telas
  if (OPEN_VERBS.some((verb) => text.includes(verb))) {
    const match = PAGE_WORDS.find((p) => p.words.some((w) => text.includes(w)));
    if (match) {
      return {
        reply: `Abrindo **${match.label}** para você.`,
        action: { type: "navigate", page: match.page },
      };
    }
  }

  // 3. Dúvidas frequentes do app
  if (/(catcoin|hype|moeda|saldo)/.test(text)) {
    return {
      reply:
        "As **CatCoins** (hypes) vêm das missões, dos eventos e do uso diário do app. Você acompanha o saldo em **Perfil**. " +
        "Quando as IAs do app estão com créditos, também dá para gerar figurinhas e jogos usando elas.",
    };
  }
  if (/(chamada|ligar|videochamada)/.test(text)) {
    return {
      reply:
        "Para ligar: abra uma conversa e toque no ícone de telefone (voz) ou de câmera (vídeo). " +
        "A chamada aparece também na aba **Chat → Sinais**, com histórico e duração.",
    };
  }
  if (/(mod\b|mods|modpack)/.test(text)) {
    return { reply: "Os **Mods** ficam em **Explorar → Mods**: dá para navegar pelos da comunidade, criar o seu e instalar com um toque." };
  }
  if (/(selo|verifica|identidade)/.test(text)) {
    return { reply: "Os **Selos** ficam em **Explorar → Selos**: você envia a solicitação e acompanha a análise por lá." };
  }
  if (/(ctrg os|premium|assinatura|preco|preço)/.test(text)) {
    return {
      reply:
        "O **Ctrg OS** é a experiência paga (R$ 15,63/mês) com tema Glass e animações extras. " +
        "Quem é dono ou faz parte da equipe recebe de graça. A assinatura é feita em **Premium**.",
    };
  }
  if (/(privacidade|fantasma|senha|pin|trava)/.test(text)) {
    return {
      reply:
        "Em **Configurações → Privacidade** você liga o modo fantasma (última vista, online, digitando, gravando) e o anti-excluir. " +
        "O PIN de uma conversa é definido no menu da própria conversa.",
    };
  }
  if (/(quem e voce|quem é você|seu nome|o que voce faz)/.test(text)) {
    return {
      reply:
        "Sou a **Nuv IA**, a assistente do app. Ajudo com dúvidas, ideias e com a navegação: posso abrir telas e mudar ajustes, se você permitir em **Configurações → IA**.",
    };
  }

  // 4. Resposta de reserva
  return {
    reply:
      "As IAs do app estão **sem créditos neste momento** — eles voltam sozinhos em algumas horas. " +
      "Enquanto isso eu sigo aqui no **modo reserva** e posso:\n\n" +
      "- abrir telas: “abrir configurações”, “abrir chat”, “abrir explorar”\n" +
      "- ligar ou desligar animações\n" +
      "- explicar recursos do app (CatCoins, chamadas, mods, selos, Ctrg OS)\n\n" +
      "Escreva com outras palavras se eu não entender — e tente de novo mais tarde para as respostas completas.",
  };
}

/** Ações em texto que a Nuv IA pode executar com a permissão do usuário. */
export const LOCAL_CAPABILITIES = [
  "Abrir telas do app",
  "Ligar e desligar animações",
  "Explicar recursos e responder dúvidas frequentes",
];
