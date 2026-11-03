const DB_NAME = "onlycars-studio-local";
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("이 브라우저는 로컬 프로젝트 저장을 지원하지 않습니다."));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("projects")) {
        db.createObjectStore("projects", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("로컬 저장소를 열지 못했습니다."));
  });
}

async function transact(mode, operation) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("projects", mode);
    const store = tx.objectStore("projects");
    const request = operation(store);
    if (request) {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error("프로젝트 저장에 실패했습니다."));
    }
    tx.oncomplete = () => {
      db.close();
      if (!request) resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error("프로젝트 저장에 실패했습니다."));
    };
    tx.onabort = () => {
      db.close();
      reject(tx.error || new Error("프로젝트 저장이 취소됐습니다."));
    };
  });
}

export async function listProjects() {
  return (await transact("readonly", store => store.getAll())) || [];
}

export async function getProject(id) {
  return transact("readonly", store => store.get(id));
}

export function saveProject(project) {
  return transact("readwrite", store => store.put(project));
}

export function removeProject(id) {
  return transact("readwrite", store => store.delete(id));
}
