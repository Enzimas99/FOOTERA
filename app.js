import { COUNTRIES, POSITIONS } from './game/data.js';
import { choose, createCareer, currentEvent } from './game/engine.js';
import { archiveCareer, createSave, listArchive, loadCareer, saveChoice } from './storage.js';
import { creationScreen, errorScreen, gameScreen, retiredScreen } from './ui/views.js';

const app = document.querySelector('#app');
let career = null;
let busy = false;
let notice = '';
let archived = [];

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function render() {
  if (!career) {
    app.innerHTML = creationScreen({ notice, busy });
    bindCreation();
    return;
  }
  if (career.status === 'retired') {
    app.innerHTML = retiredScreen(career, archived);
    document.querySelector('#new-career').addEventListener('click', startNewCareer);
    return;
  }
  app.innerHTML = gameScreen(career, { busy, notice });
  bindGame();
  // O resumo da temporada abre sozinho, mas não bloqueia a carta seguinte.
  const summary = app.querySelector('#summary-dialog');
  if (summary) summary.showModal();
}

function bindGame() {
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
  // Atalhos de teclado: setas escolhem, como em Reigns.
  document.onkeydown = event => {
    if (busy || document.querySelector('dialog[open]')) return;
    if (event.key === 'ArrowLeft') makeChoice(0);
    if (event.key === 'ArrowRight') makeChoice(1);
  };
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
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy) * 1.1) return;
    card.classList.add('is-dragging');
    card.style.transform = `translate(${dx}px, ${Math.min(Math.abs(dx) * 0.04, 14)}px) rotate(${Math.max(-14, Math.min(14, dx / 15))}deg)`;
    showPreview(dx < 0 ? 0 : 1);
  });
  card.addEventListener('pointerup', event => {
    if (!start || busy) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (Math.abs(dx) > 75 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      start = null;
      card.classList.remove('is-dragging');
      makeChoice(dx < 0 ? 0 : 1);
    } else resetDrag();
  });
  card.addEventListener('pointercancel', resetDrag);
  card.addEventListener('lostpointercapture', () => { if (start) resetDrag(); });
}

function bindCreation() {
  document.querySelector('#career-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const form = event.currentTarget;
    const submit = form.querySelector('button[type="submit"]');
    try {
      const candidate = createCareer({ name: data.get('name'), nationality: data.get('nationality'), position: data.get('position') });
      busy = true; notice = '';
      submit.disabled = true;
      submit.firstElementChild.textContent = 'CRIANDO SUA CARREIRA...';
      await createSave(candidate);
      career = candidate;
      busy = false;
      render();
    } catch (error) {
      busy = false;
      notice = error.message;
      form.querySelector('.form-error').textContent = notice;
      submit.disabled = false;
      submit.firstElementChild.textContent = 'COMEÇAR MINHA HISTÓRIA';
    }
  });
}

async function startNewCareer() {
  try {
    await archiveCareer(career);
    archived = await listArchive();
    career = null;
    notice = '';
    render();
  } catch (error) {
    notice = error.message;
    app.insertAdjacentHTML('afterbegin', `<div class="notice" role="alert">${error.message}</div>`);
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
    if (!reducedMotion()) {
      const direction = index === 0 ? -1 : 1;
      await card.animate([
        { transform: card.style.transform || 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${direction * (window.innerWidth + card.offsetWidth)}px, 35px) rotate(${direction * 24}deg)`, opacity: 0 },
      ], { duration: 230, easing: 'ease-in', fill: 'forwards' }).finished;
    }
    const updated = choose(career, index);
    await saveChoice(updated, career.revision);
    career = updated;
    if (career.status === 'retired') archived = await listArchive().catch(() => archived);
  } catch (error) {
    notice = `${error.message} A escolha não foi aplicada.`;
  }
  busy = false;
  render();
}

async function start() {
  try {
    career = await loadCareer();
    archived = await listArchive().catch(() => []);
    render();
  } catch (error) {
    app.innerHTML = errorScreen(error.message);
    document.querySelector('#retry').addEventListener('click', () => location.reload());
  }
}

start();
