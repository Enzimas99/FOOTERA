import { ATTRIBUTES, CLUB_COLORS, CLUB_PREFIXES, COUNTRIES, COUNTRY_DATA, ORIGINS, POSITIONS, RELATIONSHIPS, TRAITS } from './data.js';

const pick = (items, random) => items[Math.floor(random() * items.length)];
const integer = (min, max, random) => min + Math.floor(random() * (max - min + 1));
const id = () => crypto.randomUUID();

export function calculateOverall(attributes, position) {
  const weights = POSITIONS[position].weights;
  const total = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
  return Math.round(Object.entries(weights).reduce((sum, [key, weight]) => sum + attributes[key] * weight, 0) / total);
}

function weightedPick(items, random) {
  let value = random() * items.reduce((sum, item) => sum + item.weight, 0);
  return items.find(item => (value -= item.weight) < 0) || items[items.length - 1];
}

function createAttributes(position, random) {
  const target = integer(65, 72, random);
  const weights = POSITIONS[position].weights;
  const attributes = Object.fromEntries(Object.keys(ATTRIBUTES).map(key => {
    const specialized = key === 'reflexos' || key === 'defesa';
    const adjustment = weights[key] ? 0 : (specialized || position === 'goleiro' ? -17 : -8);
    return [key, Math.max(35, Math.min(90, target + adjustment + integer(-6, 6, random)))];
  }));
  const correction = target - calculateOverall(attributes, position);
  for (const key of Object.keys(weights)) attributes[key] = Math.max(1, Math.min(99, attributes[key] + correction));
  return attributes;
}

function createPerson(role, country, random, usedNames) {
  const data = COUNTRY_DATA[country];
  const names = data.names.flatMap(first => data.surnames.map(last => `${first} ${last}`));
  const name = pick(names.filter(candidate => !usedNames.has(candidate.toLocaleLowerCase('pt-BR'))), random);
  usedNames.add(name.toLocaleLowerCase('pt-BR'));
  return {
    id: id(), role, name,
    appearance: { skin: pick(['#c98763', '#9a6046', '#e0ac84', '#6d4638'], random), hair: pick(['#352b29', '#70462f', '#171b1b', '#b3784e'], random) },
  };
}

export function createPlayer({ name, nationality, position }, random = Math.random) {
  const cleanName = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ') : '';
  if (cleanName.length < 2 || cleanName.length > 40 || !COUNTRIES.includes(nationality) || !POSITIONS[position]) {
    throw new Error('Confira o nome, a nacionalidade e a posição.');
  }
  const age = integer(16, 22, random);
  const origin = weightedPick(ORIGINS.filter(item => !item.minAge || age >= item.minAge), random);
  const attributes = createAttributes(position, random);
  const overall = calculateOverall(attributes, position);
  const shuffledTraits = [...TRAITS];
  const traits = [];
  for (let i = 0; i < 2; i++) traits.push(shuffledTraits.splice(integer(0, shuffledTraits.length - 1, random), 1)[0]);
  const colors = pick(CLUB_COLORS, random);
  const club = {
    id: id(), name: `${pick(CLUB_PREFIXES, random)} ${pick(COUNTRY_DATA[nationality].towns, random)}`,
    country: nationality, colors,
  };
  const usedNames = new Set([cleanName.toLocaleLowerCase('pt-BR')]);
  const people = {
    treinador: createPerson('Treinador', nationality, random, usedNames),
    companheiro: createPerson('Companheiro', nationality, random, usedNames),
    empresario: createPerson('Empresário', nationality, random, usedNames),
    familia: createPerson('Familiar', nationality, random, usedNames),
    imprensa: createPerson('Jornalista', nationality, random, usedNames),
    torcida: createPerson('Torcedor', nationality, random, usedNames),
  };
  const relationships = Object.fromEntries(Object.keys(RELATIONSHIPS).map(key => [key, integer(44, 62, random)]));
  return {
    id: id(), name: cleanName, nationality, position, age,
    dominantFoot: pick(['Direito', 'Esquerdo'], random), height: integer(166, 197, random),
    attributes, overall, potential: Math.min(96, overall + integer(7, 20, random)),
    traits, origin: { id: origin.id, label: origin.label }, reputation: 'Em formação',
    money: integer(1800, 5000, random), relationships, club, people,
    appearance: { skin: pick(['#c98763', '#9a6046', '#e0ac84', '#6d4638'], random), hair: pick(['#352b29', '#70462f', '#171b1b', '#b3784e'], random) },
  };
}
