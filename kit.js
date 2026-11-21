// Utilidades compartilhadas pelas cartas.
// effects(state, h) devolve consequências; h.chance(p) usa o gerador da carreira (determinístico).
export const opt = (label, effects, extra = {}) => ({ label, effects: typeof effects === 'function' ? effects : () => effects, ...extra });

export const technical = state => (state.player.position === 'goleiro' ? 'defesa' : 'controle');
export const passing = state => (state.player.position === 'goleiro' ? 'posicionamento' : 'passe');
export const finishing = state => (state.player.position === 'goleiro' ? 'reflexos' : 'finalizacao');
export const ATTACKERS = ['centroavante', 'ponta_direita', 'ponta_esquerda', 'meia_atacante'];
export const DEFENDERS = ['zagueiro', 'lateral_direito', 'lateral_esquerdo', 'volante'];
export const isAttacker = state => ATTACKERS.includes(state.player.position);
export const isDefender = state => DEFENDERS.includes(state.player.position);
export const isKeeper = state => state.player.position === 'goleiro';

// Relógios de história contam decisões concluídas, não partidas ou datas.
export const elapsed = (state, key, turns) => Number.isInteger(state.memory[key]) && state.history.length - state.memory[key] >= turns;
export const bond = (state, key) => state.player.bonds?.[key] ?? 0;
export const seasonsAt = state => state.season - (state.player.clubHistory?.at(-1)?.fromSeason ?? 1);

const divisionOf = (world, clubId) => world?.divisions.find(division => division.clubIds.includes(clubId));
export const clubLevel = (world, clubId) => divisionOf(world, clubId)?.level ?? 1;
export const lastClubStanding = state => state.world?.lastSeason?.leagues
  .flatMap(league => league.standings.map((row, index) => ({ ...row, position: index + 1, league })))
  .find(row => row.clubId === state.player.club.id);
export const continentalEntry = state => {
  const qualification = state.world?.qualification;
  if (qualification?.sulAmericana.includes(state.player.club.id)) return 'Sul-Americana';
  if (qualification?.europeia.includes(state.player.club.id)) return 'Europeia';
  return null;
};

// Escolhe um clube de primeira divisão compatível com o momento do jogador.
export function pickSuitor(state, h, { exclude = [], preferId = null } = {}) {
  const world = state.world;
  if (preferId && world.clubs[preferId]) return world.clubs[preferId];
  const level1 = world.divisions.filter(division => division.level === 1).flatMap(division => division.clubIds)
    .filter(id => id !== state.player.club.id && !exclude.includes(id)).map(id => world.clubs[id]);
  const fits = level1.filter(club => club.strength >= state.player.overall - 14 && club.strength <= state.player.overall + 8);
  const pool = fits.length ? fits : level1;
  return pool[h.int(0, pool.length - 1)];
}
export const offerSalary = (state, club, boost = 1) => Math.round(state.player.contract.salary * (1.06 + Math.max(0, club.strength - 58) / 200) * boost / 100) * 100;
