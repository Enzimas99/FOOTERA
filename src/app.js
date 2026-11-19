import { ATTRIBUTES, COUNTRIES, POSITIONS, RELATIONSHIPS } from './game/data.js';
import { choose, createCareer, currentEvent, eventText } from './game/engine.js';
import { getWorldOverview } from './game/world.js';
import { createSave, loadCareer, saveChoice } from './storage.js';

const app = document.querySelector('#app');
let career = null;
let busy = false;
let notice = '';
let seasonNotice = '';

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
const initials = name => name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0].toLocaleUpperCase('pt-BR')).join('');
const number = value => String(value).padStart(2, '0');

function logo() {
  return `<span class="brand-mark" aria-hidden="true"><span>F</span><span>C</span></span><span class="brand-word">FOOT<span>ERA</span><small>UMA CARREIRA DE FUTEBOL</small></span>`;
}

function figure(appearance, primary, secondary, compact = false, scene = 'campo') {
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

function eventScene(event) {
  if (event.id === 'team_dinner_v1' || event.actor === 'familia') return 'casa';
  if (event.category === 'TREINAMENTO' || event.id === 'team_practice_v1') return 'campo';
  if (event.actor === 'imprensa') return 'imprensa';
  if (event.actor === 'empresario') return 'escritorio';
  if (event.actor === 'torcida') return 'torcida';
  if (event.category === 'VESTIÁRIO' || event.actor === 'companheiro') return 'vestiario';
  return 'campo';
}

function header() {
  return `<header class="topbar"><div class="topbar-inner"><div class="brand">${logo()}</div><div class="topbar-right"><span class="topbar-divider"></span><span class="edition">O JOGO DAS SUAS ESCOLHAS</span><span class="header-ball" aria-hidden="true">✳</span></div></div></header>`;
}

function creationScreen() {
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

function meterBar(key, value, previews) {
  const relation = RELATIONSHIPS[key];
  const affected = previews.map(preview => Boolean(preview[key]) && Math.max(0, Math.min(100, value + preview[key])) !== value);
  return `<div class="meter" data-left="${affected[0]}" data-right="${affected[1]}" title="${escapeHtml(relation.label)}: ${value} de 100"><div class="meter-heading"><span class="meter-icon" aria-hidden="true">${relation.icon}</span><span>${relation.label}</span><i class="meter-preview" aria-hidden="true"></i><b>${value}</b></div><div class="meter-track" role="meter" aria-label="${relation.label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}"><span style="width:${value}%"></span></div></div>`;
}

function playerPanel(player) {
  const attributes = Object.entries(ATTRIBUTES).map(([key, label]) => `<div class="skill-row"><div><span>${label}</span><b>${player.attributes[key]}</b></div><div class="skill-track" role="meter" aria-label="${escapeHtml(label)}" aria-valuemin="0" aria-valuemax="99" aria-valuenow="${player.attributes[key]}"><span style="width:${player.attributes[key] / 99 * 100}%"></span></div></div>`).join('');
  return `<section class="skills-panel"><div class="skills-intro"><span class="tiny-label">PERFIL DO JOGADOR</span><h3>Suas habilidades.</h3><p>Seus atributos evoluem com as escolhas da carreira.</p></div><div class="skills-list">${attributes}</div></section>`;
}

function changeSummary(changes) {
  const items = [];
  for (const [key, delta] of Object.entries(changes.relationships)) if (delta) items.push(`${RELATIONSHIPS[key].label} ${delta > 0 ? '+' : ''}${delta}`);
  for (const [key, delta] of Object.entries(changes.attributes)) if (delta) items.push(`${ATTRIBUTES[key]} ${delta > 0 ? '+' : ''}${delta}`);
  if (changes.money) items.push(`${changes.money > 0 ? '+' : '−'}${money(Math.abs(changes.money))}`);
  if (changes.overall) items.push(`Overall ${changes.overall > 0 ? '+' : ''}${changes.overall}`);
  return items.length ? items.join(' · ') : 'Sem alteração imediata';
}

function timelineEntry(entry, index) {
  return `<li class="timeline-entry"><div class="timeline-marker">${number(index + 1)}</div><div><span class="timeline-category">${escapeHtml(entry.category)}${entry.season ? ` · TEMPORADA ${entry.season}` : ''}</span><p>${escapeHtml(entry.choice)}</p><small>${escapeHtml(changeSummary(entry.changes))}</small><details class="decision-detail"><summary>Ver acontecimento</summary><p>${escapeHtml(entry.text)}</p><small>Com ${escapeHtml(entry.personName)}</small></details></div></li>`;
}

function historyPanel(state) {
  const latest = state.history.at(-1);
  const visible = state.history.slice(-3).reverse();
  return `<aside class="history-panel"><div class="panel-heading"><span>SUA JORNADA</span><span>✳</span></div>
    <div class="history-intro"><span class="tiny-label">CADA DECISÃO IMPORTA</span><h3>Uma história<br><em>em construção.</em></h3><p>Suas escolhas ficam guardadas aqui, para que você nunca esqueça como tudo aconteceu.</p></div>
    ${latest ? `<div class="last-impact"><span>ÚLTIMA ESCOLHA</span><strong>${escapeHtml(latest.choice)}</strong><p>${escapeHtml(changeSummary(latest.changes))}</p></div>` : `<div class="empty-journey"><span>✳</span><p>Seu primeiro capítulo está esperando por você.</p></div>`}
    <div class="history-list-title"><span>LINHA DO TEMPO</span><b>${number(state.history.length)}</b></div>
    ${visible.length ? `<ol class="timeline">${visible.map((entry, index) => timelineEntry(entry, state.history.length - index - 1)).join('')}</ol>` : `<p class="timeline-empty">A sua história começa agora.</p>`}
    ${state.history.length > 3 ? `<details class="all-history"><summary>Ver histórico completo <span>↗</span></summary><ol class="timeline">${state.history.slice(0, -3).reverse().map((entry, index) => timelineEntry(entry, state.history.length - index - 4)).join('')}</ol></details>` : ''}
    <div class="history-foot"><span>SUAS ESCOLHAS<br>CONTAM SUA HISTÓRIA.</span><span>✳</span></div>
  </aside>`;
}

function worldPanel(state) {
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

function gameScreen(state) {
  const player = state.player;
  const event = currentEvent(state);
  const person = player.people[event.actor];
  const characterColor = event.actor === 'companheiro' || event.actor === 'torcida' ? player.club.colors.primary : '#526e5d';
  const latest = state.history.at(-1);
  const previews = event.options.map(option => {
    const { world, ...careerData } = state;
    const copy = structuredClone(careerData);
    copy.world = world;
    copy.memory ??= {};
    copy.lastSeen ??= {};
    return option.effects(copy).relationships || {};
  });
  return `<div class="matchday-shell">
    <header class="matchday-header"><div class="brand">${logo()}</div><div class="matchday-header-right"><span class="save-status"><i></i>${busy ? 'SALVANDO...' : 'SALVO NESTE NAVEGADOR'}</span><button class="header-action" data-open="world-dialog" type="button">◌ <span>Mundo</span></button><button class="header-action" data-open="history-dialog" type="button">☷ <span>História</span></button><button class="header-action profile-action" data-open="profile-dialog" type="button">◉ <span>Perfil</span></button></div></header>
    <main class="matchday-main"><div class="matchday-meta"><div class="player-rating"><span>OVERALL</span><strong>${player.overall}</strong><small>${POSITIONS[player.position].short}</small></div><div class="meta-club"><span>${escapeHtml(player.club.name)} · ${escapeHtml(POSITIONS[player.position].label)}</span><strong>${escapeHtml(player.name)}</strong></div><div class="meta-right"><span>TEMPORADA ${number(state.season)}</span><strong>${player.age} anos</strong></div></div>
      <section class="relationship-strip" aria-label="Indicadores de relacionamento">${Object.entries(player.relationships).map(([key, value]) => meterBar(key, value, previews)).join('')}</section>
      ${notice ? `<div class="notice" role="alert">${escapeHtml(notice)}</div>` : ''}
      ${seasonNotice ? `<div class="season-notice" role="status">${escapeHtml(seasonNotice)}</div>` : ''}
      <section class="matchday-stage" aria-label="Próxima decisão"><div class="stage-label"><span>SUA HISTÓRIA · ${number(state.history.length + 1)}</span><span>✳</span><span>${state.seasonProgress ? `${state.seasonProgress.decisions} / ${state.seasonProgress.target} DECISÕES` : 'CADA ESCOLHA CONTA'}</span></div>
        <article class="story-card decision-card" id="story-card"><div class="card-top"><span><i></i> ${escapeHtml(event.category)}</span><span>FOOTERA / ${number(state.history.length + 1)}</span></div>
          <div class="swipe-preview" aria-hidden="true"></div>
          <div class="decision-content"><p class="decision-message">${escapeHtml(eventText(event, state))}</p>
            <div class="decision-prompt">QUAL É A SUA RESPOSTA?</div>
            <div class="choices">${event.options.map((option, index) => {
              const affected = Object.keys(previews[index]).filter(key => RELATIONSHIPS[key] && Math.max(0, Math.min(100, player.relationships[key] + previews[index][key])) !== player.relationships[key]);
              const hint = affected.length ? `Pode afetar: ${affected.map(key => RELATIONSHIPS[key].label).join(', ')}.` : 'Nenhum indicador de relacionamento muda imediatamente.';
              return `<button class="choice-button" data-choice="${index}" ${busy ? 'disabled' : ''}><span class="choice-letter">${index === 0 ? 'A' : 'B'}</span><span>${escapeHtml(option.label)}</span><span class="sr-only"> ${escapeHtml(hint)}</span><span class="choice-arrow" aria-hidden="true">${index === 0 ? '←' : '→'}</span></button>`;
            }).join('')}</div>
          </div>
          <div class="card-art">${figure(person.appearance, characterColor, player.club.colors.secondary, false, eventScene(event))}</div>
          <div class="card-person"><span>${escapeHtml(person.role.toUpperCase())}</span><strong>${escapeHtml(person.name)}</strong><span>${escapeHtml(initials(person.name))}</span></div>
        </article>
        <p class="swipe-hint">← ARRASTE A CARTA OU ESCOLHA UMA RESPOSTA →<br><span>OS PONTOS MOSTRAM QUAIS RELAÇÕES PODEM MUDAR</span></p>
      </section>
      <div class="matchday-foot"><div><span>ÚLTIMA ESCOLHA</span><strong>${latest ? escapeHtml(latest.choice) : 'Sua história começa agora'}</strong></div><div class="meta-right"><span>SALDO DISPONÍVEL</span><strong>${money(player.money)}</strong></div></div>
    </main>
    <dialog class="game-dialog world-dialog" id="world-dialog" aria-label="Mundo do futebol"><div class="dialog-head"><span>MUNDO DO FUTEBOL</span><button type="button" data-close="world-dialog" aria-label="Fechar mundo">✕</button></div>${worldPanel(state)}</dialog>
    <dialog class="game-dialog" id="profile-dialog" aria-label="Habilidades do jogador"><div class="dialog-head"><span>HABILIDADES DO JOGADOR</span><button type="button" data-close="profile-dialog" aria-label="Fechar perfil">✕</button></div>${playerPanel(player)}</dialog>
    <dialog class="game-dialog" id="history-dialog" aria-label="Histórico da carreira"><div class="dialog-head"><span>HISTÓRICO DA CARREIRA</span><button type="button" data-close="history-dialog" aria-label="Fechar histórico">✕</button></div>${historyPanel(state)}</dialog>
  </div>`;
}

function errorScreen(message) {
  return `${header()}<main class="error-screen"><span class="small-kicker">NÃO FOI POSSÍVEL CONTINUAR</span><h1>Seu salvamento<br><em>merece cuidado.</em></h1><p>${escapeHtml(message)}</p><p>Os dados existentes não foram substituídos. Verifique o armazenamento do navegador e recarregue a página.</p><button class="start-button" id="retry">TENTAR NOVAMENTE <span>↗</span></button></main>`;
}

function render() {
  app.innerHTML = career ? gameScreen(career) : creationScreen();
  if (career) {
    const shell = app.querySelector('.matchday-shell');
    const card = app.querySelector('#story-card');
    const preview = card.querySelector('.swipe-preview');
    const options = currentEvent(career).options;
    let start = null;
    const showPreview = index => {
      shell.classList.toggle('preview-left', index === 0);
      shell.classList.toggle('preview-right', index === 1);
      card.classList.toggle('has-preview', index !== null);
      preview.textContent = index === null ? '' : `${index === 0 ? '←' : '→'} ${options[index].label}`;
      card.querySelectorAll('[data-choice]').forEach(button => button.classList.toggle('is-previewed', index !== null && Number(button.dataset.choice) === index));
    };
    app.querySelectorAll('[data-choice]').forEach(button => {
      const index = Number(button.dataset.choice);
      button.addEventListener('click', () => makeChoice(index));
      button.addEventListener('mouseenter', () => { if (!busy && !start) showPreview(index); });
      button.addEventListener('mouseleave', () => { if (!start && document.activeElement !== button) showPreview(null); });
      button.addEventListener('focus', () => { if (!busy) showPreview(index); });
      button.addEventListener('blur', () => { if (!start) showPreview(null); });
    });
    app.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.open).showModal()));
    app.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));
    app.querySelectorAll('.game-dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
    const resetDrag = () => {
      start = null;
      card.classList.remove('is-dragging');
      card.style.transform = '';
      showPreview(null);
    };
    card.addEventListener('pointerdown', event => {
      if (busy || event.button !== 0 || event.target.closest('button')) return;
      start = { x: event.clientX, y: event.clientY };
      card.setPointerCapture(event.pointerId);
    });
    card.addEventListener('pointermove', event => {
      if (!start || busy) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.1) return;
      card.classList.add('is-dragging');
      card.style.transform = `translate(${dx}px, ${Math.min(Math.abs(dx) * 0.04, 14)}px) rotate(${Math.max(-14, Math.min(14, dx / 15))}deg)`;
      showPreview(dx < 0 ? 0 : 1);
    });
    card.addEventListener('pointerup', event => {
      if (!start || busy) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      if (Math.abs(dx) > 75 && Math.abs(dx) > Math.abs(dy) * 1.2) {
        start = null;
        card.classList.remove('is-dragging');
        makeChoice(dx < 0 ? 0 : 1);
      } else resetDrag();
    });
    card.addEventListener('pointercancel', resetDrag);
    card.addEventListener('lostpointercapture', () => { if (start) resetDrag(); });
  } else {
    document.querySelector('#career-form').addEventListener('submit', async event => {
      event.preventDefault();
      if (busy) return;
      const data = new FormData(event.currentTarget);
      try {
        const candidate = createCareer({ name: data.get('name'), nationality: data.get('nationality'), position: data.get('position') });
        busy = true;
        notice = '';
        const submit = event.currentTarget.querySelector('button[type="submit"]');
        submit.disabled = true;
        submit.firstElementChild.textContent = 'CRIANDO SUA CARREIRA...';
        await createSave(candidate);
        career = candidate;
        busy = false;
        render();
      } catch (error) {
        busy = false;
        notice = error.message;
        const errorElement = event.currentTarget.querySelector('.form-error');
        errorElement.textContent = notice;
        const submit = event.currentTarget.querySelector('button[type="submit"]');
        submit.disabled = false;
        submit.firstElementChild.textContent = 'COMEÇAR MINHA HISTÓRIA';
      }
    });
  }
}

async function makeChoice(index) {
  if (busy) return;
  busy = true;
  notice = '';
  app.querySelectorAll('[data-choice]').forEach(button => { button.disabled = true; });
  const status = app.querySelector('.save-status');
  if (status) status.innerHTML = '<i></i>SALVANDO...';
  try {
    const card = app.querySelector('#story-card');
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const direction = index === 0 ? -1 : 1;
      await card.animate([
        { transform: card.style.transform || 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${direction * (window.innerWidth + card.offsetWidth)}px, 35px) rotate(${direction * 24}deg)`, opacity: 0 },
      ], { duration: 230, easing: 'ease-in', fill: 'forwards' }).finished;
    }
    const updated = choose(career, index);
    await saveChoice(updated, career.revision);
    seasonNotice = updated.season !== career.season ? `Nova temporada ${updated.season} · ${updated.player.name} agora tem ${updated.player.age} anos.` : '';
    career = updated;
  } catch (error) {
    notice = `${error.message} A escolha não foi aplicada.`;
  }
  busy = false;
  render();
}

async function start() {
  try {
    career = await loadCareer();
    render();
  } catch (error) {
    app.innerHTML = errorScreen(error.message);
    document.querySelector('#retry').addEventListener('click', () => location.reload());
  }
}

start();
