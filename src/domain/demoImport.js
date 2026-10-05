import { asArray, validateImport } from './experiment.js';

// Accept the array exported by the main web app and Firebase's keyed JSON format.
// Only transform the copy. Never fetch a remote image or mutate the source object.
export function prepareDemoImport(payload) {
  const checkKeys = (value) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (['__proto__', 'constructor', 'prototype'].includes(key)) throw new Error('Khóa dữ liệu không hợp lệ.');
      checkKeys(child);
    }
  };
  checkKeys(payload);
  const collection = Array.isArray(payload) ? payload : payload?.experiments ?? payload;
  if (!collection || typeof collection !== 'object') throw new Error('Chọn tệp JSON xuất từ web main.');
  const entries = Array.isArray(collection) ? collection.filter(Boolean).map((item) => [item.id, item]) : Object.entries(collection);
  let remoteAssetCount = 0;
  const items = entries.filter(([, item]) => item && !item._deleted && item.creatorId !== '__DELETED__').map(([key, source]) => {
    const item = structuredClone(source);
    item.id ||= key;
    item.sourceOwner = { uid: source.creatorId || null, email: source.creatorEmail || null, researcher: source.researcher || null };
    item.sourceUpdatedAt = source.updatedAt || null;
    const assets = [];
    const detach = (value, path = '') => {
      if (!value || typeof value !== 'object') return;
      for (const [field, child] of Object.entries(value)) {
        const childPath = path ? `${path}.${field}` : field;
        if (['uv254', 'uv365', 'reagent', 'imageUrl', 'dataUrl'].includes(field) && typeof child === 'string' && /^https?:\/\//i.test(child)) {
          assets.push({ path: childPath, sourceUrl: child });
          value[field] = ''; // Explicitly recorded below; no automatic Firebase connection.
        } else detach(child, childPath);
      }
    };
    detach(item);
    item.sourceRemoteAssets = [...asArray(item.sourceRemoteAssets), ...assets];
    remoteAssetCount += assets.length;
    for (const field of ['stoichiometry', 'equipment', 'tlcTimeline']) if (item[field] != null) item[field] = asArray(item[field]);
    return item;
  });
  return { items: validateImport(items), remoteAssetCount };
}
