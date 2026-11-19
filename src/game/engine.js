import { RELATIONSHIPS } from './data.js';
import { EVENTS, findEvent, crisisEvent } from './events.js';
import { calculateOverall, createPlayer } from './player.js';
import { createWorld, simulateSeason } from './world.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function random(state) {
  state.randomState = (Math.imul(state.randomState, 1664525) + 1013904223) >>> 0;
  return state.randomState / 4294967296;
}

export function eventText(event, career) {
  const person = career.player.people[event.actor];
  const values = { ...(event.textValues?.(career) || {}), person: person.name, club: career.player.club.name, name: career.player.name };
  return event.text.replace(/\{([a-z_]+)\}/g, (placeholder, key) => Object.hasOwn(values, key) ? String(values[key]) : placeholder);
}

function nextEvent(career) {
  for (const key of Object.keys(RELATIONSHIPS)) {
    const value = career.player.relationships[key];
    if (value === 0 || value === 100) return crisisEvent(key, value === 100).id;
  }

  // lastSeen uses the history length *after* the previous choice, as in format 1.
  const eligible = EVENTS.filter(event => !event.eligible || event.eligible(career))
    .map(event => ({ event, weight: typeof event.weight === 'function' ? event.weight(career) : event.weight }))
    .filter(item => Number.isFinite(item.weight) && item.weight > 0);
  const ready = eligible.filter(({ event }) => career.lastSeen[event.id] === undefined ||
    career.history.length - career.lastSeen[event.id] >= (event.cooldown ?? 12));
  // If every eligible card is cooling down, choose the least recently seen.
  const oldest = Math.min(...eligible.map(({ event }) => career.lastSeen[event.id] ?? -Infinity));
  const weighted = ready.length ? ready : eligible.filter(({ event }) => (career.lastSeen[event.id] ?? -Infinity) === oldest);
  if (!weighted.length) throw new Error('Não há acontecimentos disponíveis para esta carreira.');
  // Waiting continuations gain weight to avoid getting stuck behind repeatable cards.
  const weights = weighted.map(item => {
    const { event, weight } = item;
    const since = event.waitingSince?.(career) ?? (event.id === 'mentor_return_v1' ? career.memory.promessa_turno + 4 : undefined);
    return { event, weight: Number.isInteger(since) ? weight + Math.max(0, career.history.length - since) * 4 : weight };
  });
  const total = weights.reduce((sum, item) => sum + item.weight, 0);
  let selection = random(career) * total;
  return (weights.find(item => (selection -= item.weight) < 0) || weights[weights.length - 1]).event.id;
}

export function createCareer(details, source = Math.random) {
  const player = createPlayer(details, source);
  const career = {
    id: crypto.randomUUID(), status: 'active', revision: 0,
    createdAt: new Date().toISOString(), season: 1, player,
    randomState: Math.floor(source() * 4294967296) || 1,
    history: [], memory: {}, lastSeen: {}, currentEventId: null,
  };
  career.world = createWorld(career);
  career.seasonProgress = { decisions: 0, target: 16 + Math.floor(random(career) * 9) };
  career.currentEventId = nextEvent(career);
  return career;
}

export function currentEvent(career) {
  const event = findEvent(career.currentEventId);
  if (!event) throw new Error('Este acontecimento não está disponível nesta versão do jogo.');
  return event;
}

export function choose(career, choiceIndex) {
  if (career.status !== 'active' || ![0, 1].includes(choiceIndex)) throw new Error('Escolha inválida.');
  const { world, ...careerData } = career;
  const updated = structuredClone(careerData);
  // Legacy history is not replayed; migration begins at the next decision.
  updated.memory ??= {};
  updated.lastSeen ??= {};
  updated.world = world ?? createWorld(updated);
  updated.seasonProgress ??= { decisions: 0, target: 16 + Math.floor(random(updated) * 9) };
  const event = currentEvent(updated);
  const text = eventText(event, updated);
  const choice = event.options[choiceIndex];
  const effects = choice.effects(updated);
  const changes = { relationships: {}, attributes: {}, money: 0, overall: 0 };
  for (const [key, delta] of Object.entries(effects.relationships || {})) {
    const before = updated.player.relationships[key];
    updated.player.relationships[key] = clamp(before + delta, 0, 100);
    changes.relationships[key] = updated.player.relationships[key] - before;
  }
  for (const [key, delta] of Object.entries(effects.attributes || {})) {
    const before = updated.player.attributes[key];
    updated.player.attributes[key] = clamp(before + delta, 1, 99);
    changes.attributes[key] = updated.player.attributes[key] - before;
  }
  const beforeMoney = updated.player.money;
  updated.player.money = Math.max(0, beforeMoney + (effects.money || 0));
  changes.money = updated.player.money - beforeMoney;
  const beforeOverall = updated.player.overall;
  updated.player.overall = calculateOverall(updated.player.attributes, updated.player.position);
  changes.overall = updated.player.overall - beforeOverall;
  Object.assign(updated.memory, effects.memory || {});
  updated.history.push({
    eventId: event.id, category: event.category, text,
    personId: updated.player.people[event.actor].id, personName: updated.player.people[event.actor].name,
    choice: choice.label, choiceIndex, changes, season: updated.season,
  });
  updated.lastSeen[event.id] = updated.history.length;
  updated.revision += 1;
  updated.seasonProgress.decisions++;
  if (updated.seasonProgress.decisions >= updated.seasonProgress.target) {
    updated.world = structuredClone(updated.world);
    simulateSeason(updated.world, updated.season);
    updated.season++;
    updated.player.age++;
    updated.seasonProgress = { decisions: 0, target: 16 + Math.floor(random(updated) * 9) };
  }
  updated.currentEventId = nextEvent(updated);
  return updated;
}
