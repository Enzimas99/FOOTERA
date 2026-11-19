const DB_NAME = 'entre-linhas';
const DB_VERSION = 1;
const SAVE_FORMAT = 1;
const STORE = 'saves';
const KEY = 'active';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Não foi possível abrir o salvamento deste navegador.'));
    request.onblocked = () => reject(new Error('Feche outras abas do jogo e tente novamente.'));
  });
}

function unpack(value) {
  if (!value) return null;
  if (value.format !== SAVE_FORMAT || !value.career) throw new Error('Este salvamento pertence a uma versão incompatível do jogo. Seus dados não foram alterados.');
  return value.career;
}

export async function loadCareer() {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readonly');
      const request = transaction.objectStore(STORE).get(KEY);
      request.onsuccess = () => {
        try { resolve(unpack(request.result)); } catch (error) { reject(error); }
      };
      request.onerror = () => reject(new Error('Não foi possível ler a carreira salva.'));
    });
  } finally { db.close(); }
}

export async function createSave(career) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, 'readwrite');
      transaction.objectStore(STORE).add({ format: SAVE_FORMAT, career }, KEY);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(new Error('Já existe uma carreira ativa ou não foi possível salvá-la. Recarregue a página.'));
      transaction.onabort = () => reject(new Error('Não foi possível salvar a carreira.'));
    });
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
          const saved = unpack(request.result);
          if (!saved || saved.id !== career.id || saved.revision !== expectedRevision) {
            failure = new Error('A carreira mudou em outra aba. Recarregue a página para continuar com os dados salvos.');
            transaction.abort();
            return;
          }
          store.put({ format: SAVE_FORMAT, career }, KEY);
        } catch (error) {
          failure = error;
          transaction.abort();
        }
      };
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(failure || new Error('Não foi possível salvar esta escolha.'));
      transaction.onabort = () => reject(failure || new Error('Não foi possível salvar esta escolha.'));
    });
  } finally { db.close(); }
}
