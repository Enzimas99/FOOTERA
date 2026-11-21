import { bond, continentalEntry, lastClubStanding, opt, technical } from './kit.js';

export const PUBLIC = [
  {
    id: 'world_division_change_v3', category: 'CLUBE', actor: 'treinador', weight: 16,
    eligible: state => state.world?.lastSeason?.movement.some(move => [...move.promoted, ...move.relegated].includes(state.player.club.id)) && state.memory.world_division_announcement !== state.world.lastSeason.season,
    text: '{person} reúne o elenco: o {club} {movimento}. É hora de decidir como o grupo vai encarar o novo desafio.',
    textValues: state => ({ movimento: state.world.lastSeason.movement.some(move => move.promoted.includes(state.player.club.id)) ? 'conquistou o acesso à primeira divisão' : 'foi rebaixado para a segunda divisão' }),
    options: [
      opt('Apoiar o grupo nessa mudança', state => ({ bonds: { companheiro: 1, treinador: 1 }, temper: 1, memory: { world_division_announcement: state.world.lastSeason.season }, outcome: 'O grupo se fecha em torno do projeto.' })),
      opt('Cobrar mudanças no clube', state => ({ bonds: { clube: -1, torcida: 1 }, fame: 2, temper: -1, memory: { world_division_announcement: state.world.lastSeason.season }, outcome: 'Você diz o que muitos pensam, e a diretoria anota.' })),
    ],
  },
  {
    id: 'world_cup_final_v3', category: 'TORCIDA', actor: 'torcida', weight: 14,
    eligible: state => state.world?.lastSeason?.nationalCups.some(cup => cup.rounds.at(-1).matches.some(match => [match.home, match.away].includes(state.player.club.id))) && state.memory.world_cup_announcement !== state.world.lastSeason.season,
    text: '{person} lembra da final da {copa}: o {club} {resultado}. A torcida ainda conversa sobre o que esse momento significa.',
    textValues: state => {
      const cup = state.world.lastSeason.nationalCups.find(item => item.rounds.at(-1).matches.some(match => [match.home, match.away].includes(state.player.club.id)));
      return { copa: cup.name, resultado: cup.champion === state.player.club.id ? 'levantou a taça' : 'terminou com o vice-campeonato' };
    },
    options: [
      opt('Compartilhar o momento com a torcida', state => ({ bonds: { torcida: 1 }, fame: 3, fatigue: 6, memory: { world_cup_announcement: state.world.lastSeason.season }, outcome: 'A torcida canta seu nome.' })),
      opt('Mirar na temporada seguinte', state => ({ bonds: { treinador: 1 }, development: 1, memory: { world_cup_announcement: state.world.lastSeason.season }, outcome: 'Você olha para frente, e alguns torcedores estranham a frieza.' })),
    ],
  },
  {
    id: 'world_league_review_v3', category: 'CLUBE', actor: 'treinador', weight: 8, cooldown: 14,
    eligible: state => !!lastClubStanding(state),
    text: '{person} comenta a última temporada do {club}: a equipe terminou em {posicao}º lugar, com {pontos} pontos. A comissão quer discutir o planejamento.',
    textValues: state => ({ posicao: lastClubStanding(state).position, pontos: lastClubStanding(state).points }),
    options: [
      opt('Ajudar no planejamento coletivo', { bonds: { clube: 1, companheiro: 1 }, fatigue: 6, outcome: 'Você se envolve além do campo, e a diretoria nota.' }),
      opt('Priorizar minha preparação', { development: 1, bonds: { companheiro: -1 }, outcome: 'Foco no próprio jogo. O elenco percebe quem pensa só em si.' }),
    ],
  },
  {
    id: 'world_continental_qualification_v3', category: 'CLUBE', actor: 'torcida', weight: 8, cooldown: 14,
    eligible: state => !!continentalEntry(state),
    text: '{person} comemora a classificação do {club} para a competição {competicao}, conquistada {origem}. A torcida quer saber como o elenco vai se preparar.',
    textValues: state => ({ competicao: continentalEntry(state), origem: state.world.lastSeason.nationalCups.some(cup => cup.champion === state.player.club.id) ? 'com o título da copa nacional' : 'na última liga' }),
    options: [
      opt('Prometer garra em cada jogo', { bonds: { torcida: 1 }, fame: 2, fatigue: 6, outcome: 'Você promete, e agora todo mundo vai cobrar.' }),
      opt('Pedir calma e foco', { bonds: { treinador: 1, torcida: -1 }, development: 1, outcome: 'A cautela agrada a comissão, mas esfria a torcida.' }),
    ],
  },
  {
    id: 'interview_credit_v1', category: 'IMPRENSA', actor: 'imprensa', weight: 4, cooldown: 16,
    text: 'Em uma entrevista, {person} pergunta quem merece o crédito pela sua fase. O microfone está na sua frente, e o vestiário vai ouvir.',
    options: [
      opt('Dividir o mérito com o grupo', { bonds: { companheiro: 1, imprensa: 1 }, fame: 1, temper: 1, memory: { ultima_entrevista: 'coletiva' }, echo: true, outcome: 'Todos adoram a resposta.' }),
      opt('Falar do meu próprio esforço', { bonds: { companheiro: -1, imprensa: 1 }, fame: 3, temper: -1, memory: { ultima_entrevista: 'individual' }, echo: true, outcome: 'A manchete é boa, mas o vestiário já leu.' }),
    ],
  },
  {
    id: 'interview_team_reaction_v2', category: 'VESTIÁRIO', actor: 'companheiro', weight: 7, cooldown: 20,
    waitingSince: state => state.lastSeen.interview_credit_v1 + 3,
    eligible: state => !!state.memory.ultima_entrevista && state.memory.entrevista_reagida !== state.memory.ultima_entrevista && state.lastSeen.interview_credit_v1 !== undefined && state.history.length - state.lastSeen.interview_credit_v1 >= 3,
    text: '{person} comenta sua entrevista. {entrevista_contexto}',
    textValues: state => ({ entrevista_contexto: state.memory.ultima_entrevista === 'coletiva' ? 'Você dividiu o mérito, e as palavras chegaram ao vestiário.' : 'Você destacou o próprio esforço, e as palavras chegaram ao vestiário.' }),
    options: [
      opt('Explicar o que quis dizer', state => ({ bonds: { companheiro: state.memory.ultima_entrevista === 'coletiva' ? 1 : 1 }, memory: { entrevista_reagida: state.memory.ultima_entrevista }, outcome: 'Você esclarece, e o clima melhora.' })),
      opt('Deixar minhas palavras falarem', state => ({ bonds: { companheiro: state.memory.ultima_entrevista === 'coletiva' ? 0 : -2 }, memory: { entrevista_reagida: state.memory.ultima_entrevista }, outcome: state.memory.ultima_entrevista === 'coletiva' ? 'Sem ruído, sem problema.' : 'O comentário fica no ar, e o vestiário esfria.' })),
    ],
  },
  {
    id: 'press_pressure_v1', category: 'IMPRENSA', actor: 'imprensa', weight: 4, cooldown: 14,
    eligible: state => state.player.fame >= 8,
    text: '{person} diz que as expectativas sobre você crescem a cada jogo. A pergunta é direta: você se sente preparado para a pressão?',
    options: [
      opt('Assumir a responsabilidade', (state, h) => (h.chance(0.55)
        ? { fame: 4, bonds: { torcida: 1, imprensa: 1 }, fatigue: 5, outcome: 'Você impõe respeito, e a promessa vira expectativa.' }
        : { fame: 1, bonds: { torcida: 0 }, fatigue: 8, temper: -1, outcome: 'Frases fortes, atuações abaixo. A imprensa cobra.' })),
      opt('Pedir tempo para evoluir', { fame: -1, bonds: { imprensa: 1, treinador: 1 }, development: 1, outcome: 'Humildade sempre cai bem, mas a torcida queria mais.' }),
    ],
  },
  {
    id: 'press_boundaries_v2', category: 'IMPRENSA', actor: 'imprensa', weight: 4, cooldown: 15,
    text: '{person} pede uma conversa sobre sua vida fora do futebol: família, gostos, planos. Você pode responder ou impor um limite.',
    options: [
      opt('Abrir um pouco a vida pessoal', { fame: 2, bonds: { imprensa: 1, torcida: 1 }, outcome: 'O público gosta de saber quem é você.' }),
      opt('Manter a privacidade', { fame: -1, bonds: { imprensa: -1, familia: 1 }, temper: 1, outcome: 'A família agradece, e a imprensa fica seca.' }),
    ],
  },
  {
    id: 'press_rumor_v1', category: 'IMPRENSA', actor: 'imprensa', weight: 5, cooldown: 18,
    eligible: state => state.player.fame >= 15,
    text: '{person} publica que você está insatisfeito e de saída. Não é verdade, mas o texto já circula em todos os grupos do clube.',
    options: [
      opt('Desmentir publicamente', (state, h) => (h.chance(0.55)
        ? { fame: 2, bonds: { clube: 1, torcida: 1 }, outcome: 'Seu desmentido ganha o dia, e o boato morre.' }
        : { fame: -2, bonds: { clube: -1, imprensa: -1 }, temper: -1, outcome: 'A forma agressiva ofusca o conteúdo. A polêmica cresce.' })),
      opt('Ignorar e esperar passar', { bonds: { clube: -1 }, fatigue: -2, outcome: 'O silêncio é interpretado de mil formas.' }),
    ],
  },
  {
    id: 'fan_autograph_v1', category: 'TORCIDA', actor: 'torcida', weight: 5, cooldown: 14,
    text: 'Na saída do centro de treinamento, {person} espera por uma foto e um autógrafo. Você está atrasado para a reunião com a comissão.',
    options: [
      opt('Parar e atender', (state, h) => (h.chance(0.3)
        ? { bonds: { torcida: 1, treinador: -1 }, fame: 1, outcome: 'A torcida adora, mas você chega atrasado à reunião.' }
        : { bonds: { torcida: 1 }, fame: 1, outcome: 'Você tira a foto e ainda chega a tempo.' })),
      opt('Seguir para a reunião', { bonds: { torcida: -1, treinador: 1 }, outcome: 'Pontual, mas um torcedor vai embora com a cara fechada.' }),
    ],
  },
  {
    id: 'fan_social_v1', category: 'TORCIDA', actor: 'torcida', weight: 4, cooldown: 14,
    text: 'Uma publicação sua recebe comentários divididos. {person} pede que você diga algo para a torcida do {club}.',
    options: [
      opt('Agradecer o apoio da torcida', { bonds: { torcida: 1 }, fame: 1, memory: { contato_torcida: 'proximo' }, echo: true, outcome: 'Você se aproxima do público.' }),
      opt('Manter minha privacidade', { bonds: { torcida: -1, familia: 1 }, memory: { contato_torcida: 'reservado' }, echo: true, outcome: 'Você prefere seu espaço, e alguns torcedores estranham.' }),
    ],
  },
  {
    id: 'fan_contact_return_v2', category: 'TORCIDA', actor: 'torcida', weight: 7, cooldown: 20,
    waitingSince: state => state.lastSeen.fan_social_v1 + 4,
    eligible: state => !!state.memory.contato_torcida && state.memory.contato_comentado !== state.memory.contato_torcida && state.lastSeen.fan_social_v1 !== undefined && state.history.length - state.lastSeen.fan_social_v1 >= 4,
    text: '{person} lembra de como você se comunicou com a torcida. {contato_contexto}',
    textValues: state => ({ contato_contexto: state.memory.contato_torcida === 'proximo' ? 'A aproximação criou intimidade, e agora cobram presença em eventos.' : 'A reserva virou assunto, e parte da torcida pede mais abertura.' }),
    options: [
      opt('Aparecer mais para a torcida', state => ({ bonds: { torcida: state.memory.contato_torcida === 'proximo' ? 1 : 2 }, fame: 2, fatigue: 6, memory: { contato_comentado: state.memory.contato_torcida }, outcome: 'A torcida sente você mais perto.' })),
      opt('Preservar meu espaço', state => ({ bonds: { torcida: -1, familia: 1 }, memory: { contato_comentado: state.memory.contato_torcida }, outcome: 'Você segue no seu ritmo.' })),
    ],
  },
  {
    id: 'fan_repair_v2', category: 'TORCIDA', actor: 'torcida', weight: 6, cooldown: 16,
    eligible: state => bond(state, 'torcida') <= -1,
    text: '{person} diz que parte da torcida perdeu a paciência com você. Há uma chance de ouvir sem prometer nada, ou de bater o pé.',
    options: [
      opt('Ouvir as críticas', { bonds: { torcida: 1 }, temper: 1, fatigue: 3, outcome: 'A conversa é dura, mas honesta. Parte da torcida volta.' }),
      opt('Responder dentro de campo', (state, h) => (h.chance(0.35 + (state.player.overall - 60) / 80)
        ? { bonds: { torcida: 2 }, fame: 2, outcome: 'Você joga como nunca. A torcida aplaude de pé.' }
        : { bonds: { torcida: -1 }, fame: -1, fatigue: 8, outcome: 'Tentar provar demais atrapalha, e as vaias vêm.' })),
    ],
  },
  {
    id: 'fan_pressure_v1', category: 'TORCIDA', actor: 'torcida', weight: 8, cooldown: 14,
    eligible: state => (lastClubStanding(state)?.position ?? 0) > 10 && state.season >= 2,
    text: 'O {club} vive uma fase ruim, e {person} puxa o coro da torcida: querem resposta dos jogadores. Os olhos se voltam para você.',
    options: [
      opt('Assumir a cobrança e liderar', (state, h) => (h.chance(0.5)
        ? { fame: 3, bonds: { torcida: 1, companheiro: 1 }, fatigue: 8, outcome: 'Você puxa o grupo, e o time reage.' }
        : { fame: -2, bonds: { torcida: -1 }, fatigue: 10, outcome: 'A resposta não vem, e a cobrança recai sobre você.' })),
      opt('Pedir paciência à torcida', { bonds: { torcida: -1, treinador: 1 }, fame: -1, outcome: 'O discurso é prudente, e a arquibancada não gosta.' }),
    ],
  },
  {
    id: 'club_community_v1', category: 'CLUBE', actor: 'treinador', weight: 4, cooldown: 16,
    text: 'O {club} foi convidado a visitar um projeto social. {person} pergunta se você pode representar o elenco.',
    options: [
      opt('Participar da visita', { bonds: { clube: 1, torcida: 1 }, fame: 2, fatigue: 4, outcome: 'A visita rende fotos bonitas e conversas que você não esquece.' }),
      opt('Deixar outro colega ir', { bonds: { clube: -1 }, fatigue: -4, outcome: 'Você descansa, e outro colega fica com os holofotes.' }),
    ],
  },
  {
    id: 'club_schedule_v1', category: 'CLUBE', actor: 'treinador', weight: 4, cooldown: 14,
    text: 'O clube quer usar parte do seu dia de folga em uma ação com patrocinadores. {person} deixa a decisão com você.',
    options: [
      opt('Ajudar o clube', { bonds: { clube: 1 }, money: 300, fatigue: 8, outcome: 'Você cumpre a agenda, e a diretoria agradece.' }),
      opt('Preservar minha folga', { bonds: { clube: -1 }, fatigue: -10, outcome: 'Você recarrega, mas a diretoria guarda o nome.' }),
    ],
  },
  {
    id: 'club_routine_v2', category: 'CLUBE', actor: 'treinador', weight: 4, cooldown: 15,
    text: '{person} anuncia uma mudança forte na rotina do {club}: concentração mais longa, menos folga. Querem sua opinião antes de decidir.',
    options: [
      opt('Apoiar a mudança', { bonds: { treinador: 1, companheiro: -1 }, development: 1, fatigue: 6, outcome: 'Você ganha pontos com a comissão, e perde alguns no vestiário.' }),
      opt('Defender mais folgas', { bonds: { companheiro: 1, treinador: -1 }, fatigue: -4, outcome: 'O grupo agradece, mas a comissão prefere que você não decida.' }),
    ],
  },
];
