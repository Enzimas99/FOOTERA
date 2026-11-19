import { ATTRIBUTES, COUNTRIES, POSITIONS, RELATIONSHIPS } from './game/data.js';
import { choose, createCareer, currentEvent, eventText } from './game/engine.js';
import { createSave, loadCareer, saveChoice } from './storage.js';

const app = document.querySelector('#app');
let career = null;
let busy = false;
let notice = '';

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const money = value => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
const initials = name => name.split(' ').filter(Boolean).slice(0, 2).map(part => part[0].toLocaleUpperCase('pt-BR')).join('');
const number = value => String(value).padStart(2, '0');

function logo() {
  return `<span class="brand-mark" aria-hidden="true"><span>F</span><span>C</span></span><span class="brand-word">FOOT<span>ERA</span><small>UMA CARREIRA DE FUTEBOL</small></span>`;
}

function figure(appearance, primary, secondary, compact = false) {
  const skin = escapeHtml(appearance.skin);
  const hair = escapeHtml(appearance.hair);
  const shirt = escapeHtml(primary);
  const detail = escapeHtml(secondary);
  return `<svg class="figure ${compact ? 'figure--compact' : ''}" viewBox="0 0 360 250" role="img" aria-label="Ilustração de personagem de futebol">
    <circle cx="180" cy="128" r="105" fill="#e7cda6"/>
    <circle cx="180" cy="128" r="89" fill="none" stroke="#f3e5cd" stroke-width="1.5" stroke-dasharray="4 7"/>
    <path d="M42 176 Q87 154 105 157 M255 157 Q285 147 318 174" fill="none" stroke="#739682" stroke-width="3"/>
    <path d="M89 54 L95 44 M94 49 L104 54 M260 62 L267 51 M261 53 L270 61" stroke="#f5f1df" stroke-width="3" stroke-linecap="round"/>
    <path d="M111 249 Q110 207 122 183 Q134 169 159 163 L201 163 Q226 169 238 183 Q250 207 249 249Z" fill="${shirt}"/>
    <path d="M158 163 Q180 190 202 163 L195 156 L165 156Z" fill="${detail}"/>
    <path d="M168 165 Q180 179 192 165 L192 147 L168 147Z" fill="${skin}"/>
    <path d="M146 111 Q143 72 180 68 Q217 72 214 111 L210 136 Q204 160 180 165 Q156 160 150 136Z" fill="${skin}"/>
    <path d="M146 112 Q138 89 149 75 Q155 58 180 61 Q213 59 216 85 L214 106 Q208 98 207 91 Q192 99 169 89 Q158 100 146 112Z" fill="${hair}"/>
    <path d="M159 119 Q163 116 167 119 M193 119 Q197 116 201 119" stroke="#3d3028" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M172 143 Q180 148 188 143" fill="none" stroke="#70483e" stroke-width="2" stroke-linecap="round"/>
    <path d="M138 185 L147 192 M222 185 L213 192" stroke="${detail}" stroke-width="4"/>
    <path d="M178 207 L184 207 L184 224 L178 224Z" fill="${detail}" opacity=".85"/>
    <circle cx="281" cy="203" r="20" fill="#f8f4e8" stroke="#25483c" stroke-width="2"/>
    <path d="M281 193 l7 5 -2 8 -9 0 -3 -8z M272 189 l5 5 M290 190 l-3 5 M264 204 l9 0 M296 204 l-8 0 M276 215 l2 -9 M287 215 l-2 -9" fill="none" stroke="#25483c" stroke-width="1.5"/>
  </svg>`;
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

function meterBar(key, value) {
  const relation = RELATIONSHIPS[key];
  return `<div class="meter" title="${escapeHtml(relation.label)}: ${value} de 100"><div class="meter-heading"><span class="meter-icon" aria-hidden="true">${relation.icon}</span><span>${relation.label}</span><b>${value}</b></div><div class="meter-track" role="meter" aria-label="${relation.label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${value}"><span style="width:${value}%"></span></div></div>`;
}

function playerPanel(player) {
  const attributes = Object.entries(ATTRIBUTES).map(([key, label]) => `<div class="attribute-row"><span>${label}</span><b>${player.attributes[key]}</b></div>`).join('');
  return `<aside class="profile-panel"><div class="panel-heading"><span>SEU PERFIL</span><span>↗</span></div>
    <div class="profile-art"><div class="profile-art-bg">${figure(player.appearance, player.club.colors.primary, player.club.colors.secondary, true)}</div><span class="profile-number">${POSITIONS[player.position].short}</span></div>
    <div class="profile-info"><span class="tiny-label">O PROTAGONISTA</span><h3>${escapeHtml(player.name)}</h3><p>${escapeHtml(player.nationality)} <span>•</span> ${player.age} anos</p></div>
    <div class="profile-stats"><div><small>POSIÇÃO</small><strong>${POSITIONS[player.position].short}</strong></div><div><small>OVERALL</small><strong>${player.overall}</strong></div><div><small>POTENCIAL</small><strong>${player.potential}</strong></div></div>
    <div class="profile-club"><span class="club-crest" style="--club-color:${escapeHtml(player.club.colors.primary)};--club-detail:${escapeHtml(player.club.colors.secondary)}">✦</span><div><small>SEU CLUBE</small><b>${escapeHtml(player.club.name)}</b></div></div>
    <details class="profile-details"><summary>Conheça seu jogador <span>＋</span></summary><div class="details-body"><p><b>Origem</b><br>${escapeHtml(player.origin.label)}</p><p><b>Pé dominante</b> ${escapeHtml(player.dominantFoot)} <span>·</span> <b>Altura</b> ${player.height} cm</p><p><b>Personalidade</b><br>${player.traits.map(escapeHtml).join(' · ')}</p><p><b>Reputação</b><br>${escapeHtml(player.reputation)}</p><div class="attribute-title">ATRIBUTOS</div>${attributes}</div></details>
  </aside>`;
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
  return `<li class="timeline-entry"><div class="timeline-marker">${number(index + 1)}</div><div><span class="timeline-category">${escapeHtml(entry.category)}</span><p>${escapeHtml(entry.choice)}</p><small>${escapeHtml(changeSummary(entry.changes))}</small><details class="decision-detail"><summary>Ver acontecimento</summary><p>${escapeHtml(entry.text)}</p><small>Com ${escapeHtml(entry.personName)}</small></details></div></li>`;
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

function gameScreen(state) {
  const player = state.player;
  const event = currentEvent(state);
  const person = player.people[event.actor];
  const characterColor = event.actor === 'companheiro' || event.actor === 'torcida' ? player.club.colors.primary : '#526e5d';
  const latest = state.history.at(-1);
  return `<div class="matchday-shell">
    <header class="matchday-header"><div class="brand">${logo()}</div><div class="matchday-header-right"><span class="save-status"><i></i>${busy ? 'SALVANDO...' : 'SALVO NESTE NAVEGADOR'}</span><button class="header-action" data-open="history-dialog" type="button">☷ <span>História</span></button><button class="header-action profile-action" data-open="profile-dialog" type="button">◉ <span>Perfil</span></button></div></header>
    <main class="matchday-main"><div class="matchday-meta"><div><span>CAPÍTULO</span><strong>${number(state.history.length + 1)}</strong></div><div class="meta-club"><span>${escapeHtml(player.club.name)}</span><strong>${escapeHtml(player.name)}</strong></div><div class="meta-right"><span>TEMPORADA</span><strong>${number(state.season)}</strong></div></div>
      <section class="relationship-strip" aria-label="Indicadores de relacionamento">${Object.entries(player.relationships).map(([key, value]) => meterBar(key, value)).join('')}</section>
      ${notice ? `<div class="notice" role="alert">${escapeHtml(notice)}</div>` : ''}
      <section class="matchday-stage" aria-label="Próxima decisão"><div class="stage-label"><span>A SUA CARREIRA</span><span>✳</span><span>CADA ESCOLHA CONTA</span></div>
        <article class="story-card decision-card" id="story-card"><div class="card-top"><span><i></i> ${escapeHtml(event.category)}</span><span>FOOTERA / ${number(state.history.length + 1)}</span></div>
          <div class="decision-content"><p class="decision-message">${escapeHtml(eventText(event, state))}</p>
            <div class="decision-prompt">QUAL É A SUA RESPOSTA?</div>
            <div class="choices">${event.options.map((option, index) => `<button class="choice-button" data-choice="${index}" ${busy ? 'disabled' : ''}><span class="choice-letter">${index === 0 ? 'A' : 'B'}</span><span>${escapeHtml(option.label)}</span><span class="choice-arrow" aria-hidden="true">${index === 0 ? '←' : '→'}</span></button>`).join('')}</div>
          </div>
          <div class="card-art">${figure(person.appearance, characterColor, player.club.colors.secondary)}<span class="art-side-text">O FUTEBOL É FEITO DE HISTÓRIAS</span><span class="art-index">✳</span></div>
          <div class="card-person"><span>${escapeHtml(person.role.toUpperCase())}</span><strong>${escapeHtml(person.name)}</strong><span>${escapeHtml(initials(person.name))}</span></div>
        </article>
        <p class="swipe-hint">← ARRASTE A CARTA OU ESCOLHA UMA RESPOSTA →</p>
      </section>
      <div class="matchday-foot"><div><span>ÚLTIMA ESCOLHA</span><strong>${latest ? escapeHtml(latest.choice) : 'Sua história começa agora'}</strong></div><div class="meta-right"><span>SALDO DISPONÍVEL</span><strong>${money(player.money)}</strong></div></div>
    </main>
    <dialog class="game-dialog" id="profile-dialog" aria-label="Perfil do jogador"><div class="dialog-head"><span>PERFIL DO JOGADOR</span><button type="button" data-close="profile-dialog" aria-label="Fechar perfil">✕</button></div>${playerPanel(player)}</dialog>
    <dialog class="game-dialog" id="history-dialog" aria-label="Histórico da carreira"><div class="dialog-head"><span>HISTÓRICO DA CARREIRA</span><button type="button" data-close="history-dialog" aria-label="Fechar histórico">✕</button></div>${historyPanel(state)}</dialog>
  </div>`;
}

function errorScreen(message) {
  return `${header()}<main class="error-screen"><span class="small-kicker">NÃO FOI POSSÍVEL CONTINUAR</span><h1>Seu salvamento<br><em>merece cuidado.</em></h1><p>${escapeHtml(message)}</p><p>Os dados existentes não foram substituídos. Verifique o armazenamento do navegador e recarregue a página.</p><button class="start-button" id="retry">TENTAR NOVAMENTE <span>↗</span></button></main>`;
}

function render() {
  app.innerHTML = career ? gameScreen(career) : creationScreen();
  if (career) {
    app.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => makeChoice(Number(button.dataset.choice))));
    app.querySelectorAll('[data-open]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.open).showModal()));
    app.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => document.getElementById(button.dataset.close).close()));
    app.querySelectorAll('.game-dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); }));
    const card = document.querySelector('#story-card');
    let start = null;
    card.addEventListener('pointerdown', event => {
      if (busy || event.button !== 0 || event.target.closest('button')) return;
      start = { x: event.clientX, y: event.clientY };
      card.setPointerCapture(event.pointerId);
    });
    card.addEventListener('pointerup', event => {
      if (!start || busy) return;
      const dx = event.clientX - start.x;
      const dy = event.clientY - start.y;
      start = null;
      if (Math.abs(dx) > 75 && Math.abs(dx) > Math.abs(dy) * 1.2) makeChoice(dx < 0 ? 0 : 1);
    });
    card.addEventListener('pointercancel', () => { start = null; });
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
  render();
  try {
    const updated = choose(career, index);
    await saveChoice(updated, career.revision);
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
