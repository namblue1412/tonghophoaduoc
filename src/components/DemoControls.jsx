import React, { useState } from 'react';
import { retryDemoDrafts } from '../services/demoBackend.js';
import { SyncConflictDialog } from './SyncConflictDialog';
import { useExperiment } from '../context/ExperimentContext';
import { useAuth } from '../context/AuthContext';

export function DemoControls() {
  const { currentUser } = useAuth();
  const { syncError, allExperiments, clearSyncError, exportAllToJson } = useExperiment();
  const [dialogId, setDialogId] = useState(null);
  const conflicts = allExperiments.filter((e) => e.demoConflict);
  React.useEffect(() => {
    delete document.documentElement.dataset.labDark;
    localStorage.removeItem('medchem_demo_dark');
    sessionStorage.removeItem('medchem_demo_offline');
  }, []);
  React.useEffect(() => { if (conflicts.length) setDialogId(conflicts[0].id); }, [conflicts.map((e) => e.id).join('|'), currentUser?.uid]);
  const dialogExperiment = conflicts.find((e) => e.id === dialogId);
  return <>
    {syncError && !conflicts.length && <div role="alert" className="no-print mx-4 my-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-rose-800">{syncError}<button className="ml-3 underline" onClick={() => void retryDemoDrafts()}>Thử lưu lại</button></div>}
    {conflicts.length > 0 && !dialogExperiment && <div className="no-print mx-4 my-2 rounded-lg border border-rose-200 p-3 text-rose-800"><p>Có dữ liệu cần đối chiếu trước khi đồng bộ.</p><button onClick={exportAllToJson}>Xuất bản nháp</button>{conflicts.map((e) => <button className="ml-3 underline" key={e.id} onClick={() => setDialogId(e.id)}>Xử lý xung đột {e.code}</button>)}</div>}
    {dialogExperiment && <SyncConflictDialog key={dialogExperiment.id} experiment={dialogExperiment} onClose={() => setDialogId(null)} onResolved={() => { clearSyncError(); setDialogId(null); }} />}
  </>;
}
