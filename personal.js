import { bond, elapsed, opt } from './kit.js';

export const PERSONAL = [
  {
    id: 'family_visit_v1', category: 'VIDA PESSOAL', actor: 'familia', weight: 4, cooldown: 14,
    text: '{person} sente sua falta e sugere uma visita no fim de semana. Mas o clube marcou um coletivo que só os mais dedicados costumam encarar.',
    options: [
      opt('Minha família vem primeiro', (state, h) => (h.chance(0.3)
        ? { bonds: { familia: 1, treinador: -1 }, fatigue: -12, outcome: 'A viagem faz bem, mas a ausência no coletivo foi notada.' }
        : { bonds: { familia: 1 }, fatigue: -12, outcome: 'Você volta renovado, e ninguém comenta a ausência.' })),
      opt('Ficar com o clube', { bonds: { familia: -1, clube: 1 }, development: 1, fatigue: 4, outcome: 'Você treina forte, e a saudade aperta.' }),
    ],
  },
  {
    id: 'family_plan_v2', category: 'VIDA PESSOAL', actor: 'familia', weight: 4,
    eligible: state => !state.memory.plano_familia,
    text: '{person} sugere que vocês combinem uma forma de manter contato com regularidade, mesmo com a loucura da rotina no futebol.',
    options: [
      opt('Combinar um horário fixo', state => ({ bonds: { familia: 1 }, memory: { plano_familia: 'combinado', familia_turno: state.history.length + 1 }, echo: true })),
      opt('Preferir conversas espontâneas', state => ({ bonds: { familia: -1 }, memory: { plano_familia: 'espontaneo', familia_turno: state.history.length + 1 }, echo: true })),
    ],
  },
  {
    id: 'family_plan_test_v2', category: 'VIDA PESSOAL', actor: 'familia', weight: 12,
    waitingSince: state => state.memory.familia_turno + 3,
    eligible: state => ['combinado', 'espontaneo'].includes(state.memory.plano_familia) && elapsed(state, 'familia_turno', 3),
    text: '{person} lembra da conversa sobre manter contato. Exatamente na hora marcada, o clube chama você para uma atividade importante.',
    options: [
      opt('Reservar o tempo para a família', state => ({ bonds: { familia: 2, clube: -1 }, fatigue: -6, memory: { plano_familia: 'presente', familia_turno: state.history.length + 1 }, echo: true })),
      opt('Priorizar a atividade do clube', state => ({ bonds: { familia: -2, clube: 1 }, fame: 1, memory: { plano_familia: 'ausente', familia_turno: state.history.length + 1 }, echo: true })),
    ],
  },
  {
    id: 'family_plan_consequence_v2', category: 'VIDA PESSOAL', actor: 'familia', weight: 15,
    waitingSince: state => state.memory.familia_turno + 5,
    eligible: state => ['presente', 'ausente'].includes(state.memory.plano_familia) && elapsed(state, 'familia_turno', 5),
    text: '{person} quer conversar sobre o tempo que vocês passam juntos. {familia_contexto}',
    textValues: state => ({ familia_contexto: state.memory.plano_familia === 'presente' ? 'O tempo que você reservou ainda é lembrado com carinho.' : 'A vez em que você escolheu o clube ainda é lembrada, em silêncio.' }),
    options: [
      opt('Ouvir e ajustar a rotina', state => ({ bonds: { familia: state.memory.plano_familia === 'presente' ? 1 : 2 }, fatigue: -5, memory: { familia_desfecho: state.memory.plano_familia, plano_familia: 'concluido' }, outcome: 'A conversa aproxima vocês.' })),
      opt('Manter a rotina como está', state => ({ bonds: { familia: state.memory.plano_familia === 'presente' ? 0 : -2 }, memory: { familia_desfecho: state.memory.plano_familia, plano_familia: 'concluido' }, outcome: 'Cada um segue o seu caminho, com um silêncio a mais.' })),
    ],
  },
];
