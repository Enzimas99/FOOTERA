const option = (label, effects) => ({ label, effects });

// Story clocks count completed choices, not matches, dates or seasons.
const elapsed = (state, key, turns) => Number.isInteger(state.memory[key]) && state.history.length - state.memory[key] >= turns;
const technical = state => state.player.position === 'goleiro' ? 'defesa' : 'controle';
const passing = state => state.player.position === 'goleiro' ? 'posicionamento' : 'passe';

const lastClubStanding = state => state.world?.lastSeason?.leagues
  .flatMap(league => league.standings.map((row, index) => ({ ...row, position: index + 1, league })))
  .find(row => row.clubId === state.player.club.id);
const continentalEntry = state => {
  const qualification = state.world?.qualification;
  if (qualification?.sulAmericana.includes(state.player.club.id)) return 'Sul-Americana';
  if (qualification?.europeia.includes(state.player.club.id)) return 'Europeia';
  return null;
};

export const EVENTS = [
  {
    id: 'world_division_change_v3', category: 'CLUBE', actor: 'treinador', weight: 16,
    eligible: state => state.world?.lastSeason?.movement.some(move => [...move.promoted, ...move.relegated].includes(state.player.club.id)) && state.memory.world_division_announcement !== state.world.lastSeason.season,
    text: '{person} reúne o elenco: o {club} {movimento}. É hora de pensar em como enfrentar o novo desafio.',
    textValues: state => ({ movimento: state.world.lastSeason.movement.some(move => move.promoted.includes(state.player.club.id)) ? 'conquistou o acesso à primeira divisão' : 'foi rebaixado para a segunda divisão' }),
    options: [
      option('Apoiar o grupo nessa mudança', state => ({ relationships: { equipe: 5, treinador: 3 }, memory: { world_division_announcement: state.world.lastSeason.season } })),
      option('Cobrar mudanças no clube', state => ({ relationships: { clube: -3, torcida: 3 }, memory: { world_division_announcement: state.world.lastSeason.season } })),
    ],
  },
  {
    id: 'world_cup_final_v3', category: 'CLUBE', actor: 'torcida', weight: 14,
    eligible: state => state.world?.lastSeason?.nationalCups.some(cup => cup.rounds.at(-1).matches.some(match => [match.home, match.away].includes(state.player.club.id))) && state.memory.world_cup_announcement !== state.world.lastSeason.season,
    text: '{person} lembra a final da {copa}: o {club} {resultado}. A torcida ainda conversa sobre o que esse momento significa.',
    textValues: state => {
      const cup = state.world.lastSeason.nationalCups.find(item => item.rounds.at(-1).matches.some(match => [match.home, match.away].includes(state.player.club.id)));
      return { copa: cup.name, resultado: cup.champion === state.player.club.id ? 'levantou a taça' : 'terminou com o vice-campeonato' };
    },
    options: [
      option('Compartilhar o momento com a torcida', state => ({ relationships: { torcida: 5, equipe: 2 }, memory: { world_cup_announcement: state.world.lastSeason.season } })),
      option('Deixar o resultado para trás', state => ({ relationships: { treinador: 3, torcida: -2 }, memory: { world_cup_announcement: state.world.lastSeason.season } })),
    ],
  },
  {
    id: 'world_league_review_v3', category: 'CLUBE', actor: 'treinador', weight: 8, cooldown: 18,
    eligible: state => !!lastClubStanding(state),
    text: '{person} comenta a última temporada do {club}: a equipe terminou em {posicao}º lugar, com {pontos} pontos. A comissão quer discutir o planejamento.',
    textValues: state => ({ posicao: lastClubStanding(state).position, pontos: lastClubStanding(state).points }),
    options: [option('Ajudar no planejamento coletivo', () => ({ relationships: { clube: 4, equipe: 3 } })), option('Priorizar minha preparação', state => ({ relationships: { treinador: 2 }, attributes: { [technical(state)]: 1 } }))],
  },
  {
    id: 'world_continental_qualification_v3', category: 'CLUBE', actor: 'torcida', weight: 8, cooldown: 18,
    eligible: state => !!continentalEntry(state),
    text: '{person} comemora a classificação do {club} para a competição {competicao}, conquistada {origem}. A torcida quer saber como o elenco vai se preparar.',
    textValues: state => ({ competicao: continentalEntry(state), origem: state.world.lastSeason.nationalCups.some(cup => cup.champion === state.player.club.id) ? 'com o título da copa nacional' : 'na última liga' }),
    options: [option('Conversar com a torcida', () => ({ relationships: { torcida: 5, equipe: 1 } })), option('Concentrar-me na preparação', () => ({ relationships: { treinador: 3, torcida: -1 } }))],
  },
  {
    id: 'coach_responsibility_v1', category: 'VESTIÁRIO', actor: 'treinador', weight: 5,
    text: 'Depois do treino, {person} chama você para conversar. A comissão quer dar mais responsabilidade ao seu futebol, mas a cobrança também vai aumentar.',
    options: [
      option('Estou pronto para o desafio', state => ({ relationships: { treinador: state.player.relationships.treinador < 50 ? 7 : 4, clube: 3 }, attributes: { posicionamento: 1 } })),
      option('Prefiro evoluir sem pressa', () => ({ relationships: { treinador: -2, social: 3 }, attributes: { controle: 1 } })),
    ],
  },
  {
    id: 'team_dinner_v1', category: 'EQUIPE', actor: 'companheiro', weight: 5,
    text: '{person} está organizando um jantar com o elenco. Você ainda está conhecendo o grupo e amanhã o treino começa cedo.',
    options: [
      option('Vou conhecer melhor o grupo', () => ({ relationships: { equipe: 7, social: 3 }, attributes: { resistencia: -1 } })),
      option('Vou descansar para o treino', () => ({ relationships: { equipe: -2, treinador: 3 }, attributes: { resistencia: 1 } })),
    ],
  },
  {
    id: 'training_extra_v1', category: 'TREINAMENTO', actor: 'treinador', weight: 5,
    text: 'Depois que o treino termina, {person} propõe uma sessão extra. É uma chance de melhorar, mas seu corpo também precisa de descanso.',
    options: [
      option('Fico para treinar', state => ({ relationships: { treinador: 4 }, attributes: { [state.player.position === 'goleiro' ? 'reflexos' : 'controle']: 2, resistencia: -1 } })),
      option('Hoje vou descansar', () => ({ relationships: { treinador: -1, social: 2 }, attributes: { resistencia: 1 } })),
    ],
  },
  {
    id: 'family_visit_v1', category: 'VIDA PESSOAL', actor: 'familia', weight: 4,
    text: '{person} sente sua falta e sugere uma visita. Você teria de abrir mão de um encontro com pessoas do clube para voltar para casa.',
    options: [
      option('Minha família vem primeiro', () => ({ relationships: { social: 7, clube: -2 } })),
      option('Vou ficar com o clube', () => ({ relationships: { social: -3, clube: 4 } })),
    ],
  },
  {
    id: 'interview_credit_v1', category: 'IMPRENSA', actor: 'imprensa', weight: 4,
    text: 'Em uma entrevista, {person} pergunta quem merece o crédito pelo seu começo de carreira. O microfone está diante de você.',
    options: [
      option('Dividir o mérito com a equipe', () => ({ relationships: { equipe: 5, torcida: 3 }, memory: { ultima_entrevista: 'coletiva' } })),
      option('Falar do meu próprio esforço', () => ({ relationships: { torcida: 3, equipe: -3 }, memory: { ultima_entrevista: 'individual' } })),
    ],
  },
  {
    id: 'agent_meeting_v1', category: 'EMPRESÁRIO', actor: 'empresario', weight: 4,
    text: '{person} quer que você participe de uma reunião comercial. O encontro pode fortalecer a parceria, mas vai ocupar uma tarde livre.',
    options: [
      option('Vamos à reunião', () => ({ relationships: { empresario: 6, social: -2 }, money: 300 })),
      option('Prefiro aproveitar meu tempo', () => ({ relationships: { empresario: -3, social: 4 } })),
    ],
  },
  {
    id: 'fan_autograph_v1', category: 'TORCIDA', actor: 'torcida', weight: 5,
    text: 'Na saída do centro de treinamento, {person} espera por uma foto e um autógrafo. Você está atrasado para um compromisso.',
    options: [
      option('Parar para atender', () => ({ relationships: { torcida: 6, social: -1 } })),
      option('Seguir para o compromisso', () => ({ relationships: { torcida: -3, social: 3 } })),
    ],
  },
  {
    id: 'teammate_confidence_v1', category: 'EQUIPE', actor: 'companheiro', weight: 4,
    text: 'Depois de um treino difícil, {person} admite que está perdendo a confiança. Você também tem assuntos a resolver com a comissão.',
    options: [
      option('Conversar e apoiar', () => ({ relationships: { equipe: 6, treinador: -1 }, memory: { apoiou_companheiro: true } })),
      option('Ir falar com a comissão', () => ({ relationships: { equipe: -2, treinador: 4 } })),
    ],
  },
  {
    id: 'family_help_v1', category: 'VIDA PESSOAL', actor: 'familia', weight: 3,
    eligible: state => state.player.money >= 800,
    text: '{person} precisa de uma ajuda financeira para resolver uma despesa inesperada. Você pode contribuir, mas ainda está construindo sua reserva.',
    options: [
      option('Ajudar com € 800', () => ({ relationships: { social: 7 }, money: -800, memory: { ajudou_familia: true } })),
      option('Conversar sobre outra solução', () => ({ relationships: { social: -2 }, memory: { ajudou_familia: false } })),
    ],
  },
  {
    id: 'coach_feedback_v1', category: 'TREINAMENTO', actor: 'treinador', weight: 4,
    text: '{person} aponta detalhes que você precisa melhorar. A conversa é sincera e um pouco mais dura do que você esperava.',
    options: [
      option('Ouvir e trabalhar nisso', state => ({ relationships: { treinador: 5 }, attributes: { [state.player.position === 'goleiro' ? 'defesa' : 'passe']: 1 } })),
      option('Defender meu ponto de vista', () => ({ relationships: { treinador: -3, equipe: 2 } })),
    ],
  },
  {
    id: 'team_practice_v1', category: 'EQUIPE', actor: 'companheiro', weight: 4,
    text: '{person} propõe praticar algumas jogadas em dupla. Vocês podem trabalhar a troca de passes ou fazer uma disputa mais individual.',
    options: [
      option('Trabalhar em conjunto', state => ({ relationships: { equipe: 5 }, attributes: { [state.player.position === 'goleiro' ? 'posicionamento' : 'passe']: 1 } })),
      option('Fazer uma disputa individual', state => ({ relationships: { equipe: -1 }, attributes: { [state.player.position === 'goleiro' ? 'reflexos' : 'drible']: 1 } })),
    ],
  },
  {
    id: 'club_community_v1', category: 'CLUBE', actor: 'treinador', weight: 4,
    text: 'O {club} foi convidado para visitar um projeto comunitário. {person} pergunta se você pode representar o elenco.',
    options: [
      option('Participar da visita', () => ({ relationships: { clube: 4, torcida: 5, social: -1 } })),
      option('Deixar outro colega participar', () => ({ relationships: { clube: -2, social: 2 } })),
    ],
  },
  {
    id: 'agent_gear_v1', category: 'EMPRESÁRIO', actor: 'empresario', weight: 3,
    text: '{person} encontrou uma pequena ação publicitária. Você pode aceitar a proposta ou preservar sua rotina para se dedicar ao futebol.',
    options: [
      option('Aceitar a ação', () => ({ money: 500, relationships: { empresario: 5, treinador: -2 } })),
      option('Focar na rotina de treinos', () => ({ relationships: { empresario: -2, treinador: 4 } })),
    ],
  },
  {
    id: 'club_schedule_v1', category: 'CLUBE', actor: 'treinador', weight: 4,
    text: 'O clube quer usar parte do seu dia de folga em uma atividade para patrocinadores. {person} deixa a decisão com você.',
    options: [
      option('Ajudar o clube', () => ({ relationships: { clube: 6, social: -3 }, money: 150 })),
      option('Preservar minha folga', () => ({ relationships: { clube: -3, social: 4 } })),
    ],
  },
  {
    id: 'fan_social_v1', category: 'TORCIDA', actor: 'torcida', weight: 4,
    text: 'Uma postagem sua recebe comentários divididos. {person} pede que você diga algo para a torcida do {club}.',
    options: [
      option('Agradecer o apoio da torcida', () => ({ relationships: { torcida: 5, clube: 2 }, memory: { contato_torcida: 'proximo' } })),
      option('Manter minha privacidade', () => ({ relationships: { torcida: -2, social: 3 }, memory: { contato_torcida: 'reservado' } })),
    ],
  },
  {
    id: 'training_focus_v1', category: 'TREINAMENTO', actor: 'treinador', weight: 4,
    text: 'A comissão prepara uma atividade especial e {person} pergunta em que você gostaria de concentrar seus esforços.',
    options: [
      option('Trabalhar meu físico', () => ({ attributes: { resistencia: 2, forca: 1 }, relationships: { treinador: 2 } })),
      option('Aperfeiçoar a técnica', state => ({ attributes: { [state.player.position === 'goleiro' ? 'defesa' : 'controle']: 2 }, relationships: { treinador: 2 } })),
    ],
  },
  {
    id: 'teammate_advice_v1', category: 'EQUIPE', actor: 'companheiro', weight: 3,
    text: '{person} conhece bem o vestiário e oferece um conselho sobre como conquistar espaço. Você pode seguir a sugestão ou encontrar seu próprio caminho.',
    options: [
      option('Ouvir o conselho', () => ({ relationships: { equipe: 5, treinador: 2 } })),
      option('Confiar no meu jeito', () => ({ relationships: { equipe: -2, social: 3 }, attributes: { posicionamento: 1 } })),
    ],
  },
  {
    id: 'press_pressure_v1', category: 'IMPRENSA', actor: 'imprensa', weight: 4,
    text: '{person} diz que as expectativas sobre você estão crescendo. A pergunta é direta: você se sente preparado para a pressão?',
    options: [
      option('Assumir a responsabilidade', () => ({ relationships: { torcida: 4, clube: 2, treinador: 1 } })),
      option('Pedir tempo para evoluir', () => ({ relationships: { torcida: -1, social: 3, treinador: 2 } })),
    ],
  },
  {
    id: 'mentor_promise_v1', category: 'VESTIÁRIO', actor: 'treinador', weight: 3,
    eligible: state => !state.memory.promessa_treinador,
    text: '{person} acredita no seu potencial e pede uma promessa: que você continue dedicando tempo ao desenvolvimento, mesmo quando tudo parecer mais fácil.',
    options: [
      option('Prometo continuar trabalhando', state => ({ relationships: { treinador: 5 }, memory: { promessa_treinador: 'feita', promessa_turno: state.history.length } })),
      option('Prefiro não fazer promessas', () => ({ relationships: { treinador: -2, social: 2 }, memory: { promessa_treinador: 'recusada' } })),
    ],
  },
  {
    id: 'mentor_return_v1', category: 'VESTIÁRIO', actor: 'treinador', weight: 8,
    eligible: state => state.memory.promessa_treinador === 'feita' && state.history.length >= state.memory.promessa_turno + 4 && !state.memory.promessa_resolvida,
    text: '{person} lembra da promessa que você fez sobre continuar trabalhando. Agora existe a chance de fazer uma sessão extra e mostrar que ela ainda importa.',
    options: [
      option('Cumprir a promessa', state => ({ relationships: { treinador: 8 }, attributes: { [state.player.position === 'goleiro' ? 'defesa' : 'controle']: 1 }, memory: { promessa_resolvida: 'cumprida' } })),
      option('Dizer que preciso descansar', () => ({ relationships: { treinador: -5, social: 2 }, memory: { promessa_resolvida: 'adiada' } })),
    ],
  },
  {
    id: 'duo_invitation_v2', category: 'EQUIPE', actor: 'companheiro', weight: 5,
    eligible: state => !state.memory.dupla_etapa,
    text: '{person} propõe que vocês reservem tempo para desenvolver uma parceria nos treinos. Isso exigiria reorganizar sua rotina.',
    options: [
      option('Aceitar a parceria', state => ({ relationships: { equipe: 4 }, memory: { dupla_etapa: 'aceita', dupla_turno: state.history.length + 1 } })),
      option('Agradecer e seguir minha rotina', state => ({ relationships: { equipe: -1, social: 2 }, memory: { dupla_etapa: 'recusada', dupla_turno: state.history.length + 1 } })),
    ],
  },
  {
    id: 'duo_disagreement_v2', category: 'EQUIPE', actor: 'companheiro', weight: 12,
    waitingSince: state => state.memory.dupla_turno + 3,
    eligible: state => ['aceita', 'recusada'].includes(state.memory.dupla_etapa) && elapsed(state, 'dupla_turno', 3),
    text: '{person} retoma a conversa sobre treinar em dupla. As expectativas de vocês não parecem iguais, e é hora de esclarecer o que cada um espera.',
    options: [
      option('Encontrar um compromisso', state => ({ relationships: { equipe: 4 }, attributes: { [passing(state)]: 1 }, memory: { dupla_etapa: 'acordo', dupla_turno: state.history.length + 1 } })),
      option('Insistir na minha rotina', state => ({ relationships: { equipe: -4, treinador: 2 }, memory: { dupla_etapa: 'distancia', dupla_turno: state.history.length + 1 } })),
    ],
  },
  {
    id: 'duo_consequence_v2', category: 'EQUIPE', actor: 'companheiro', weight: 16,
    waitingSince: state => state.memory.dupla_turno + 5,
    eligible: state => ['acordo', 'distancia'].includes(state.memory.dupla_etapa) && elapsed(state, 'dupla_turno', 5),
    text: '{person} volta a falar da rotina que vocês discutiram. {dupla_contexto}',
    textValues: state => ({ dupla_contexto: state.memory.dupla_etapa === 'acordo' ? 'O compromisso que vocês encontraram ainda influencia o ambiente de treino.' : 'A distância que ficou entre vocês ainda influencia o ambiente de treino.' }),
    options: [
      option('Conversar sobre o que ficou', state => ({ relationships: { equipe: state.memory.dupla_etapa === 'acordo' ? 6 : 2 }, memory: { dupla_desfecho: state.memory.dupla_etapa, dupla_etapa: 'concluida' } })),
      option('Deixar o assunto para trás', state => ({ relationships: { equipe: state.memory.dupla_etapa === 'acordo' ? -2 : -5, social: 2 }, memory: { dupla_desfecho: state.memory.dupla_etapa, dupla_etapa: 'concluida' } })),
    ],
  },
  {
    id: 'agent_proposal_v2', category: 'EMPRESÁRIO', actor: 'empresario', weight: 4,
    eligible: state => !state.memory.projeto_comercial,
    text: '{person} apresenta uma proposta para uma pequena campanha. O pagamento é modesto, mas aceitar também significa dedicar tempo à preparação.',
    options: [
      option('Aceitar a proposta', state => ({ relationships: { empresario: 4 }, memory: { projeto_comercial: 'aceito', projeto_turno: state.history.length + 1 } })),
      option('Recusar a proposta', state => ({ relationships: { empresario: -2, social: 2 }, memory: { projeto_comercial: 'recusado', projeto_turno: state.history.length + 1 } })),
    ],
  },
  {
    id: 'agent_followup_v2', category: 'EMPRESÁRIO', actor: 'empresario', weight: 12,
    waitingSince: state => state.memory.projeto_turno + 4,
    eligible: state => ['aceito', 'recusado'].includes(state.memory.projeto_comercial) && elapsed(state, 'projeto_turno', 4),
    text: '{person} volta à proposta comercial. {projeto_contexto}',
    textValues: state => ({ projeto_contexto: state.memory.projeto_comercial === 'aceito' ? 'Ainda há detalhes da campanha que precisam ser combinados.' : 'A recusa abre uma conversa sobre como conduzir oportunidades futuras.' }),
    options: [
      option('Construir um plano em conjunto', state => ({ relationships: { empresario: 5, social: -1 }, money: state.memory.projeto_comercial === 'aceito' ? 400 : 0, memory: { projeto_comercial: 'plano', projeto_turno: state.history.length + 1 } })),
      option('Definir meus próprios limites', state => ({ relationships: { empresario: -3, social: 3 }, memory: { projeto_comercial: 'limites', projeto_turno: state.history.length + 1 } })),
    ],
  },
  {
    id: 'agent_consequence_v2', category: 'EMPRESÁRIO', actor: 'empresario', weight: 15,
    waitingSince: state => state.memory.projeto_turno + 5,
    eligible: state => ['plano', 'limites'].includes(state.memory.projeto_comercial) && elapsed(state, 'projeto_turno', 5),
    text: '{person} revisita a maneira como vocês decidiram trabalhar. {projeto_contexto}',
    textValues: state => ({ projeto_contexto: state.memory.projeto_comercial === 'plano' ? 'O plano conjunto criou expectativas que ainda precisam ser administradas.' : 'Os limites que você estabeleceu continuam influenciando a parceria.' }),
    options: [
      option('Reafirmar o combinado', state => ({ relationships: { empresario: state.memory.projeto_comercial === 'plano' ? 5 : 2 }, memory: { projeto_desfecho: state.memory.projeto_comercial, projeto_comercial: 'concluido' } })),
      option('Renegociar a parceria', state => ({ relationships: { empresario: -2, social: 3 }, memory: { projeto_desfecho: state.memory.projeto_comercial, projeto_comercial: 'concluido' } })),
    ],
  },
  {
    id: 'family_plan_v2', category: 'VIDA PESSOAL', actor: 'familia', weight: 4,
    eligible: state => !state.memory.plano_familia,
    text: '{person} sugere que vocês encontrem uma forma de manter contato com mais regularidade, mesmo com a rotina do futebol.',
    options: [
      option('Combinar um horário', state => ({ relationships: { social: 4 }, memory: { plano_familia: 'combinado', familia_turno: state.history.length + 1 } })),
      option('Preferir conversas espontâneas', state => ({ relationships: { social: -1 }, memory: { plano_familia: 'espontaneo', familia_turno: state.history.length + 1 } })),
    ],
  },
  {
    id: 'family_plan_test_v2', category: 'VIDA PESSOAL', actor: 'familia', weight: 12,
    waitingSince: state => state.memory.familia_turno + 3,
    eligible: state => ['combinado', 'espontaneo'].includes(state.memory.plano_familia) && elapsed(state, 'familia_turno', 3),
    text: '{person} lembra da conversa sobre manter contato. Uma atividade do clube ocupa o tempo que você poderia dedicar à família.',
    options: [
      option('Reservar tempo para a família', state => ({ relationships: { social: 5, clube: -2 }, memory: { plano_familia: 'presente', familia_turno: state.history.length + 1 } })),
      option('Priorizar a atividade do clube', state => ({ relationships: { social: -4, clube: 4 }, memory: { plano_familia: 'ausente', familia_turno: state.history.length + 1 } })),
    ],
  },
  {
    id: 'family_plan_consequence_v2', category: 'VIDA PESSOAL', actor: 'familia', weight: 15,
    waitingSince: state => state.memory.familia_turno + 5,
    eligible: state => ['presente', 'ausente'].includes(state.memory.plano_familia) && elapsed(state, 'familia_turno', 5),
    text: '{person} quer conversar sobre o tempo que vocês conseguem passar juntos. {familia_contexto}',
    textValues: state => ({ familia_contexto: state.memory.plano_familia === 'presente' ? 'O tempo que você reservou para a família ainda é lembrado.' : 'A decisão de priorizar o clube ainda é lembrada.' }),
    options: [
      option('Ouvir e ajustar a rotina', state => ({ relationships: { social: state.memory.plano_familia === 'presente' ? 6 : 3, clube: -1 }, memory: { familia_desfecho: state.memory.plano_familia, plano_familia: 'concluido' } })),
      option('Manter a rotina como está', state => ({ relationships: { social: state.memory.plano_familia === 'presente' ? 1 : -5, clube: 2 }, memory: { familia_desfecho: state.memory.plano_familia, plano_familia: 'concluido' } })),
    ],
  },
  {
    id: 'interview_team_reaction_v2', category: 'EQUIPE', actor: 'companheiro', weight: 7, cooldown: 20,
    waitingSince: state => state.lastSeen.interview_credit_v1 + 3,
    eligible: state => !!state.memory.ultima_entrevista && state.memory.entrevista_reagida !== state.memory.ultima_entrevista && state.lastSeen.interview_credit_v1 !== undefined && state.history.length - state.lastSeen.interview_credit_v1 >= 3,
    text: '{person} comenta sua entrevista sobre os méritos do começo de carreira. {entrevista_contexto}',
    textValues: state => ({ entrevista_contexto: state.memory.ultima_entrevista === 'coletiva' ? 'Você dividiu o mérito com a equipe, e suas palavras chegaram ao vestiário.' : 'Você destacou o próprio esforço, e suas palavras chegaram ao vestiário.' }),
    options: [
      option('Explicar o que quis dizer', state => ({ relationships: { equipe: state.memory.ultima_entrevista === 'coletiva' ? 5 : 2 }, memory: { entrevista_reagida: state.memory.ultima_entrevista } })),
      option('Deixar minhas palavras falarem', state => ({ relationships: { equipe: state.memory.ultima_entrevista === 'coletiva' ? 2 : -4 }, memory: { entrevista_reagida: state.memory.ultima_entrevista } })),
    ],
  },
  {
    id: 'teammate_support_return_v2', category: 'EQUIPE', actor: 'companheiro', weight: 8,
    waitingSince: state => state.lastSeen.teammate_confidence_v1 + 4,
    eligible: state => state.memory.apoiou_companheiro === true && !state.memory.apoio_retribuido && state.lastSeen.teammate_confidence_v1 !== undefined && state.history.length - state.lastSeen.teammate_confidence_v1 >= 4,
    text: '{person} lembra da conversa em que você ofereceu apoio e agora pergunta como pode ajudar você a lidar com a rotina.',
    options: [
      option('Aceitar a ajuda', state => ({ relationships: { equipe: 5 }, attributes: { [passing(state)]: 1 }, memory: { apoio_retribuido: true } })),
      option('Agradecer e resolver sozinho', () => ({ relationships: { equipe: 1, social: 2 }, memory: { apoio_retribuido: true } })),
    ],
  },
  {
    id: 'fan_contact_return_v2', category: 'TORCIDA', actor: 'torcida', weight: 7, cooldown: 20,
    waitingSince: state => state.lastSeen.fan_social_v1 + 4,
    eligible: state => !!state.memory.contato_torcida && state.memory.contato_comentado !== state.memory.contato_torcida && state.lastSeen.fan_social_v1 !== undefined && state.history.length - state.lastSeen.fan_social_v1 >= 4,
    text: '{person} lembra de como você decidiu se comunicar com a torcida. {contato_contexto}',
    textValues: state => ({ contato_contexto: state.memory.contato_torcida === 'proximo' ? 'Sua mensagem aproximou vocês, e agora surge a pergunta de como manter esse contato.' : 'Você preferiu preservar sua privacidade, e agora surge a pergunta de como manter algum contato.' }),
    options: [
      option('Conversar com transparência', state => ({ relationships: { torcida: state.memory.contato_torcida === 'proximo' ? 5 : 3 }, memory: { contato_comentado: state.memory.contato_torcida } })),
      option('Preservar meu espaço', state => ({ relationships: { torcida: -2, social: 3 }, memory: { contato_comentado: state.memory.contato_torcida } })),
    ],
  },
  {
    id: 'mentor_promise_consequence_v2', category: 'VESTIÁRIO', actor: 'treinador', weight: 10,
    waitingSince: state => state.lastSeen.mentor_return_v1 + 5,
    eligible: state => !!state.memory.promessa_resolvida && !state.memory.promessa_consequencia && state.lastSeen.mentor_return_v1 !== undefined && state.history.length - state.lastSeen.mentor_return_v1 >= 5,
    text: '{person} volta ao assunto da promessa de trabalhar no seu desenvolvimento. {promessa_contexto}',
    textValues: state => ({ promessa_contexto: state.memory.promessa_resolvida === 'cumprida' ? 'A sessão em que você cumpriu a promessa ainda pesa na confiança entre vocês.' : 'A decisão de adiar a sessão ainda pesa na confiança entre vocês.' }),
    options: [
      option('Conversar sobre minha evolução', state => ({ relationships: { treinador: state.memory.promessa_resolvida === 'cumprida' ? 5 : 2 }, attributes: { [technical(state)]: 1 }, memory: { promessa_consequencia: state.memory.promessa_resolvida } })),
      option('Pedir mais autonomia', state => ({ relationships: { treinador: state.memory.promessa_resolvida === 'cumprida' ? -1 : -4, social: 2 }, memory: { promessa_consequencia: state.memory.promessa_resolvida } })),
    ],
  },
  {
    id: 'family_help_return_v2', category: 'VIDA PESSOAL', actor: 'familia', weight: 7, cooldown: 20,
    waitingSince: state => state.lastSeen.family_help_v1 + 5,
    eligible: state => typeof state.memory.ajudou_familia === 'boolean' && state.memory.ajuda_comentada !== state.memory.ajudou_familia && state.lastSeen.family_help_v1 !== undefined && state.history.length - state.lastSeen.family_help_v1 >= 5,
    text: '{person} retoma a conversa sobre a despesa familiar. {ajuda_contexto}',
    textValues: state => ({ ajuda_contexto: state.memory.ajudou_familia ? 'Sua ajuda financeira é lembrada, e vocês conversam sobre pedidos futuros.' : 'A busca por outra solução é lembrada, e vocês conversam sobre pedidos futuros.' }),
    options: [
      option('Planejar juntos', state => ({ relationships: { social: state.memory.ajudou_familia ? 5 : 3 }, memory: { ajuda_comentada: state.memory.ajudou_familia } })),
      option('Estabelecer limites', state => ({ relationships: { social: -2, clube: 1 }, memory: { ajuda_comentada: state.memory.ajudou_familia } })),
    ],
  },
  {
    id: 'coach_rebuild_v2', category: 'VESTIÁRIO', actor: 'treinador', weight: state => state.player.relationships.treinador < 30 ? 9 : 5, cooldown: 16,
    eligible: state => state.player.relationships.treinador < 50,
    text: '{person} percebe que a comunicação entre vocês precisa melhorar e oferece uma conversa antes do próximo treino.',
    options: [option('Ouvir com atenção', () => ({ relationships: { treinador: 6, social: -1 } })), option('Explicar minha perspectiva', () => ({ relationships: { treinador: 2, equipe: 2 } }))],
  },
  {
    id: 'coach_trust_v2', category: 'VESTIÁRIO', actor: 'treinador', weight: 5, cooldown: 16,
    eligible: state => state.player.relationships.treinador >= 60,
    text: '{person} confia na sua leitura do treino e pede uma opinião sobre o que pode ser trabalhado com o grupo.',
    options: [option('Sugerir trabalho coletivo', state => ({ relationships: { treinador: 2, equipe: 3 }, attributes: { [passing(state)]: 1 } })), option('Pedir foco individual', state => ({ relationships: { treinador: 1, equipe: -1 }, attributes: { [technical(state)]: 1 } }))],
  },
  {
    id: 'team_tension_v2', category: 'EQUIPE', actor: 'companheiro', weight: state => state.player.relationships.equipe < 30 ? 9 : 5, cooldown: 16,
    eligible: state => state.player.relationships.equipe < 50,
    text: '{person} percebe um distanciamento no vestiário e pergunta se vocês podem encontrar uma maneira de melhorar o ambiente.',
    options: [option('Propor uma conversa', () => ({ relationships: { equipe: 6, social: -1 } })), option('Dar tempo ao grupo', () => ({ relationships: { equipe: 2, treinador: 1 } }))],
  },
  {
    id: 'team_trust_v2', category: 'EQUIPE', actor: 'companheiro', weight: 5, cooldown: 16,
    eligible: state => state.player.relationships.equipe >= 60,
    text: '{person} pede sua ajuda para receber alguém novo no ambiente de treinamento. Seu vínculo com o grupo pode ajudar.',
    options: [option('Ajudar na recepção', () => ({ relationships: { equipe: 4, social: 1 } })), option('Sugerir outra pessoa', () => ({ relationships: { equipe: -1, treinador: 2 } }))],
  },
  {
    id: 'fan_repair_v2', category: 'TORCIDA', actor: 'torcida', weight: 6, cooldown: 18,
    eligible: state => state.player.relationships.torcida < 45,
    text: '{person} diz que parte da torcida sente falta de uma conversa mais aberta com você. Há espaço para ouvir sem fazer promessas.',
    options: [option('Ouvir as críticas', () => ({ relationships: { torcida: 6, social: -1 } })), option('Manter distância por enquanto', () => ({ relationships: { torcida: -1, social: 3 } }))],
  },
  {
    id: 'agent_budget_v2', category: 'EMPRESÁRIO', actor: 'empresario', weight: 6, cooldown: 18,
    eligible: state => state.player.money < 1200,
    text: '{person} nota que sua reserva está curta e sugere revisar os gastos antes de assumir novos compromissos.',
    options: [option('Reorganizar as despesas', () => ({ relationships: { empresario: 3 }, money: 200 })), option('Conversar sobre prioridades', () => ({ relationships: { empresario: 1, social: 2 } }))],
  },
  {
    id: 'agent_savings_v2', category: 'EMPRESÁRIO', actor: 'empresario', weight: 4, cooldown: 18,
    eligible: state => state.player.money >= 2000,
    text: '{person} sugere conversar sobre sua reserva e seus objetivos pessoais, sem comprometer o dinheiro em uma proposta desconhecida.',
    options: [option('Planejar com cuidado', () => ({ relationships: { empresario: 3, social: 1 } })), option('Decidir por conta própria', () => ({ relationships: { empresario: -2, social: 3 } }))],
  },
  {
    id: 'keeper_positioning_v2', category: 'TREINAMENTO', actor: 'treinador', weight: 6, cooldown: 14,
    eligible: state => state.player.position === 'goleiro',
    text: '{person} prepara um exercício de posicionamento para goleiros e pergunta qual aspecto você quer priorizar.',
    options: [option('Trabalhar a colocação', () => ({ attributes: { posicionamento: 2 }, relationships: { treinador: 1 } })), option('Trabalhar os reflexos', () => ({ attributes: { reflexos: 2 }, relationships: { treinador: 1 } }))],
  },
  {
    id: 'outfield_movement_v2', category: 'TREINAMENTO', actor: 'treinador', weight: 6, cooldown: 14,
    eligible: state => state.player.position !== 'goleiro',
    text: '{person} propõe um exercício de movimentação sem bola. Você pode focar na leitura do espaço ou no primeiro toque.',
    options: [option('Ler melhor os espaços', () => ({ attributes: { posicionamento: 2 }, relationships: { treinador: 1 } })), option('Aprimorar o primeiro toque', () => ({ attributes: { controle: 2 }, relationships: { treinador: 1 } }))],
  },
  {
    id: 'rest_balance_v2', category: 'VIDA PESSOAL', actor: 'familia', weight: 4, cooldown: 15,
    text: '{person} pergunta se você tem conseguido equilibrar descanso e dedicação ao futebol. Sua próxima tarde livre está disponível.',
    options: [option('Reservar tempo para descansar', () => ({ relationships: { social: 3 }, attributes: { resistencia: 1 } })), option('Estudar minha rotina de treino', state => ({ relationships: { treinador: 2 }, attributes: { [technical(state)]: 1 } }))],
  },
  {
    id: 'press_boundaries_v2', category: 'IMPRENSA', actor: 'imprensa', weight: 4, cooldown: 15,
    text: '{person} pede uma conversa sobre sua vida fora do futebol. Você pode responder de modo breve ou estabelecer um limite.',
    options: [option('Compartilhar um pouco', () => ({ relationships: { torcida: 3, social: -1 } })), option('Manter a privacidade', () => ({ relationships: { torcida: -1, social: 3 } }))],
  },
  {
    id: 'club_routine_v2', category: 'CLUBE', actor: 'treinador', weight: 4, cooldown: 15,
    text: '{person} apresenta uma mudança na organização dos treinos do {club} e pede sua opinião sobre a adaptação.',
    options: [option('Ajudar na adaptação', () => ({ relationships: { clube: 4, equipe: 2 } })), option('Pedir mais tempo', () => ({ relationships: { clube: -1, social: 2 } }))],
  },
  {
    id: 'teammate_listening_v2', category: 'EQUIPE', actor: 'companheiro', weight: 4, cooldown: 15,
    text: '{person} quer trocar ideias sobre a rotina de treinos. A conversa pode ser uma oportunidade de entender melhor o grupo.',
    options: [option('Ouvir e trocar ideias', () => ({ relationships: { equipe: 4, social: 1 } })), option('Concentrar-me no treino', state => ({ relationships: { equipe: -1 }, attributes: { [technical(state)]: 1 } }))],
  },
  {
    id: 'fan_community_v2', category: 'TORCIDA', actor: 'torcida', weight: 4, cooldown: 15,
    text: '{person} fala de uma iniciativa de torcedores na comunidade e convida você a conhecer o trabalho.',
    options: [option('Conhecer a iniciativa', () => ({ relationships: { torcida: 4, social: 1 } })), option('Agradecer o convite', () => ({ relationships: { torcida: -1, treinador: 1 } }))],
  },
];

const CRISES = {
  clube: ['A confiança da diretoria está no limite. O clube quer conversar sobre seu lugar no projeto.', 'O clube confia muito em você, mas a diretoria agora espera que você carregue uma responsabilidade enorme.'],
  equipe: ['O ambiente no elenco está difícil e seus colegas já não sabem se podem confiar em você.', 'Sua influência no elenco cresceu tanto que seus colegas esperam que você resolva qualquer conflito.'],
  treinador: ['A relação com a comissão chegou a um ponto delicado. O treinador chama você para uma conversa franca.', 'A confiança do treinador virou uma cobrança constante. Ele espera mais de você a cada treino.'],
  empresario: ['A parceria com seu empresário está desgastada. Ele quer entender se vocês ainda conseguem trabalhar juntos.', 'Seu empresário está tão envolvido na carreira que começa a opinar sobre todas as suas escolhas.'],
  torcida: ['As críticas da torcida estão cada vez mais fortes. Uma conversa com os torcedores pode mudar o ambiente.', 'A idolatria aumentou e a torcida espera uma resposta sua para cada acontecimento do clube.'],
  social: ['Você se sente isolado fora do futebol. Alguém próximo pergunta se você pode reservar um tempo para conversar.', 'Sua vida social está movimentada e os compromissos começam a disputar espaço com a carreira.'],
};

export function crisisEvent(key, high) {
  const actor = { clube: 'treinador', equipe: 'companheiro', treinador: 'treinador', empresario: 'empresario', torcida: 'torcida', social: 'familia' }[key];
  return {
    id: `crise_${key}_${high ? 'alta' : 'baixa'}_v1`, category: 'MOMENTO DECISIVO', actor, weight: 1,
    text: CRISES[key][high ? 1 : 0],
    options: high ? [
      option('Conversar e ajustar expectativas', () => ({ relationships: { [key]: -5, social: key === 'social' ? -5 : 2 } })),
      option('Pedir espaço para respirar', () => ({ relationships: { [key]: -8, treinador: key === 'treinador' ? -8 : 1 } })),
    ] : [
      option('Tentar reconstruir a relação', () => ({ relationships: { [key]: 9, social: key === 'social' ? 9 : -1 } })),
      option('Conversar com sinceridade', () => ({ relationships: { [key]: 5, clube: key === 'clube' ? 5 : 1 } })),
    ],
  };
}

export function findEvent(id) {
  const crisis = /^crise_(clube|equipe|treinador|empresario|torcida|social)_(alta|baixa)_v1$/.exec(id);
  if (crisis) return crisisEvent(crisis[1], crisis[2] === 'alta');
  return EVENTS.find(event => event.id === id);
}
