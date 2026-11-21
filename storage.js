import { upgradeCareer } from './game/engine.js';

const DB_NAME = 'entre-linhas';
const DB_VERSION = 2;
export const SAVE_FORMAT = 2;
const STORE = 'saves';
const ARCHIVE = 'archive';
const BACKUPS = 'backups';
const KEY = 'active';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      if (!db.objectStoreNames.contains(ARCHIVE)) db.createObjectStore(ARCHIVE);
      if (!db.objectStoreNames.contains(BACKUPS)) db.createObjectStore(BACKUPS);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Não foi possível abrir o salvamento deste navegador.'));
    request.onblocked = () => reject(new Error('Feche outras abas do jogo e tente novamente.'));
  });
}

// Aceita os formatos 1 e 2. O formato 1 é convertido por upgradeCareer sem alterar o original salvo.
export function unpack(value) {
  if (!value) return null;
  if (![1, SAVE_FORMAT].includes(value.format) || !value.career) throw new Error('Este salvamento pertence a uma versão incompatível do jogo. Seus dados não foram alterados.');
  return value;
}

const wrap = (transaction, action) => new Promise((resolve, reject) => {
  let result;
  transaction.oncomplete = () => resolve(result);
  transaction.onerror = () => reject(transaction.error ?? new Error('Falha no salvamento.'));
  transaction.onabort = () => reject(transaction.error ?? new Error('Salvamento cancelado.'));
  result = action();
});

export async function loadCareer() {
  const db = await openDatabase();
  try {
    const raw = await new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(KEY);
      request.onsuccess = () => { try { resolve(unpack(request.result)); } catch (error) { reject(error); } };
      request.onerror = () => reject(new Error('Não foi possível ler a carreira salva.'));
    });
    if (!raw) return null;
    if (raw.format === SAVE_FORMAT) return upgradeCareer(raw.career);
    // Formato 1: guarda uma cópia intacta antes de gravar a versão migrada.
    const upgraded = upgradeCareer(raw.career);
    const transaction = db.transaction([STORE, BACKUPS], 'readwrite');
    await wrap(transaction, () => {
      transaction.objectStore(BACKUPS).put(raw, `format1:${raw.career.id}`);
      transaction.objectStore(STORE).put({ format: SAVE_FORMAT, career: upgraded }, KEY);
    });
    return upgraded;
  } finally { db.close(); }
}

export async function createSave(career) {
  const db = await openDatabase();
  try {
    const transaction = db.transaction(STORE, 'readwrite');
    await wrap(transaction, () => transaction.objectStore(STORE).add({ format: SAVE_FORMAT, career }, KEY));
  } catch (error) {
    throw new Error('Já existe uma carreira ativa ou não foi possível salvá-la. Recarregue a página.');
  } finally { db.close(); }
}

export async function saveChoice(career, expectedRevision) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      const store = transaction.objectStore(STORE);
      const request = store.get(KEY);
      let failure;
      request.onsuccess = () => {
        try {
          const saved = unpack(request.result)?.career;
          if (!saved || saved.id !== career.id || saved.revision !== expectedRevision) {
            failure = new Error('A carreira mudou em outra aba. Recarregue a página para continuar com os dados salvos.');
            transaction.abort();
            return;
          }
          store.put({ format: SAVE_FORMAT, career }, KEY);
        } catch (error) { failure = error; transaction.abort(); }
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(failure || new Error('Não foi possível salvar esta escolha.'));
      transaction.onabort = () => reject(failure || new Error('Não foi possível salvar esta escolha.'));
    });
  } finally { db.close(); }
}

// Move uma carreira aposentada para o arquivo permanente e libera o espaço da carreira ativa.
export function archiveEntry(career) {
  const { world, ...rest } = career;
  const { player } = career;
  return {
    ...rest, world: undefined, archivedAt: new Date().toISOString(),
    summary: { id: career.id, name: player.name, position: player.position, nationality: player.nationality, retiredAge: career.retirement?.age ?? player.age, seasons: player.seasons.length, overall: player.overall, stats: structuredClone(player.stats), trophies: structuredClone(player.trophies), awards: structuredClone(player.awards), clubs: structuredClone(player.clubHistory), peakFame: player.fame },
  };
}

export async function archiveCareer(career) {
  const db = await openDatabase();
  try {
    const transaction = db.transaction([STORE, ARCHIVE], 'readwrite');
    await wrap(transaction, () => {
      transaction.objectStore(ARCHIVE).put(archiveEntry(career), career.id);
      transaction.objectStore(STORE).delete(KEY);
    });
  } finally { db.close(); }
}

export async function listArchive() {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(ARCHIVE, 'readonly').objectStore(ARCHIVE).getAll();
      request.onsuccess = () => resolve(request.result.map(entry => entry.summary));
      request.onerror = () => reject(new Error('Não foi possível ler o arquivo de carreiras.'));
    });
  } finally { db.close(); }
}

// Livro de recordes: agrega as carreiras arquivadas (e a ativa, se houver).
export function recordBook(summaries) {
  const best = (selector) => summaries.reduce((top, item) => (!top || selector(item) > selector(top) ? item : top), null);
  return {
    careers: summaries.length,
    mostGoals: best(item => item.stats.goals), mostMatches: best(item => item.stats.matches),
    mostTrophies: best(item => item.trophies.length), highestOverall: best(item => item.overall),
  };
}
