import test from 'node:test';
import assert from 'node:assert/strict';
import { ATTRIBUTES, COUNTRIES, COUNTRY_DATA, POSITIONS } from '../src/game/data.js';
import { calculateOverall } from '../src/game/player.js';
import { choose, createCareer, currentEvent, eventText } from '../src/game/engine.js';
import { findEvent } from '../src/game/events.js';
import { createSchedule, getWorldOverview, selectContinentalQualifiers, simulateCup, simulateSeason } from '../src/game/world.js';

const seeded = seed => () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
const career = (seed = 91) => createCareer({ name: 'Alex Silva', nationality: 'Brasil', position: 'centroavante' }, seeded(seed));

test('mundo inicial possui países, divisões, clubes e jogadores com IDs estáveis', () => {
  const state = career(), world = state.world;
  assert.equal(world.divisions.length, 12);
  assert.equal(Object.keys(world.clubs).length, 240);
  assert.equal(new Set(world.divisions.flatMap(d => d.clubIds)).size, 240);
  for (const country of COUNTRIES) {
    const divisions = world.divisions.filter(d => d.country === country);
    assert.deepEqual(divisions.map(d => d.level), [1, 2]);
    assert.ok(divisions.every(d => d.clubIds.length === 20));
  }
  assert.deepEqual(Object.fromEntries(Object.entries(state.player.club)), Object.fromEntries(Object.keys(state.player.club).map(k => [k, world.clubs[state.player.club.id][k]])));
  const players = Object.values(world.clubs).flatMap(club => club.squad);
  assert.equal(players.length, 240 * 18);
  assert.equal(new Set(players.map(player => player.id)).size, players.length);
  assert.ok(players.every(player => player.age >= 17 && player.age <= 34 && player.overall === calculateOverall(player.attributes, player.position)));
  for (const club of Object.values(world.clubs)) {
    assert.ok(club.squad.filter(player => player.nationality === club.country).length > 0);
    assert.ok(club.academy && club.reputation && club.formation && club.finances && club.history && club.titles);
    assert.equal(club.strength, Math.round(club.squad.reduce((sum, p) => sum + p.overall, 0) / club.squad.length * 100) / 100);
    for (const player of club.squad) {
      assert.equal(player.clubId, club.id);
      assert.ok(POSITIONS[player.position] && player.traits.length && player.condition && player.history);
      assert.deepEqual(Object.keys(player.attributes), Object.keys(ATTRIBUTES));
      const [first, last] = player.name.split(' ');
      assert.ok(COUNTRY_DATA[player.nationality].names.includes(first));
      assert.ok(COUNTRY_DATA[player.nationality].surnames.includes(last));
    }
  }
  assert.ok(players.filter(p => p.nationality === world.clubs[p.clubId].country).length > players.length * 0.7);
  assert.ok(players.some(p => p.nationality !== world.clubs[p.clubId].country));
  assert.equal(getWorldOverview(state).divisions.length, 12);
  assert.equal(getWorldOverview(state).lastSeason, null);
});

test('calendário possui turno e returno com 38 partidas para cada clube', () => {
  const ids = Array.from({ length: 20 }, (_, i) => String(i));
  const rounds = createSchedule(ids);
  assert.equal(rounds.length, 38);
  const fixtures = rounds.flat();
  assert.equal(fixtures.length, 380);
  for (const round of rounds) assert.equal(new Set(round.flatMap(m => [m.home, m.away])).size, 20);
  for (const a of ids) for (const b of ids) if (a !== b) {
    assert.equal(fixtures.filter(m => m.home === a && m.away === b).length, 1);
  }
  assert.throws(() => createSchedule(ids.slice(1)), /20 clubes/);
});

test('ligas, copas, vagas e acesso refletem resultados e preservam identidades', () => {
  const state = career(), world = state.world;
  const oldDivisions = structuredClone(world.divisions);
  const ids = Object.keys(world.clubs);
  const result = simulateSeason(world, 1);
  assert.equal(result.leagues.length, 12);
  for (const league of result.leagues) {
    assert.equal(league.rounds.length, 38);
    assert.equal(league.standings.length, 20);
    for (const row of league.standings) {
      assert.equal(row.played, 38);
      assert.equal(row.wins + row.draws + row.losses, 38);
      assert.equal(row.points, row.wins * 3 + row.draws);
      assert.equal(row.goalDifference, row.goalsFor - row.goalsAgainst);
      const matches = league.rounds.flat().filter(m => m.home === row.clubId || m.away === row.clubId);
      assert.equal(row.goalsFor, matches.reduce((sum, m) => sum + (m.home === row.clubId ? m.homeGoals : m.awayGoals), 0));
    }
    assert.equal(league.standings.reduce((n, r) => n + r.wins, 0), league.standings.reduce((n, r) => n + r.losses, 0));
    assert.ok(league.standings.every((row, i, arr) => !i || arr[i - 1].points >= row.points));
  }
  for (const cup of result.nationalCups) {
    assert.equal(cup.entrants.length, 40);
    assert.equal(cup.rounds.flatMap(r => r.matches).length, 39);
    assert.ok(cup.entrants.includes(cup.champion));
    assert.equal(cup.rounds.at(-1).matches[0].winner, cup.champion);
    for (const round of cup.rounds) for (const match of round.matches) {
      assert.ok([match.home, match.away].includes(match.winner));
      assert.equal(match.decidedByPenalties, match.homeGoals === match.awayGoals);
      if (!match.decidedByPenalties) assert.equal(match.winner, match.homeGoals > match.awayGoals ? match.home : match.away);
    }
  }
  for (const move of result.movement) {
    const first = result.leagues.find(l => l.country === move.country && l.level === 1);
    const second = result.leagues.find(l => l.country === move.country && l.level === 2);
    assert.deepEqual(move.relegated, first.standings.slice(-3).map(r => r.clubId));
    assert.deepEqual(move.promoted, second.standings.slice(0, 3).map(r => r.clubId));
    assert.ok(move.promoted.every(id => world.clubs[id].divisionId === first.divisionId));
    assert.ok(move.relegated.every(id => world.clubs[id].divisionId === second.divisionId));
  }
  assert.equal(result.qualification.sulAmericana.length, 8);
  assert.equal(result.qualification.europeia.length, 16);
  assert.deepEqual(result.qualification, selectContinentalQualifiers(result.leagues, result.nationalCups));
  for (const country of COUNTRIES) {
    const qualifiers = country === 'Brasil' || country === 'Argentina' ? result.qualification.sulAmericana : result.qualification.europeia;
    const countryIds = qualifiers.filter(id => world.clubs[id].country === country);
    assert.equal(new Set(countryIds).size, 4);
    assert.ok(countryIds.includes(result.nationalCups.find(c => c.name === `Copa ${country}`).champion));
  }
  assert.equal(result.continentalCups.length, 0);
  assert.deepEqual(Object.keys(world.clubs), ids);
  assert.ok(world.divisions.every(d => d.clubIds.length === 20));
  assert.equal(new Set(world.divisions.flatMap(d => d.clubIds)).size, 240);
  assert.notDeepEqual(world.divisions, oldDivisions);
  const firstQualifiers = structuredClone(result.qualification);
  const second = simulateSeason(world, 2);
  assert.deepEqual(new Set(second.continentalCups.find(c => c.name === 'Sul-Americana').entrants), new Set(firstQualifiers.sulAmericana));
  assert.deepEqual(new Set(second.continentalCups.find(c => c.name === 'Europeia').entrants), new Set(firstQualifiers.europeia));
  assert.equal(world.champions.length, 2);
});

test('elencos envelhecem, podem superar potencial e repõem aposentados sem reutilizar IDs', () => {
  const world = career().world;
  const club = Object.values(world.clubs)[0];
  for (const other of Object.values(world.clubs)) other.squad[0].age = 36;
  club.squad[1].age = 20;
  club.squad[1].potential = 1;
  const survivor = structuredClone(club.squad[1]);
  simulateSeason(world, 1);
  assert.equal(club.squad.length, 18);
  const aged = club.squad.find(p => p.id === survivor.id);
  assert.equal(aged.age, 21);
  assert.ok(aged.overall >= survivor.overall && aged.overall > aged.potential);
  assert.equal(aged.overall, calculateOverall(aged.attributes, aged.position));
  const all37 = Object.values(world.clubs).flatMap(c => c.squad).filter(p => p.age === 37);
  assert.ok(all37.length > 0);
  for (let i = 2; i <= 8; i++) simulateSeason(world, i);
  const all = Object.values(world.clubs).flatMap(c => c.squad);
  assert.equal(new Set(all.map(p => p.id)).size, all.length);
  assert.ok(all.every(p => p.overall === calculateOverall(p.attributes, p.position)));
  assert.ok(Object.values(world.clubs).some(c => c.nextPlayerSerial > 18));
});

test('jogadores aposentados e suas temporadas permanecem no histórico do mundo', () => {
  const world = career().world;
  const oldIds = new Set();
  for (const club of Object.values(world.clubs)) {
    const player = club.squad[0];
    player.age = 100;
    player.history.push({ season: 0, clubId: club.id, age: 99, overall: player.overall });
    oldIds.add(player.id);
  }
  simulateSeason(world, 1);
  const forcedRetirees = world.retiredPlayers.filter(player => oldIds.has(player.id));
  assert.ok(forcedRetirees.length > 100);
  const activeIds = new Set(Object.values(world.clubs).flatMap(club => club.squad.map(player => player.id)));
  for (const player of world.retiredPlayers) {
    assert.ok(!activeIds.has(player.id));
    assert.equal(player.retiredSeason, 1);
    assert.deepEqual(player.history.at(-1), { season: 1, clubId: player.clubId, age: player.age, overall: player.overall });
  }
  assert.ok(forcedRetirees.every(player => player.history[0].season === 0));
  simulateSeason(world, 2);
  assert.ok(Object.values(world.clubs).some(club => club.squad.some(player => player.history.length === 2)));
});

test('vagas incluem campeão da segunda divisão e não duplicam campeão entre os primeiros', () => {
  const leagues = COUNTRIES.map(country => ({ country, level: 1, standings: Array.from({ length: 20 }, (_, i) => ({ clubId: `${country}:${i}` })) }));
  const cups = COUNTRIES.map(country => ({ name: `Copa ${country}`, champion: `${country}:0` }));
  cups[0].champion = 'Brasil:segunda';
  const selected = selectContinentalQualifiers(leagues, cups);
  assert.deepEqual(selected.sulAmericana.slice(0, 4), ['Brasil:segunda', 'Brasil:0', 'Brasil:1', 'Brasil:2']);
  assert.deepEqual(selected.sulAmericana.slice(4), ['Argentina:0', 'Argentina:1', 'Argentina:2', 'Argentina:3']);
  assert.equal(new Set(selected.europeia).size, 16);
});

test('histórico, títulos, finanças e força acompanham as temporadas', () => {
  const world = career().world;
  const initial = Object.fromEntries(Object.values(world.clubs).map(c => [c.id, c.finances.balance]));
  const result = simulateSeason(world, 1);
  for (const league of result.leagues) {
    league.standings.forEach((row, i) => {
      const club = world.clubs[row.clubId];
      assert.equal(club.history[0].position, i + 1);
      assert.equal(club.finances.balance, initial[club.id] + club.finances.lastIncome - club.finances.lastExpenses);
      assert.equal(club.strength, Math.round(club.squad.reduce((sum, p) => sum + p.overall, 0) / club.squad.length * 100) / 100);
    });
    assert.ok(world.clubs[league.standings[0].clubId].titles.some(t => t.name === league.divisionId));
  }
  for (const cup of result.nationalCups) assert.ok(world.clubs[cup.champion].titles.some(t => t.name === cup.name));
  const clubs = { a: { strength: 99, squad: [{ overall: 50 }] }, b: { strength: 1, squad: [{ overall: 50 }] } };
  const strong = Array.from({ length: 100 }, (_, i) => simulateCup('teste', ['a', 'b'], clubs, seeded(i + 100)).champion).filter(id => id === 'a').length;
  assert.ok(strong > 70);
});

test('qualidade da formação influencia os jovens promovidos', () => {
  const world = career().world;
  const clubs = Object.values(world.clubs);
  clubs.forEach((club, index) => {
    club.academy = index < 120 ? 20 : 90;
    club.squad[0].age = 100;
  });
  simulateSeason(world, 1);
  const average = group => {
    const promoted = group.flatMap(c => c.squad.filter(p => p.id.endsWith(':player:18')));
    assert.ok(promoted.length > 60);
    return promoted.reduce((sum, p) => sum + p.overall, 0) / promoted.length;
  };
  assert.ok(average(clubs.slice(120)) > average(clubs.slice(0, 120)) + 15);
});

test('mundo antigo é enriquecido deterministicamente sem alterar identidades', () => {
  const world = career().world;
  for (const club of Object.values(world.clubs)) {
    delete club.academy; delete club.reputation; delete club.formation; delete club.finances; delete club.history; delete club.titles; delete club.strength;
    for (const p of club.squad) {
      delete p.nationality; delete p.attributes; delete p.traits; delete p.clubId; delete p.condition; delete p.history;
    }
  }
  const original = JSON.parse(JSON.stringify(world));
  const copy = JSON.parse(JSON.stringify(world));
  simulateSeason(world, 1); simulateSeason(copy, 1);
  assert.deepEqual(world, copy);
  for (const club of Object.values(world.clubs)) {
    assert.equal(club.name, original.clubs[club.id].name);
    assert.deepEqual(club.colors, original.clubs[club.id].colors);
    assert.ok(club.squad.every(p => p.clubId === club.id && p.overall === calculateOverall(p.attributes, p.position)));
  }
});

test('virada é determinística, variável e soma exatamente um ano', () => {
  let state = career();
  const age = state.player.age;
  const target = state.seasonProgress.target;
  for (let i = 0; i < target - 1; i++) state = choose(state, i % 2);
  assert.equal(state.season, 1);
  assert.equal(state.player.age, age);
  const snapshot = JSON.parse(JSON.stringify(state));
  const a = choose(state, 0), b = choose(snapshot, 0);
  assert.deepEqual(a, b);
  assert.equal(a.season, 2);
  assert.equal(a.player.age, age + 1);
  assert.equal(a.world.lastSeason.season, 1);
  assert.equal(a.seasonProgress.decisions, 0);
  assert.ok(a.seasonProgress.target >= 16 && a.seasonProgress.target <= 24);
  assert.ok(new Set(Array.from({ length: 12 }, (_, i) => career(i + 1).seasonProgress.target)).size > 1);
  const overview = getWorldOverview(a);
  assert.equal(overview.lastSeason, 1);
  assert.equal(overview.nationalChampions.length, 6);
  assert.equal(overview.continentalChampions.length, 0);
  assert.ok(overview.divisions.every(d => d.clubs.length === 20 && d.table.length === 20));
  overview.divisions[0].clubs[0].name = 'alterado';
  assert.notEqual(a.world.clubs[overview.divisions[0].clubs[0].id].name, 'alterado');
});

test('migração de formato 1 preserva estado, evento pendente e não reprocessa escolhas', () => {
  const old = career();
  delete old.world; delete old.seasonProgress;
  old.season = 7; old.player.age = 27; old.revision = 80;
  old.history = Array.from({ length: 80 }, (_, i) => ({ eventId: 'antigo', season: 1, choiceIndex: i % 2 }));
  old.memory = { promessa_treinador: 'feita', promessa_turno: 1 };
  old.currentEventId = 'team_dinner_v1';
  const copy = structuredClone(old);
  assert.equal(getWorldOverview(old), null);
  assert.equal(currentEvent(old).id, 'team_dinner_v1');
  const a = choose(old, 0), b = choose(JSON.parse(JSON.stringify(old)), 0);
  assert.deepEqual(a, b);
  assert.deepEqual(old, copy);
  assert.equal(a.season, 7);
  assert.equal(a.player.age, 27);
  assert.equal(a.seasonProgress.decisions, 1);
  assert.equal(a.revision, 81);
  assert.deepEqual(a.history.slice(0, 80), old.history);
  assert.equal(a.history.at(-1).eventId, 'team_dinner_v1');
  assert.deepEqual(a.player.club, old.player.club);
  assert.equal(a.world.clubs[old.player.club.id].name, old.player.club.name);
  assert.equal(a.memory.promessa_turno, 1);
});

test('eventos contextuais usam classificação e vagas efetivamente simuladas', () => {
  const state = career();
  simulateSeason(state.world, 1);
  const league = findEvent('world_league_review_v3');
  assert.ok(league.eligible(state));
  const row = state.world.lastSeason.leagues.flatMap(l => l.standings).find(r => r.clubId === state.player.club.id);
  assert.ok(eventText(league, state).includes(`${row.points} pontos`));
  const continental = findEvent('world_continental_qualification_v3');
  assert.equal(continental.eligible(state), state.world.qualification.sulAmericana.includes(state.player.club.id));
  if (continental.eligible(state)) assert.match(eventText(continental, state), /Sul-Americana/);
  state.world.qualification.sulAmericana = [state.player.club.id];
  state.world.lastSeason.nationalCups[0].champion = state.player.club.id;
  assert.match(eventText(continental, state), /título da copa nacional/);
});
