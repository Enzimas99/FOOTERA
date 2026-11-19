import { ATTRIBUTES, COUNTRIES, COUNTRY_DATA, CLUB_COLORS, POSITIONS, TRAITS } from './data.js';
import { calculateOverall } from './player.js';

const SOUTH = COUNTRIES.slice(0, 2);
const EUROPE = COUNTRIES.slice(2);
const POSITIONS_LIST = Object.keys(POSITIONS);
const SQUAD_SIZE = 18;

function generator(seed) {
  let state = seed >>> 0 || 1;
  return () => ((state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296);
}
const int = (random, min, max) => min + Math.floor(random() * (max - min + 1));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const ATTRIBUTE_KEYS = Object.keys(ATTRIBUTES);
const FOREIGN_COUNTRIES = Object.fromEntries(COUNTRIES.map(country => [country, COUNTRIES.filter(other => other !== country)]));

function makeAttributes(position, target, random) {
  const weights = POSITIONS[position].weights;
  const attributes = Object.fromEntries(ATTRIBUTE_KEYS.map(key => {
    const adjustment = weights[key] ? 0 : (position === 'goleiro' || key === 'reflexos' || key === 'defesa' ? -17 : -8);
    return [key, clamp(target + adjustment + int(random, -5, 5), 1, 99)];
  }));
  const correction = target - calculateOverall(attributes, position);
  for (const key of Object.keys(weights)) attributes[key] = clamp(attributes[key] + correction, 1, 99);
  return attributes;
}

function makePlayer(club, serial, random, age = int(random, 17, 34), academy = false) {
  const nationality = random() < 0.8 ? club.country : FOREIGN_COUNTRIES[club.country][int(random, 0, COUNTRIES.length - 2)];
  const data = COUNTRY_DATA[nationality];
  const position = POSITIONS_LIST[serial % POSITIONS_LIST.length];
  const target = academy ? clamp(38 + Math.round(club.academy / 3) + int(random, -4, 4), 35, 85) : int(random, 49, 76);
  const attributes = makeAttributes(position, target, random);
  const overall = calculateOverall(attributes, position);
  const firstTrait = int(random, 0, TRAITS.length - 1);
  const secondTrait = (firstTrait + int(random, 1, TRAITS.length - 1)) % TRAITS.length;
  return {
    id: `${club.id}:player:${serial}`, name: `${data.names[int(random, 0, data.names.length - 1)]} ${data.surnames[int(random, 0, data.surnames.length - 1)]}`,
    nationality, position, age, attributes, overall, potential: clamp(overall + int(random, 2, 16), 1, 99),
    traits: [TRAITS[firstTrait], TRAITS[secondTrait]], clubId: club.id,
    condition: { fitness: 100, morale: 70 }, history: [],
  };
}

function squadStrength(club) {
  return club.squad.length ? Math.round(club.squad.reduce((sum, player) => sum + player.overall, 0) / club.squad.length * 100) / 100 : 50;
}

// Fill missing fields only when an old world reaches a season boundary.
function prepareWorld(world, random) {
  world.qualification ??= { sulAmericana: [], europeia: [] };
  world.qualification.sulAmericana ??= [];
  world.qualification.europeia ??= [];
  world.champions ??= [];
  world.retiredPlayers ??= [];
  for (const club of Object.values(world.clubs)) {
    club.academy ??= 50;
    club.reputation ??= 50;
    club.formation ??= '4-3-3';
    club.finances ??= { balance: 10000000, lastIncome: 0, lastExpenses: 0 };
    club.history ??= [];
    club.titles ??= [];
    let nextSerial = club.nextPlayerSerial ?? 0;
    for (const player of club.squad) {
      const prefix = `${club.id}:player:`;
      if (player.id?.startsWith(prefix)) {
        const serial = Number(player.id.slice(prefix.length));
        if (Number.isSafeInteger(serial) && serial >= 0) nextSerial = Math.max(nextSerial, serial + 1);
      }
      player.nationality ??= club.country;
      player.attributes ??= makeAttributes(player.position, player.overall, random);
      player.overall = calculateOverall(player.attributes, player.position);
      player.potential ??= player.overall;
      player.traits ??= ['Determinado'];
      player.clubId ??= club.id;
      player.condition ??= { fitness: 100, morale: 70 };
      player.history ??= [];
    }
    club.nextPlayerSerial = nextSerial;
    club.strength = squadStrength(club);
  }
}

// The world has its own stream, derived solely from the saved narrative RNG.
export function createWorld(career) {
  const random = generator((career.randomState ^ 0x9e3779b9) >>> 0);
  const clubs = {};
  const divisions = [];
  for (const country of COUNTRIES) {
    for (let level = 1; level <= 2; level++) {
      const division = { id: `${COUNTRIES.indexOf(country)}:${level}`, country, level, clubIds: [] };
      for (let index = 0; index < 20; index++) {
        const isPlayerClub = country === career.player.club.country && level === 1 && index === 0;
        const id = isPlayerClub ? career.player.club.id : `world:club:${COUNTRIES.indexOf(country)}:${level}:${index}`;
        const club = isPlayerClub
          ? { ...structuredClone(career.player.club), divisionId: division.id }
          : { id, name: `${['União', 'Estrela', 'Atlético', 'Esportivo', 'Aurora'][index % 5]} ${COUNTRY_DATA[country].towns[Math.floor(index / 5) % 4]} ${level === 1 ? 'A' : 'B'}`, country, colors: structuredClone(CLUB_COLORS[index % CLUB_COLORS.length]), divisionId: division.id };
        club.academy = int(random, level === 1 ? 45 : 30, level === 1 ? 80 : 65);
        club.reputation = int(random, level === 1 ? 50 : 30, level === 1 ? 80 : 60);
        club.formation = ['4-3-3', '4-4-2', '3-5-2'][int(random, 0, 2)];
        club.finances = { balance: club.reputation * 200000, lastIncome: 0, lastExpenses: 0 };
        club.history = [];
        club.titles = [];
        club.nextPlayerSerial = SQUAD_SIZE;
        club.squad = Array.from({ length: SQUAD_SIZE }, (_, serial) => makePlayer(club, serial, random));
        club.strength = squadStrength(club);
        clubs[id] = club;
        division.clubIds.push(id);
      }
      divisions.push(division);
    }
  }
  return { version: 1, randomState: Math.floor(random() * 4294967296) || 1, clubs, divisions, lastSeason: null, champions: [], retiredPlayers: [], qualification: { sulAmericana: [], europeia: [] } };
}

export function createSchedule(clubIds) {
  if (clubIds.length !== 20 || new Set(clubIds).size !== 20) throw new Error('Uma divisão precisa de 20 clubes distintos.');
  const rotating = [...clubIds];
  const first = [];
  for (let round = 0; round < 19; round++) {
    const matches = [];
    for (let i = 0; i < 10; i++) {
      const a = rotating[i], b = rotating[19 - i];
      matches.push(round % 2 ? { home: b, away: a } : { home: a, away: b });
    }
    first.push(matches);
    rotating.splice(1, 0, rotating.pop());
  }
  return [...first, ...first.map(round => round.map(match => ({ home: match.away, away: match.home })))];
}

function strength(club) {
  return club.strength ?? squadStrength(club);
}
function goals(random, attack, defense, home) {
  const expectation = clamp(1.25 + (attack - defense) / 25 + (home ? 0.2 : 0), 0.3, 3.3);
  let count = 0, product = 1;
  const limit = Math.exp(-expectation);
  do { count++; product *= random(); } while (product > limit);
  return count - 1;
}
function playMatch(home, away, clubs, random) {
  return { home, away, homeGoals: goals(random, strength(clubs[home]), strength(clubs[away]), true), awayGoals: goals(random, strength(clubs[away]), strength(clubs[home]), false) };
}

export function simulateLeague(division, clubs, random) {
  const table = Object.fromEntries(division.clubIds.map(id => [id, { clubId: id, played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 }]));
  const rounds = createSchedule(division.clubIds).map(round => round.map(({ home, away }) => {
    const match = playMatch(home, away, clubs, random);
    const a = table[home], b = table[away];
    a.played++; b.played++;
    a.goalsFor += match.homeGoals; a.goalsAgainst += match.awayGoals;
    b.goalsFor += match.awayGoals; b.goalsAgainst += match.homeGoals;
    if (match.homeGoals === match.awayGoals) { a.draws++; b.draws++; a.points++; b.points++; }
    else {
      const winner = match.homeGoals > match.awayGoals ? a : b;
      const loser = winner === a ? b : a;
      winner.wins++; winner.points += 3; loser.losses++;
    }
    return match;
  }));
  const standings = Object.values(table).map(row => ({ ...row, goalDifference: row.goalsFor - row.goalsAgainst }))
    .sort((a, b) => b.points - a.points || b.wins - a.wins || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.clubId.localeCompare(b.clubId));
  return { divisionId: division.id, country: division.country, level: division.level, rounds, standings };
}

// Odd fields are supported by byes; draws are decided by a deterministic shootout.
export function simulateCup(name, clubIds, clubs, random) {
  if (!clubIds.length || new Set(clubIds).size !== clubIds.length) throw new Error('Participantes inválidos.');
  let participants = [...clubIds];
  for (let i = participants.length - 1; i > 0; i--) {
    const j = int(random, 0, i); [participants[i], participants[j]] = [participants[j], participants[i]];
  }
  const entrants = [...participants], rounds = [];
  while (participants.length > 1) {
    const next = [], matches = [];
    const byes = participants.length - 2 ** Math.floor(Math.log2(participants.length));
    // Reduce to the next power of two, or halve an already balanced bracket.
    const matchCount = byes || participants.length / 2;
    const byeCount = participants.length - matchCount * 2;
    next.push(...participants.slice(0, byeCount));
    for (let i = byeCount; i < participants.length; i += 2) {
      const match = playMatch(participants[i], participants[i + 1], clubs, random);
      const winner = match.homeGoals === match.awayGoals ? (random() < 0.5 ? match.home : match.away) : (match.homeGoals > match.awayGoals ? match.home : match.away);
      matches.push({ ...match, winner, decidedByPenalties: match.homeGoals === match.awayGoals });
      next.push(winner);
    }
    rounds.push({ byes: participants.slice(0, byeCount), matches });
    participants = next;
  }
  return { name, entrants, rounds, champion: participants[0] };
}

function evolveSquads(world, random, season) {
  for (const club of Object.values(world.clubs)) {
    club.squad = club.squad.filter(player => {
      player.age++;
      const retire = player.age >= 35 && random() < Math.min(0.8, (player.age - 34) * 0.08);
      if (retire) {
        player.history.push({ season, clubId: club.id, age: player.age, overall: player.overall });
        world.retiredPlayers.push({ ...player, retiredSeason: season });
        return false;
      }
      const change = player.age <= 23 ? (random() < (player.overall < player.potential ? 0.8 : 0.3) ? 1 : 0)
        : player.age >= 31 ? -int(random, 0, 2) : int(random, -1, 1);
      for (const key of ATTRIBUTE_KEYS) player.attributes[key] = clamp(player.attributes[key] + change, 1, 99);
      player.overall = calculateOverall(player.attributes, player.position);
      player.condition.fitness = clamp(player.condition.fitness + int(random, -5, 5), 50, 100);
      player.condition.morale = clamp(player.condition.morale + (club.history.at(-1).position <= 5 ? 2 : -1), 1, 100);
      player.history.push({ season, clubId: club.id, age: player.age, overall: player.overall });
      return true;
    });
    while (club.squad.length < SQUAD_SIZE) club.squad.push(makePlayer(club, club.nextPlayerSerial++, random, int(random, 16, 19), true));
    club.strength = squadStrength(club);
  }
}

// The cup champion occupies one place; league order fills all remaining places.
export function selectContinentalQualifiers(leagues, nationalCups) {
  const countryPlaces = country => {
    const champion = nationalCups.find(cup => cup.name === `Copa ${country}`).champion;
    const standings = leagues.find(league => league.country === country && league.level === 1).standings;
    const selected = [champion];
    for (const row of standings) {
      if (!selected.includes(row.clubId)) selected.push(row.clubId);
      if (selected.length === 4) break;
    }
    return selected;
  };
  return { sulAmericana: SOUTH.flatMap(countryPlaces), europeia: EUROPE.flatMap(countryPlaces) };
}

function updateClubRecords(world, leagues, nationalCups, continentalCups, season) {
  const titles = new Map();
  const award = (id, type, name) => {
    const title = { season, type, name };
    world.clubs[id].titles.push(title);
    if (!titles.has(id)) titles.set(id, []);
    titles.get(id).push(title);
  };
  for (const league of leagues) award(league.standings[0].clubId, 'league', league.divisionId);
  for (const cup of nationalCups) award(cup.champion, 'nationalCup', cup.name);
  for (const cup of continentalCups) award(cup.champion, 'continentalCup', cup.name);
  for (const league of leagues) league.standings.forEach((row, index) => {
    const club = world.clubs[row.clubId];
    const won = titles.get(club.id) || [];
    const income = (league.level === 1 ? 5000000 : 2500000) + (20 - index) * 100000 + won.length * 1000000 + club.reputation * 10000;
    const expenses = Math.round(club.strength * 50000 + club.academy * 10000);
    club.finances.balance += income - expenses;
    club.finances.lastIncome = income;
    club.finances.lastExpenses = expenses;
    club.reputation = clamp(club.reputation + (index < 4 ? 2 : index >= 17 ? -2 : 0) + won.length * 2, 1, 99);
    club.history.push({ season, divisionId: league.divisionId, position: index + 1, points: row.points, titles: won.map(title => title.name), income, expenses });
  });
}

export function simulateSeason(world, season) {
  const random = generator(world.randomState);
  prepareWorld(world, random);
  const leagues = world.divisions.map(division => simulateLeague(division, world.clubs, random));
  const nationalCups = COUNTRIES.map(country => simulateCup(`Copa ${country}`, world.divisions.filter(d => d.country === country).flatMap(d => d.clubIds), world.clubs, random));
  const qualification = selectContinentalQualifiers(leagues, nationalCups);
  // Only the previous season's qualifiers enter this season.
  const continentalCups = [];
  for (const [key, name] of [['sulAmericana', 'Sul-Americana'], ['europeia', 'Europeia']]) {
    if (world.qualification[key].length) continentalCups.push(simulateCup(name, world.qualification[key], world.clubs, random));
  }
  const movement = [];
  for (const country of COUNTRIES) {
    const first = world.divisions.find(d => d.country === country && d.level === 1);
    const second = world.divisions.find(d => d.country === country && d.level === 2);
    const relegated = leagues.find(l => l.divisionId === first.id).standings.slice(-3).map(row => row.clubId);
    const promoted = leagues.find(l => l.divisionId === second.id).standings.slice(0, 3).map(row => row.clubId);
    first.clubIds = first.clubIds.filter(id => !relegated.includes(id)).concat(promoted);
    second.clubIds = second.clubIds.filter(id => !promoted.includes(id)).concat(relegated);
    for (const id of promoted) world.clubs[id].divisionId = first.id;
    for (const id of relegated) world.clubs[id].divisionId = second.id;
    movement.push({ country, promoted, relegated });
  }
  const summary = { season, leagues, nationalCups, continentalCups, qualification, movement };
  world.champions.push({ season, leagues: leagues.map(l => ({ divisionId: l.divisionId, champion: l.standings[0].clubId })), nationalCups: nationalCups.map(c => ({ name: c.name, champion: c.champion })), continentalCups: continentalCups.map(c => ({ name: c.name, champion: c.champion })) });
  world.lastSeason = summary;
  world.qualification = qualification;
  updateClubRecords(world, leagues, nationalCups, continentalCups, season);
  evolveSquads(world, random, season);
  world.randomState = Math.floor(random() * 4294967296) || 1;
  return summary;
}

export function getWorldOverview(career) {
  if (!career.world) return null;
  const world = career.world;
  const club = id => ({ id, name: world.clubs[id].name, country: world.clubs[id].country, colors: structuredClone(world.clubs[id].colors) });
  return {
    season: career.season,
    progress: structuredClone(career.seasonProgress),
    divisions: world.divisions.map(division => ({ id: division.id, country: division.country, level: division.level, clubs: division.clubIds.map(club), table: (world.lastSeason?.leagues.find(l => l.divisionId === division.id)?.standings || []).map(row => ({ ...row, club: club(row.clubId) })) })),
    lastSeason: world.lastSeason?.season ?? null,
    nationalChampions: (world.lastSeason?.nationalCups || []).map(cup => ({ name: cup.name, club: club(cup.champion) })),
    continentalChampions: (world.lastSeason?.continentalCups || []).map(cup => ({ name: cup.name, club: club(cup.champion) })),
    championsHistory: structuredClone(world.champions),
  };
}
