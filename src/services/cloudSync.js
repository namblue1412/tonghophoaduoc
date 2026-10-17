import { changedFields, deriveExperiment, mergePatch, asArray } from '../domain/experiment.js';

const clean = (value) => JSON.parse(JSON.stringify(value, (key, child) => ['demoPending', 'demoConflict'].includes(key) ? undefined : child));
export function assertCompatible(base, current, patch, path = '') {
  for (const [key, value] of Object.entries(patch || {})) {
    if (value && typeof value === 'object' && !Array.isArray(value)) assertCompatible(base?.[key], current?.[key], value, `${path}${key}.`);
    else if (JSON.stringify(base?.[key]) !== JSON.stringify(current?.[key]) && JSON.stringify(value) !== JSON.stringify(current?.[key])) throw new Error(`Xung đột tại ${path}${key}. Bản nháp được giữ trên máy.`);
  }
}
export function normalizeCloudRecord(raw, user) {
  if (!raw) return raw;
  const list = asArray;
  const group = raw.columnAndYield || {};
  const normalized = {
    ...raw,
    creatorId: ((!raw.creatorId || String(raw.creatorId).startsWith('stu_')) && raw.creatorEmail?.trim().toLowerCase() === user?.email?.trim().toLowerCase()) ? user?.uid : raw.creatorId,
    tlcTimeline: list(raw.tlcTimeline).map((p) => ({ ...p, spots: list(p.spots), images: p.images || { uv254: p.imageUrl || null } })),
    reportProducts: list(raw.reportProducts).map((p) => ({ ...p, plates: list(p.plates).map((t) => ({ ...t, images: t.images || {} })) })),
    columnAndYield: { ...group, fractionGroups: list(group.fractionGroups).map((g, i) => ({ ...g, id: g.id || `group-${i}`, fractionNumbers: list(g.fractionNumbers).map(Number) })) }
  };
  return deriveExperiment(normalized);
}

// Injected driver and draft store make the complete cloud flow testable without a Firebase connection.
export function createCloudSync({ driver, drafts, getUser, online = () => navigator.onLine }) {
  const listeners = new Set();
  let cloud = [], retrying, sequence = 0;
  const uid = () => { const user = getUser(); if (!user?.uid) throw new Error('Cần đăng nhập Firebase.'); return user; };
  const owned = (record, user) => !record || normalizeCloudRecord(record, user).creatorId === user.uid;
  const notify = async () => {
    const pending = await drafts.all();
    for (const entry of listeners) {
      if (getUser()?.uid !== entry.uid) continue;
      const map = new Map(cloud.filter((e) => e.creatorId === entry.uid && !e._deleted).map((e) => [e.id, e]));
      for (const d of pending.filter((d) => d.creatorId === entry.uid).sort((a, b) => a.sequence - b.sequence)) {
        const server = cloud.find((e) => e.id === d.experimentId);
        if (server?._deleted) continue;
        map.set(d.experimentId, { ...d.experiment, ...(server?.inTrash && d.kind !== 'restore' ? { inTrash: true, trashedAt: server.trashedAt } : {}), demoPending: true, demoConflict: d.conflict || '' });
      }
      entry.callback([...map.values()], pending.some((d) => d.creatorId === entry.uid) ? 'firebase-pending' : 'firebase');
    }
  };
  async function commit(draft) {
    const user = uid(); if (draft.creatorId !== user.uid) throw new Error('Tài khoản đã đổi.');
    const result = await driver.transaction(draft.experimentId, (raw) => {
      if (!owned(raw, user)) throw new Error('Không có quyền sửa thí nghiệm.');
      const current = raw && normalizeCloudRecord(raw, user);
      if (raw?.lastMutationId === draft.id) return raw;
      if (current?._deleted || (!current && draft.base)) throw new Error('Bản đã xóa; không ghi lại dữ liệu cũ.');
      if (current?.inTrash && !['trash', 'restore'].includes(draft.kind)) throw new Error('Thí nghiệm đã vào thùng rác.');
      if (current && !draft.base) throw new Error('ID thí nghiệm đã tồn tại.');
      if (current) assertCompatible(draft.base, current, draft.patch);
      return clean(deriveExperiment({ ...(current ? mergePatch(current, draft.patch) : draft.experiment), id: draft.experimentId, creatorId: user.uid, creatorEmail: user.email, lastMutationId: draft.id, revision: (current?.revision || 0) + 1, updatedAt: new Date().toISOString() }));
    });
    await drafts.delete(draft.id); return result;
  }
  async function save(experiment, options = {}) {
    let draft;
    try {
      const user = uid();
      if (experiment.creatorId !== user.uid || (options.user && options.user.uid !== user.uid)) throw new Error('Không có quyền ghi thí nghiệm.');
      const base = options.base ? clean(options.base) : null;
      const patch = clean(options.patch || (base ? changedFields(base, experiment) : {}) || {});
      for (const key of ['revision', 'updatedAt', 'auditTrail', 'creatorId', 'creatorEmail', 'lastMutationId']) delete patch[key];
      draft = { id: crypto.randomUUID(), experimentId: experiment.id, creatorId: user.uid, experiment: clean(deriveExperiment(experiment)), base, patch, kind: options.kind || 'edit', sequence: Date.now() * 1000 + sequence++ % 1000 };
      await drafts.put(draft);
      if (!online()) { await notify(); return { success: true, pending: true, mode: 'firebase-pending', data: draft.experiment }; }
      const data = await commit(draft); return { success: true, mode: 'firebase', data };
    } catch (error) {
      if (draft && /network|disconnected|unavailable|offline/i.test(error.code || '')) {
        await notify(); return { success: true, pending: true, mode: 'firebase-pending', data: draft.experiment };
      }
      if (draft) await drafts.put({ ...draft, conflict: error.message });
      return { success: false, error };
    } finally { await notify(); }
  }
  async function retry() {
    if (retrying) return retrying;
    retrying = (async () => {
      if (!getUser() || !online()) return;
      const blocked = new Set();
      for (const draft of (await drafts.all()).sort((a, b) => a.sequence - b.sequence)) {
        if (draft.creatorId !== getUser()?.uid || blocked.has(draft.experimentId)) continue;
        if (draft.conflict) { blocked.add(draft.experimentId); continue; }
        try { await commit(draft); } catch (error) {
          blocked.add(draft.experimentId);
          if (!/network|disconnected|unavailable|offline/i.test(error.code || '')) await drafts.put({ ...draft, conflict: error.message });
        }
      }
      await notify();
    })().finally(() => { retrying = null; });
    return retrying;
  }
  function subscribe(callback, userId, onError) {
    const entry = { callback, uid: userId, onError }; listeners.add(entry);
    const stop = driver.subscribe((records) => {
      cloud = records.map((r) => normalizeCloudRecord(r, getUser()));
      void notify().catch(onError); void retry().catch(onError);
    }, onError);
    void notify().catch(onError);
    return () => { listeners.delete(entry); stop(); };
  }
  async function conflict(id) {
    const user = uid(), raw = await driver.read(id);
    if (!owned(raw, user)) throw new Error('Không có quyền đọc bản này.');
    const own = (await drafts.all()).filter((d) => d.creatorId === user.uid && d.experimentId === id).sort((a, b) => a.sequence - b.sequence);
    if (!own.length) throw new Error('Không còn bản nháp xung đột.');
    return { experimentId: id, uid: user.uid, cloud: raw ? normalizeCloudRecord(raw, user) : null, local: own.at(-1).experiment, draftIds: own.map((d) => d.id), fingerprint: JSON.stringify(raw), purged: !!raw?._deleted };
  }
  async function resolve(snapshot, choice) {
    const user = uid();
    if (snapshot.uid !== user.uid || !['cloud', 'local'].includes(choice)) throw new Error('Lựa chọn hoặc tài khoản không hợp lệ.');
    const own = (await drafts.all()).filter((d) => d.creatorId === user.uid && d.experimentId === snapshot.experimentId).sort((a, b) => a.sequence - b.sequence);
    if (JSON.stringify(own.map((d) => d.id)) !== JSON.stringify(snapshot.draftIds)) throw new Error('Bản nháp đã đổi; mở lại hộp thoại.');
    if (choice === 'local') await driver.transaction(snapshot.experimentId, (raw) => {
      if (!owned(raw, user) || !raw || raw._deleted || raw.inTrash) throw new Error('Không ghi đè bản đã xóa hoặc không thuộc tài khoản.');
      if (JSON.stringify(raw) !== snapshot.fingerprint) throw new Error('Cloud đã thay đổi; chọn lại sau khi xem bản mới.');
      return clean(deriveExperiment({ ...snapshot.local, id: raw.id, creatorId: user.uid, creatorEmail: user.email, revision: (raw.revision || 0) + 1, updatedAt: new Date().toISOString() }));
    });
    for (const id of snapshot.draftIds) await drafts.delete(id);
    cloud = await driver.readAll(); cloud = cloud.map((e) => normalizeCloudRecord(e, user)); await notify();
  }
  async function purge(ids) {
    try {
      const user = uid();
      for (const id of ids) await driver.transaction(id, (raw) => {
        if (!raw || !owned(raw, user) || !raw.inTrash) throw new Error('Chỉ xóa vĩnh viễn thí nghiệm của bạn trong thùng rác.');
        // Tombstone retains required schema and blocks stale tabs from recreating the record.
        return { id, code: raw.code, title: raw.title, creatorId: user.uid, _deleted: true, inTrash: true, revision: (raw.revision || 0) + 1, updatedAt: new Date().toISOString() };
      });
      await notify(); return { success: true, count: ids.length };
    } catch (error) { return { success: false, error }; }
  }
  return { save, subscribe, retry, notify, conflict, resolve, purge };
}
