# Arraste da lente Glass UI

## Resultado
- Permitir arrastar a lente horizontalmente com o dedo ou mouse.
- Durante o arraste, a lente acompanha o gesto e destaca o elemento mais próximo.
- Ao soltar, a lente encaixa no elemento escolhido com a mesma mola elástica.
- Manter o clique atual e o passeio automático quando não houver interação.

## Detalhes técnicos
- Usar Pointer Events com captura do ponteiro para funcionar em toque e mouse.
- Limitar o deslocamento às extremidades da cápsula e impedir rolagem horizontal acidental somente sobre ela.
- Pausar o movimento automático durante o gesto e retomá-lo depois.
- Preservar a refração, ampliação, deformação e posição dos três elementos.

## Verificação
- Testar arraste e clique no celular e no desktop.
- Conferir encaixe nos três elementos, limites da barra e ausência de sobreposição.
