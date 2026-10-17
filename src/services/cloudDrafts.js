// Production drafts use a different database from the isolated demo.
let opening;
function database() {
  return opening ||= new Promise((resolve, reject) => {
    const request = indexedDB.open('medchem-cloud-drafts-v1', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('drafts', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error);
  });
}
async function operation(mode, action) {
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('drafts', mode); let value;
    const request = action(tx.objectStore('drafts'));
    request.onsuccess = () => { value = request.result; };
    tx.oncomplete = () => resolve(value); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  });
}
export const cloudDrafts = { all: () => operation('readonly', (s) => s.getAll()), put: (d) => operation('readwrite', (s) => s.put(d)), delete: (id) => operation('readwrite', (s) => s.delete(id)) };
