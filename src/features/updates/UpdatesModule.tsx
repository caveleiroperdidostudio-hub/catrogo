import { useState } from "react";
import { Rocket, ChevronLeft, ChevronRight, Check, Sparkles, History } from "lucide-react";
import { Button } from "@/components/ui/button";

type Change = { type: "novo" | "melhoria" | "correção"; text: string };
export type ChangelogVersion = { version: string; date: string; title: string; changes: Change[] };

// Mais recente primeiro
export const CHANGELOG: ChangelogVersion[] = [
  {
    version: "4.3.0",
    date: "Novembro de 2026",
    title: "Nuv • Vidro premium, filmes com ficha e biblioteca",
    changes: [
      { type: "novo", text: "Vidro premium com três variações: Cristal, Âmbar e Ônix." },
      { type: "novo", text: "Movimento reduzido: a lente acompanha direto, sem mola, e respeita a preferência do sistema." },
      { type: "novo", text: "Ficha do filme com sinopse, direção, elenco, classificação e nota." },
      { type: "novo", text: "Minha lista: salve filmes para assistir depois." },
      { type: "novo", text: "Histórico: continue de onde parou, direto na tela de Filmes." },
      { type: "melhoria", text: "Dependências do projeto atualizadas e build mais estável." },
    ],
  },
  {
    version: "4.2.0",
    date: "Novembro de 2026",
    title: "Nuv • Animações sob medida, IA sem pausa e interface mais limpa",
    changes: [
      { type: "novo", text: "Animação de boas-vindas mostrando tudo que chegou nesta versão." },
      { type: "novo", text: "Editar animações: use seus próprios vídeos, fotos e sons ao abrir o app, trocar de aba ou enviar mensagem." },
      { type: "novo", text: "Botão para ativar ou desativar animações e escolher a intensidade (suave, normal ou viva)." },
      { type: "novo", text: "IA reserva: quando as IAs do app ficam sem créditos, a Nuv IA continua respondendo e abrindo telas." },
      { type: "novo", text: "Permissões da IA nas configurações: deixe a assistente abrir telas e mudar ajustes do app." },
      { type: "melhoria", text: "Animações mais fluidas no Ctrg UI e ainda mais expressivas no Ctrg OS." },
      { type: "melhoria", text: "Explorar mais enxuto, com o painel de atualizações em destaque." },
      { type: "correção", text: "Removidas opções que não funcionavam nas configurações e o modo Museu." },
    ],
  },
  {
    version: "4.1.0",
    date: "Outubro de 2026",
    title: "Ctrg OS • Tema Glass UI & Pix automático",
    changes: [
      { type: "novo", text: "Ctrg UI (gratuita) e Ctrg OS (paga) agora são as duas experiências do app." },
      { type: "novo", text: "Glass UI: tema exclusivo do Ctrg OS com vidro translúcido no estilo do iPhone." },
      { type: "novo", text: "Dono e administradores recebem o Ctrg OS de graça." },
      { type: "novo", text: "Pix automático: QR Code e Copia e Cola já preenchidos com R$ 15,63 — sem digitar nada." },
      { type: "melhoria", text: "Ctrg OS mensal por R$ 15,63." },
      { type: "melhoria", text: "Interface mais limpa: personalização, temas e informações do app reunidas em Perfil → Configurações." },
    ],
  },
  {
    version: "4.0.0",
    date: "Setembro de 2026",
    title: "Ctrg UI • Sistema de Design, Museu & IA com Navegação",
    changes: [
      { type: "novo", text: "Ctrg UI: sistema de design oficial do CatroGo com tokens centralizados." },
      { type: "novo", text: "Ctrg OS: experiência premium com efeitos visuais e animações exclusivas." },
      { type: "novo", text: "Sistema de versionamento da interface que acompanha a versão do aplicativo." },
      { type: "novo", text: "Liberação de interface validada no backend." },
      { type: "novo", text: "Modo Museu: viaje no tempo e experimente versões antigas do CatroGo." },
      { type: "novo", text: "IA com navegação: peça para a IA abrir configurações, mods e mais." },
      { type: "novo", text: "Configurações redesenhadas com categorias: Conta, Perfil, Privacidade, etc." },
      { type: "novo", text: "Página Sobre com versão do app e da interface Ctrg UI." },
      { type: "novo", text: "Feature flags para ativar/desativar recursos sem alterar código." },
      { type: "novo", text: "Personalização de perfil com tema, banner e estilo de cards." },
      { type: "melhoria", text: "Navegação inferior refinada com densidade ajustável e microinterações." },
      { type: "melhoria", text: "Tokens de design centralizados para cores, espaçamento e animações." },
    ],
  },
  {
    version: "3.4.0",
    date: "Setembro de 2026",
    title: "Chat Completo • Criptografia, Anexos & Figurinhas",
    changes: [
      { type: "novo", text: "Criptografia ponta a ponta real: mensagens cifradas no seu aparelho, com código de segurança verificável." },
      { type: "novo", text: "Anexos no chat: fotos, vídeos, áudios e documentos em armazenamento privado." },
      { type: "novo", text: "Figurinhas: crie enviando imagem ou gerando com a IA, e use as da comunidade." },
      { type: "novo", text: "IA Personal: lições de idiomas com XP, níveis e ofensiva, além de treinos personalizados." },
      { type: "novo", text: "Skins: monte seu avatar cósmico com cores, corpo, olhos, aura e acessórios." },
      { type: "novo", text: "Busca de contatos pelo número do CatroGo." },
      { type: "melhoria", text: "Modo museu: navegue pelas versões antigas em somente leitura." },
    ],
  },
  {
    version: "3.3.0",
    date: "Agosto de 2026",
    title: "Jogos 100% por IA & Conversas Portáveis",
    changes: [
      { type: "novo", text: "Criar jogos agora é só conversar: a IA programa o jogo inteiro em HTML, sem escrever código." },
      { type: "novo", text: "Ajuste seu jogo publicado por comandos ('deixe mais difícil') e desfaça versões na hora." },
      { type: "novo", text: "Preço em hypes, salvar rascunho, exportar (15) e publicar/atualizar na vitrine (10)." },
      { type: "novo", text: "Exportar conversa em .txt e limpar suas mensagens de um chat." },
      { type: "melhoria", text: "Importação de jogos aceita arquivos HTML e abre direto no estúdio da IA." },
      { type: "melhoria", text: "Editor de código Newcatroid removido — jogos antigos continuam jogáveis." },
    ],
  },
  {

    version: "3.2.0",
    date: "Agosto de 2026",
    title: "Sinais, Organização de Conversas & Agendamento",
    changes: [
      { type: "novo", text: "Aba Sinais com histórico completo de chamadas: voz/vídeo, duração e recusadas." },
      { type: "novo", text: "Fixar, silenciar (8h) e arquivar conversas direto na lista." },
      { type: "novo", text: "Mensagens agendadas agora são enviadas automaticamente ao vencer." },
      { type: "melhoria", text: "Conversas fixadas sempre no topo, com indicadores de silenciado e arquivado." },
      { type: "correção", text: "Estabilidade das chamadas de voz e vídeo (toque, recusa e reconexão)." },
    ],
  },
  {
    version: "3.1.0",
    date: "Agosto de 2026",
    title: "Mensagens Avançadas & Chamadas Estáveis",
    changes: [
      { type: "novo", text: "Responder com citação, editar, apagar para todos e reações com contador." },
      { type: "novo", text: "Favoritar, encaminhar, copiar e buscar mensagens dentro da conversa." },
      { type: "novo", text: "Toque de chamada real com vibração e ringback para quem liga." },
      { type: "melhoria", text: "Compartilhar tela, controle de volume e reconexão automática nas chamadas." },
      { type: "correção", text: "Eco e áudio duplicado nas ligações corrigidos." },
    ],
  },
  {
    version: "3.0.0",

    date: "Julho de 2026",
    title: "Hiper Atualização • IA, Chamadas & Painel de Design",
    changes: [
      { type: "novo", text: "Nova aba CatroGo IA: chat inteligente contextualizado com o app." },
      { type: "novo", text: "Chamadas de vídeo entre usuários (WebRTC) com câmera e microfone." },
      { type: "novo", text: "Painel de Design de Eventos para o dono criar eventos visualmente." },
      { type: "novo", text: "Comando /criar no terminal admin para eventos e comandos personalizados." },
      { type: "novo", text: "Gerador de jogos completos em HTML (mobile e PC) com código limpo." },
      { type: "novo", text: "Categoria de Atualizações com histórico de versões." },
      { type: "melhoria", text: "IAs do app otimizadas: respostas mais rápidas e precisas." },
      { type: "correção", text: "O terminal admin não gera mais comandos automáticos em segundo plano." },
      { type: "correção", text: "Correções gerais de interface e carregamento." },
    ],
  },
  {
    version: "2.1.0",
    date: "Julho de 2026",
    title: "Painel de Comandos do Dono",
    changes: [
      { type: "novo", text: "Painel administrativo oculto ativado por /abrir painel adm." },
      { type: "novo", text: "Comando /give hype to para conceder CatCoins a usuários." },
      { type: "melhoria", text: "Controle de tempo de eventos globais em tempo real." },
    ],
  },
  {
    version: "2.0.0",
    date: "Julho de 2026",
    title: "Mods, Modpacks & Eventos",
    changes: [
      { type: "novo", text: "Módulo de criação de Mods e Modpacks (código aberto)." },
      { type: "novo", text: "Eventos globais com missões e recompensas (ex.: Natal)." },
      { type: "melhoria", text: "Reforço de segurança em funções e políticas do banco." },
    ],
  },
  {
    version: "1.0.0",
    date: "Junho de 2026",
    title: "Lançamento do CatroGo",
    changes: [
      { type: "novo", text: "Chat em tempo real, IA e mods da comunidade." },
      { type: "novo", text: "Sistema de hype, inscrições e perfis." },
    ],
  },
];

export const LATEST_VERSION = CHANGELOG[0];

const TYPE_STYLE: Record<Change["type"], string> = {
  novo: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  melhoria: "bg-sky-500/15 text-sky-400 border-sky-500/30",
  correção: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

export function UpdatesModule() {
  const [index, setIndex] = useState(0);
  const v = CHANGELOG[index];
  const isLatest = index === 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="h-14 shrink-0 px-4 flex items-center gap-2 border-b border-white/5">
        <div className="h-9 w-9 rounded-xl bg-primary/20 border border-primary/40 flex items-center justify-center cosmic-glow">
          <Rocket className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1">
          <div className="font-semibold leading-tight">Atualizações</div>
          <div className="text-[11px] text-muted-foreground">Tudo que chegou ao Nuv</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Version navigator */}
        <div className="flex items-center justify-between rounded-2xl glass border border-white/10 p-3">
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9"
            disabled={index >= CHANGELOG.length - 1}
            onClick={() => setIndex((i) => Math.min(i + 1, CHANGELOG.length - 1))}
            title="Versão anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg font-bold">v{v.version}</span>
              {isLatest && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/25 text-primary border border-primary/40 font-semibold inline-flex items-center gap-1">
                  <Sparkles className="h-3 w-3" /> Atual
                </span>
              )}
            </div>
            <div className="text-[11px] text-muted-foreground">{v.date}</div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-9 w-9"
            disabled={index <= 0}
            onClick={() => setIndex((i) => Math.max(i - 1, 0))}
            title="Versão mais recente"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        {!isLatest && (
          <button
            onClick={() => setIndex(0)}
            className="w-full rounded-xl border border-primary/30 bg-primary/10 text-primary text-sm font-medium py-2.5 hover:bg-primary/15 transition"
          >
            Voltar para a versão mais recente
          </button>
        )}

        <div className="rounded-2xl glass border border-white/10 p-4 space-y-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground uppercase tracking-wide">
              <History className="h-3.5 w-3.5" /> Novidades desta versão
            </div>
            <h2 className="text-lg font-semibold mt-1">{v.title}</h2>
          </div>
          <ul className="space-y-2.5">
            {v.changes.map((c, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className={`shrink-0 mt-0.5 text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase ${TYPE_STYLE[c.type]}`}>
                  {c.type}
                </span>
                <span className="text-sm flex-1">{c.text}</span>
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              </li>
            ))}
          </ul>
        </div>

        {isLatest && (
          <button
            onClick={() => window.dispatchEvent(new Event("nuv:show-intro"))}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 text-sm font-medium text-foreground transition hover:bg-white/10"
          >
            ▶︎ Rever a animação de novidades
          </button>
        )}

        <p className="text-center text-[11px] text-muted-foreground">
          Versão {index + 1} de {CHANGELOG.length} no histórico
        </p>
        <div className="h-2" />
      </div>
    </div>
  );
}
