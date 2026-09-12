/**
 * Responder local de fallback para a CatroGo IA.
 * Quando nenhum provedor externo (Lovable, OpenAI, Jarvis) está disponível,
 * esta função responde com base em palavras-chave — assim a IA sempre responde,
 * nunca fica em silêncio nem dá erro genérico.
 */

type Msg = { role: string; content: string };

function lastUser(messages: Msg[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") return messages[i].content.toLowerCase();
  }
  return "";
}

function has(text: string, ...words: string[]): boolean {
  return words.some((w) => text.includes(w));
}

/** Resposta de fallback para o assistente geral da plataforma. */
export function platformFallback(messages: Msg[]): string {
  const q = lastUser(messages);

  if (has(q, "catcoin", "cat coin", "moeda", "ganhar", "dinheiro"))
    return `💰 **Como ganhar CatCoins no CatroGo:**

1. **Resgates diários** — entre todo dia e resgate sua recompensa gratuita.
2. **Eventos globais** — participe de missões e eventos sazonais (ex: Natal).
3. **Vender mods** — crie mods na aba Explorar e ganhe CatCoins com cada download.
4. **Presentes da comunidade** — outros usuários podem te enviar CatCoins.

> Dica: o Premium remove a fila de espera para resgatar CatCoins!`;

  if (has(q, "chamada", "video", "vídeo", "ligar", "voz", "call"))
    return `📞 **Como fazer chamadas no CatroGo:**

1. Abra a conversa com a pessoa.
2. Toque no ícone de **telefone** (voz) ou **câmera** (vídeo).
3. Aguarde a pessoa atender.

> As chamadas funcionam em tempo real e são gratuitas. O Premium oferece prioridade na fila de chamadas.`;

  if (has(q, "mod", "criar", "criar mod"))
    return `🎮 **Como criar um mod no CatroGo:**

1. Vá em **Explorar → Mods**.
2. Toque em **Criar Mod**.
3. Dê um nome, descrição e adicione o conteúdo do mod.
4. Publique — outros usuários podem baixar e avaliar.

> Mods populares ganham mais CatCoins para o criador!`;

  if (has(q, "premium", "assinatura", "pagar", "pix", "comprar"))
    return `👑 **Sobre o Premium do CatroGo:**

O Premium é opcional e só adiciona extras — nada do que já é gratuito fica bloqueado.

**Benefícios:**
- Selo Premium dourado no perfil e conversas
- Temas e auras exclusivas
- IA com respostas mais longas e prioridade
- Figurinhas por IA ilimitadas
- Sem espera para resgatar CatCoins

**Como assinar:** vá na aba **Premium**, escolha o plano (Mensal R$9,90 ou Anual R$79,90), clique em **Comprar**, copie o código PIX e pague no seu banco. O Premium é ativado automaticamente após o pagamento!`;

  if (has(q, "configura", "configurar", "ajustar", "tema", "aparência", "skin"))
    return `⚙️ **Configurações do CatroGo:**

Vá em **Perfil → Configurações** para ajustar:
- **Aparência** — temas, skins e modo claro/escuro
- **Privacidade** — quem pode te ver e te chamar
- **Notificações** — sons, vibração e alertas
- **Conta** — email, senha e dados

> O Premium desbloqueia temas e auras exclusivas!`;

  if (has(q, "selo", "verificação", "verificado", "selo de"))
    return `✅ **Selos de verificação no CatroGo:**

Os selos aparecem no perfil e em conversas. Tipos:
- **Verificado** — concedido pela equipe a contas oficiais.
- **Premium** — dourado, exclusivo de assinantes Premium.
- **Eventos** — concedido durante eventos especiais.

> Quer um selo verificado? Fale com a equipe pelo chat oficial.`;

  if (has(q, "oi", "olá", "ola", "bom dia", "boa tarde", "boa noite", "e ai", "eai", "hello"))
    return `Olá! 👋 Eu sou a **CatroGo IA**, sua assistente da plataforma. Posso te ajudar com:\n\n- Dúvidas sobre o CatroGo (chat, chamadas, mods, premium, CatCoins)\n- Ideias criativas e brainstorming\n- Programação e textos\n\nO que você precisa? 😊`;

  if (has(q, "obrigad", "valeu", "vlw", "thanks"))
    return `De nada! 😊 Estou aqui pra ajudar. Se tiver mais alguma dúvida, é só perguntar!`;

  if (has(q, "quem e voce", "quem é voce", "quem e você", "quem é você", "seu nome", "o que voce e", "o que você é"))
    return `Eu sou a **CatroGo IA** 🤖✨ — a inteligência artificial nativa e oficial do app CatroGo. Estou aqui pra tirar suas dúvidas, dar ideias e ajudar com o que precisar!`;

  if (has(q, "jogo", "game", "newcatroid"))
    return `🎮 **Criar jogos no CatroGo:**

A linguagem Newcatroid é simples, linha a linha em português:

\`\`\`newcatroid
# Meu primeiro jogo
fundo #0b0b1e
criar jogador 160 280 azul 20
quando_tecla esquerda mover jogador -5 0
quando_tecla direita mover jogador 5 0
criar alvo 160 40 vermelho 15
sempre mover alvo 0 2
ao_tocar jogador alvo pontos 1
ao_tocar jogador alvo fim "Game Over!"
\`\`\`

Vá em **Explorar** e use o criador de jogos para testar!`;

  // Resposta genérica amigável
  return `Entendi! 😊 No momento estou rodando em modo offline (sem provedor de IA conectado), então minha resposta é limitada. 

Posso te ajudar com dúvidas sobre o CatroGo: **chat, chamadas, mods, premium, CatCoins, configurações** e muito mais.

Tente perguntar algo como:
- "Como eu ganho CatCoins?"
- "Como faço uma chamada de vídeo?"
- "Como criar um mod?"
- "O que tem no Premium?"

> 💡 **Dica:** para respostas mais completas e inteligentes, o administrador precisa configurar uma chave de IA (Lovable ou OpenAI) no painel da equipe.`;
}

/** Resposta de fallback para geração de jogos Newcatroid. */
export function gameFallback(prompt: string): string {
  return `# Jogo gerado (modo offline)
fundo #0b0b1e
gravidade 0.2
criar jogador 160 280 azul 20
quando_tecla esquerda mover jogador -5 0
quando_tecla direita mover jogador 5 0
quando_tecla cima mover jogador 0 -8
quando_tecla espaco mover jogador 0 -8
criar alvo 160 40 vermelho 15
sempre mover alvo 0 3
ao_tocar jogador alvo pontos 1
ao_tocar jogador alvo fim "Voce perdeu! Tente novamente."`;
}

/** Resposta de fallback para geração de jogos HTML. */
export function htmlGameFallback(_prompt: string): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Jogo CatroGo</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{display:flex;justify-content:center;align-items:center;min-height:100vh;background:#0b0b1e;color:#fff;font-family:sans-serif}
canvas{border:2px solid #444;border-radius:8px}
</style>
</head>
<body>
<canvas id="game" width="320" height="320"></canvas>
<script>
const c=document.getElementById("game"),x=c.getContext("2d");
let p={x:160,y:280,r:15,s:0},o={x:160,y:40,r:15,vy:3},score=0,over=false;
addEventListener("keydown",e=>{
  if(over){p.x=160;p.y=280;o.x=160;o.y=40;score=0;over=false;return}
  if(e.key=="ArrowLeft"||e.key=="a")p.x-=20;
  if(e.key=="ArrowRight"||e.key=="d")p.x+=20;
  p.x=Math.max(p.r,Math.min(320-p.r,p.x));
});
function loop(){
  if(over){x.fillStyle="#0b0b1e";x.fillRect(0,0,320,320);x.fillStyle="#f44";x.font="20px sans-serif";x.textAlign="center";x.fillText("Game Over! Pontos: "+score,160,160);x.fillStyle="#888";x.font("14px sans-serif");x.fillText("Pressione qualquer tecla",160,190);return requestAnimationFrame(loop)}
  x.fillStyle="#0b0b1e";x.fillRect(0,0,320,320);
  o.y+=o.vy;if(o.y>320){o.y=0;o.x=Math.random()*300+10}
  x.fillStyle="#4af";x.beginPath();x.arc(p.x,p.y,p.r,0,7);x.fill();
  x.fillStyle="#f44";x.beginPath();x.arc(o.x,o.y,o.r,0,7);x.fill();
  let d=Math.hypot(p.x-o.x,p.y-o.y);
  if(d<p.r+o.r){score++;o.y=0;o.x=Math.random()*300+10;o.vy+=0.2}
  x.fillStyle="#fff";x.font="16px sans-serif";x.textAlign="left";x.fillText("Pontos: "+score,10,25);
  requestAnimationFrame(loop);
}
loop();
</script>
</body>
</html>`;
}
