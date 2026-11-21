import { ATTRIBUTES, BOND_WORDS, BONDS, COUNTRIES, HINTS, POSITIONS, STANDING } from '../game/data.js';
import { currentEvent, eventText, previewOptions, careerNumbers } from '../game/engine.js';
import { getWorldOverview } from '../game/world.js';

// Funções de apresentação puras: recebem o estado e devolvem HTML. Não tocam o DOM.
export const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
export const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
export const initials = name => name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0].toLocaleUpperCase('pt-BR')).join('');
export const number = value => String(value).padStart(2, '0');

export function logo() {
  return `<span class="brand-mark" aria-hidden="true"><span>F</span><span>C</span></span><span class="brand-word">FOOT<span>ERA</span><small>UMA CARREIRA DE FUTEBOL</small></span>`;
}

export function figure(appearance, primary, secondary, compact = false, scene = 'campo') {
  const skin = escapeHtml(appearance.skin);
  const hair = escapeHtml(appearance.hair);
  const shirt = escapeHtml(primary);
  const detail = escapeHtml(secondary);
  const scenes = {
    campo: `<rect width="360" height="250" fill="#b8d2af"/><path d="M0 155 Q180 110 360 155 V250 H0Z" fill="#81aa83"/><path d="M0 194 Q180 140 360 194 M180 145 V250" fill="none" stroke="#d9e6c8" stroke-width="2"/><path d="M252 84 h78 v58 h-78z M252 103 h78 M272 84 v58 M312 84 v58" fill="none" stroke="#eaf0d9" stroke-width="3"/><path d="M38 205 l13-28 13 28z M35 207 h32" fill="#e89565" stroke="#f6d8a7" stroke-width="2"/>`,
    vestiario: `<rect width="360" height="250" fill="#d5c6aa"/><path d="M0 165 h360 v85 H0z" fill="#a9896e"/><path d="M18 18 h94 v139 H18z M248 18 h94 v139 h-94z" fill="#abbda1" stroke="#f2e8d4" stroke-width="4"/><path d="M65 18 v139 M295 18 v139 M18 60 h94 M248 60 h94" stroke="#e8dfc8" stroke-width="3"/><path d="M34 180 h292 v16 H34z M53 196 v35 M307 196 v35" fill="#745e4c" stroke="#745e4c" stroke-width="5"/><path d="M40 82 l10-9 12 5 12-5 10 9-5 19-8-3v32H53V98l-8 3z" fill="${detail}"/>`,
    imprensa: `<rect width="360" height="250" fill="#b2c6bb"/><path d="M0 0 h360 v155 H0z" fill="#a5bcb0"/><path d="M0 39 h360 M0 85 h360 M0 131 h360 M60 0 v155 M180 0 v155 M300 0 v155" stroke="#d2ded1" stroke-width="2"/><path d="M38 184 h284 v66 H38z" fill="#697e70"/><circle cx="56" cy="30" r="8" fill="#e9d8aa"/><circle cx="304" cy="112" r="8" fill="#e9d8aa"/><path d="M80 208 l18-46 M280 208 l-18-46" stroke="#3e5549" stroke-width="5"/><rect x="84" y="150" width="23" height="18" rx="7" fill="#30483f" transform="rotate(24 95 159)"/><rect x="253" y="150" width="23" height="18" rx="7" fill="#30483f" transform="rotate(-24 264 159)"/>`,
    escritorio: `<rect width="360" height="250" fill="#d9c7aa"/><path d="M0 170 h360 v80 H0z" fill="#b79c7e"/><path d="M30 25 h78 v92 H30z" fill="#9fbca9" stroke="#f5ead3" stroke-width="5"/><path d="M69 25 v92 M30 71 h78" stroke="#f5ead3" stroke-width="4"/><path d="M260 35 h65 v73 h-65z" fill="#eee4c9" stroke="#ad9878" stroke-width="4"/><path d="M269 51 h47 M269 62 h38 M269 73 h43 M269 84 h30" stroke="#a9b9a4" stroke-width="3"/><path d="M35 190 h290 v60 H35z" fill="#866c55"/><path d="M55 200 h65 v35 H55z" fill="#f4e9d2"/><path d="M66 209 h40 M66 217 h32" stroke="#b8b9a7" stroke-width="2"/>`,
    casa: `<rect width="360" height="250" fill="#e6d2b8"/><path d="M0 171 h360 v79 H0z" fill="#cbaa89"/><path d="M27 28 h80 v86 H27z" fill="#bad0bb" stroke="#f5e9d1" stroke-width="6"/><path d="M67 28 v86 M27 71 h80" stroke="#f5e9d1" stroke-width="4"/><path d="M262 42 h62 v57 h-62z" fill="#f0e4cb" stroke="#b99e7e" stroke-width="5"/><path d="M274 79 q18-27 38 0" fill="#a7bba0"/><path d="M30 179 q0-27 30-27 h240 q30 0 30 27 v58 H30z" fill="#bd8a70"/><path d="M30 191 h300" stroke="#e4b69b" stroke-width="4"/><circle cx="55" cy="174" r="14" fill="#e7bd96"/><circle cx="305" cy="174" r="14" fill="#e7bd96"/>`,
    torcida: `<rect width="360" height="250" fill="#c8d7b4"/><path d="M0 45 Q180 8 360 45 v115 H0z" fill="#9ebc9e"/><path d="M0 75 Q180 38 360 75 M0 108 Q180 71 360 108 M0 141 Q180 104 360 141" fill="none" stroke="#e3e9cf" stroke-width="4"/><path d="M0 156 Q180 120 360 156 v94 H0z" fill="#78a17d"/><path d="M47 51 v115 M48 52 q27-19 48-3 v38 q-21-16-48 3z" fill="${detail}" stroke="${shirt}" stroke-width="4"/><path d="M302 61 v98 M302 62 q-26-18-46-2 v34 q20-15 46 3z" fill="${shirt}" stroke="${detail}" stroke-width="4"/><circle cx="31" cy="120" r="7" fill="#edd1ad"/><circle cx="87" cy="126" r="7" fill="#b77d5f"/><circle cx="281" cy="124" r="7" fill="#d8a57c"/><circle cx="329" cy="116" r="7" fill="#92654c"/>`,
  };
  return `<svg class="figure ${compact ? 'figure--compact' : ''}" viewBox="0 0 360 250" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Ilustração de ${escapeHtml(scene === 'campo' ? 'futebol' : scene)}">
    ${scenes[scene] || scenes.campo}
    <circle cx="180" cy="128" r="92" fill="#e7cda6" opacity=".5"/>
    <path d="M111 249 Q110 207 122 183 Q134 169 159 163 L201 163 Q226 169 238 183 Q250 207 249 249Z" fill="${shirt}"/>
    <path d="M158 163 Q180 190 202 163 L195 156 L165 156Z" fill="${detail}"/>
    <path d="M168 165 Q180 179 192 165 L192 147 L168 147Z" fill="${skin}"/>
    <path d="M146 111 Q143 72 180 68 Q217 72 214 111 L210 136 Q204 160 180 165 Q156 160 150 136Z" fill="${skin}"/>
    <path d="M146 112 Q138 89 149 75 Q155 58 180 61 Q213 59 216 85 L214 106 Q208 98 207 91 Q192 99 169 89 Q158 100 146 112Z" fill="${hair}"/>
    <path d="M159 119 Q163 116 167 119 M193 119 Q197 116 201 119" stroke="#3d3028" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M172 143 Q180 148 188 143" fill="none" stroke="#70483e" stroke-width="2" stroke-linecap="round"/>
    <path d="M138 185 L147 192 M222 185 L213 192" stroke="${detail}" stroke-width="4"/>
    <path d="M178 207 L184 207 L184 224 L178 224Z" fill="${detail}" opacity=".85"/>
  </svg>`;
}

export function eventScene(event) {
  if (event.id === 'team_dinner_v1' || event.actor === 'familia') return 'casa';
  if (event.category === 'TREINAMENTO' || event.id === 'team_practice_v1') return 'campo';
  if (event.actor === 'imprensa') return 'imprensa';
  if (event.actor === 'empresario') return 'escritorio';
  if (event.actor === 'torcida') return 'torcida';
  if (event.category === 'VESTIÁRIO' || event.actor === 'companheiro') return 'vestiario';
  return 'campo';
}

export function header() {
  return `<header class="topbar"><div class="topbar-inner"><div class="brand">${logo()}</div><div class="topbar-right"><span class="topbar-divider"></span><span class="edition">O JOGO DAS SUAS ESCOLHAS</span><span class="header-ball" aria-hidden="true">✳</span></div></div></header>`;
}

export function creationScreen({ notice = '', busy = false } = {}) {
  return `${header()}<main class="start-shell">
    <section class="start-intro">
      <div class="intro-eyebrow"><span class="eyebrow-dot"></span> UM JOGO DE CARREIRA NARRATIVO <span class="intro-line"></span> 01 / 01</div>
      <h1>O futebol é feito<br>de <em>histórias.</em></h1>
      <p>As oportunidades, as pessoas, as decisões. Cada escolha deixa uma marca na carreira que só você pode construir.</p>
      <div class="start-art"><div class="art-stamp">O INÍCIO DE<br><strong>TUDO</strong><span>✳</span></div>${figure({ skin: '#bc8062', hair: '#302826' }, '#ed7954', '#f4d79d')}<div class="art-caption"><span>ENTRE EM CAMPO</span><b>01</b></div></div>
      <div class="intro-bottom"><span>FEITO PARA QUEM AMA FUTEBOL</span><span>✳</span><span>ESCOLHA. VIVA. LEMBRE.</span></div>
    </section>
    <section class="start-form-wrap"><div class="form-top"><span>PRIMEIRO PASSO</span><span>01 — 03</span></div>
      <div class="form-title"><span class="small-kicker">VAMOS COMEÇAR?</span><h2>Crie seu<br><em>jogador.</em></h2><p>O resto da história, a gente descobre no caminho.</p></div>
      <form id="career-form" autocomplete="off">
        <label for="player-name"><span>01</span> COMO VOCÊ SE CHAMA?</label>
        <input id="player-name" name="name" type="text" minlength="2" maxlength="40" placeholder="Nome do jogador" required autocomplete="name" />
        <label for="nationality"><span>02</span> QUAL É A SUA NACIONALIDADE?</label>
        <div class="select-wrap"><select id="nationality" name="nationality">${COUNTRIES.map(country => `<option value="${country}">${country}</option>`).join('')}</select></div>
        <label for="position"><span>03</span> ONDE VOCÊ JOGA?</label>
        <div class="select-wrap"><select id="position" name="position">${Object.entries(POSITIONS).map(([id, position]) => `<option value="${id}" ${id === 'meio_campista' ? 'selected' : ''}>${position.label}</option>`).join('')}</select></div>
        <p class="form-error" role="alert">${escapeHtml(notice)}</p>
        <button class="start-button" type="submit" ${busy ? 'disabled' : ''}><span>${busy ? 'CRIANDO SUA CARREIRA...' : 'COMEÇAR MINHA HISTÓRIA'}</span><span aria-hidden="true">↗</span></button>
      </form>
      <p class="save-note"><span aria-hidden="true">◇</span> Sua carreira é salva automaticamente neste navegador. Limpar os dados do navegador pode apagá-la.</p>
    </section>
  </main><footer class="site-footer"><span>FOOTERA · UMA HISTÓRIA POR VEZ</span><span>O COMEÇO DE UMA GRANDE JORNADA ✳</span></footer>`;
}

export function worldPanel(state) {
  const world = getWorldOverview(state);
  if (!world) return `<div class="world-empty"><h3>Seu mundo está esperando.</h3><p>Ele será criado quando você fizer sua próxima escolha, sem alterar sua história anterior.</p></div>`;
  const championRecords = [...world.championsHistory].reverse().map(record => {
    const leagues = record.leagues.map(item => {
      const division = world.divisions.find(entry => entry.id === item.divisionId);
      return { name: `${division.country} · ${division.level}ª divisão`, champion: item.champion };
    });
    const competitions = [...leagues, ...record.nationalCups, ...record.continentalCups];
    return `<details class="world-champions"><summary>Campeões · temporada ${record.season} <span>＋</span></summary>${competitions.map(item => `<div><span>${escapeHtml(item.name)}</span><b>${escapeHtml(state.world.clubs[item.champion].name)}</b></div>`).join('')}</details>`;
  }).join('');
  return `<section class="world-panel"><div class="world-intro"><span class="tiny-label">O FUTEBOL ALÉM DA SUA HISTÓRIA</span><h3>O mundo em campo.</h3><p>6 países · 12 divisões · 240 clubes</p><p>As competições são simuladas ao final de cada temporada.</p></div>
    <div class="world-progress"><span>TEMPORADA ${world.season}</span><b>${world.progress.decisions} / ${world.progress.target} decisões</b></div>
    ${championRecords || `<p class="world-note">Os primeiros campeões serão conhecidos ao fim desta temporada.</p>`}
    <div class="world-countries">${COUNTRIES.map(country => `<details class="world-country" ${country === state.player.club.country ? 'open' : ''}><summary>${escapeHtml(country)} <span>＋</span></summary><div class="world-divisions">${world.divisions.filter(division => division.country === country).map(division => `<details class="world-division"><summary>${division.level}ª divisão <span>20 clubes · ↗</span></summary><div class="division-content"><p class="world-note">Clubes na temporada ${world.season}</p><ul class="club-list">${division.clubs.map(club => `<li class="${club.id === state.player.club.id ? 'is-player-club' : ''}"><i style="--team-color:${escapeHtml(club.colors.primary)}"></i>${escapeHtml(club.name)}</li>`).join('')}</ul>${division.table.length ? `<p class="world-note">Classificação final da temporada ${world.lastSeason}</p><div class="table-scroll"><table class="standings"><thead><tr><th scope="col">#</th><th scope="col">Clube</th><th scope="col" title="Pontos">P</th><th scope="col" title="Jogos">J</th><th scope="col" title="Vitórias">V</th><th scope="col" title="Empates">E</th><th scope="col" title="Derrotas">D</th><th scope="col" title="Saldo de gols">SG</th></tr></thead><tbody>${division.table.map((row, index) => `<tr class="${row.clubId === state.player.club.id ? 'is-player-club' : ''}"><td>${index + 1}</td><td>${escapeHtml(row.club.name)}</td><td>${row.points}</td><td>${row.played}</td><td>${row.wins}</td><td>${row.draws}</td><td>${row.losses}</td><td>${row.goalDifference}</td></tr>`).join('')}</tbody></table></div>` : ''}</div></details>`).join('')}</div></details>`).join('')}</div>
  </section>`;
}

export function errorScreen(message) {
  return `${header()}<main class="error-screen"><span class="small-kicker">NÃO FOI POSSÍVEL CONTINUAR</span><h1>Seu salvamento<br><em>merece cuidado.</em></h1><p>${escapeHtml(message)}</p><p>Os dados existentes não foram substituídos. Verifique o armazenamento do navegador e recarregue a página.</p><button class="start-button" id="retry">TENTAR NOVAMENTE <span>↗</span></button></main>`;
}

const fatigueWord = value => (value < 25 ? 'Descansado' : value < 50 ? 'Em ritmo' : value < 70 ? 'Cansado' : 'No limite');
const fameWord = (fame, temper) => `${fame < 12 ? 'Desconhecido' : fame < 30 ? 'Em ascensão' : fame < 55 ? 'Conhecido' : fame < 80 ? 'Estrela' : 'Ídolo'}${temper <= -2 ? ' · Polêmico' : temper >= 2 ? ' · Exemplar' : ''}`;
const signed = value => (value > 0 ? `+${value}` : `${value}`);

export function pips(progress) {
  const done = Math.min(progress.decisions, progress.target);
  return `<div class="season-pips" role="img" aria-label="${done} de ${progress.target} decisões nesta temporada">${Array.from({ length: progress.target }, (_, index) => `<i class="${index < done ? 'is-done' : ''}"></i>`).join('')}</div>`;
}

export function hintChips(preview) {
  const chips = preview.hints.map(key => `<i class="hint hint--${key}" title="${escapeHtml(HINTS[key].label)}" aria-hidden="true">${HINTS[key].icon}</i>`).join('');
  return `<span class="hint-row">${chips}${preview.risky ? '<i class="hint hint--risco" title="Resultado incerto" aria-hidden="true">?</i>' : ''}</span>`;
}

const hintText = preview => (preview.hints.length ? `Pode afetar: ${preview.hints.map(key => HINTS[key].label).join(', ')}.${preview.risky ? ' O resultado é incerto.' : ''}` : 'Sem consequência imediata visível.');

export function playerPanel(state) {
  const { player } = state;
  const attributes = Object.entries(ATTRIBUTES).map(([key, label]) => `<div class="skill-row"><div><span>${label}</span><b>${player.attributes[key]}</b></div><div class="skill-track" role="meter" aria-label="${escapeHtml(label)}" aria-valuemin="0" aria-valuemax="99" aria-valuenow="${player.attributes[key]}"><span style="width:${player.attributes[key] / 99 * 100}%"></span></div></div>`).join('');
  const people = Object.entries(player.people).filter(([key]) => key in BONDS).map(([key, person]) => {
    const level = player.bonds[key] ?? 0;
    return `<li><span>${escapeHtml(person.role)} · ${escapeHtml(person.name)}</span><b>${BOND_WORDS[String(level)]}</b></li>`;
  }).join('');
  const status = [
    ['Espaço no elenco', STANDING[player.standing].label], ['Condição física', player.injury ? `Lesionado · ${escapeHtml(player.injury.label)}` : fatigueWord(player.fatigue)],
    ['Reputação', fameWord(player.fame, player.temper)], ['Contrato', `${money(player.contract.salary)}/temporada · até a temporada ${player.contract.until}`],
  ].map(([label, value]) => `<li><span>${label}</span><b>${value}</b></li>`).join('');
  return `<section class="skills-panel"><div class="skills-intro"><span class="tiny-label">PERFIL DO JOGADOR</span><h3>${escapeHtml(player.name)}</h3><p>${escapeHtml(player.origin.label)} · ${player.traits.join(' e ')} · potencial ${player.potential}</p></div>
    <ul class="status-list">${status}</ul><div class="skills-list">${attributes}</div>
    <div class="skills-intro"><span class="tiny-label">PESSOAS QUE IMPORTAM</span><p>O que cada um pensa de você aparece nas cartas, não em barras.</p></div><ul class="status-list">${people}</ul></section>`;
}

export function careerPanel(state) {
  const { player } = state;
  const totals = careerNumbers(state);
  const seasons = [...player.seasons].reverse().map(item => `<tr><td>${item.season}</td><td>${escapeHtml(item.clubName)}</td><td>${item.played}</td><td>${item.goals}</td><td>${item.assists}</td><td>${item.averageRating ? item.averageRating.toFixed(1) : '–'}</td><td>${item.position}º</td></tr>`).join('');
  const clubs = player.clubHistory.map(club => `<li><span>${escapeHtml(club.name)}</span><b>${club.fromSeason}${club.toSeason ? `–${club.toSeason}` : '–hoje'}</b></li>`).join('');
  const trophies = player.trophies.length ? player.trophies.map(item => `<li><span>${escapeHtml(item.name)}</span><b>T${item.season}</b></li>`).join('') : '<li><span>Nenhum título ainda</span><b>—</b></li>';
  const awards = player.awards.map(item => `<li><span>${escapeHtml(item.name)}</span><b>T${item.season}</b></li>`).join('');
  return `<section class="skills-panel"><div class="skills-intro"><span class="tiny-label">CARREIRA</span><h3>${totals.matches} jogos · ${totals.goals} gols · ${totals.assists} assistências</h3><p>${player.stats.caps ? `${player.stats.caps} jogos pela seleção · ` : ''}${totals.yellow} amarelos · ${totals.red} vermelhos${totals.matches ? ` · nota média ${totals.average.toFixed(2)}` : ''}</p></div>
    <div class="skills-intro"><span class="tiny-label">CLUBES</span></div><ul class="status-list">${clubs}</ul>
    <div class="skills-intro"><span class="tiny-label">TÍTULOS E PRÊMIOS</span></div><ul class="status-list">${trophies}${awards}</ul>
    ${seasons ? `<div class="skills-intro"><span class="tiny-label">TEMPORADAS</span></div><div class="table-wrap"><table class="stat-table"><thead><tr><th>T</th><th>Clube</th><th>J</th><th>G</th><th>A</th><th>Nota</th><th>Liga</th></tr></thead><tbody>${seasons}</tbody></table></div>` : ''}</section>`;
}

function timelineEntry(entry, index) {
  return `<li class="timeline-entry"><div class="timeline-marker">${number(index + 1)}</div><div><span class="timeline-category">${escapeHtml(entry.category)}${entry.season ? ` · TEMPORADA ${entry.season}` : ''}</span><p>${escapeHtml(entry.text)}</p><strong>${escapeHtml(entry.choice)}</strong>${entry.outcome ? `<em class="timeline-outcome">${escapeHtml(entry.outcome)}</em>` : ''}</div></li>`;
}

export function historyPanel(state) {
  const items = state.history.map((entry, index) => timelineEntry(entry, index)).reverse().join('');
  return `<aside class="history-panel"><div class="history-intro"><span class="tiny-label">CADA DECISÃO IMPORTA</span><h3>Uma história<br><em>em construção.</em></h3><p>Tudo o que você decidiu fica guardado, e pode voltar a qualquer momento.</p></div>
    <div class="history-list-title"><span>LINHA DO TEMPO</span><b>${number(state.history.length)}</b></div>${items ? `<ol class="timeline">${items}</ol>` : '<p class="timeline-empty">A sua história começa na primeira carta.</p>'}</aside>`;
}

export function summaryPanel(summary, state) {
  const rows = summary.highlights.map(item => {
    const line = [item.goals ? `${item.goals} gol${item.goals > 1 ? 's' : ''}` : '', item.assists ? `${item.assists} assist.` : '', item.red ? 'expulso' : ''].filter(Boolean).join(' · ') || 'boa atuação';
    return `<li><span>R${item.round} · ${escapeHtml(item.opponent)} ${item.own}–${item.other}</span><b>${line} · ${item.rating.toFixed(1)}</b></li>`;
  }).join('');
  const progress = summary.progress.delta ? `Overall ${summary.progress.before} → ${summary.progress.after} (${signed(summary.progress.delta)})` : `Overall mantido em ${summary.progress.after}`;
  const standingNote = summary.standingAfter !== summary.standingBefore ? `Espaço no elenco: ${STANDING[summary.standingBefore].label} → ${STANDING[summary.standingAfter].label}` : `Espaço no elenco: ${STANDING[summary.standingAfter].label}`;
  return `<section class="skills-panel summary-panel"><div class="skills-intro"><span class="tiny-label">FIM DA TEMPORADA ${summary.season}</span><h3>${escapeHtml(summary.clubName)} · ${summary.position}º lugar</h3><p>${summary.played ? `${summary.played} jogos (${summary.started} como titular)` : 'Nenhum jogo disputado'}${summary.injuryNote ? ` · perdeu jogos por lesão: ${escapeHtml(summary.injuryNote)}` : ''}</p></div>
    <div class="summary-grid"><div><b>${summary.goals}</b><span>gols</span></div><div><b>${summary.assists}</b><span>assistências</span></div><div><b>${summary.averageRating ? summary.averageRating.toFixed(1) : '–'}</b><span>nota média</span></div><div><b>${summary.yellow + summary.red}</b><span>cartões</span></div></div>
    <ul class="status-list"><li><span>Evolução</span><b>${progress}</b></li><li><span>Situação</span><b>${standingNote}</b></li><li><span>Salário líquido</span><b>+${money(summary.income)}</b></li>${summary.titles.map(item => `<li><span>🏆 ${escapeHtml(item.name)}</span><b>Título</b></li>`).join('')}${summary.awards.map(item => `<li><span>★ ${escapeHtml(item.name)}</span><b>Prêmio</b></li>`).join('')}</ul>
    ${rows ? `<div class="skills-intro"><span class="tiny-label">JOGOS EM DESTAQUE</span></div><ul class="status-list">${rows}</ul>` : ''}
    <button class="start-button" type="button" data-close="summary-dialog">SEGUIR PARA A TEMPORADA ${state.season} <span>↗</span></button></section>`;
}

const dialog = (id, title, body, extra = '') => `<dialog class="game-dialog ${extra}" id="${id}" aria-label="${escapeHtml(title)}"><div class="dialog-head"><span>${escapeHtml(title.toUpperCase())}</span><button type="button" data-close="${id}" aria-label="Fechar">✕</button></div>${body}</dialog>`;

export function gameScreen(state, ui = {}) {
  const { busy = false, notice = '' } = ui;
  const player = state.player;
  const event = currentEvent(state);
  const person = player.people[event.actor];
  const characterColor = event.actor === 'companheiro' || event.actor === 'torcida' ? player.club.colors.primary : '#526e5d';
  const previews = previewOptions(state, event);
  const latest = state.history.at(-1);
  const lastLine = latest?.outcome || '';
  return `<div class="matchday-shell">
    <header class="matchday-header"><div class="brand">${logo()}</div><div class="matchday-header-right"><span class="save-status"><i></i>${busy ? 'SALVANDO...' : 'SALVO NESTE NAVEGADOR'}</span><button class="header-action" data-open="world-dialog" type="button">◌ <span>Mundo</span></button><button class="header-action" data-open="career-dialog" type="button">★ <span>Carreira</span></button><button class="header-action" data-open="history-dialog" type="button">☷ <span>História</span></button><button class="header-action profile-action" data-open="profile-dialog" type="button">◉ <span>Perfil</span></button></div></header>
    <main class="matchday-main"><div class="matchday-meta"><div class="player-rating"><span>OVERALL</span><strong>${player.overall}</strong><small>${POSITIONS[player.position].short}</small></div><div class="meta-club"><span>${escapeHtml(player.club.name)} · ${escapeHtml(POSITIONS[player.position].label)}</span><strong>${escapeHtml(player.name)}</strong></div><div class="meta-right"><span>TEMPORADA ${number(state.season)}</span><strong>${player.age} anos</strong></div></div>
      <div class="status-strip"><span>${STANDING[player.standing].label}</span>${player.injury ? `<span class="is-alert">Lesionado</span>` : player.fatigue >= 70 ? '<span class="is-alert">No limite físico</span>' : ''}<span>${fameWord(player.fame, player.temper)}</span></div>
      ${notice ? `<div class="notice" role="alert">${escapeHtml(notice)}</div>` : ''}
      ${lastLine ? `<div class="season-notice outcome-line" role="status"><strong>${escapeHtml(latest.choice)}.</strong> ${escapeHtml(lastLine)}</div>` : ''}
      <section class="matchday-stage" aria-label="Próxima decisão"><div class="stage-label"><span>${number(state.history.length + 1)}</span>${pips(state.seasonProgress)}<span>T${state.season}</span></div>
        <article class="story-card decision-card" id="story-card"><div class="card-top"><span><i></i> ${escapeHtml(event.category)}</span><span>FOOTERA / ${number(state.history.length + 1)}</span></div>
          <div class="swipe-preview" aria-hidden="true"></div>
          <div class="decision-content"><p class="decision-message">${escapeHtml(eventText(event, state))}</p>
            <div class="decision-prompt">O QUE VOCÊ FAZ?</div>
            <div class="choices">${event.options.map((option, index) => `<button class="choice-button" data-choice="${index}" ${busy ? 'disabled' : ''}><span class="choice-letter">${index === 0 ? 'A' : 'B'}</span><span class="choice-label">${escapeHtml(option.label)}${hintChips(previews[index])}</span><span class="sr-only"> ${escapeHtml(hintText(previews[index]))}</span><span class="choice-arrow" aria-hidden="true">${index === 0 ? '←' : '→'}</span></button>`).join('')}</div>
          </div>
          <div class="card-art">${figure(person.appearance, characterColor, player.club.colors.secondary, false, eventScene(event))}</div>
          <div class="card-person"><span>${escapeHtml(person.role.toUpperCase())}</span><strong>${escapeHtml(person.name)}</strong><span>${escapeHtml(initials(person.name))}</span></div>
        </article>
        <p class="swipe-hint">← ARRASTE A CARTA OU TOQUE EM UMA RESPOSTA →<br><span>OS SÍMBOLOS MOSTRAM O QUE PODE MUDAR · ? = RESULTADO INCERTO</span></p>
      </section>
      <div class="matchday-foot"><div><span>SALDO</span><strong>${money(player.money)}</strong></div><div class="meta-right"><span>CONTRATO ATÉ</span><strong>TEMP. ${player.contract.until}</strong></div></div>
    </main>
    ${dialog('world-dialog', 'Mundo do futebol', worldPanel(state), 'world-dialog')}
    ${dialog('career-dialog', 'Carreira', careerPanel(state))}
    ${dialog('profile-dialog', 'Perfil do jogador', playerPanel(state))}
    ${dialog('history-dialog', 'Histórico da carreira', historyPanel(state))}
    ${state.lastSummary ? dialog('summary-dialog', 'Resumo da temporada', summaryPanel(state.lastSummary, state)) : ''}
  </div>`;
}

export function retiredScreen(state, archived = []) {
  const { player } = state;
  const totals = careerNumbers(state);
  const book = archived.length ? `<p class="world-note">${archived.length} carreira${archived.length > 1 ? 's' : ''} no arquivo.</p>` : '';
  return `${header()}<main class="error-screen retired-screen"><span class="small-kicker">FIM DE CARREIRA · ${state.retirement.age} ANOS</span><h1>${escapeHtml(player.name)}<br><em>pendurou as chuteiras.</em></h1><p>${escapeHtml(state.retirement.text)}</p>
    <div class="summary-grid"><div><b>${totals.matches}</b><span>jogos</span></div><div><b>${totals.goals}</b><span>gols</span></div><div><b>${totals.assists}</b><span>assistências</span></div><div><b>${player.trophies.length}</b><span>títulos</span></div></div>
    ${careerPanel(state)}${book}<button class="start-button" id="new-career">GUARDAR NO ARQUIVO E COMEÇAR OUTRA CARREIRA <span>↗</span></button></main>`;
}
