# FOOTERA 2.0

Um Reigns de futebol: você vive uma carreira inteira escolhendo entre duas respostas por carta.

## Como rodar
```
npm run dev     # http://127.0.0.1:4173
npm test        # 35 testes automatizados
```

## O que mudou na 2.0
- Sem barras de relacionamento. Personagens guardam confiança interna (-3 a +3); você a sente nas cartas.
- Temporadas de 7 a 10 decisões, com resumo individual ao final (gols, assistências, nota, jogos em destaque).
- 80 cartas, com cadeias de consequências (rival, treinador, empresário, família, transferências recusadas).
- Cada escolha tem custo; o potencial é um teto de evolução.
- Salvamento formato 2, com migração automática do formato 1 e backup do save original.

## Estrutura
- `src/game/engine.js` motor: seleção de cartas, consequências, virada de temporada.
- `src/game/cards/*.js` cartas por tema.
- `src/game/season.js` temporada do jogador e progressão.
- `src/game/migrate.js` migração de saves.
- `src/game/world.js` mundo (6 países, 240 clubes, copas).
- `src/ui/views.js` telas (HTML puro); `src/app.js` eventos e gestos.
- `src/storage.js` IndexedDB (carreira ativa, arquivo, backups).

## Pendências
Copa do Mundo e seleção completa; filhos e sucessão familiar; tela do arquivo de carreiras e livro de recordes.
