import { POSITIONS, STANDING } from './data.js';
import { calculateOverall } from './player.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const PHYSICAL = ['velocidade', 'aceleracao', 'resistencia', 'forca'];

const FAMILY = position => (position === 'goleiro' ? 'goleiro' : position.startsWith('zag') ? 'defesa'
  : position.startsWith('lateral') ? 'lateral' : position === 'volante' ? 'volante'
    : position === 'meio_campista' ? 'meio' : position === 'meia_atacante' ? 'meia'
      : position.startsWith('ponta') ? 'ponta' : 'ataque');
const GOAL_RATE = { goleiro: 0, defesa: 0.025, lateral: 0.035, volante: 0.05, meio: 0.1, meia: 0.18, ponta: 0.22, ataque: 0.42 };
const ASSIST_RATE = { goleiro: 0.01, defesa: 0.03, lateral: 0.12, volante: 0.07, meio: 0.16, meia: 0.26, ponta: 0.22, ataque: 0.1 };
const CARD_RATE = { goleiro: 0.03, defesa: 0.16, lateral: 0.12, volante: 0.17, meio: 0.1, meia: 0.06, ponta: 0.05, ataque: 0.07 };

export function standingLabel(standing) { return STANDING[clamp(standing, 0, STANDING.length - 1)].label; }

// Resultado individual de cada jogo do clube do jogador, derivado das partidas realmente simuladas no mundo.
export function simulatePlayerSeason(career, random) {
  const { player, world } = career;
  const season = world.lastSeason;
  const league = season.leagues.find(item => item.standings.some(row => row.clubId === player.club.id));
  const family = FAMILY(player.position);
  const share = STANDING[clamp(player.standing, 0, 4)].share;
  const injuredGames = player.injury?.games ?? 0;
  const goalSkill = clamp((player.overall / 70) ** 2.2, 0.35, 1.9);
  const log = [];
  let goals = 0, assists = 0, yellow = 0, red = 0, ratingSum = 0, played = 0, missed = 0, started = 0;

  league.rounds.forEach((round, index) => {
    const match = round.find(item => item.home === player.club.id || item.away === player.club.id);
    if (!match) return;
    const home = match.home === player.club.id;
    const own = home ? match.homeGoals : match.awayGoals, other = home ? match.awayGoals : match.homeGoals;
    const opponentId = home ? match.away : match.home;
    const opponent = world.clubs[opponentId]?.name ?? 'Adversário';
    if (index < injuredGames) { missed++; log.push({ round: index + 1, opponent, home, own, other, status: 'lesionado' }); return; }
    if (random() >= share) { log.push({ round: index + 1, opponent, home, own, other, status: 'fora' }); return; }
    const starter = random() < clamp(share + 0.12, 0, 1);
    played++; if (starter) started++;
    let g = 0, a = 0;
    for (let i = 0; i < own; i++) {
      if (random() < GOAL_RATE[family] * goalSkill * (starter ? 1 : 0.6)) g++;
      else if (random() < ASSIST_RATE[family] * clamp(player.attributes.passe / 70, 0.4, 1.6) * (starter ? 1 : 0.6)) a++;
    }
    const y = random() < CARD_RATE[family] * 0.6 * (1 + (player.temper < 0 ? -player.temper * 0.12 : 0)) ? 1 : 0;
    const r = random() < 0.008 + (player.temper < 0 ? -player.temper * 0.004 : 0) ? 1 : 0;
    const result = own > other ? 0.5 : own === other ? 0 : -0.4;
    const concededPenalty = family === 'goleiro' || family === 'defesa' ? Math.min(other, 3) * -0.25 : 0;
    const rating = clamp(6.1 + result + g * 0.9 + a * 0.55 + concededPenalty + (player.overall - 70) / 60 + (random() - 0.5) * 1.2 - r * 1.4, 3.5, 10);
    goals += g; assists += a; yellow += y; red += r; ratingSum += rating;
    log.push({ round: index + 1, opponent, home, own, other, status: starter ? 'titular' : 'reserva', goals: g, assists: a, yellow: y, red: r, rating: Math.round(rating * 10) / 10 });
  });

  const average = played ? Math.round(ratingSum / played * 100) / 100 : 0;
  const position = league.standings.findIndex(row => row.clubId === player.club.id) + 1;
  const row = league.standings[position - 1];
  const score = entry => (entry.goals ?? 0) * 3 + (entry.assists ?? 0) * 2 + Math.abs(entry.own - entry.other) * 0.4 + (entry.rating ?? 0) * 0.3 + (entry.red ? 2 : 0);
  const highlights = log.filter(entry => entry.status === 'titular' || entry.status === 'reserva')
    .sort((a, b) => score(b) - score(a) || a.round - b.round).slice(0, 5).sort((a, b) => a.round - b.round);

  const titles = [];
  if (played >= 10) {
    if (position === 1) titles.push({ season: season.season, name: `Campeão da ${league.level}ª divisão (${league.country})` });
    for (const cup of season.nationalCups) if (cup.champion === player.club.id) titles.push({ season: season.season, name: cup.name });
    for (const cup of season.continentalCups) if (cup.champion === player.club.id) titles.push({ season: season.season, name: cup.name });
  }
  const awards = [];
  if (played >= 20 && average >= 7.35) awards.push({ season: season.season, name: 'Seleção da temporada' });
  if (player.age <= 21 && played >= 15 && average >= 6.9) awards.push({ season: season.season, name: 'Revelação da temporada' });
  if (goals >= 18) awards.push({ season: season.season, name: 'Artilheiro do clube' });

  return {
    season: season.season, age: player.age, clubId: player.club.id, clubName: player.club.name,
    divisionLevel: league.level, country: league.country, position, points: row.points, played, started, missed,
    goals, assists, yellow, red, averageRating: average, highlights, titles, awards,
    standing: player.standing, injuryNote: injuredGames > 0 ? player.injury?.label ?? 'Lesão' : null,
  };
}

function weightedKey(keys, weightOf, random) {
  const total = keys.reduce((sum, key) => sum + weightOf(key), 0);
  let value = random() * total;
  return keys.find(key => (value -= weightOf(key)) < 0) ?? keys[keys.length - 1];
}

// Evolução não automática: depende de idade, minutos, potencial, treino, desgaste e escolhas.
export function progressPlayer(player, summary, random) {
  const before = player.overall;
  const weights = POSITIONS[player.position].weights;
  const keys = Object.keys(weights);
  const playFactor = clamp(summary.played / 38, 0, 1);
  const dev = player.development ?? 0;
  const room = Math.max(0, player.potential - player.overall);
  let delta;
  if (player.age <= 24) delta = Math.round(room * 0.11 * (0.35 + playFactor) + dev * 0.7 + (random() - 0.4) * 2);
  else if (player.age <= 30) delta = Math.round(dev * 0.6 + (playFactor - 0.4) * 1.2 + (random() - 0.55) * 1.4);
  else {
    const decline = 0.6 + (player.age - 31) * 0.3 + player.fatigue / 140 - dev * 0.45 + random() * 0.8;
    delta = -Math.round(clamp(decline, 0, 4));
  }
  delta = clamp(delta, -5, 5);
  // O potencial é o teto: não se evolui além dele (e ele não sobe junto).
  if (delta > 0) delta = Math.min(delta, room);
  const attributes = { ...player.attributes };
  // O overall é uma média ponderada: são necessários vários pontos de atributo para mover 1 de overall.
  const steps = Math.round((Math.abs(delta) + (delta >= 0 && dev > 1 ? 0.5 : 0)) * keys.length * 0.55);
  for (let i = 0; i < steps; i++) {
    const sign = delta < 0 ? -1 : 1;
    const key = weightedKey(keys, k => weights[k] * (sign < 0 && PHYSICAL.includes(k) ? 3 : 1) * (sign > 0 && player.focus === k ? 2.5 : 1), random);
    attributes[key] = clamp(attributes[key] + sign, 1, 99);
  }
  player.attributes = attributes;
  player.overall = calculateOverall(attributes, player.position);
  player.development = 0;
  return { before, after: player.overall, delta: player.overall - before };
}

// Espaço no elenco muda um degrau por vez, conforme desempenho, força do clube e confiança do treinador.
export function reevaluateStanding(player, club, summary, random) {
  const diff = player.overall - (club?.strength ?? 62);
  const target = clamp(Math.round(1.6 + diff / 4.5 + player.bonds.treinador * 0.25), 0, 4);
  let standing = player.standing;
  if (target > standing && random() < 0.7) standing++;
  else if (target < standing && random() < 0.7) standing--;
  if (summary.played >= 12) {
    if (summary.averageRating >= 7.3 && standing < 4 && random() < 0.5) standing++;
    if (summary.averageRating < 6.1 && standing > 0 && random() < 0.5) standing--;
  }
  return clamp(standing, 0, 4);
}

// Renda líquida: salário menos impostos, agente e custo de vida, que cresce com a fama.
export function seasonIncome(player) { return Math.max(1500, Math.round(player.contract.salary * 0.5 - player.fame * 30)); }

// Posição inicial no elenco de um novo clube: quem chega a um time mais forte começa atrás.
export function standingAtClub(player, club) {
  const diff = player.overall - (club?.strength ?? 62);
  return clamp(Math.round(1.1 + diff / 4.5), 0, 3);
}
