import React, { useEffect, useState } from 'react';
import { getDemoConflict, resolveDemoConflict } from '../services/demoBackend.js';

export function SyncConflictDialog({ experiment, onResolved, onClose }) {
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [choice, setChoice] = useState('');
  useEffect(() => {
    let live = true;
    getDemoConflict(experiment.id).then((data) => { if (live) setSnapshot(data); }).catch((err) => { if (live) setError(err.message); });
    return () => { live = false; };
  }, [experiment.id]);
  const resolve = async () => {
    setBusy(true); setError('');
    try { await resolveDemoConflict(snapshot, choice); onResolved(choice); }
    catch (err) {
      setError(err.message); setChoice('');
      try { setSnapshot(await getDemoConflict(experiment.id)); } catch { setSnapshot(null); }
    } finally { setBusy(false); }
  };
  return <div className="fixed inset-0 z-[100] bg-slate-950/60 overflow-y-auto p-4 flex items-start justify-center" style={{ paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
    <section role="dialog" aria-modal="true" aria-labelledby="sync-conflict-heading" className="bg-white rounded-xl p-5 w-full max-w-2xl my-auto space-y-4">
      <h2 id="sync-conflict-heading" className="text-xl font-bold">Xung đột đồng bộ · {experiment.code}</h2>
      <p>Hai thiết bị đã sửa cùng dữ liệu. Chọn bản bạn muốn giữ.</p>
      <p className="text-sm text-amber-800">Cloud trong hộp thoại này là kho đồng bộ mô phỏng trên trình duyệt. Firebase thật không bị ghi thay đổi.</p>
      {error && <p role="alert" className="text-rose-700">{error}</p>}
      {snapshot && <>
        <div className="grid sm:grid-cols-2 gap-3">
          {[['cloud', 'Bản cloud thử nghiệm', snapshot.cloud], ['local', 'Bản trên máy này', snapshot.local]].map(([key, label, data]) => <div key={key} className="border rounded-lg p-3 min-w-0">
            <h3 className="font-bold">{label}</h3>
            <p className="break-words">{data?.title || 'Đã xóa'}</p>
            <p className="text-sm">Phiên bản: {data?.revision ?? '—'}</p>
            <p className="text-sm">Cập nhật: {data?.updatedAt ? new Date(data.updatedAt).toLocaleString('vi-VN') : 'Chưa lưu'}</p>
            <details><summary className="cursor-pointer py-2">Xem toàn bộ dữ liệu</summary><pre className="text-xs whitespace-pre-wrap break-all max-h-52 overflow-auto">{JSON.stringify(data, (k, v) => typeof v === 'string' && v.startsWith('data:') ? '[Ảnh/tệp nhúng]' : v, 2)}</pre></details>
          </div>)}
        </div>
        <div className="flex flex-wrap gap-3">
          <button disabled={busy} onClick={() => setChoice('cloud')} className="border rounded-lg px-4 py-3">Lấy dữ liệu từ cloud</button>
          <button disabled={busy || !snapshot.cloud || snapshot.purged || snapshot.cloud.inTrash} onClick={() => setChoice('local')} className="border rounded-lg px-4 py-3">Đồng bộ bản trên máy này lên</button>
        </div>
        {choice && <div className="bg-amber-50 rounded-lg p-3 space-y-2">
          <p>{choice === 'cloud' ? 'Bản nháp trên máy sẽ bị bỏ; dùng bản đã lưu ở cloud thử nghiệm.' : 'Toàn bộ bản trên máy sẽ thay thế bản cloud thử nghiệm, kể cả các sửa đổi riêng trên thiết bị kia.'}</p>
          <button disabled={busy} onClick={resolve} className="bg-teal-700 text-white rounded-lg px-4 py-3">{busy ? 'Đang xử lý…' : 'Xác nhận lựa chọn'}</button>
        </div>}
      </>}
      <button disabled={busy} onClick={onClose} className="border rounded-lg px-4 py-3">Để sau, giữ cả hai bản</button>
    </section>
  </div>;
}
