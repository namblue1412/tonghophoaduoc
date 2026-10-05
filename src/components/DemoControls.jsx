import React, { useState } from 'react';
import { DEMO_USERS, selectDemoUser, retryDemoDrafts, simulateDemoConflict } from '../services/demoBackend.js';
import { SyncConflictDialog } from './SyncConflictDialog';
import { useExperiment } from '../context/ExperimentContext';
import { useAuth } from '../context/AuthContext';

export function DemoControls() {
  const { currentUser } = useAuth();
  const { syncError, syncMode, isSyncing, lastSaved, activeExperiment, allExperiments, clearSyncError, exportAllToJson, importFromJson } = useExperiment();
  const [dialogId, setDialogId] = useState(null);
  const [message, setMessage] = useState('');
  const [importing, setImporting] = useState(false);
  const [importWarnings, setImportWarnings] = useState([]);
  const conflicts = allExperiments.filter((e) => e.demoConflict);
  React.useEffect(() => {
    delete document.documentElement.dataset.labDark;
    localStorage.removeItem('medchem_demo_dark');
    sessionStorage.removeItem('medchem_demo_offline');
  }, []);
  React.useEffect(() => { if (conflicts.length) setDialogId(conflicts[0].id); }, [conflicts.map((e) => e.id).join('|'), currentUser?.uid]);
  const dialogExperiment = conflicts.find((e) => e.id === dialogId);
  return <aside className="demo-controls no-print bg-amber-100 border-b border-amber-300 px-4 py-3 space-y-2 text-amber-950">
    <p className="font-bold">DEMO CÁCH LY — dữ liệu thử lưu trên trình duyệt, không kết nối Firebase thật.</p>
    <details open={!currentUser}>
    <summary className="cursor-pointer py-2">Điều khiển kiểm thử · {currentUser?.displayName || 'Chọn tài khoản demo'}</summary>
    <div className="flex flex-wrap gap-3 items-center">
      {DEMO_USERS.map((user) => <button className={`px-3 py-2 rounded-lg border ${currentUser?.uid === user.uid ? 'bg-amber-900 text-white' : 'bg-white text-amber-950'}`} key={user.uid} onClick={() => selectDemoUser(user.uid)}>{user.displayName}</button>)}
      <button onClick={() => void retryDemoDrafts()} className="border rounded-lg px-3 py-2">Thử lại bản nháp</button>
      <button disabled={!activeExperiment || isSyncing || activeExperiment.demoPending} className="border rounded-lg px-3 py-2" onClick={async () => { try { await simulateDemoConflict(activeExperiment.id); } catch (err) { setMessage(err.message); } }}>Thử xung đột thiết bị A/B</button>
      <label className="border rounded-lg px-3 py-2 cursor-pointer">{importing ? 'Đang nhập…' : 'Nhập JSON xuất từ web main'}<input className="block max-w-full mt-2" type="file" accept=".json,application/json" disabled={!currentUser || importing} onChange={async (e) => {
        const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
        setImporting(true); setMessage(''); setImportWarnings([]);
        try { const result = await importFromJson(file); setImportWarnings(result.weighingWarnings || []); setMessage(`Đã sao chép ${result.count} thí nghiệm vào demo.${result.remoteAssetCount ? ` Có ${result.remoteAssetCount} ảnh/tệp là liên kết ngoài: đã giữ đường dẫn trong sourceRemoteAssets, không tải nội dung từ Firebase.` : ''}`); } catch (err) { setMessage(err.message); } finally { setImporting(false); }
      }} /></label>
    </div>
    </details>
    {activeExperiment?.sourceRemoteAssets?.length > 0 && <details><summary className="cursor-pointer py-2">{activeExperiment.sourceRemoteAssets.length} ảnh/tệp nguồn chưa có trong bản sao</summary><p>Ảnh nhúng vẫn hiển thị. Các liên kết dưới đây chỉ dùng đối chiếu, không tự tải:</p><ul>{activeExperiment.sourceRemoteAssets.map((asset, i) => <li className="text-xs break-all" key={i}>{asset.path}: {asset.sourceUrl}</li>)}</ul></details>}
    <p role="status">{isSyncing ? 'Đang lưu bản nháp…' : syncMode === 'demo-pending' ? 'Bản nháp đã lưu cục bộ; chờ đồng bộ giả lập.' : lastSaved ? `Đã lưu database demo lúc ${lastSaved.toLocaleTimeString('vi-VN')}` : 'Sẵn sàng thử nghiệm.'}</p>
    {(syncError || activeExperiment?.demoConflict) && <p role="alert" className="text-rose-900 font-semibold">{syncError || activeExperiment.demoConflict}</p>}
    {message && <p role="status">{message}</p>}
    {importWarnings.length > 0 && <details open><summary className="font-semibold">Đã nhập, cần kiểm tra {importWarnings.length} ống cân</summary><ul className="list-disc pl-5">{importWarnings.map((warning, i) => <li key={i}>{warning}</li>)}</ul><p className="text-sm">Giữ nguyên số gốc. Ống chưa đủ số cân hoặc cả bì nhỏ hơn bì chưa được cộng vào khối lượng; mở thí nghiệm để hoàn tất cân.</p></details>}
    {conflicts.length > 0 && <div className="flex flex-wrap gap-3"><button onClick={exportAllToJson}>Xuất bản nháp để đối chiếu</button>{conflicts.map((e) => <button key={e.id} onClick={() => setDialogId(e.id)}>Xử lý xung đột {e.code}</button>)}</div>}
    {dialogExperiment && <SyncConflictDialog key={dialogExperiment.id} experiment={dialogExperiment} onClose={() => setDialogId(null)} onResolved={(choice) => { clearSyncError(); setDialogId(null); setMessage(choice === 'cloud' ? 'Đã lấy bản cloud thử nghiệm, bỏ bản nháp xung đột.' : 'Đã đồng bộ bản trên máy lên kho thử nghiệm.'); }} />}
  </aside>;
}
