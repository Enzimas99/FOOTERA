import { bond, elapsed, opt, technical, passing } from './kit.js';

export const TRAINING = [
  {
    id: 'preseason_focus_v1', category: 'TREINAMENTO', actor: 'treinador', weight: 60, cooldown: 4,
    eligible: state => state.seasonProgress.decisions === 0,
    text: 'Nova temporada, e {person} abre a pré-temporada com uma regra simples: ninguém evolui em tudo ao mesmo tempo. Cada jogador escolhe onde vai suar mais.',
    options: [
      opt('Ganhar fôlego e força', state => ({ focus: 'resistencia', attributes: { resistencia: 1 }, fatigue: 12, outcome: 'Os treinos de campo pesam, mas o corpo responde.' })),
      opt('Lapidar a técnica', state => ({ focus: technical(state), attributes: { [technical(state)]: 1 }, development: 1, outcome: 'Horas extras com a bola, e menos tempo de recuperação.' })),
    ],
  },
  {
    id: 'training_extra_v1', category: 'TREINAMENTO', actor: 'treinador', weight: 6,
    text: 'O treino terminou, mas {person} propõe uma sessão extra só com você. É uma chance real de evoluir, e seu corpo já avisa que o dia foi longo.',
    options: [
      opt('Ficar e treinar mais', (state, h) => {
        const risky = state.player.fatigue >= 45 && h.chance(0.2 + state.player.fatigue / 300);
        return risky
          ? { attributes: { [technical(state)]: 1 }, fatigue: 14, injury: { label: 'Estiramento leve', games: 4 }, bonds: { treinador: 1 }, outcome: 'No fim da sessão, a coxa travou. Você sai de campo mancando.' }
          : { attributes: { [technical(state)]: 2 }, fatigue: 16, bonds: { treinador: 1 }, development: 1, outcome: 'Foi puxado, mas o toque de bola nunca esteve tão afiado.' };
      }),
      opt('Descansar hoje', { fatigue: -14, bonds: { treinador: -1 }, outcome: 'O corpo agradece. O treinador anota a ausência.' }),
    ],
  },
  {
    id: 'training_focus_v1', category: 'TREINAMENTO', actor: 'treinador', weight: 5, cooldown: 8,
    eligible: state => state.player.money >= 1500,
    text: 'A comissão libera uma semana de trabalho especial. {person} pergunta onde você quer investir, e lembra que particular custa caro, mas o clube só dá o básico.',
    options: [
      opt('Trabalhar o físico com a comissão', { attributes: { resistencia: 2, forca: 1 }, fatigue: 12, outcome: 'Semana dura de academia e corrida. Você sente o ganho.' }),
      opt('Pagar um treinador particular (€ 1.500)', state => ({ attributes: { [technical(state)]: 3 }, money: -1500, development: 1, outcome: 'Um especialista ajusta detalhes que ninguém no clube via.' })),
    ],
  },
  {
    id: 'coach_feedback_v1', category: 'TREINADOR', actor: 'treinador', weight: 4, cooldown: 10,
    text: '{person} aponta, diante de outros jogadores, o que você precisa corrigir. A crítica é sincera, e dura demais para o seu gosto.',
    options: [
      opt('Ouvir e trabalhar nisso', state => ({ attributes: { [passing(state)]: 1 }, bonds: { treinador: 1 }, outcome: 'Você engole o orgulho e muda o hábito. O treinador percebe.' })),
      opt('Defender meu ponto de vista', (state, h) => (h.chance(0.4 + state.player.fame / 300)
        ? { bonds: { treinador: 1 }, temper: -1, fame: 1, outcome: 'Você argumenta bem. {person} recua e passa a te respeitar.' }
        : { bonds: { treinador: -2 }, temper: -1, standing: -1, schedule: [{ id: 'coach_bench_v1', after: 2 }], echo: true, outcome: 'A resposta cai mal. A escalação da próxima semana dirá o quanto.' })),
    ],
  },
  {
    id: 'coach_responsibility_v1', category: 'TREINADOR', actor: 'treinador', weight: 4, cooldown: 14,
    eligible: state => state.player.standing <= 3,
    text: '{person} quer lhe dar mais responsabilidade no time. Mais minutos, mais cobrança, e nenhuma garantia de que você aguenta o peso.',
    options: [
      opt('Estou pronto', (state, h) => (h.chance(0.35 + (state.player.overall - 60) / 50)
        ? { standing: 1, fatigue: 10, bonds: { treinador: 1 }, fame: 2, outcome: 'Você responde dentro de campo. A vaga é sua por enquanto.' }
        : { standing: 0, fatigue: 14, fame: -2, bonds: { treinador: -1 }, outcome: 'O peso foi maior que o esperado, e as falhas apareceram.' })),
      opt('Prefiro evoluir sem pressa', { development: 1, fatigue: -6, bonds: { treinador: -1 }, outcome: 'Você ganha tempo, mas o treinador procura outra solução.' }),
    ],
  },
  {
    id: 'mentor_promise_v1', category: 'TREINADOR', actor: 'treinador', weight: 3,
    eligible: state => !state.memory.promessa_treinador,
    text: '{person} acredita no seu potencial e pede uma promessa: que você continue treinando como quem ainda tem tudo a provar, mesmo quando o sucesso chegar.',
    options: [
      opt('Prometo continuar trabalhando', state => ({ bonds: { treinador: 1 }, memory: { promessa_treinador: 'feita', promessa_turno: state.history.length }, echo: true })),
      opt('Prefiro não fazer promessas', { bonds: { treinador: -1 }, temper: -1, memory: { promessa_treinador: 'recusada' } }),
    ],
  },
  {
    id: 'mentor_return_v1', category: 'TREINADOR', actor: 'treinador', weight: 8,
    waitingSince: state => state.memory.promessa_turno + 4,
    eligible: state => state.memory.promessa_treinador === 'feita' && state.history.length >= state.memory.promessa_turno + 4 && !state.memory.promessa_resolvida,
    text: '{person} lembra da promessa que você fez. Hoje há uma sessão extra, e é justamente o dia em que você queria estar em outro lugar.',
    options: [
      opt('Cumprir a promessa', state => ({ bonds: { treinador: 2 }, attributes: { [technical(state)]: 1 }, fatigue: 10, development: 1, memory: { promessa_resolvida: 'cumprida' }, echo: true })),
      opt('Dizer que preciso descansar', { bonds: { treinador: -2 }, fatigue: -10, memory: { promessa_resolvida: 'adiada' }, echo: true }),
    ],
  },
  {
    id: 'mentor_promise_consequence_v2', category: 'TREINADOR', actor: 'treinador', weight: 10,
    waitingSince: state => state.lastSeen.mentor_return_v1 + 5,
    eligible: state => !!state.memory.promessa_resolvida && !state.memory.promessa_consequencia && state.lastSeen.mentor_return_v1 !== undefined && state.history.length - state.lastSeen.mentor_return_v1 >= 5,
    text: '{person} volta ao assunto da promessa. {promessa_contexto}',
    textValues: state => ({ promessa_contexto: state.memory.promessa_resolvida === 'cumprida' ? 'Ele nunca esqueceu o dia em que você ficou. Agora quer saber até onde vai essa vontade.' : 'Ele nunca esqueceu o dia em que você adiou. Agora quer saber se você vai ser o jogador que falou que seria.' }),
    options: [
      opt('Conversar sobre minha evolução', state => (state.memory.promessa_resolvida === 'cumprida'
        ? { bonds: { treinador: 1 }, standing: 1, fatigue: 6, attributes: { [technical(state)]: 1 }, memory: { promessa_consequencia: 'cumprida' }, outcome: 'A confiança construída vira espaço no time.' }
        : { bonds: { treinador: 1 }, memory: { promessa_consequencia: 'adiada' }, outcome: 'A conversa é franca. A confiança volta devagar.' })),
      opt('Pedir mais autonomia', state => (state.memory.promessa_resolvida === 'cumprida'
        ? { bonds: { treinador: 1 }, development: 1, memory: { promessa_consequencia: 'cumprida' }, outcome: 'Ele concede, e passa a te deixar decidir parte do treino.' }
        : { bonds: { treinador: -2 }, standing: -1, memory: { promessa_consequencia: 'adiada' }, outcome: 'Pedir liberdade depois de ter adiado a promessa foi um erro.' })),
    ],
  },
  {
    id: 'coach_rebuild_v2', category: 'TREINADOR', actor: 'treinador', weight: state => (bond(state, 'treinador') <= -2 ? 12 : 6), cooldown: 14,
    eligible: state => bond(state, 'treinador') <= -1,
    text: '{person} chama você para uma conversa antes do treino. O clima entre vocês pesou nas últimas semanas, e ele diz que prefere resolver agora.',
    options: [
      opt('Ouvir com atenção', { bonds: { treinador: 1 }, temper: 1, outcome: 'Menos orgulho, mais futebol. O gelo começa a quebrar.' }),
      opt('Explicar minha perspectiva', (state, h) => (h.chance(0.45)
        ? { bonds: { treinador: 2 }, fame: 1, outcome: 'Ele não esperava tanta clareza. A relação volta ao eixo.' }
        : { bonds: { treinador: -1 }, standing: -1, outcome: 'A conversa vira uma discussão. Ele encerra friamente.' })),
    ],
  },
  {
    id: 'coach_trust_v2', category: 'TREINADOR', actor: 'treinador', weight: 5, cooldown: 14,
    eligible: state => bond(state, 'treinador') >= 2,
    text: '{person} confia na sua leitura de jogo e pede sua opinião sobre o plano da semana, na frente do grupo.',
    options: [
      opt('Sugerir um trabalho coletivo', state => ({ bonds: { treinador: 1, companheiro: 1 }, attributes: { [passing(state)]: 1 }, outcome: 'O grupo vê você como alguém que pensa o time.' })),
      opt('Pedir foco no meu ponto fraco', state => ({ development: 2, bonds: { companheiro: -1 }, outcome: 'Você evolui, e alguns colegas acham que pensou só em si.' })),
    ],
  },
  {
    id: 'coach_bench_v1', category: 'TREINADOR', actor: 'treinador', weight: 14, scheduledOnly: true,
    waitingSince: state => state.history.length,
    eligible: state => state.player.standing <= 2 && bond(state, 'treinador') <= 0,
    text: '{person} divulga o time titular e você está no banco, de novo. Ninguém disse por quê, mas todo mundo sabe que a última conversa ficou pendente.',
    options: [
      opt('Calar e trabalhar mais', state => ({ development: 1, fatigue: 6, bonds: { treinador: 1 }, memory: { banco_resposta: 'calou' }, schedule: [{ id: 'coach_bench_return_v1', after: 4 }], echo: true, outcome: 'Você treina mais forte que nunca, sem dar um pio.' })),
      opt('Reclamar publicamente', (state, h) => (h.chance(0.3)
        ? { fame: 3, temper: -2, bonds: { torcida: 1, treinador: -1 }, memory: { banco_resposta: 'reclamou' }, outcome: 'A torcida se solidariza, e o vestiário acompanha atento.' }
        : { fame: 1, temper: -2, standing: -1, bonds: { treinador: -2 }, memory: { banco_resposta: 'reclamou' }, outcome: 'A declaração viraliza pelo motivo errado. O banco fica mais longo.' })),
    ],
  },
  {
    id: 'coach_bench_return_v1', category: 'TREINADOR', actor: 'treinador', weight: 20,
    eligible: state => state.memory.banco_resposta === 'calou' && !state.memory.banco_resolvido,
    text: '{person} chama você de lado: ele viu cada treino extra. A lesão de um titular abre uma vaga, e a escolha dele é você, se você a quiser.',
    options: [
      opt('Aceitar e agarrar a vaga', { standing: 1, bonds: { treinador: 2 }, fatigue: 8, memory: { banco_resolvido: 'titular' }, outcome: 'O silêncio vira prêmio: você volta ao time.' }),
      opt('Pedir uma semana para me recuperar', { bonds: { treinador: -1 }, fatigue: -12, memory: { banco_resolvido: 'adiou' }, outcome: 'O corpo ganha, mas a vaga fica com outro.' }),
    ],
  },
  {
    id: 'rest_balance_v2', category: 'VIDA PESSOAL', actor: 'familia', weight: 4, cooldown: 10,
    eligible: state => state.player.fatigue >= 30,
    text: '{person} percebe você abatido e pergunta se tem dormido bem. A próxima tarde livre pode ser de descanso ou de análise de jogos.',
    options: [
      opt('Descansar de verdade', { fatigue: -22, bonds: { familia: 1 }, outcome: 'Pela primeira vez em semanas, você dorme sem relógio.' }),
      opt('Estudar vídeos do meu jogo', state => ({ development: 1, attributes: { posicionamento: 1 }, fatigue: 4, outcome: 'Você descobre vícios que nem sabia que tinha.' })),
    ],
  },
  {
    id: 'aging_body_v1', category: 'TREINAMENTO', actor: 'treinador', weight: 8, cooldown: 14,
    eligible: state => state.player.age >= 31,
    text: 'Os treinos já não passam em branco. {person} nota que você demora mais para se recuperar, e diz que ainda dá para jogar bem, desde que o jogo mude.',
    options: [
      opt('Investir em fisioterapia (€ 2.000)', { money: -2000, fatigue: -18, development: 2, outcome: 'Um plano individual desacelera o desgaste do corpo.' }),
      opt('Reinventar meu jogo', state => ({ attributes: { [passing(state)]: 1, posicionamento: 1, velocidade: -1 }, development: 1, outcome: 'Você joga com a cabeça no lugar das pernas.' })),
    ],
  },
  {
    id: 'injury_warning_v1', category: 'LESÃO', actor: 'treinador', weight: state => 14 + Math.max(0, state.player.fatigue - 60), cooldown: 8,
    eligible: state => state.player.fatigue >= 62 && !state.player.injury,
    text: 'Depois de uma sequência pesada, a coxa avisa antes do jogo. O médico pede que você pare. {person} diz que a decisão é sua, mas a partida é importante.',
    options: [
      opt('Parar e fazer o tratamento', { injury: { label: 'Lesão evitada, tratamento preventivo', games: 3 }, fatigue: -30, bonds: { treinador: 1 }, outcome: 'Você perde alguns jogos, mas segura a temporada.' }),
      opt('Jogar no sacrifício', (state, h) => (h.chance(0.5)
        ? { fatigue: 10, fame: 2, bonds: { torcida: 1, treinador: 1 }, outcome: 'Você joga no limite e resolve. O corpo cobra a conta depois.' }
        : { injury: { label: 'Lesão muscular', games: 12 }, standing: -1, fatigue: -10, outcome: 'A coxa não aguentou. O tempo parado vai ser longo.' })),
    ],
  },
  {
    id: 'injury_recovery_v1', category: 'LESÃO', actor: 'treinador', weight: 20, cooldown: 10,
    eligible: state => !!state.player.injury && state.player.injury.games >= 3,
    text: 'No departamento médico, {person} pergunta como está a recuperação. A liberação gradual existe, e a vontade de voltar também.',
    options: [
      opt('Seguir o protocolo à risca', { injury: { heal: 3 }, bonds: { treinador: 1 }, fatigue: -6, outcome: 'Você se cuida sem pressa e volta mais inteiro.' }),
      opt('Forçar o retorno', (state, h) => (h.chance(0.5)
        ? { injury: { heal: 6 }, fame: 1, outcome: 'Você volta antes do previsto, sem sequelas.' }
        : { injury: { heal: -5 }, fatigue: 12, outcome: 'Uma recaída empurra a volta para bem mais longe.' })),
    ],
  },
];
