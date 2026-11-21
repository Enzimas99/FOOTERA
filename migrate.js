import { BONDS, COUNTRY_DATA } from './data.js';
import { startingSalary } from './player.js';

export const CAREER_FORMAT = 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function generator(seed) {
  let state = seed >>> 0 || 1;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
}
function hash(text) {
  let value = 2166136261;
  for (const character of String(text)) value = Math.imul(value ^ character.charCodeAt(0), 16777619) >>> 0;
  return value;
}

function legacyPerson(role, key, career, used, random) {
  const data = COUNTRY_DATA[career.player.nationality] ?? COUNTRY_DATA.Brasil;
  const names = data.names.flatMap(first => data.surnames.map(last => `${first} ${last}`)).filter(name => !used.has(name.toLocaleLowerCase('pt-BR')));
  const name = names[Math.floor(random() * names.length)] ?? `${role} ${key}`;
  used.add(name.toLocaleLowerCase('pt-BR'));
  const skins = ['#c98763', '#9a6046', '#e0ac84', '#6d4638'], hairs = ['#352b29', '#70462f', '#171b1b', '#b3784e'];
  return { id: `${career.id}:person:${key}`, role, name, appearance: { skin: skins[Math.floor(random() * 4)], hair: hairs[Math.floor(random() * 4)] } };
}

// Converte uma barra antiga (0-100) em um nível interno de confiança (-3 a +3).
const toBond = value => clamp(Math.round((Number(value ?? 50) - 50) / 17), -3, 3);

// Idempotente: formato 1 -> 2 sem apagar histórico, memória, mundo ou identidade dos personagens.
export function migrateCareer(career) {
  const { player } = career;
  if (career.formatVersion === CAREER_FORMAT && player.bonds) return career;
  const old = player.relationships ?? {};
  player.bonds ??= {
    ...Object.fromEntries(Object.keys(BONDS).map(key => [key, 0])),
    clube: toBond(old.clube), companheiro: toBond(old.equipe), treinador: toBond(old.treinador),
    empresario: toBond(old.empresario), torcida: toBond(old.torcida), familia: toBond(old.social), amigo: Math.max(0, toBond(old.social)),
  };
  delete player.relationships;
  const random = generator(hash(`${career.id}:${career.randomState ?? 1}`));
  const used = new Set([player.name, ...Object.values(player.people).map(person => person.name)].map(name => name.toLocaleLowerCase('pt-BR')));
  if (!player.people.rival) player.people.rival = legacyPerson('Rival', 'rival', career, used, random);
  if (!player.people.amigo) player.people.amigo = legacyPerson('Amigo', 'amigo', career, used, random);
  player.standing ??= player.overall >= 70 ? 2 : 1;
  player.fatigue ??= 15;
  player.fame ??= clamp(6 + ((career.season ?? 1) - 1) * 4, 0, 100);
  player.temper ??= 0;
  player.injury ??= null;
  player.contract ??= { salary: startingSalary(player.overall), until: (career.season ?? 1) + 2 };
  player.clubHistory ??= [{ clubId: player.club.id, name: player.club.name, country: player.club.country, fromSeason: 1, toSeason: null }];
  player.stats ??= { matches: 0, goals: 0, assists: 0, yellow: 0, red: 0, ratingSum: 0 };
  player.trophies ??= [];
  player.awards ??= [];
  player.seasons ??= [];
  career.queue ??= [];
  career.context ??= null;
  career.memory ??= {};
  career.lastSeen ??= {};
  if (career.seasonProgress) {
    career.seasonProgress.matchCards ??= 0;
    // Temporadas antigas pediam 16 a 24 decisões; a nova duração fica entre 7 e 10.
    if (career.seasonProgress.target > 10) career.seasonProgress.target = clamp(Math.round(career.seasonProgress.target * 0.45), 7, 10);
  }
  career.formatVersion = CAREER_FORMAT;
  return career;
}
