import React, { useState } from 'react';
import { DEMO_USERS, selectDemoUser, setDemoOffline, retryDemoDrafts, discardDemoDrafts } from '../services/demoBackend.js';
import { useExperiment } from '../context/ExperimentContext';
import { useAuth } from '../context/AuthContext';

export function DemoControls() {
  const { currentUser } = useAuth();
  const { syncError, syncMode, isSyncing, lastSaved, activeExperiment, exportAllToJson } = useExperiment();
  const [offline, setOffline] = useState(() => sessionStorage.getItem('medchem_demo_offline') === 'true');
  const [dark, setDark] = useState(() => localStorage.getItem('medchem_demo_dark') === 'true');
  React.useEffect(() => { document.documentElement.dataset.labDark = String(dark); localStorage.setItem('medchem_demo_dark', String(dark)); }, [dark]);
  return <aside className="demo-controls no-print bg-amber-100 border-b border-amber-300 px-4 py-3 space-y-2 text-amber-950">
    <p className="font-bold">DEMO CÁCH LY — dữ liệu thử lưu trên trình duyệt, không kết nối Firebase thật.</p>
    <details open={!currentUser}>
    <summary className="cursor-pointer py-2">Điều khiển kiểm thử · {currentUser?.displayName || 'Chọn tài khoản demo'}</summary>
    <div className="flex flex-wrap gap-3 items-center">
      {DEMO_USERS.map((user) => <button className={`px-3 py-2 rounded-lg border ${currentUser?.uid === user.uid ? 'bg-amber-900 text-white' : 'bg-white text-amber-950'}`} key={user.uid} onClick={() => selectDemoUser(user.uid)}>{user.displayName}</button>)}
      <label className="flex items-center gap-2"><input type="checkbox" checked={offline} onChange={(e) => { setOffline(e.target.checked); setDemoOffline(e.target.checked); }} />Giả lập mất mạng</label>
      <button onClick={() => void retryDemoDrafts()} className="border rounded-lg px-3 py-2">Thử lại bản nháp</button>
      <button className="border rounded-lg px-3 py-2" onClick={() => setDark(!dark)}>{dark ? 'Chế độ sáng' : 'Phòng tối UV'}</button>
    </div>
    </details>
    <p role="status">{isSyncing ? 'Đang lưu bản nháp…' : syncMode === 'demo-pending' ? 'Bản nháp đã lưu cục bộ; chờ đồng bộ giả lập.' : lastSaved ? `Đã lưu database demo lúc ${lastSaved.toLocaleTimeString('vi-VN')}` : 'Sẵn sàng thử nghiệm.'}</p>
    {(syncError || activeExperiment?.demoConflict) && <p role="alert" className="text-rose-900 font-semibold">{syncError || activeExperiment.demoConflict}</p>}
    {activeExperiment?.demoConflict && <div className="flex gap-3"><button onClick={exportAllToJson}>Xuất bản nháp để đối chiếu</button><button onClick={() => { if (confirm('Bỏ bản nháp xung đột và tải bản đã lưu? Hãy xuất JSON trước nếu cần giữ nội dung.')) void discardDemoDrafts(activeExperiment.id); }}>Bỏ bản nháp, tải bản đã lưu</button></div>}
  </aside>;
}
