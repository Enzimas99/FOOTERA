import test from 'node:test';
import assert from 'node:assert/strict';
import { ATTRIBUTES, COUNTRIES, POSITIONS, RELATIONSHIPS } from '../src/game/data.js';
import { choose, createCareer, currentEvent, eventText } from '../src/game/engine.js';
import { EVENTS, findEvent } from '../src/game/events.js';
import { calculateOverall } from '../src/game/player.js';

function seeded(seed) {
  return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
}

function newCareer(position = 'centroavante', seed = 42) {
  return createCareer({ name: 'Alex Silva', nationality: 'Brasil', position }, seeded(seed));
}

test('gera jogadores válidos em todas as posições', () => {
  for (const position of Object.keys(POSITIONS)) {
    for (let seed = 1; seed <= 75; seed++) {
      const career = newCareer(position, seed);
      const player = career.player;
      assert.ok(player.age >= 16 && player.age <= 22);
      assert.ok(player.overall >= 65 && player.overall <= 72);
      assert.equal(player.overall, calculateOverall(player.attributes, position));
      assert.ok(player.potential > player.overall);
      assert.equal(Object.keys(player.attributes).length, Object.keys(ATTRIBUTES).length);
      assert.equal(Object.keys(player.relationships).length, Object.keys(RELATIONSHIPS).length);
      assert.equal(new Set(Object.values(player.people).map(person => person.id)).size, 6);
      assert.equal(new Set(Object.values(player.people).map(person => person.name)).size, 6);
      assert.equal(currentEvent(career).options.length, 2);
    }
  }
});

test('valida os dados fornecidos pelo jogador', () => {
  assert.throws(() => createCareer({ name: ' ', nationality: 'Brasil', position: 'goleiro' }), /Confira/);
  assert.throws(() => createCareer({ name: 'Ana', nationality: 'País inválido', position: 'goleiro' }), /Confira/);
  assert.throws(() => createCareer({ name: 'Ana', nationality: COUNTRIES[0], position: 'inválida' }), /Confira/);
});

test('todas as cartas têm identificadores estáveis e duas escolhas', () => {
  assert.equal(new Set(EVENTS.map(event => event.id)).size, EVENTS.length);
  for (const event of EVENTS) {
    assert.equal(event.options.length, 2);
    assert.equal(findEvent(event.id), event);
  }
});

test('escolhas atualizam estado, histórico e mantêm o original intacto', () => {
  const state = newCareer();
  state.currentEventId = 'team_dinner_v1';
  const previous = structuredClone(state);
  const next = choose(state, 0);
  assert.deepEqual(state, previous);
  assert.equal(next.player.relationships.equipe, state.player.relationships.equipe + 7);
  assert.equal(next.revision, 1);
  assert.equal(next.history[0].eventId, 'team_dinner_v1');
  assert.equal(next.history[0].personId, state.player.people.companheiro.id);
  assert.equal(next.history[0].choice, 'Vou conhecer melhor o grupo');
  assert.match(next.history[0].text, new RegExp(state.player.people.companheiro.name));
  assert.equal(next.history[0].changes.relationships.equipe, 7);
  assert.notEqual(next.currentEventId, 'team_dinner_v1');
  assert.throws(() => choose(state, 2), /inválida/);
});

test('calcula consequências conforme o contexto', () => {
  const low = newCareer();
  low.currentEventId = 'coach_responsibility_v1';
  low.player.relationships.treinador = 40;
  const high = structuredClone(low);
  high.player.relationships.treinador = 60;
  assert.equal(choose(low, 0).player.relationships.treinador, 47);
  assert.equal(choose(high, 0).player.relationships.treinador, 64);
});

test('promessa cria memória e libera retorno do mesmo personagem', () => {
  const state = newCareer();
  state.currentEventId = 'mentor_promise_v1';
  const next = choose(state, 0);
  assert.equal(next.memory.promessa_treinador, 'feita');
  const continuation = findEvent('mentor_return_v1');
  assert.equal(continuation.eligible(next), false);
  next.history.push(...Array.from({ length: 3 }, () => ({ eventId: 'test' })));
  assert.equal(continuation.eligible(next), true);
  next.currentEventId = continuation.id;
  const followed = choose(next, 0);
  assert.equal(followed.memory.promessa_resolvida, 'cumprida');
  assert.equal(followed.history.at(-1).personId, followed.history[0].personId);
});

test('extremos disparam uma crise antes de qualquer consequência definitiva', () => {
  const state = newCareer();
  state.player.relationships.equipe = 98;
  state.currentEventId = 'team_dinner_v1';
  const crisis = choose(state, 0);
  assert.equal(crisis.player.relationships.equipe, 100);
  assert.equal(crisis.currentEventId, 'crise_equipe_alta_v1');
  assert.equal(crisis.history[0].changes.relationships.equipe, 2);
  assert.equal(currentEvent(crisis).options.length, 2);
  const next = choose(crisis, 0);
  assert.equal(next.player.relationships.equipe, 95);
  assert.equal(next.status, 'active');
});

test('o banco não repete imediatamente e mantém limites por muitas decisões', () => {
  let state = newCareer();
  for (let i = 0; i < 500; i++) {
    const priorEvent = currentEvent(state);
    const text = eventText(priorEvent, state);
    assert.ok(!text.includes('{person}') && !text.includes('{club}'));
    const previousMoney = state.player.money;
    state = choose(state, i % 2);
    assert.notEqual(state.currentEventId, priorEvent.id);
    assert.ok(state.player.money >= 0);
    assert.equal(state.player.money - previousMoney, state.history.at(-1).changes.money);
    for (const value of Object.values(state.player.relationships)) assert.ok(value >= 0 && value <= 100);
    for (const value of Object.values(state.player.attributes)) assert.ok(value >= 1 && value <= 99);
    assert.equal(state.player.overall, calculateOverall(state.player.attributes, state.player.position));
  }
  assert.equal(state.history.length, 500);
  assert.equal(state.revision, 500);
});

const legacyIds = [
  'coach_responsibility_v1', 'team_dinner_v1', 'training_extra_v1', 'family_visit_v1',
  'interview_credit_v1', 'agent_meeting_v1', 'fan_autograph_v1', 'teammate_confidence_v1',
  'family_help_v1', 'coach_feedback_v1', 'team_practice_v1', 'club_community_v1',
  'agent_gear_v1', 'club_schedule_v1', 'fan_social_v1', 'training_focus_v1',
  'teammate_advice_v1', 'press_pressure_v1', 'mentor_promise_v1', 'mentor_return_v1',
];

function select(state, id, choice = 0) {
  state.currentEventId = id;
  return choose(state, choice);
}

function advance(state, count) {
  for (let i = 0; i < count; i++) state = select(state, i % 2 ? 'press_pressure_v1' : 'club_schedule_v1', 0);
  return state;
}

test('salvamentos formato 1 preservam cartas, crises, histórico e estado ao carregar', () => {
  const old = newCareer();
  old.currentEventId = 'interview_credit_v1';
  old.history = [{ eventId: 'mentor_return_v1', category: 'VESTIÁRIO', text: 'snapshot antigo', personId: old.player.people.treinador.id, personName: old.player.people.treinador.name, choice: 'escolha antiga', choiceIndex: 0, changes: { relationships: {}, attributes: {}, money: 0, overall: 0 }, season: 1 }];
  old.revision = 1;
  old.lastSeen.mentor_return_v1 = 1;
  old.memory = { promessa_treinador: 'feita', promessa_turno: 0, promessa_resolvida: 'cumprida' };
  const saved = JSON.parse(JSON.stringify({ format: 1, career: old }));
  const snapshot = structuredClone(saved);
  assert.equal(currentEvent(saved.career).id, 'interview_credit_v1');
  assert.match(eventText(currentEvent(saved.career), saved.career), /entrevista/);
  assert.deepEqual(saved, snapshot);
  const updated = choose(saved.career, 0);
  assert.deepEqual(saved, snapshot);
  assert.deepEqual(updated.history[0], old.history[0]);
  assert.equal(updated.history[1].eventId, 'interview_credit_v1');
  assert.equal(updated.memory.promessa_resolvida, 'cumprida');
  assert.equal(updated.revision, 2);
  for (const id of legacyIds) assert.equal(findEvent(id)?.id, id);
  for (const key of Object.keys(RELATIONSHIPS)) for (const side of ['alta', 'baixa']) {
    const id = `crise_${key}_${side}_v1`;
    assert.equal(currentEvent({ currentEventId: id }).id, id);
  }
  const withoutOptional = structuredClone(old);
  delete withoutOptional.memory;
  delete withoutOptional.lastSeen;
  assert.equal(choose(withoutOptional, 1).memory.ultima_entrevista, 'individual');
  assert.equal(withoutOptional.memory, undefined);
});

test('elegibilidade contextual considera posição, dinheiro, relações e memórias', () => {
  const state = newCareer();
  const keeper = structuredClone(state);
  keeper.player.position = 'goleiro';
  assert.equal(findEvent('keeper_positioning_v2').eligible(state), false);
  assert.equal(findEvent('keeper_positioning_v2').eligible(keeper), true);
  assert.equal(findEvent('outfield_movement_v2').eligible(state), true);
  assert.equal(findEvent('outfield_movement_v2').eligible(keeper), false);
  state.player.money = 799;
  assert.equal(findEvent('family_help_v1').eligible(state), false);
  assert.equal(findEvent('agent_budget_v2').eligible(state), true);
  assert.equal(findEvent('agent_savings_v2').eligible(state), false);
  state.player.money = 2000;
  assert.equal(findEvent('family_help_v1').eligible(state), true);
  assert.equal(findEvent('agent_savings_v2').eligible(state), true);
  state.player.relationships.treinador = 29;
  assert.equal(findEvent('coach_rebuild_v2').eligible(state), true);
  assert.equal(findEvent('coach_rebuild_v2').weight(state), 9);
  state.player.relationships.treinador = 40;
  assert.equal(findEvent('coach_rebuild_v2').weight(state), 5);
  state.player.relationships.treinador = 60;
  assert.equal(findEvent('coach_rebuild_v2').eligible(state), false);
  assert.equal(findEvent('coach_trust_v2').eligible(state), true);
  assert.equal(findEvent('duo_disagreement_v2').eligible(state), false);
  assert.equal(findEvent('duo_consequence_v2').eligible(state), false);
});

test('histórias em três atos respeitam atrasos, escolhas e identidade recorrente', () => {
  for (const [start, middle, end, role, stage, startValue, middleValue, outcome, delay1, delay2] of [
    ['duo_invitation_v2', 'duo_disagreement_v2', 'duo_consequence_v2', 'companheiro', 'dupla_etapa', 'recusada', 'distancia', 'dupla_desfecho', 3, 5],
    ['agent_proposal_v2', 'agent_followup_v2', 'agent_consequence_v2', 'empresario', 'projeto_comercial', 'recusado', 'limites', 'projeto_desfecho', 4, 5],
    ['family_plan_v2', 'family_plan_test_v2', 'family_plan_consequence_v2', 'familia', 'plano_familia', 'espontaneo', 'ausente', 'familia_desfecho', 3, 5],
  ]) {
    let state = select(newCareer(), start, 1);
    const personId = state.player.people[role].id;
    assert.equal(state.memory[stage], startValue);
    assert.equal(findEvent(middle).eligible(state), false);
    state = advance(state, delay1 - 1);
    assert.equal(findEvent(middle).eligible(state), false);
    state = advance(state, 1);
    assert.equal(findEvent(middle).eligible(state), true);
    state = select(state, middle, 1);
    assert.equal(state.memory[stage], middleValue);
    assert.equal(state.history.at(-1).personId, personId);
    assert.equal(findEvent(end).eligible(state), false);
    state = advance(state, delay2);
    assert.equal(findEvent(end).eligible(state), true);
    assert.doesNotMatch(eventText(findEvent(end), state), /\{[a-z_]+\}/);
    const visibleText = eventText(findEvent(end), state);
    state = select(state, end, 0);
    assert.equal(state.history.at(-1).text, visibleText);
    assert.equal(state.memory[outcome], middleValue);
    assert.equal(state.history.at(-1).personId, personId);
    assert.equal(findEvent(start).eligible(state), false);
    assert.equal(findEvent(end).eligible(state), false);
    assert.equal(state.season, 1);
  }
});

test('memórias antigas geram consequências posteriores sem perder ramificações', () => {
  let collective = select(newCareer(), 'interview_credit_v1', 0);
  let individual = select(newCareer(), 'interview_credit_v1', 1);
  collective = advance(collective, 3);
  individual = advance(individual, 3);
  const reaction = findEvent('interview_team_reaction_v2');
  assert.equal(reaction.eligible(collective), true);
  assert.equal(reaction.eligible(individual), true);
  assert.match(eventText(reaction, collective), /dividiu o mérito/);
  assert.match(eventText(reaction, individual), /próprio esforço/);
  const afterCollective = select(collective, reaction.id, 1);
  const afterIndividual = select(individual, reaction.id, 1);
  assert.equal(afterCollective.history.at(-1).changes.relationships.equipe, 2);
  assert.equal(afterIndividual.history.at(-1).changes.relationships.equipe, -4);
  assert.equal(reaction.eligible(afterCollective), false);
  let supported = select(newCareer(), 'teammate_confidence_v1', 0);
  supported = advance(supported, 4);
  const supportReturn = findEvent('teammate_support_return_v2');
  assert.equal(supportReturn.eligible(supported), true);
  const afterSupport = select(supported, supportReturn.id, 0);
  assert.equal(afterSupport.history.at(-1).personId, afterSupport.history[0].personId);
  assert.equal(supportReturn.eligible(afterSupport), false);
  let promise = select(newCareer(), 'mentor_promise_v1', 0);
  promise = advance(promise, 3);
  promise = select(promise, 'mentor_return_v1', 1);
  promise = advance(promise, 5);
  const consequence = findEvent('mentor_promise_consequence_v2');
  assert.equal(consequence.eligible(promise), true);
  assert.match(eventText(consequence, promise), /adiar/);
  promise = select(promise, consequence.id, 0);
  assert.equal(promise.memory.promessa_consequencia, 'adiada');
});

test('seleção respeita elegibilidade, cooldown e distribuição em carreiras longas', () => {
  for (const position of ['goleiro', 'centroavante']) for (const seed of [1, 42, 99]) {
    let state = newCareer(position, seed);
    const seen = new Map();
    const diversity = new Set();
    for (let i = 0; i < 350; i++) {
      const event = currentEvent(state);
      if (!event.id.startsWith('crise_')) {
        assert.ok(!event.eligible || event.eligible(state), `${event.id} inelegível`);
        if (seen.has(event.id)) assert.ok(i - seen.get(event.id) - 1 >= (event.cooldown ?? 12), `${event.id} repetiu cedo`);
        seen.set(event.id, i);
        diversity.add(event.id);
      }
      assert.doesNotMatch(eventText(event, state), /\{[a-z_]+\}/);
      const priorId = event.id;
      state = choose(state, (i + seed) % 2);
      assert.notEqual(state.currentEventId, priorId);
      assert.ok(state.player.money >= 0);
      assert.ok(Object.values(state.player.relationships).every(value => value >= 0 && value <= 100));
      assert.ok(Object.values(state.player.attributes).every(value => value >= 1 && value <= 99));
      assert.equal(state.season, 1);
    }
    assert.ok(diversity.size >= 30, `pouca diversidade: ${diversity.size}`);
    assert.equal(state.memory.dupla_etapa, 'concluida');
    assert.equal(state.memory.projeto_comercial, 'concluido');
    assert.equal(state.memory.plano_familia, 'concluido');
  }
});

test('limites registram deltas reais e escolhas são determinísticas após serialização', () => {
  let state = newCareer();
  state.currentEventId = 'training_focus_v1';
  state.player.attributes.resistencia = 99;
  state.player.attributes.forca = 98;
  state.player.overall = calculateOverall(state.player.attributes, state.player.position);
  const serialized = JSON.parse(JSON.stringify(state));
  const first = choose(state, 0);
  const second = choose(serialized, 0);
  assert.deepEqual(first, second);
  assert.equal(first.history.at(-1).changes.attributes.resistencia, 0);
  assert.equal(first.history.at(-1).changes.attributes.forca, 1);
  assert.equal(first.player.attributes.forca, 99);
  state = newCareer();
  state.currentEventId = 'family_help_v1';
  state.player.money = 100;
  const bounded = choose(state, 0);
  assert.equal(bounded.player.money, 0);
  assert.equal(bounded.history.at(-1).changes.money, -100);
});
