import { isAttacker, isDefender, isKeeper, opt } from './kit.js';

// Cartas de jogo importante: raras (no máximo uma por temporada) e nunca garantem o resultado.
const gate = state => state.seasonProgress.decisions >= 2 && (state.seasonProgress.matchCards ?? 0) < 1 && state.player.standing >= 1 && !state.player.injury;
const attr = (state, key) => state.player.attributes[key];

export const MATCH = [
  {
    id: 'match_chance_v1', category: 'PARTIDA', actor: 'companheiro', weight: 7, cooldown: 12,
    eligible: state => gate(state) && !isKeeper(state) && !isDefender(state),
    text: 'Jogo equilibrado, minuto 78. A bola sobra na entrada da área. {person} está livre à sua direita, e o gol está aberto na sua frente.',
    options: [
      opt('Finalizar de primeira', (state, h) => (h.chance(0.22 + attr(state, 'finalizacao') / 200 + state.player.fatigue / -500)
        ? { stats: { goals: 1 }, fame: 3, bonds: { torcida: 1 }, matchCard: true, outcome: 'GOL! A bola entra no ângulo, e o estádio vem abaixo.' }
        : { fame: -1, bonds: { companheiro: -1 }, matchCard: true, outcome: 'O chute vai por cima. {person} levanta os braços, sem entender.' })),
      opt('Tocar para o companheiro', (state, h) => (h.chance(0.35 + attr(state, 'passe') / 200)
        ? { stats: { assists: 1 }, bonds: { companheiro: 1 }, fame: 1, matchCard: true, outcome: 'O passe sai perfeito, e {person} só empurra para o fundo da rede.' }
        : { bonds: { companheiro: 0 }, matchCard: true, outcome: 'O passe chega fraco, o zagueiro corta, e a chance morre.' })),
    ],
  },
  {
    id: 'match_defense_v1', category: 'PARTIDA', actor: 'companheiro', weight: 7, cooldown: 12,
    eligible: state => gate(state) && isDefender(state),
    text: 'Minuto 84, jogo empatado. O atacante adversário passa pelo meio-campo e vai em direção à área, e só você está entre ele e o gol.',
    options: [
      opt('Ir no desarme', (state, h) => (h.chance(0.25 + attr(state, 'desarme') / 160)
        ? { fame: 3, bonds: { torcida: 1, treinador: 1 }, matchCard: true, outcome: 'Desarme limpo, de carrinho. O estádio aplaude de pé.' }
        : { stats: { yellow: 1 }, fame: -2, bonds: { treinador: -1 }, matchCard: true, outcome: 'Você chega atrasado: falta, amarelo e bola parada perigosa.' })),
      opt('Recuar e fechar o espaço', (state, h) => (h.chance(0.35 + attr(state, 'posicionamento') / 180)
        ? { fame: 1, bonds: { treinador: 1 }, matchCard: true, outcome: 'Você faz o atacante errar o passe. Perigo afastado.' }
        : { fame: -1, matchCard: true, outcome: 'Ele ganha o espaço e finaliza. A bola passa raspando a trave.' })),
    ],
  },
  {
    id: 'match_keeper_v1', category: 'PARTIDA', actor: 'treinador', weight: 7, cooldown: 12,
    eligible: state => gate(state) && isKeeper(state),
    text: 'Pênalti para o adversário, aos 87. O artilheiro deles pega a bola. Você o conhece: já bateu três vezes contra você, sempre no mesmo canto... talvez.',
    options: [
      opt('Cair no canto de sempre', (state, h) => (h.chance(0.2 + attr(state, 'reflexos') / 200)
        ? { fame: 4, bonds: { torcida: 1 }, matchCard: true, outcome: 'Pegou! O estádio explode, e você é o herói da noite.' }
        : { fame: -1, matchCard: true, outcome: 'Ele muda o canto. A bola entra, e o jogo escapa.' })),
      opt('Esperar e reagir', (state, h) => (h.chance(0.15 + attr(state, 'reflexos') / 200)
        ? { fame: 4, bonds: { torcida: 1 }, matchCard: true, outcome: 'Você fica no meio e agarra o chute. Cabeça fria!' }
        : { fame: -1, matchCard: true, outcome: 'A bola passa pelo meio do gol. Ele tinha escolhido o centro.' })),
    ],
  },
  {
    id: 'match_taunt_v1', category: 'PARTIDA', actor: 'rival', weight: 5, cooldown: 14,
    eligible: state => gate(state) && state.player.fame >= 8,
    text: 'No intervalo, {person} se aproxima na saída do túnel e diz algo baixo no seu ouvido. Você só ouve o final: "acabou a sorte".',
    options: [
      opt('Responder com provocação', (state, h) => (h.chance(0.4)
        ? { fame: 2, bonds: { rival: -1, torcida: 1 }, matchCard: true, outcome: 'Sua resposta viraliza, e o jogo esquenta a seu favor.' }
        : { stats: { yellow: 1 }, fame: -1, temper: -1, bonds: { rival: -1, treinador: -1 }, matchCard: true, outcome: 'O árbitro ouve e adverte você. O rival sorri.' })),
      opt('Ignorar e voltar ao campo', { temper: 1, bonds: { treinador: 1 }, matchCard: true, outcome: 'Você entra mais frio que nunca, e ele fica sem reação.' }),
    ],
  },
  {
    id: 'match_coach_shift_v1', category: 'PARTIDA', actor: 'treinador', weight: 5, cooldown: 14,
    eligible: state => gate(state) && !isKeeper(state),
    text: 'Perdendo por 1 a 0, {person} grita da beira do campo: quer que você mude de função, abra mão do seu jogo e vá ajudar na marcação.',
    options: [
      opt('Obedecer e se sacrificar', (state, h) => (h.chance(0.45)
        ? { bonds: { treinador: 2, companheiro: 1 }, fatigue: 8, matchCard: true, outcome: 'O time vira o jogo, e o treinador abraça você no apito final.' }
        : { bonds: { treinador: 1 }, fatigue: 8, fame: -1, matchCard: true, outcome: 'Você cumpre a função, mas o time perde assim mesmo.' })),
      opt('Manter meu jogo', (state, h) => (h.chance(0.4 + (state.player.overall - 65) / 80)
        ? { fame: 3, bonds: { treinador: -1, torcida: 1 }, matchCard: true, outcome: 'Você decide o jogo por conta própria. O treinador engole em seco.' }
        : { fame: -2, bonds: { treinador: -2 }, standing: -1, matchCard: true, outcome: 'Você desobedece e erra. A reprimenda pública vem pesada.' })),
    ],
  },
  {
    id: 'match_penalty_v1', category: 'PARTIDA', actor: 'companheiro', weight: 5, cooldown: 14,
    eligible: state => gate(state) && !isKeeper(state) && state.player.standing >= 2,
    text: 'Pênalti a favor aos 90, com o jogo empatado. O cobrador habitual está lesionado. {person} olha para você: "pega a bola".',
    options: [
      opt('Pegar a bola e bater', (state, h) => (h.chance(0.55 + attr(state, 'finalizacao') / 400)
        ? { stats: { goals: 1 }, fame: 4, bonds: { torcida: 1, companheiro: 1 }, matchCard: true, outcome: 'Gol no último minuto. O estádio inteiro vem abaixo.' }
        : { fame: -3, bonds: { torcida: -1 }, matchCard: true, outcome: 'O goleiro defende. O silêncio é de doer.' })),
      opt('Passar a responsabilidade', { bonds: { companheiro: 1 }, fame: 0, matchCard: true, outcome: 'Outro jogador cobra. Você respira, mas o gesto não passa em branco.' }),
    ],
  },
];
