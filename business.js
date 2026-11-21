import { bond, elapsed, opt, pickSuitor, offerSalary } from './kit.js';

const fmt = value => new Intl.NumberFormat('pt-BR').format(value);

export const BUSINESS = [
  {
    id: 'agent_proposal_v2', category: 'EMPRESÁRIO', actor: 'empresario', weight: 4,
    eligible: state => !state.memory.projeto_comercial,
    text: '{person} apresenta uma campanha publicitária para um clube de formação de atletas. Paga pouco, mas abre portas, e exige parte da sua agenda.',
    options: [
      opt('Aceitar a campanha', state => ({ money: 800, bonds: { empresario: 1 }, fatigue: 6, memory: { projeto_comercial: 'aceito', projeto_turno: state.history.length + 1 }, echo: true })),
      opt('Recusar a campanha', state => ({ bonds: { empresario: -1 }, development: 1, memory: { projeto_comercial: 'recusado', projeto_turno: state.history.length + 1 }, echo: true })),
    ],
  },
  {
    id: 'agent_followup_v2', category: 'EMPRESÁRIO', actor: 'empresario', weight: 12,
    waitingSince: state => state.memory.projeto_turno + 4,
    eligible: state => ['aceito', 'recusado'].includes(state.memory.projeto_comercial) && elapsed(state, 'projeto_turno', 4),
    text: '{person} volta à campanha. {projeto_contexto}',
    textValues: state => ({ projeto_contexto: state.memory.projeto_comercial === 'aceito' ? 'A marca gostou e quer expandir o contrato, com mais gravações e eventos.' : 'A marca fechou com outro atleta. Ele quer entender se você pretende ser mais seletivo daqui para frente.' }),
    options: [
      opt('Montar um plano de imagem em conjunto', state => ({ money: state.memory.projeto_comercial === 'aceito' ? 1500 : 0, fame: 2, bonds: { empresario: 1 }, fatigue: 6, memory: { projeto_comercial: 'plano', projeto_turno: state.history.length + 1 }, echo: true })),
      opt('Definir meus próprios limites', state => ({ bonds: { empresario: -1 }, development: 1, memory: { projeto_comercial: 'limites', projeto_turno: state.history.length + 1 }, echo: true })),
    ],
  },
  {
    id: 'agent_consequence_v2', category: 'EMPRESÁRIO', actor: 'empresario', weight: 15,
    waitingSince: state => state.memory.projeto_turno + 5,
    eligible: state => ['plano', 'limites'].includes(state.memory.projeto_comercial) && elapsed(state, 'projeto_turno', 5),
    text: '{person} volta ao rumo que vocês combinaram para a sua carreira. {projeto_contexto}',
    textValues: state => ({ projeto_contexto: state.memory.projeto_comercial === 'plano' ? 'O plano de imagem rendeu notoriedade, e agora ele cobra dedicação.' : 'Seus limites impressionaram o clube, mas fecharam algumas portas comerciais.' }),
    options: [
      opt('Reafirmar o combinado', state => (state.memory.projeto_comercial === 'plano'
        ? { money: 1200, fame: 2, bonds: { empresario: 1 }, memory: { projeto_desfecho: 'plano', projeto_comercial: 'concluido' }, outcome: 'O dinheiro entra, e a agenda aperta.' }
        : { bonds: { empresario: 1, treinador: 1 }, memory: { projeto_desfecho: 'limites', projeto_comercial: 'concluido' }, outcome: 'Foco total no futebol. O clube enxerga profissionalismo.' })),
      opt('Renegociar a parceria', { bonds: { empresario: -1 }, money: 0, memory: { projeto_desfecho: 'renegociou', projeto_comercial: 'concluido' }, outcome: 'Ele aceita rever os termos, mas fica reticente.' }),
    ],
  },
  {
    id: 'sponsorship_v1', category: 'PATROCÍNIO', actor: 'empresario', weight: 5, cooldown: 14,
    eligible: state => state.player.fame >= 10,
    text: '{person} traz um contrato de chuteiras com uma marca grande: € 3.500 agora e participação em eventos. Vai custar tempo de treino e sono.',
    options: [
      opt('Assinar o contrato', { money: 3500, fatigue: 14, fame: 3, bonds: { empresario: 1, treinador: -1 }, outcome: 'O dinheiro cai, a agenda enche e o treinador torce o nariz.' }),
      opt('Recusar e manter o foco', { development: 2, bonds: { empresario: -1, treinador: 1 }, outcome: 'Você deixa o dinheiro passar, e o treino rende.' }),
    ],
  },
  {
    id: 'agent_budget_v2', category: 'EMPRESÁRIO', actor: 'empresario', weight: 6, cooldown: 14,
    eligible: state => state.player.money < 1500,
    text: '{person} olha sua conta e diz sem rodeios: se continuar assim, a próxima emergência vai te pegar sem reserva.',
    options: [
      opt('Cortar despesas', { money: 400, bonds: { empresario: 1 }, fatigue: 2, outcome: 'Você aperta o cinto e ganha folga.' }),
      opt('Aceitar um adiantamento do clube', { money: 1500, bonds: { clube: -1 }, outcome: 'O dinheiro entra, e a diretoria passa a te ver como alguém aflito.' }),
    ],
  },
  {
    id: 'agent_savings_v2', category: 'EMPRESÁRIO', actor: 'empresario', weight: 4, cooldown: 18,
    eligible: state => state.player.money >= 6000,
    text: '{person} fala de um investimento: uma sociedade em um restaurante de um conhecido. Pode render bem, ou virar dor de cabeça.',
    options: [
      opt('Investir € 3.000', (state, h) => (h.chance(0.5)
        ? { money: 2200, bonds: { empresario: 1 }, outcome: 'O negócio engrenou, e o dinheiro rende.' }
        : { money: -3000, bonds: { empresario: -1 }, outcome: 'O restaurante fecha em seis meses. A conta é só sua.' })),
      opt('Guardar o dinheiro', { bonds: { empresario: 0, familia: 1 }, outcome: 'Reserva segura. Sem risco, sem retorno.' }),
    ],
  },
  {
    id: 'family_help_v1', category: 'VIDA PESSOAL', actor: 'familia', weight: 3, cooldown: 20,
    eligible: state => state.player.money >= 1500,
    text: '{person} precisa de ajuda com uma despesa inesperada: € 1.500. Você pode ajudar, mas ainda está construindo sua reserva.',
    options: [
      opt('Ajudar com € 1.500', { money: -1500, bonds: { familia: 2 }, memory: { ajudou_familia: true }, echo: true, outcome: 'A família respira aliviada.' }),
      opt('Procurar outra solução juntos', { bonds: { familia: -1 }, memory: { ajudou_familia: false }, echo: true, outcome: 'Você diz não, e o silêncio pesa.' }),
    ],
  },
  {
    id: 'family_help_return_v2', category: 'VIDA PESSOAL', actor: 'familia', weight: 7, cooldown: 20,
    waitingSince: state => state.lastSeen.family_help_v1 + 5,
    eligible: state => typeof state.memory.ajudou_familia === 'boolean' && state.memory.ajuda_comentada !== state.memory.ajudou_familia && state.lastSeen.family_help_v1 !== undefined && state.history.length - state.lastSeen.family_help_v1 >= 5,
    text: '{person} retoma o assunto da despesa. {ajuda_contexto}',
    textValues: state => ({ ajuda_contexto: state.memory.ajudou_familia ? 'A ajuda que você deu mudou o rumo da família, e agora aparece outro pedido.' : 'A recusa ainda machuca, e agora existe uma nova necessidade.' }),
    options: [
      opt('Planejar juntos', state => ({ bonds: { familia: state.memory.ajudou_familia ? 1 : 2 }, money: state.memory.ajudou_familia ? -600 : -1000, memory: { ajuda_comentada: state.memory.ajudou_familia }, outcome: 'Dessa vez, a conversa é de igual para igual.' })),
      opt('Estabelecer limites', state => ({ bonds: { familia: state.memory.ajudou_familia ? -1 : -2 }, memory: { ajuda_comentada: state.memory.ajudou_familia }, outcome: 'Você põe limites claros, e a conversa esfria.' })),
    ],
  },
  {
    id: 'contract_renewal_v1', category: 'EMPRESÁRIO', actor: 'empresario', weight: 40, cooldown: 12,
    eligible: state => state.player.contract.until <= state.season,
    text: 'O contrato com o {club} termina nesta temporada. {person} diz que o clube quer renovar, mas que outros times já perguntaram por você.',
    options: [
      opt('Renovar por três temporadas', state => ({ contract: { years: 3, raise: 1.06 }, bonds: { clube: 1, empresario: 0 }, outcome: 'Assinatura feita, com um aumento modesto e segurança.' })),
      opt('Esperar outras propostas', (state, h) => (h.chance(0.65)
        ? { bonds: { clube: -1 }, schedule: [{ id: 'transfer_offer_v1', after: 1 }], contract: { years: 1, raise: 1 }, echo: true, outcome: 'Você renova por um ano e abre espaço para propostas.' }
        : { bonds: { clube: -2 }, standing: -1, contract: { years: 1, raise: 1 }, outcome: 'O clube fica ressentido e te coloca em segundo plano por um tempo.' })),
    ],
  },
  {
    id: 'transfer_offer_v1', category: 'CLUBE', actor: 'empresario', weight: 5, cooldown: 30,
    eligible: state => state.season >= 2 && state.player.overall >= 60 && !state.memory.proposta_pendente && state.world?.divisions,
    prepare: (state, h) => {
      const club = pickSuitor(state, h, { exclude: [state.memory.recusou_clube].filter(Boolean) });
      return { clubId: club.id, clubName: club.name, country: club.country, salary: offerSalary(state, club), strength: club.strength };
    },
    text: '{person} traz notícia: o {oferta_clube}, da {oferta_pais}, quer contratar você. O salário seria de € {oferta_salario} por temporada. O time é {oferta_nivel}.',
    textValues: state => ({
      oferta_clube: state.context?.clubName, oferta_pais: state.context?.country, oferta_salario: fmt(state.context?.salary ?? 0),
      oferta_nivel: (state.context?.strength ?? 0) > state.player.club.strength ? 'mais forte que o seu atual, o que significa disputar posição' : 'mais modesto que o atual, com chances de ser titular absoluto',
    }),
    options: [
      opt('Aceitar a transferência', state => ({ transfer: { clubId: state.context.clubId, salary: state.context.salary, years: 3 }, bonds: { treinador: 0, companheiro: 0, clube: 0 }, fame: 2, echo: true, outcome: 'Mala feita, vida nova. Tudo recomeça em outro vestiário.' })),
      opt('Recusar e continuar', state => ({ bonds: { clube: 1, empresario: -1 }, memory: { recusou_clube: state.context.clubId, recusou_nome: state.context.clubName, recusou_turno: state.history.length + 1, recusou_temporada: state.season }, schedule: [{ id: 'offer_return_v1', after: 10 }], echo: true, outcome: 'Você fica. O clube agradece, e o empresário suspira.' })),
    ],
  },
  {
    id: 'offer_return_v1', category: 'CLUBE', actor: 'empresario', weight: 22,
    eligible: state => !!state.memory.recusou_clube && !state.memory.recusou_fechado && state.world?.clubs?.[state.memory.recusou_clube],
    prepare: (state) => {
      const club = state.world.clubs[state.memory.recusou_clube];
      return { clubId: club.id, clubName: club.name, country: club.country, salary: offerSalary(state, club, 1.18), strength: club.strength };
    },
    text: 'O {oferta_clube} voltou, e {person} avisa: a oferta agora é melhor do que a que você recusou: € {oferta_salario} por temporada. Eles não esqueceram você.',
    textValues: state => ({ oferta_clube: state.context?.clubName, oferta_salario: fmt(state.context?.salary ?? 0) }),
    options: [
      opt('Dessa vez, aceitar', state => ({ transfer: { clubId: state.context.clubId, salary: state.context.salary, years: 3 }, fame: 2, memory: { recusou_fechado: true }, outcome: 'A segunda proposta chega com mais respeito, e você aceita.' })),
      opt('Recusar de vez', { bonds: { empresario: -1, clube: 1 }, memory: { recusou_fechado: true }, outcome: 'Agora a porta se fecha. Pelo menos por um bom tempo.' }),
    ],
  },
  {
    id: 'luxury_purchase_v1', category: 'VIDA PESSOAL', actor: 'amigo', weight: 5, cooldown: 24,
    eligible: state => state.player.money >= 12000,
    text: '{person} mostra um carro esportivo à venda por € {valor}. "Você merece depois de tudo que construiu." Ou o dinheiro pode ir para algo mais sólido: um imóvel para a família.',
    textValues: state => ({ valor: fmt(Math.round(state.player.money * 0.2 / 100) * 100) }),
    options: [
      opt('Comprar o carro dos sonhos', (state, h) => ({ money: -Math.round(state.player.money * 0.2 / 100) * 100, fame: 3, bonds: { amigo: 1, ...(h.chance(0.3) ? { imprensa: -1, treinador: -1 } : {}) }, outcome: 'Você se dá o presente, e os holofotes acompanham.' })),
      opt('Comprar uma casa para a família', state => ({ money: -Math.round(state.player.money * 0.2 / 100) * 100, bonds: { familia: 2 }, fatigue: -8, outcome: 'Sua família agora tem o chão que você sempre quis dar.' })),
    ],
  },
  {
    id: 'foundation_v1', category: 'PATROCÍNIO', actor: 'empresario', weight: 4, cooldown: 30,
    eligible: state => state.player.money >= 10000 && state.player.fame >= 25 && !state.memory.projeto_social,
    text: '{person} sugere que você use seu nome para algo maior: um projeto social para jovens da sua cidade natal. Vai custar € {valor} e muita atenção.',
    textValues: state => ({ valor: fmt(Math.round(state.player.money * 0.25 / 100) * 100) }),
    options: [
      opt('Criar o projeto', state => ({ money: -Math.round(state.player.money * 0.25 / 100) * 100, fame: 5, bonds: { torcida: 2, clube: 1, imprensa: 1 }, fatigue: 8, memory: { projeto_social: true }, outcome: 'Crianças com a camisa do seu nome: isso vale mais que qualquer troféu.' })),
      opt('Preferir investir no futuro', { bonds: { empresario: 1 }, money: 1200, outcome: 'Você mantém a estratégia financeira, sem barulho.' }),
    ],
  },
  {
    id: 'loan_bench_v1', category: 'CLUBE', actor: 'empresario', weight: 12, cooldown: 20,
    eligible: state => state.player.standing <= 1 && state.season >= 2 && state.history.length > 10,
    text: 'Sem espaço no time, {person} sugere uma saída: empréstimo a um clube menor, para jogar. Ou você pode brigar por posição onde está.',
    options: [
      opt('Brigar por posição aqui', (state, h) => (h.chance(0.4 + (state.player.overall - 62) / 60)
        ? { standing: 1, fatigue: 8, bonds: { treinador: 1 }, outcome: 'Treino a treino, você volta para a rotação.' }
        : { fatigue: 10, development: 0, bonds: { treinador: -1 }, outcome: 'Você insiste, mas o banco continua sendo o seu lugar.' })),
      opt('Aceitar o empréstimo', state => ({ standing: 2 - state.player.standing, fatigue: -6, bonds: { clube: -1, empresario: 1 }, development: 1, outcome: 'Longe de casa, mas finalmente em campo toda semana.' })),
    ],
  },
];
