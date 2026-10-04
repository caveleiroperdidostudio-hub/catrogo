# Glass UI do Ctrg OS

## Objetivo
Refazer o tema Glass UI existente sem recriar o app, usando os vídeos enviados como referência para obter vidro líquido convincente, movimento fluido e boa leitura no celular. O tema continuará exclusivo do Ctrg OS; a Ctrg UI gratuita e todas as funções atuais serão preservadas.

## O que será alterado
- Substituir o vidro atual, que parece apenas transparente, por superfícies com profundidade: desfoque real do conteúdo atrás, saturação, reflexo superior, borda prismática discreta, sombra interna e sensação de espessura.
- Criar uma linguagem única para barras, cabeçalhos, campos, cartões, menus, modais, controles, balões e botões, mantendo a identidade galáctica da CATROGO.
- Refazer a navegação inferior como uma cápsula de vidro líquido flutuante, com um indicador ativo que desliza e se deforma entre as abas, como nas referências.
- Aplicar animações de pressão e soltura nos controles: compressão, expansão elástica, brilho que acompanha o estado e transições suaves entre telas.
- Criar controles de vidro específicos para alternâncias, seletores e ações, com estados selecionado, pressionado, desativado e foco acessível.
- Melhorar os fundos para que o desfoque seja perceptível sem prejudicar contraste, leitura ou desempenho.
- Ajustar tudo para telas pequenas, recortes, barras do sistema e orientação, evitando sobreposição na largura de 320 px mostrada no preview.
- Respeitar “reduzir movimento” e a opção de animações do app, com uma versão estática do mesmo visual.

## Aplicação no app
- Priorizar a estrutura principal, Chat, Perfil/Configurações, Ctrg OS e os elementos compartilhados; os módulos que já usam o componente visual compartilhado receberão o novo acabamento automaticamente.
- Manter a liberação do Glass UI apenas para assinante, dono e equipe autorizada.
- Preservar todas as telas, dados, autenticação, permissões e recursos existentes.

## Pix e QR Code
O gerador já existe: ele cria o Pix Copia e Cola com R$ 15,63 e o QR Code usando a chave atual. Não será recriado; apenas receberá o novo acabamento Glass UI.

## Validação
- Conferir visualmente no preview em 320 × 595 e desktop.
- Testar troca de abas, indicador líquido, botões, rolagem, configurações do tema e tela do Pix.
- Verificar contraste, foco, movimento reduzido, ausência de sobreposição e erros do app.

## Detalhes técnicos
- Centralizar tokens de transparência, refração simulada, brilho, borda e elevação no tema global.
- Usar desfoque compilado pelo sistema de estilos do projeto para funcionar corretamente no navegador.
- Animar somente `transform`, `opacity` e propriedades leves; efeitos mais caros serão limitados às superfícies principais.
- Atualizar os metadados próprios da página inicial exigidos pelo app, sem alterar a navegação.
