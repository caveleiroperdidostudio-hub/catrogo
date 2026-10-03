# Atualização Ctrg UI + Ctrg OS

## Resultado
- Renomear a experiência gratuita para **Ctrg UI** e a experiência paga para **Ctrg OS**.
- Manter todas as funções atuais; o plano pago adiciona personalização e acabamento, sem bloquear recursos gratuitos existentes.
- Definir o Ctrg OS mensal por **R$ 15,63**.
- Substituir as chaves Pix atuais por **billiealieshsilva@gmail.com**.

## Acesso e segurança
- Validar o acesso ao Ctrg OS pelo backend: assinatura ativa, dono ou função de administrador.
- Dono e administradores recebem Ctrg OS automaticamente, sem pagamento.
- Usuários comuns enviam o Pix pelo fluxo atual; o app gera QR Code e Pix Copia e Cola preenchidos com R$ 15,63.
- Manter aprovação do pagamento até existir uma integração bancária com webhook; uma chave Pix isolada não confirma pagamentos com segurança.

## Interface
- Criar o tema exclusivo **Glass UI** do Ctrg OS inspirado no vídeo: painéis translúcidos, reflexos discretos, desfoque, profundidade e navegação flutuante, preservando a identidade galáctica do CatroGo.
- Melhorar também o Ctrg UI gratuito com superfícies mais limpas, hierarquia clara e menos informação simultânea.
- Reduzir a navegação principal ao essencial e colocar conta, personalização, temas, privacidade, notificações, IA e informações do app dentro de **Perfil → Configurações**.
- Tornar as categorias de Configurações fáceis de navegar em telas pequenas, sem listas horizontais apertadas.
- Atualizar textos de Premium, Sobre, IA, Museu e histórico de versões para a nomenclatura Ctrg OS.

## Implementação técnica
- Reutilizar `ui_user_preferences`, `ui_versions`, assinaturas e funções atuais; migrar nomenclatura e regras sem apagar dados.
- Adicionar o tema `glass` às preferências e aplicar tokens globais somente quando o usuário tiver Ctrg OS.
- Gerar o payload Pix no navegador sem expor segredos e sem depender de API externa.
- Corrigir o erro atual da tela de Configurações e manter os controles existentes funcionais.
- Atualizar o histórico da versão e o roadmap.

## Verificação
- Validar compilação e erros de execução.
- Testar o fluxo no tamanho de celular mostrado no preview: Perfil → Configurações → Aparência e Premium → Pix.
- Conferir que usuário comum não ativa Glass UI sem assinatura e que dono/admin recebe o acesso automaticamente.
