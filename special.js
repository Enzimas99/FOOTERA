import { bond, opt } from './kit.js';

export const SPECIAL = [
  {
    id: 'national_callup_v1', category: 'SELEÇÃO', actor: 'treinador', weight: 10, cooldown: 6,
    eligible: state => state.player.overall >= 70 && state.player.fame >= 18 && state.player.age >= 18 && state.memory.convocacao_temporada !== state.season,
    text: 'Uma ligação inesperada: a comissão da seleção quer você na próxima data FIFA. {person} diz que o clube vai liberar, mas que o calendário está apertado.',
    options: [
      opt('Aceitar a convocação', state => ({ stats: { caps: 2 }, fame: 4, fatigue: 14, bonds: { torcida: 1, treinador: 0 }, memory: { convocacao_temporada: state.season, convocado: true }, outcome: 'A camisa da seleção pesa e emociona.' })),
      opt('Pedir dispensa e ficar no clube', state => ({ fame: -2, bonds: { treinador: 1, imprensa: -1 }, fatigue: -6, memory: { convocacao_temporada: state.season }, outcome: 'O clube agradece, mas a imprensa não perdoa.' })),
    ],
  },
  {
    id: 'rare_old_idol_v1', category: 'RARO', actor: 'familia', weight: 12, cooldown: 100,
    eligible: state => state.player.origin.id === 'filho_ex_jogador' && !state.memory.idolo,
    text: 'Antes do jogo, um senhor de cabelos brancos para você no corredor. Ele jogou com o seu pai, e diz que viu em você o mesmo jeito de correr. {person} aparece e confirma: era mesmo um dos grandes.',
    options: [
      opt('Perguntar como seu pai jogava', { development: 2, bonds: { familia: 1, treinador: -1 }, fame: 1, memory: { idolo: 'ouvido' }, outcome: 'Você descobre detalhes que seu pai nunca contou, mas chega atrasado ao aquecimento.' }),
      opt('Agradecer e seguir o seu caminho', { temper: 1, memory: { idolo: 'cumprimento' }, outcome: 'Você quer ser você, e não o filho do ex-jogador.' }),
    ],
  },
  {
    id: 'rare_fan_hospital_v1', category: 'RARO', actor: 'torcida', weight: 8, cooldown: 100,
    eligible: state => state.player.fame >= 20 && !state.memory.torcedor_hospital,
    text: 'O clube recebe uma carta de {person}, que está internado e conta que sua única alegria é torcer. Ele pede, sem esperança, uma camisa sua.',
    options: [
      opt('Visitar o hospital', state => ({ fame: 3, bonds: { torcida: 2 }, fatigue: 6, memory: { torcedor_hospital: 'visitou', torcedor_turno: state.history.length + 1 }, echo: true, outcome: 'Uma tarde de conversa que muda os dois.' })),
      opt('Mandar a camisa autografada', state => ({ fame: 1, bonds: { torcida: 1 }, memory: { torcedor_hospital: 'enviou', torcedor_turno: state.history.length + 1 }, echo: true, outcome: 'O gesto é pequeno, mas chega a tempo.' })),
    ],
  },
  {
    id: 'rare_fan_return_v1', category: 'RARO', actor: 'torcida', weight: 14, cooldown: 100,
    eligible: state => !!state.memory.torcedor_hospital && !state.memory.torcedor_retorno && state.history.length - (state.memory.torcedor_turno ?? 0) >= 12,
    text: 'No meio de uma fase difícil, uma faixa aparece na arquibancada: "Obrigado". É {person}, recuperado. Ele vai todos os domingos, para te ver jogar.',
    options: [
      opt('Dedicar o próximo gol a ele', (state, h) => (h.chance(0.6)
        ? { fame: 3, bonds: { torcida: 2 }, development: 1, memory: { torcedor_retorno: true }, outcome: 'O gol sai, e a faixa na arquibancada balança.' }
        : { fame: -2, bonds: { torcida: 1 }, memory: { torcedor_retorno: true }, outcome: 'O gol não sai, mas o gesto foi sentido por quem importa.' })),
      opt('Chamá-lo ao vestiário depois do jogo', state => ({ fame: 2, bonds: { torcida: 1, companheiro: 1 }, memory: { torcedor_retorno: true }, outcome: 'Todo o elenco abraça o torcedor. Um dia que ninguém esquece.' })),
    ],
  },
  {
    id: 'rare_legend_game_v1', category: 'RARO', actor: 'imprensa', weight: 6, cooldown: 100,
    eligible: state => state.player.age >= 30 && state.player.fame >= 35 && !state.memory.jogo_lendas,
    text: 'Uma lenda do futebol organiza um jogo beneficente e convida você para o time dele. {person} avisa que o calendário aperta e que o treinador não gosta de desfalques.',
    options: [
      opt('Aceitar o convite', { fame: 4, fatigue: 10, bonds: { treinador: -1, torcida: 1 }, memory: { jogo_lendas: 'jogou' }, outcome: 'Jogar ao lado de um ídolo da infância não tem preço.' }),
      opt('Recusar e priorizar o clube', { bonds: { treinador: 1, imprensa: -1 }, memory: { jogo_lendas: 'recusou' }, outcome: 'Profissionalismo, mas fica a pergunta: e se?' }),
    ],
  },
  {
    id: 'rare_rival_friend_call_v1', category: 'RARO', actor: 'rival', weight: 16, cooldown: 100,
    eligible: state => state.memory.rival_estado === 'amigos' && !!state.world?.clubs?.[state.memory.rival_clube] && !state.memory.rival_convite && state.history.length > 14,
    prepare: state => {
      const club = state.world.clubs[state.memory.rival_clube];
      return { clubId: club.id, clubName: club.name, salary: Math.round(state.player.contract.salary * 1.2 / 100) * 100 };
    },
    text: 'O antigo rival, hoje um dos seus melhores amigos, liga com uma proposta: o {rival_clube} quer você, e ele já falou bem de você para a diretoria.',
    textValues: state => ({ rival_clube: state.context?.clubName ?? state.memory.rival_clube_nome }),
    options: [
      opt('Aceitar o convite do amigo', state => ({ fatigue: 6, transfer: { clubId: state.context.clubId, salary: state.context.salary, years: 3 }, bonds: { rival: 1, amigo: 1 }, memory: { rival_convite: 'aceito' }, outcome: 'A rivalidade de antes vira parceria no mesmo vestiário.' })),
      opt('Agradecer e ficar onde estou', { bonds: { rival: 0, clube: 1 }, memory: { rival_convite: 'recusado' }, outcome: 'Ele entende. A amizade segue, mesmo em clubes diferentes.' }),
    ],
  },
  {
    id: 'rare_loyalty_v1', category: 'RARO', actor: 'treinador', weight: 12, cooldown: 100,
    eligible: state => state.memory.capitao === true && state.player.age >= 28 && bond(state, 'clube') >= 2 && !state.memory.lealdade,
    text: 'A diretoria do {club} chama você para uma reunião com {person}: querem fazer de você a cara do projeto, com um contrato longo e uma proposta de se tornar ídolo eterno.',
    options: [
      opt('Ficar para sempre', state => ({ contract: { years: 5, raise: 1.15 }, bonds: { clube: 1, torcida: 2 }, fame: 3, memory: { lealdade: 'ficou' }, outcome: 'A camisa vira pele. A torcida jamais esquece.' })),
      opt('Buscar novos desafios', state => ({ bonds: { clube: -2, torcida: -1 }, fame: 1, memory: { lealdade: 'saiu' }, schedule: [{ id: 'transfer_offer_v1', after: 2 }], outcome: 'Você agradece e abre a porta. Isso custa caro à torcida.' })),
    ],
  },
  {
    id: 'retire_v1', category: 'CARREIRA', actor: 'familia', weight: state => 4 + (state.player.age - 34) * 4 + (state.player.overall < 62 ? 8 : 0), cooldown: 3,
    eligible: state => state.player.age >= 34,
    text: 'A idade pesa, e {person} pergunta se você já pensou no depois. Ainda há jogo no corpo, mas há uma vida inteira fora de campo esperando.',
    options: [
      opt('Pendurar as chuteiras', { retire: true, fame: 3, outcome: 'Você encerra uma carreira inteira. A torcida lota o estádio para a despedida.' }),
      opt('Mais uma temporada', { fatigue: 8, outcome: 'Você não está pronto para dizer adeus.' }),
    ],
  },
];
