import { BONDS } from './data.js';
import { EVENTS, findEvent } from './events.js';
import { CAREER_FORMAT, migrateCareer } from './migrate.js';
import { calculateOverall, createPlayer } from './player.js';
import { progressPlayer, reevaluateStanding, seasonIncome, simulatePlayerSeason, standingAtClub } from './season.js';
import { createWorld, simulateSeason } from './world.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const SEASON_DECISIONS = { min: 7, max: 10 };

function random(state) {
  state.randomState = (Math.imul(state.randomState, 1664525) + 1013904223) >>> 0;
  return state.randomState / 4294967296;
}
const helpers = state => ({
  chance: probability => random(state) < clamp(probability, 0.03, 0.97),
  int: (min, max) => min + Math.floor(random(state) * (max - min + 1)),
});
const seasonTarget = state => SEASON_DECISIONS.min + Math.floor(random(state) * (SEASON_DECISIONS.max - SEASON_DECISIONS.min + 1));

export function fillText(text, event, career, extra = {}) {
  const person = career.player.people[event.actor] ?? { name: 'Alguém' };
  const values = { ...(event.textValues?.(career) || {}), ...extra, person: person.name, club: career.player.club.name, name: career.player.name };
  return String(text).replace(/\{([a-z_]+)\}/g, (placeholder, key) => (Object.hasOwn(values, key) && values[key] !== undefined ? String(values[key]) : placeholder));
}
export const eventText = (event, career) => fillText(event.text, event, career);

// ---------- Seleção de cartas ----------

const CATEGORY_MEMORY = 3;

function selectable(career) {
  const eligible = EVENTS.filter(event => !event.scheduledOnly && (!event.eligible || event.eligible(career)))
    .map(event => ({ event, weight: typeof event.weight === 'function' ? event.weight(career) : event.weight }))
    .filter(item => Number.isFinite(item.weight) && item.weight > 0);
  const ready = eligible.filter(({ event }) => career.lastSeen[event.id] === undefined || career.history.length - career.lastSeen[event.id] >= (event.cooldown ?? 12));
  const oldest = Math.min(...eligible.map(({ event }) => career.lastSeen[event.id] ?? -Infinity));
  return ready.length ? ready : eligible.filter(({ event }) => (career.lastSeen[event.id] ?? -Infinity) === oldest);
}

function setCurrent(career, event) {
  career.currentEventId = event.id;
  career.context = event.prepare ? { eventId: event.id, ...event.prepare(career, helpers(career)) } : null;
  return event.id;
}

function nextEvent(career) {
  // Consequências agendadas têm prioridade: o passado volta para cobrar a conta.
  career.queue = career.queue.filter(item => item.expires === undefined || item.expires > career.history.length);
  const due = career.queue.filter(item => item.due <= career.history.length)
    .map(item => ({ item, event: findEvent(item.id) })).filter(({ event }) => event && (!event.eligible || event.eligible(career)));
  if (due.length && random(career) < 0.85) {
    const [{ item, event }] = due;
    career.queue = career.queue.filter(entry => entry !== item);
    return setCurrent(career, event);
  }
  const weighted = selectable(career);
  if (!weighted.length) throw new Error('Não há acontecimentos disponíveis para esta carreira.');
  const recent = career.history.slice(-CATEGORY_MEMORY).map(entry => entry.category);
  const thisSeason = new Set(career.history.filter(entry => entry.season === career.season).map(entry => entry.category));
  const weights = weighted.map(({ event, weight }) => {
    const since = event.waitingSince?.(career);
    let value = Number.isInteger(since) ? weight + Math.max(0, career.history.length - since) * 4 : weight;
    // Variedade: categorias recentes perdem peso, categorias ainda não vistas na temporada ganham.
    value *= 0.4 ** recent.filter(category => category === event.category).length;
    if (!thisSeason.has(event.category)) value *= 1.25;
    return { event, weight: Math.max(0.01, value) };
  });
  const total = weights.reduce((sum, item) => sum + item.weight, 0);
  let selection = random(career) * total;
  const picked = (weights.find(item => (selection -= item.weight) < 0) || weights[weights.length - 1]).event;
  return setCurrent(career, picked);
}

// ---------- Criação e leitura ----------

export function createCareer(details, source = Math.random) {
  const player = createPlayer(details, source);
  const career = {
    id: crypto.randomUUID(), status: 'active', revision: 0, formatVersion: CAREER_FORMAT,
    createdAt: new Date().toISOString(), season: 1, player,
    randomState: Math.floor(source() * 4294967296) || 1,
    history: [], memory: {}, lastSeen: {}, queue: [], context: null, currentEventId: null,
  };
  career.world = createWorld(career);
  career.seasonProgress = { decisions: 0, target: seasonTarget(career), matchCards: 0 };
  nextEvent(career);
  return career;
}

export function currentEvent(career) {
  const event = findEvent(career.currentEventId);
  if (!event) throw new Error('Este acontecimento não está disponível nesta versão do jogo.');
  return event;
}

// Carrega qualquer salvamento (formato 1 ou 2) já no formato atual. Nunca altera o objeto recebido.
export function upgradeCareer(career) {
  const { world, ...data } = career;
  const upgraded = structuredClone(data);
  upgraded.world = world ?? createWorld(upgraded);
  migrateCareer(upgraded);
  upgraded.seasonProgress ??= { decisions: 0, target: seasonTarget(upgraded), matchCards: 0 };
  if (upgraded.status === 'active' && !findEvent(upgraded.currentEventId)) nextEvent(upgraded);
  return upgraded;
}

// ---------- Consequências ----------

const HINT_RULES = [
  ['dinheiro', effects => !!effects.money],
  ['fisico', effects => Math.abs(effects.fatigue || 0) >= 5 || !!effects.injury],
  ['tecnica', effects => Object.keys(effects.attributes || {}).length > 0 || !!effects.development || !!effects.focus],
  ['espaco', effects => !!effects.standing],
  ['imagem', effects => Math.abs(effects.fame || 0) >= 2 || !!effects.temper],
  ['relacao', effects => Object.values(effects.bonds || {}).some(Boolean)],
  ['carreira', effects => !!effects.transfer || !!effects.contract || !!effects.retire || !!effects.stats?.goals || !!effects.stats?.assists || !!effects.stats?.caps],
  ['futuro', effects => !!effects.echo || (effects.schedule?.length ?? 0) > 0],
];

// Mostra apenas categorias de consequência (nunca números). "risky" indica resultado incerto.
export function previewOptions(career, event) {
  const dry = mode => ({ chance: () => mode, int: min => min });
  return event.options.map(option => {
    const lucky = option.effects(career, dry(true)), unlucky = option.effects(career, dry(false));
    const hints = HINT_RULES.filter(([, test]) => test(lucky) || test(unlucky)).map(([key]) => key);
    const risky = JSON.stringify(lucky) !== JSON.stringify(unlucky);
    return { hints, risky };
  });
}

function applyEffects(state, effects) {
  const player = state.player;
  const changes = { attributes: {}, bonds: {}, money: 0, overall: 0, standing: 0, fatigue: 0, fame: 0, temper: 0, injury: null, transfer: null, stats: {} };
  // O potencial é um teto: perto dele, e com a idade, treinar rende bem menos.
  const gainFactor = (player.overall >= player.potential ? 0 : player.overall >= player.potential - 3 ? 0.5 : 1) * (player.age >= 31 ? 0.5 : 1);
  for (const [key, rawDelta] of Object.entries(effects.attributes || {})) {
    const delta = rawDelta > 0 ? Math.floor(rawDelta * gainFactor + 1e-9) : rawDelta;
    const before = player.attributes[key];
    player.attributes[key] = clamp(before + delta, 1, 99);
    changes.attributes[key] = player.attributes[key] - before;
  }
  for (const [key, delta] of Object.entries(effects.bonds || {})) {
    if (!(key in BONDS)) continue;
    const before = player.bonds[key] ?? 0;
    player.bonds[key] = clamp(before + delta, -3, 3);
    changes.bonds[key] = player.bonds[key] - before;
  }
  const beforeMoney = player.money;
  player.money = Math.max(0, beforeMoney + (effects.money || 0));
  changes.money = player.money - beforeMoney;
  const step = (key, min, max) => {
    const before = player[key];
    player[key] = clamp(before + (effects[key] || 0), min, max);
    changes[key] = player[key] - before;
  };
  step('standing', state.season === 1 ? 1 : 0, 4); step('fatigue', 0, 100); step('fame', 0, 100); step('temper', -5, 5);
  if (effects.development) player.development = (player.development ?? 0) + effects.development;
  if (effects.focus) player.focus = effects.focus;
  if (effects.injury) {
    if (effects.injury.label) {
      player.injury = { label: effects.injury.label, games: Math.max(player.injury?.games ?? 0, effects.injury.games) };
      changes.injury = effects.injury.label;
    } else if (player.injury || effects.injury.heal < 0) {
      player.injury ??= { label: 'Recaída', games: 0 };
      player.injury.games = Math.max(0, player.injury.games - effects.injury.heal);
      if (player.injury.games === 0) player.injury = null;
    }
  }
  if (effects.stats) {
    player.seasonExtras ??= { goals: 0, assists: 0, yellow: 0, red: 0, caps: 0 };
    for (const [key, value] of Object.entries(effects.stats)) { player.seasonExtras[key] = (player.seasonExtras[key] ?? 0) + value; changes.stats[key] = value; }
  }
  if (effects.contract) {
    player.contract = { salary: Math.round(player.contract.salary * (effects.contract.raise ?? 1) / 100) * 100, until: Math.max(player.contract.until, state.season) + effects.contract.years };
  }
  if (effects.transfer) {
    const club = state.world.clubs[effects.transfer.clubId];
    const previous = player.club;
    const last = player.clubHistory.at(-1);
    if (last) last.toSeason = state.season;
    player.club = { id: club.id, name: club.name, country: club.country, colors: structuredClone(club.colors) };
    player.clubHistory.push({ clubId: club.id, name: club.name, country: club.country, fromSeason: state.season, toSeason: null });
    player.contract = { salary: effects.transfer.salary, until: state.season + effects.transfer.years - 1 };
    player.standing = standingAtClub(player, club);
    // Novo vestiário: relações locais recomeçam; pessoas de fora do clube permanecem.
    for (const key of ['treinador', 'companheiro', 'clube', 'torcida']) player.bonds[key] = 0;
    state.memory.ultima_transferencia = state.season;
    changes.transfer = { from: previous.name, to: club.name };
  }
  Object.assign(state.memory, effects.memory || {});
  for (const item of effects.schedule || []) {
    const due = state.history.length + 1 + (item.after ?? 0);
    state.queue.push({ id: item.id, due, expires: due + 14 });
  }
  if (effects.matchCard) state.seasonProgress.matchCards = (state.seasonProgress.matchCards ?? 0) + 1;
  // O calendário cobra: cada decisão da temporada soma um pouco de desgaste.
  player.fatigue = clamp(player.fatigue + 3, 0, 100);
  const beforeOverall = player.overall;
  player.overall = calculateOverall(player.attributes, player.position);
  changes.overall = player.overall - beforeOverall;
  return changes;
}

// ---------- Virada de temporada ----------

function endSeason(state) {
  state.world = structuredClone(state.world);
  simulateSeason(state.world, state.season);
  const player = state.player;
  const summary = simulatePlayerSeason(state, () => random(state));
  const extras = player.seasonExtras ?? { goals: 0, assists: 0, yellow: 0, red: 0, caps: 0 };
  summary.goals += extras.goals; summary.assists += extras.assists; summary.yellow += extras.yellow; summary.red += extras.red;
  summary.caps = extras.caps;
  player.seasonExtras = null;
  const club = state.world.clubs[player.club.id];
  summary.income = seasonIncome(player);
  player.money += summary.income;
  summary.progress = progressPlayer(player, summary, () => random(state));
  summary.standingBefore = player.standing;
  player.standing = reevaluateStanding(player, club, summary, () => random(state));
  summary.standingAfter = player.standing;
  player.stats.matches += summary.played; player.stats.goals += summary.goals; player.stats.assists += summary.assists;
  player.stats.yellow += summary.yellow; player.stats.red += summary.red; player.stats.ratingSum += summary.averageRating * summary.played;
  player.stats.caps = (player.stats.caps ?? 0) + summary.caps;
  player.trophies.push(...summary.titles.map(title => ({ ...title, club: player.club.name })));
  player.awards.push(...summary.awards);
  const form = Math.round((summary.averageRating - 6.4) * 5) + summary.titles.length * 5 + Math.floor(summary.goals / 5);
  player.fame = clamp(player.fame + (summary.played ? form : -2), 0, 100);
  player.fatigue = Math.round(player.fatigue * 0.4);
  if (player.injury) { player.injury.games = Math.max(0, player.injury.games - 38); if (!player.injury.games) player.injury = null; }
  player.temper = Math.trunc(player.temper * 0.7);
  player.seasons.push(summary);
  player.age++;
  state.season++;
  state.lastSummary = summary;
  state.seasonProgress = { decisions: 0, target: seasonTarget(state), matchCards: 0 };
  return summary;
}

export function choose(career, choiceIndex) {
  if (career.status !== 'active' || ![0, 1].includes(choiceIndex)) throw new Error('Escolha inválida.');
  const { world, ...careerData } = career;
  const updated = structuredClone(careerData);
  updated.world = world ?? createWorld(updated);
  migrateCareer(updated);
  updated.seasonProgress ??= { decisions: 0, target: seasonTarget(updated), matchCards: 0 };
  const event = currentEvent(updated);
  const text = eventText(event, updated);
  const choice = event.options[choiceIndex];
  const effects = choice.effects(updated, helpers(updated));
  const outcome = effects.outcome ? fillText(effects.outcome, event, updated) : '';
  const changes = applyEffects(updated, effects);
  const person = updated.player.people[event.actor];
  updated.history.push({
    eventId: event.id, category: event.category, text, personId: person.id, personName: person.name,
    choice: choice.label, choiceIndex, outcome, changes, season: updated.season,
  });
  updated.lastSeen[event.id] = updated.history.length;
  updated.revision += 1;
  updated.lastSummary = null;
  updated.context = null;

  if (effects.retire) {
    updated.status = 'retired';
    updated.retirement = { season: updated.season, age: updated.player.age, text: outcome };
    updated.currentEventId = null;
    return updated;
  }
  updated.seasonProgress.decisions++;
  if (updated.seasonProgress.decisions >= updated.seasonProgress.target) endSeason(updated);
  nextEvent(updated);
  return updated;
}

// ---------- Leitura para a interface ----------

export function careerNumbers(career) {
  const { stats } = career.player;
  return { ...stats, average: stats.matches ? Math.round(stats.ratingSum / stats.matches * 100) / 100 : 0, seasons: career.player.seasons.length };
}
