import { bond, elapsed, opt, passing, pickSuitor, technical } from './kit.js';

export const LOCKER = [
  {
    id: 'team_dinner_v1', category: 'VESTIÁRIO', actor: 'companheiro', weight: 5, cooldown: 14,
    text: '{person} está organizando um jantar com o elenco. Amanhã tem treino cedo, e o grupo costuma lembrar de quem aparece.',
    options: [
      opt('Ir e conhecer melhor o grupo', { bonds: { companheiro: 1 }, fatigue: 6, money: -150, outcome: 'Você ri, ouve histórias e sai do jantar mais parte do elenco.' }),
      opt('Dormir cedo e render no treino', { fatigue: -8, bonds: { companheiro: -1 }, development: 1, outcome: 'O treino rende, e o grupo repara na cadeira vazia.' }),
    ],
  },
  {
    id: 'teammate_confidence_v1', category: 'VESTIÁRIO', actor: 'companheiro', weight: 4, cooldown: 14,
    text: 'Depois de um treino difícil, {person} admite que está perdendo a confiança. Você também tem um assunto a resolver com a comissão.',
    options: [
      opt('Parar e ouvir', { bonds: { companheiro: 2 }, fatigue: 3, memory: { apoiou_companheiro: true }, echo: true, outcome: 'A conversa dura mais do que o previsto. Ele não vai esquecer.' }),
      opt('Ir falar com a comissão', { bonds: { treinador: 1, companheiro: -1 }, memory: { apoiou_companheiro: false }, outcome: 'Você resolve o seu assunto. Ele percebe que você tinha pressa.' }),
    ],
  },
  {
    id: 'teammate_support_return_v2', category: 'VESTIÁRIO', actor: 'companheiro', weight: 8,
    waitingSince: state => state.lastSeen.teammate_confidence_v1 + 4,
    eligible: state => state.memory.apoiou_companheiro === true && !state.memory.apoio_retribuido && state.lastSeen.teammate_confidence_v1 !== undefined && state.history.length - state.lastSeen.teammate_confidence_v1 >= 4,
    text: '{person} nunca esqueceu quando você ouviu os problemas dele. Agora aparece com uma ideia para ajudar o seu jogo: treinos de passe em dupla antes da coletiva.',
    options: [
      opt('Aceitar a ajuda', state => ({ bonds: { companheiro: 1 }, attributes: { [passing(state)]: 1 }, fatigue: 6, memory: { apoio_retribuido: true }, outcome: 'A parceria dá frutos e a amizade se firma.' })),
      opt('Agradecer e seguir sozinho', { bonds: { companheiro: -1 }, temper: 0, memory: { apoio_retribuido: true }, outcome: 'Ele entende, mas a porta fica menos aberta.' }),
    ],
  },
  {
    id: 'duo_invitation_v2', category: 'VESTIÁRIO', actor: 'companheiro', weight: 5,
    eligible: state => !state.memory.dupla_etapa,
    text: '{person} propõe que vocês criem uma parceria de treino: jogadas ensaiadas, tempo extra, e um compromisso mútuo de cobrar um ao outro.',
    options: [
      opt('Aceitar a parceria', state => ({ bonds: { companheiro: 1 }, fatigue: 5, memory: { dupla_etapa: 'aceita', dupla_turno: state.history.length + 1 }, echo: true })),
      opt('Agradecer e seguir minha rotina', state => ({ bonds: { companheiro: -1 }, memory: { dupla_etapa: 'recusada', dupla_turno: state.history.length + 1 }, echo: true })),
    ],
  },
  {
    id: 'duo_disagreement_v2', category: 'VESTIÁRIO', actor: 'companheiro', weight: 12,
    waitingSince: state => state.memory.dupla_turno + 3,
    eligible: state => ['aceita', 'recusada'].includes(state.memory.dupla_etapa) && elapsed(state, 'dupla_turno', 3),
    text: '{person} retoma a conversa sobre os treinos em dupla. As expectativas de vocês não são iguais, e ele quer deixar isso claro antes de virar problema.',
    options: [
      opt('Encontrar um meio-termo', state => ({ bonds: { companheiro: 1 }, attributes: { [passing(state)]: 1 }, memory: { dupla_etapa: 'acordo', dupla_turno: state.history.length + 1 }, echo: true })),
      opt('Insistir na minha rotina', state => ({ bonds: { companheiro: -2, treinador: 1 }, memory: { dupla_etapa: 'distancia', dupla_turno: state.history.length + 1 }, echo: true })),
    ],
  },
  {
    id: 'duo_consequence_v2', category: 'VESTIÁRIO', actor: 'companheiro', weight: 16,
    waitingSince: state => state.memory.dupla_turno + 5,
    eligible: state => ['acordo', 'distancia'].includes(state.memory.dupla_etapa) && elapsed(state, 'dupla_turno', 5),
    text: '{person} volta a falar da rotina de vocês. {dupla_contexto}',
    textValues: state => ({ dupla_contexto: state.memory.dupla_etapa === 'acordo' ? 'O combinado deu certo: nos jogos, vocês se encontram sem nem olhar.' : 'A distância ficou. No campo, vocês já não se procuram como antes.' }),
    options: [
      opt('Conversar sobre o que ficou', state => ({ bonds: { companheiro: state.memory.dupla_etapa === 'acordo' ? 1 : 2 }, standing: state.memory.dupla_etapa === 'acordo' ? 1 : 0, memory: { dupla_desfecho: state.memory.dupla_etapa, dupla_etapa: 'concluida' }, outcome: 'Conversa aberta. O ambiente muda para melhor.' })),
      opt('Deixar o assunto para trás', state => ({ bonds: { companheiro: state.memory.dupla_etapa === 'acordo' ? -1 : -2 }, memory: { dupla_desfecho: state.memory.dupla_etapa, dupla_etapa: 'concluida' }, outcome: 'O assunto morre, mas fica uma marca no vestiário.' })),
    ],
  },
  {
    id: 'teammate_advice_v1', category: 'VESTIÁRIO', actor: 'companheiro', weight: 3, cooldown: 14,
    text: '{person} já viu muita gente passar pelo clube e oferece um conselho: aprenda a jogar o jogo fora do campo antes que o jogo te engula.',
    options: [
      opt('Ouvir o conselho', { bonds: { companheiro: 1, treinador: 1 }, temper: 1, outcome: 'Você ganha uma bússola para o ambiente do clube.' }),
      opt('Confiar no meu jeito', state => ({ attributes: { posicionamento: 1 }, bonds: { companheiro: -1 }, temper: -1, outcome: 'Você ganha confiança, e perde um aliado.' })),
    ],
  },
  {
    id: 'team_tension_v2', category: 'VESTIÁRIO', actor: 'companheiro', weight: state => (bond(state, 'companheiro') <= -2 ? 12 : 6), cooldown: 12,
    eligible: state => bond(state, 'companheiro') <= -1,
    text: '{person} diz que o vestiário anda dividido, e que parte da divisão tem a ver com você. A conversa pode ser a última chance de acertar isso sem barulho.',
    options: [
      opt('Chamar o grupo para conversar', (state, h) => (h.chance(0.65)
        ? { bonds: { companheiro: 2 }, fatigue: 4, temper: 1, outcome: 'Todo mundo fala o que pensa, e o ambiente volta a respirar.' }
        : { bonds: { companheiro: -1 }, fame: -1, outcome: 'A reunião vira um bate-boca. Ninguém sai satisfeito.' })),
      opt('Dar tempo ao tempo', { bonds: { companheiro: 0, treinador: 1 }, development: 0, outcome: 'Você evita o desgaste. O problema fica guardado.' }),
    ],
  },
  {
    id: 'team_trust_v2', category: 'VESTIÁRIO', actor: 'companheiro', weight: 5, cooldown: 14,
    eligible: state => bond(state, 'companheiro') >= 2,
    text: '{person} pede ajuda para integrar um garoto da base que acabou de subir. O grupo confia que você sabe fazer isso melhor que ninguém.',
    options: [
      opt('Cuidar do garoto', { bonds: { companheiro: 1, clube: 1 }, fame: 1, fatigue: 4, outcome: 'Você ganha um discípulo e a admiração do clube.' }),
      opt('Sugerir outra pessoa', { bonds: { treinador: 1, companheiro: -1 }, fatigue: -3, outcome: 'Você se poupa, mas perde pontos de liderança.' }),
    ],
  },
  {
    id: 'teammate_jealousy_v1', category: 'AMIZADE E RIVALIDADE', actor: 'rival', weight: 5, cooldown: 30,
    eligible: state => state.player.fame >= 10 && !state.memory.rival_estado,
    text: '{person} era seu parceiro de treino até você começar a aparecer. Agora as divididas vêm mais duras e os elogios ao seu futebol já não saem dele.',
    options: [
      opt('Chamar para conversar', state => ({ bonds: { rival: 1 }, memory: { rival_estado: 'conversa', rival_turno: state.history.length + 1 }, schedule: [{ id: 'rival_return_v1', after: 6 }], echo: true, outcome: 'Ele não admite o ciúme, mas abaixa a guarda por enquanto.' })),
      opt('Responder na mesma moeda', state => ({ bonds: { rival: -2 }, temper: -1, fame: 1, memory: { rival_estado: 'hostil', rival_turno: state.history.length + 1 }, schedule: [{ id: 'rival_return_v1', after: 6 }], echo: true, outcome: 'O treino vira disputa. Os dois passam a se evitar.' })),
    ],
  },
  {
    id: 'rival_return_v1', category: 'AMIZADE E RIVALIDADE', actor: 'rival', weight: 20,
    eligible: state => ['conversa', 'hostil'].includes(state.memory.rival_estado),
    prepare: (state, h) => {
      const club = pickSuitor(state, h);
      return { clubId: club.id, clubName: club.name };
    },
    text: '{person} deixou o clube e agora defende o {rival_clube}, justamente o próximo adversário. {rival_contexto}',
    textValues: state => ({
      rival_clube: state.context?.clubName ?? state.memory.rival_clube_nome ?? 'rival',
      rival_contexto: state.memory.rival_estado === 'hostil' ? 'Ele deu declarações dizendo que você teve sorte e que vai provar isso em campo.' : 'Mandou uma mensagem curta dizendo que quer um jogo limpo, e um abraço depois.',
    }),
    options: [
      opt('Provocar de volta', state => ({ bonds: { rival: -1, torcida: 1 }, fame: 2, temper: -1, memory: { rival_estado: 'guerra', rival_turno: state.history.length + 1, rival_clube: state.context?.clubId, rival_clube_nome: state.context?.clubName }, schedule: [{ id: 'rival_war_v1', after: 5 }], echo: true, outcome: 'A imprensa adora. O jogo contra eles vira o assunto da semana.' })),
      opt('Procurar a reconciliação', state => ({ bonds: { rival: 2 }, temper: 1, memory: { rival_estado: 'tregua', rival_turno: state.history.length + 1, rival_clube: state.context?.clubId, rival_clube_nome: state.context?.clubName }, schedule: [{ id: 'rival_peace_v1', after: 6 }], echo: true, outcome: 'Você oferece a trégua. Ele hesita, mas aceita.' })),
    ],
  },
  {
    id: 'rival_war_v1', category: 'AMIZADE E RIVALIDADE', actor: 'rival', weight: 20,
    eligible: state => state.memory.rival_estado === 'guerra',
    text: 'No clássico contra o {rival_clube}, {person} vem para cima de você desde o primeiro minuto. Em uma disputa de bola, ele deixa a perna passar.',
    textValues: state => ({ rival_clube: state.memory.rival_clube_nome ?? 'adversário' }),
    options: [
      opt('Revidar na hora', (state, h) => (h.chance(0.45)
        ? { fame: 2, bonds: { torcida: 1, rival: -1 }, stats: { yellow: 1 }, memory: { rival_estado: 'inimigo' }, outcome: 'Você leva um amarelo, mas a torcida entende o recado.' }
        : { stats: { red: 1 }, fame: -2, standing: -1, bonds: { treinador: -1 }, memory: { rival_estado: 'inimigo' }, outcome: 'O árbitro puxa o vermelho. O time sofre sem você.' })),
      opt('Respirar fundo e jogar', { temper: 2, bonds: { treinador: 1 }, fame: 1, memory: { rival_estado: 'respeito' }, outcome: 'Você deixa o jogo falar. Ele sai do campo sem palavras.' }),
    ],
  },
  {
    id: 'rival_peace_v1', category: 'AMIZADE E RIVALIDADE', actor: 'rival', weight: 20,
    eligible: state => state.memory.rival_estado === 'tregua',
    text: 'Depois do jogo contra o {rival_clube}, {person} espera você na saída do vestiário. Diz que a trégua virou respeito, e que precisa de um conselho de amigo.',
    textValues: state => ({ rival_clube: state.memory.rival_clube_nome ?? 'adversário' }),
    options: [
      opt('Ajudar sem esperar nada', { bonds: { rival: 1, amigo: 1 }, fame: 1, temper: 1, fatigue: 5, memory: { rival_estado: 'amigos' }, outcome: 'Dois rivais que viram amigos: o futebol aprova.' }),
      opt('Manter distância profissional', { bonds: { rival: 0 }, memory: { rival_estado: 'respeito' }, outcome: 'Sem inimizade e sem amizade: apenas dois profissionais.' }),
    ],
  },
  {
    id: 'captain_armband_v1', category: 'VESTIÁRIO', actor: 'companheiro', weight: 5, cooldown: 40,
    eligible: state => state.player.age >= 22 && state.player.standing >= 3 && bond(state, 'companheiro') >= 1,
    text: 'O capitão se machucou, e {person} diz que o grupo quer você com a braçadeira. Será uma responsabilidade enorme, com cobrança de todos os lados.',
    options: [
      opt('Aceitar a braçadeira', { bonds: { companheiro: 1, clube: 1, treinador: 1 }, fame: 3, fatigue: 8, memory: { capitao: true }, outcome: 'Você assume o vestiário. Agora também é seu problema.' }),
      opt('Recusar e apoiar outro', { bonds: { companheiro: 0 }, fatigue: -4, temper: 1, outcome: 'O grupo respeita, e alguém assume. Você segue como peça-chave.' }),
    ],
  },
  {
    id: 'new_signing_v1', category: 'VESTIÁRIO', actor: 'treinador', weight: 5, cooldown: 30,
    eligible: state => state.player.standing >= 2 && state.season >= 2,
    text: 'O clube contrata um reforço para a sua posição. {person} garante que a concorrência é saudável, mas todo mundo sabe que só um deles vai jogar.',
    options: [
      opt('Receber bem e competir limpo', { bonds: { companheiro: 1, treinador: 1 }, development: 1, outcome: 'O treino ganha qualidade. Quem jogar, joga por merecer.' }),
      opt('Provar quem manda no treino', (state, h) => (h.chance(0.4 + (state.player.overall - 65) / 60)
        ? { standing: 1, bonds: { companheiro: -1 }, fatigue: 10, outcome: 'Você deixa o recado claro, e o novato fica atrás.' }
        : { standing: -1, bonds: { companheiro: -1, treinador: -1 }, fatigue: 10, outcome: 'O novato responde melhor que o esperado, e você perde espaço.' })),
    ],
  },
  {
    id: 'youth_initiation_v1', category: 'VESTIÁRIO', actor: 'companheiro', weight: 6, cooldown: 60,
    eligible: state => state.player.age <= 20 && !state.memory.trote,
    text: 'É tradição no clube: o garoto da base faz uma apresentação diante do elenco inteiro. {person} garante que é só diversão. Todos olham para você.',
    options: [
      opt('Cantar e entrar na brincadeira', { bonds: { companheiro: 2 }, fame: 1, memory: { trote: 'aceito' }, outcome: 'Você desafina, e todos riem junto. Está aceito.' }),
      opt('Recusar com educação', { bonds: { companheiro: -1, treinador: 1 }, temper: 1, memory: { trote: 'recusado' }, outcome: 'Alguns respeitam. Outros guardam a recusa.' }),
    ],
  },
  {
    id: 'friend_party_v1', category: 'VIDA PESSOAL', actor: 'amigo', weight: 4, cooldown: 16,
    text: '{person} te convida para um aniversário na véspera do jogo. Vai estar cheio de gente, e de câmeras de celular.',
    options: [
      opt('Ir, só por um tempo', (state, h) => (h.chance(0.35)
        ? { bonds: { amigo: 1, treinador: -1 }, fatigue: 8, fame: -2, temper: -1, outcome: 'Uma foto vaza. O treinador não ficou nada contente.' }
        : { bonds: { amigo: 1 }, fatigue: 6, outcome: 'Você se diverte, vai embora cedo, e ninguém nota.' })),
      opt('Ficar em casa descansando', { bonds: { amigo: -1 }, fatigue: -8, outcome: 'Você dorme bem, e perde uma noite de memórias.' }),
    ],
  },
];
