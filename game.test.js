import test from 'node:test';
import assert from 'node:assert/strict';
import { ATTRIBUTES, BONDS, COUNTRIES, POSITIONS } from '../src/game/data.js';
import { choose, createCareer, currentEvent, eventText, previewOptions, upgradeCareer } from '../src/game/engine.js';
import { EVENTS, findEvent } from '../src/game/events.js';
import { migrateCareer } from '../src/game/migrate.js';
import { calculateOverall, createPlayer } from '../src/game/player.js';
import { simulatePlayerSeason, progressPlayer } from '../src/game/season.js';
import { simulateSeason } from '../src/game/world.js';
import { archiveEntry, recordBook, unpack } from '../src/storage.js';

const seeded = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const newCareer = (position = 'centroavante', seed = 42, nationality = 'Brasil') => createCareer({ name: 'Alex Silva', nationality, position }, seeded(seed));
function play(career, steps, seed = 7) {
  const rnd = seeded(seed);
  for (let i = 0; i < steps && career.status === 'active'; i++) career = choose(career, rnd() < 0.5 ? 0 : 1);
  return career;
}

test('gera jogadores válidos em todas as posições, sem barras de relacionamento', () => {
  for (const position of Object.keys(POSITIONS)) {
    for (let seed = 1; seed <= 40; seed++) {
      const player = createPlayer({ name: 'Alex Silva', nationality: 'Brasil', position }, seeded(seed));
      assert.ok(player.age >= 16 && player.age <= 22);
      assert.ok(player.overall >= 65 && player.overall <= 72);
      assert.equal(player.overall, calculateOverall(player.attributes, position));
      assert.ok(player.potential > player.overall);
      assert.equal(Object.keys(player.attributes).length, Object.keys(ATTRIBUTES).length);
      assert.equal(player.relationships, undefined);
      assert.deepEqual(Object.keys(player.bonds).sort(), Object.keys(BONDS).sort());
      assert.ok(Object.values(player.bonds).every(value => value === 0));
      assert.equal(new Set(Object.values(player.people).map(person => person.name)).size, Object.keys(player.people).length);
      assert.ok(player.people.rival && player.people.amigo);
    }
    assert.equal(currentEvent(newCareer(position)).options.length, 2);
  }
});

test('valida os dados fornecidos pelo jogador', () => {
  assert.throws(() => createPlayer({ name: 'A', nationality: 'Brasil', position: 'goleiro' }), /Confira/);
  assert.throws(() => createPlayer({ name: 'Alex', nationality: 'Japão', position: 'goleiro' }), /Confira/);
  assert.throws(() => createPlayer({ name: 'Alex', nationality: COUNTRIES[0], position: 'ala' }), /Confira/);
});

test('todas as cartas têm id único, duas escolhas e efeitos válidos', () => {
  const ids = EVENTS.map(event => event.id);
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(EVENTS.length >= 70);
  const keys = new Set(['attributes', 'money', 'standing', 'fatigue', 'fame', 'temper', 'bonds', 'memory', 'schedule', 'injury', 'transfer', 'contract', 'retire', 'focus', 'development', 'stats', 'echo', 'outcome', 'matchCard']);
  const state = newCareer();
  simulateSeason(state.world, 1);
  state.memory.rival_clube_nome = 'Rival FC'; state.memory.promessa_resolvida = 'cumprida'; state.memory.projeto_comercial = 'plano';
  state.context = { clubId: Object.keys(state.world.clubs)[3], clubName: 'X', country: 'Brasil', salary: 9000, strength: 60 };
  for (const event of EVENTS) {
    assert.equal(event.options.length, 2, event.id);
    for (const option of event.options) for (const mode of [true, false]) {
      const effects = option.effects(state, { chance: () => mode, int: min => min });
      for (const key of Object.keys(effects)) assert.ok(keys.has(key), `${event.id}: efeito desconhecido ${key}`);
      for (const key of Object.keys(effects.bonds || {})) assert.ok(key in BONDS, `${event.id}: vínculo ${key}`);
      for (const key of Object.keys(effects.attributes || {})) assert.ok(key in ATTRIBUTES, `${event.id}: atributo ${key}`);
      assert.ok(option.label.length > 3);
    }
  }
});

test('escolhas têm custo: nenhuma carta é só ganho nas duas opções', () => {
  const state = newCareer();
  simulateSeason(state.world, 1);
  state.memory.rival_clube_nome = 'Rival FC'; state.memory.promessa_resolvida = 'cumprida'; state.memory.projeto_comercial = 'plano';
  state.context = { clubId: Object.keys(state.world.clubs)[3], clubName: 'X', country: 'Brasil', salary: 9000, strength: 60 };
  const hasCost = effects => (effects.money ?? 0) < 0 || (effects.fatigue ?? 0) > 0 || (effects.standing ?? 0) < 0 || (effects.fame ?? 0) < 0 || !!effects.injury
    || Object.values(effects.bonds || {}).some(value => value < 0) || Object.values(effects.attributes || {}).some(value => value < 0) || (effects.temper ?? 0) < 0;
  const free = [];
  for (const event of EVENTS) {
    const costly = event.options.some(option => [true, false].some(mode => hasCost(option.effects(state, { chance: () => mode, int: min => min }))));
    if (!costly) free.push(event.id);
  }
  assert.deepEqual(free, [], `cartas sem nenhum custo ou risco: ${free.join(', ')}`);
});

test('não existe indicador de relacionamento no estado nem na interface', async () => {
  const { gameScreen } = await import('../src/ui/views.js');
  const state = play(newCareer(), 12);
  assert.equal(state.player.relationships, undefined);
  const html = gameScreen(state, {});
  assert.doesNotMatch(html, /relationship-strip|class="meter"/);
  for (const label of ['Equipe', 'Vida social']) assert.ok(!html.includes(`title="${label}:`));
  assert.match(html, /season-pips/);
});

test('temporadas têm entre 7 e 10 decisões e a virada ocorre no momento certo', () => {
  const counts = [];
  for (let seed = 1; seed <= 10; seed++) {
    let state = newCareer(Object.keys(POSITIONS)[seed % 10], seed), season = state.season, decisions = 0;
    for (let i = 0; i < 140 && state.status === 'active'; i++) {
      state = choose(state, i % 2); decisions++;
      if (state.season !== season) { counts.push(decisions); decisions = 0; season = state.season; }
    }
  }
  assert.ok(counts.length >= 40);
  assert.ok(counts.every(count => count >= 7 && count <= 10), counts.join(','));
  assert.ok(new Set(counts).size >= 3, 'a duração deve variar');
});

test('escolhas atualizam estado e histórico, preservam o original e são determinísticas', () => {
  const career = newCareer();
  const snapshot = structuredClone(career);
  const updated = choose(career, 0), again = choose(JSON.parse(JSON.stringify(career)), 0);
  assert.deepEqual(career, snapshot);
  assert.deepEqual(updated, again);
  assert.equal(updated.history.length, 1);
  assert.equal(updated.revision, 1);
  assert.ok(updated.history[0].changes.bonds);
  assert.throws(() => choose(career, 2), /Escolha inválida/);
});

test('prévia das consequências não consome sorteios nem altera a carreira', () => {
  const career = play(newCareer(), 6);
  const snapshot = structuredClone(career);
  const preview = previewOptions(career, currentEvent(career));
  assert.deepEqual(career, snapshot);
  assert.equal(preview.length, 2);
  for (const item of preview) { assert.ok(Array.isArray(item.hints)); assert.equal(typeof item.risky, 'boolean'); }
});

test('textos das cartas não deixam marcadores sem substituir ao longo de carreiras', () => {
  for (let seed = 1; seed <= 6; seed++) {
    let state = newCareer(Object.keys(POSITIONS)[seed], seed);
    for (let i = 0; i < 120 && state.status === 'active'; i++) {
      assert.doesNotMatch(eventText(currentEvent(state), state), /\{[a-z_]+\}/, currentEvent(state).id);
      state = choose(state, i % 2);
      if (state.history.at(-1).outcome) assert.doesNotMatch(state.history.at(-1).outcome, /\{[a-z_]+\}/);
    }
  }
});

test('transferência troca de clube, contrato e histórico; recusa agenda uma nova proposta', () => {
  let state = newCareer();
  state.season = 3; state.player.contract.until = 9; state.history = Array.from({ length: 12 }, (_, i) => ({ eventId: 'x', category: 'CLUBE', season: 1, choice: String(i), outcome: '', changes: {} }));
  const ids = Object.keys(state.world.clubs);
  const target = ids.find(id => id !== state.player.club.id && state.world.clubs[id].divisionId);
  state.currentEventId = 'transfer_offer_v1';
  state.context = { eventId: 'transfer_offer_v1', clubId: target, clubName: state.world.clubs[target].name, country: 'Brasil', salary: 20000, strength: 60 };
  const accepted = choose(state, 0);
  assert.equal(accepted.player.club.id, target);
  assert.equal(accepted.player.contract.salary, 20000);
  assert.equal(accepted.player.clubHistory.length, 2);
  assert.equal(accepted.player.clubHistory[0].toSeason, 3);
  assert.equal(accepted.player.bonds.treinador, 0);
  const refused = choose(state, 1);
  assert.equal(refused.player.club.id, state.player.club.id);
  assert.equal(refused.memory.recusou_clube, target);
  assert.ok(refused.queue.some(item => item.id === 'offer_return_v1'));
  // Dez cartas depois, o mesmo clube volta com uma oferta melhor.
  let later = refused, seen = false;
  for (let i = 0; i < 14 && !seen; i++) {
    later = choose(later, 1);
    if (later.currentEventId === 'offer_return_v1') {
      seen = true;
      assert.equal(later.context.clubId, target);
      assert.ok(later.context.salary > state.player.contract.salary);
      assert.match(eventText(currentEvent(later), later), new RegExp(state.world.clubs[target].name.split(' ')[0]));
    }
  }
  assert.ok(seen, 'o clube recusado deveria voltar');
});

test('rivalidade em cadeia: conflito, reencontro em outro clube e desfecho', () => {
  let state = newCareer();
  state.player.fame = 20;
  state.currentEventId = 'teammate_jealousy_v1';
  state = choose(state, 1);
  assert.equal(state.memory.rival_estado, 'hostil');
  assert.equal(state.player.bonds.rival, -2);
  let guard = 0;
  while (state.currentEventId !== 'rival_return_v1' && guard++ < 20) state = choose(state, 0);
  assert.equal(state.currentEventId, 'rival_return_v1');
  assert.ok(state.context.clubName);
  assert.notEqual(state.context.clubId, state.player.club.id);
  assert.ok(eventText(currentEvent(state), state).includes(state.context.clubName));
  state = choose(state, 0);
  assert.equal(state.memory.rival_estado, 'guerra');
  guard = 0;
  while (state.currentEventId !== 'rival_war_v1' && guard++ < 20) state = choose(state, 0);
  assert.equal(state.currentEventId, 'rival_war_v1');
  assert.match(eventText(currentEvent(state), state), new RegExp(state.memory.rival_clube_nome));
  assert.ok(['inimigo', 'respeito'].includes(choose(state, 1).memory.rival_estado));
});

test('conflito com o treinador reduz o espaço no elenco e volta como consequência', () => {
  let state = newCareer();
  state.player.standing = 3; state.player.bonds.treinador = 0;
  state.currentEventId = 'coach_feedback_v1';
  let bad = null;
  for (let seed = 1; seed < 60 && !bad; seed++) {
    state.randomState = seed * 7919;
    const result = choose(state, 1);
    if (result.queue.some(item => item.id === 'coach_bench_v1')) bad = result;
  }
  assert.ok(bad, 'a opção arriscada deve poder falhar');
  assert.equal(bad.player.bonds.treinador, -2);
  assert.ok(bad.player.standing < 3);
  let next = bad, seen = false;
  for (let i = 0; i < 8 && !seen; i++) { next = choose(next, 0); seen = next.currentEventId === 'coach_bench_v1'; }
  assert.ok(seen);
});

test('a temporada do jogador usa as partidas reais do clube e é coerente', () => {
  for (let seed = 1; seed <= 8; seed++) {
    const state = newCareer(Object.keys(POSITIONS)[seed], seed);
    state.player.standing = 3;
    simulateSeason(state.world, 1);
    const summary = simulatePlayerSeason(state, seeded(seed));
    const league = state.world.lastSeason.leagues.find(item => item.standings.some(row => row.clubId === state.player.club.id));
    const clubGoals = league.rounds.flat().filter(match => [match.home, match.away].includes(state.player.club.id)).reduce((sum, match) => sum + (match.home === state.player.club.id ? match.homeGoals : match.awayGoals), 0);
    assert.ok(summary.played <= 38 && summary.played > 15, `jogos ${summary.played}`);
    assert.ok(summary.goals + summary.assists <= clubGoals);
    assert.equal(summary.position, league.standings.findIndex(row => row.clubId === state.player.club.id) + 1);
    assert.ok(summary.highlights.length <= 5);
    if (state.player.position === 'goleiro') assert.equal(summary.goals, 0);
  }
});

test('lesão e espaço no elenco reduzem a quantidade de jogos', () => {
  const state = newCareer();
  simulateSeason(state.world, 1);
  const totals = (standing, injury) => {
    let sum = 0;
    for (let seed = 1; seed <= 20; seed++) { state.player.standing = standing; state.player.injury = injury; sum += simulatePlayerSeason(state, seeded(seed)).played; }
    return sum / 20;
  };
  const starter = totals(4, null), bench = totals(1, null), injured = totals(4, { label: 'Lesão', games: 20 });
  assert.ok(starter > bench + 10);
  assert.ok(injured < starter - 8);
});

test('evolução não é automática: jovens evoluem, veteranos declinam, minutos e treino importam', () => {
  const mean = (age, played, dev = 0) => {
    let sum = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const player = createPlayer({ name: 'Alex Silva', nationality: 'Brasil', position: 'meio_campista' }, seeded(seed));
      player.age = age; player.potential = player.overall + 15; player.development = dev; player.fatigue = 30;
      sum += progressPlayer(player, { played }, seeded(seed + 100)).delta;
    }
    return sum / 60;
  };
  assert.ok(mean(19, 36) > 0.8);
  assert.ok(mean(19, 36) > mean(19, 4));
  assert.ok(mean(19, 36, 2) > mean(19, 36, 0));
  assert.ok(mean(34, 30) < -1);
  const values = new Set(Array.from({ length: 80 }, (_, i) => {
    const player = createPlayer({ name: 'Alex Silva', nationality: 'Brasil', position: 'zagueiro' }, seeded(i + 1));
    player.age = 20; player.potential = 85;
    return progressPlayer(player, { played: 25 }, seeded(i + 500)).delta;
  }));
  assert.ok(values.size >= 2, 'o resultado deve variar entre jogadores iguais');
});

test('carreira completa: dezenas de temporadas, números coerentes e aposentadoria opcional', () => {
  let retired = 0;
  for (let seed = 1; seed <= 8; seed++) {
    let state = newCareer(Object.keys(POSITIONS)[seed], seed * 3);
    const rnd = seeded(seed);
    for (let i = 0; i < 400 && state.status === 'active'; i++) {
      state = choose(state, rnd() < 0.5 ? 0 : 1);
      const { player } = state;
      assert.ok(player.fatigue >= 0 && player.fatigue <= 100);
      assert.ok(player.standing >= 0 && player.standing <= 4);
      assert.ok(player.overall >= 1 && player.overall <= 99);
      assert.ok(Object.values(player.bonds).every(value => value >= -3 && value <= 3));
      assert.equal(player.overall, calculateOverall(player.attributes, player.position));
      assert.ok(player.money >= 0);
    }
    assert.equal(state.player.seasons.length, state.season - 1);
    assert.equal(state.player.stats.matches, state.player.seasons.reduce((sum, item) => sum + item.played, 0));
    if (state.status === 'retired') { retired++; assert.ok(state.player.age >= 34); assert.equal(state.currentEventId, null); assert.throws(() => choose(state, 0), /Escolha inválida/); }
  }
  assert.ok(retired >= 4, 'jogadores devem chegar à aposentadoria por escolha');
});

test('nenhuma aposentadoria é obrigatória antes dos 34 anos', () => {
  const state = newCareer();
  state.player.age = 33;
  assert.equal(findEvent('retire_v1').eligible(state), false);
  state.player.age = 34;
  assert.equal(findEvent('retire_v1').eligible(state), true);
});

test('variedade: muitas cartas distintas e sem repetição imediata', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 16; seed++) {
    let state = newCareer(Object.keys(POSITIONS)[seed % 10], seed + 30), previous = null;
    const rnd = seeded(seed);
    for (let i = 0; i < 150 && state.status === 'active'; i++) {
      const id = state.currentEventId;
      assert.notEqual(id, previous);
      seen.add(id); previous = id;
      state = choose(state, rnd() < 0.5 ? 0 : 1);
    }
  }
  assert.ok(seen.size >= 60, `apenas ${seen.size} cartas diferentes`);
});

test('cartas de partida são raras (no máximo uma por temporada) e dependem de atributos', () => {
  for (let seed = 1; seed <= 10; seed++) {
    let state = newCareer(Object.keys(POSITIONS)[seed % 10], seed);
    const perSeason = {};
    for (let i = 0; i < 100 && state.status === 'active'; i++) {
      if (currentEvent(state).category === 'PARTIDA') perSeason[state.season] = (perSeason[state.season] ?? 0) + 1;
      state = choose(state, i % 2);
    }
    assert.ok(Object.values(perSeason).every(count => count <= 1), JSON.stringify(perSeason));
  }
  const goals = (finalizacao) => {
    let total = 0;
    for (let seed = 1; seed <= 200; seed++) {
      const state = newCareer('centroavante', 5);
      state.player.attributes.finalizacao = finalizacao; state.player.fatigue = 0;
      state.currentEventId = 'match_chance_v1'; state.randomState = seed * 104729;
      total += choose(state, 0).history.at(-1).changes.stats.goals ?? 0;
    }
    return total;
  };
  assert.ok(goals(90) > goals(40) + 20);
});

test('migração do formato 1 converte barras em vínculos sem perder histórico nem memória', () => {
  const old = newCareer();
  delete old.formatVersion; delete old.queue; delete old.context;
  old.player.relationships = { clube: 80, equipe: 20, treinador: 50, empresario: 65, torcida: 30, social: 90 };
  delete old.player.bonds; delete old.player.standing; delete old.player.contract; delete old.player.stats;
  delete old.player.people.rival; delete old.player.people.amigo;
  old.currentEventId = 'interview_credit_v1';
  old.memory = { promessa_treinador: 'feita', promessa_turno: 0 };
  old.history = [{ eventId: 'mentor_return_v1', category: 'VESTIÁRIO', text: 'snapshot antigo', choice: 'escolha antiga', choiceIndex: 0, changes: { relationships: { treinador: 5 } }, season: 1 }];
  const saved = JSON.parse(JSON.stringify({ format: 1, career: old }));
  const snapshot = structuredClone(saved);
  assert.equal(unpack(saved).format, 1);
  const upgraded = upgradeCareer(saved.career);
  assert.deepEqual(saved, snapshot, 'o salvamento original não pode ser alterado');
  assert.equal(upgraded.formatVersion, 2);
  assert.equal(upgraded.player.relationships, undefined);
  assert.equal(upgraded.player.bonds.clube, 2);
  assert.equal(upgraded.player.bonds.companheiro, -2);
  assert.equal(upgraded.player.bonds.treinador, 0);
  assert.equal(upgraded.player.bonds.familia, 2);
  assert.deepEqual(upgraded.history, old.history);
  assert.deepEqual(upgraded.memory, old.memory);
  assert.equal(upgraded.currentEventId, 'interview_credit_v1');
  assert.ok(upgraded.player.people.rival.id.endsWith(':person:rival'));
  assert.deepEqual(upgradeCareer(saved.career), upgraded, 'migração determinística');
  assert.deepEqual(migrateCareer(structuredClone(upgraded)), upgraded, 'migração idempotente');
  const next = choose(upgraded, 0);
  assert.equal(next.history[0].eventId, 'mentor_return_v1');
  assert.equal(next.history[1].eventId, 'interview_credit_v1');
  assert.equal(next.memory.ultima_entrevista, 'coletiva');
});

test('saves antigos com carta pendente removida ou crise recebem uma carta válida', () => {
  for (const id of ['crise_equipe_baixa_v1', 'carta_que_nao_existe']) {
    const old = newCareer();
    old.currentEventId = id;
    delete old.player.bonds;
    old.player.relationships = { clube: 50, equipe: 50, treinador: 50, empresario: 50, torcida: 50, social: 50 };
    const upgraded = upgradeCareer(old);
    assert.ok(findEvent(upgraded.currentEventId));
    assert.equal(currentEvent(upgraded).options.length, 2);
  }
});

test('arquivo de carreiras e livro de recordes', () => {
  let state = newCareer();
  state.player.age = 36;
  state.currentEventId = 'retire_v1';
  state = choose(state, 0);
  assert.equal(state.status, 'retired');
  const entry = archiveEntry(state);
  assert.equal(entry.world, undefined);
  assert.equal(entry.summary.name, 'Alex Silva');
  const other = structuredClone(entry.summary); other.id = 'outra'; other.stats.goals = 999; other.trophies = [1, 2, 3];
  const book = recordBook([entry.summary, other]);
  assert.equal(book.careers, 2);
  assert.equal(book.mostGoals.id, 'outra');
  assert.equal(book.mostTrophies.id, 'outra');
});

test('simular uma temporada não modifica o mundo da carreira anterior', () => {
  const career = newCareer();
  const before = JSON.stringify(career.world);
  const next = play(career, career.seasonProgress.target);
  assert.equal(JSON.stringify(career.world), before);
  assert.equal(next.season, 2);
  assert.equal(next.world.lastSeason.season, 1);
  assert.ok(next.lastSummary === null || typeof next.lastSummary === 'object');
});
