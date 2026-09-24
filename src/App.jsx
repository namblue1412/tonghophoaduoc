import React, { useState } from 'react';
import { ExperimentProvider, useExperiment } from './context/ExperimentContext';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { ExperimentDetail } from './pages/ExperimentDetail';
import { PlusCircle, X, FlaskConical, Beaker } from 'lucide-react';

function AppContent() {
  const {
    activeExperimentId,
    setActiveExperimentId,
    createNewExperiment
  } = useExperiment();

  const [currentView, setCurrentView] = useState('detail'); // 'dashboard' | 'detail'
  const [newModalOpen, setNewModalOpen] = useState(false);

  // New Experiment Form State
  const [newCode, setNewCode] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newResearcher, setNewResearcher] = useState('Nghiên cứu viên');
  const [newLabRoom, setNewLabRoom] = useState('Phòng Hóa Dược');
  const [newTargetName, setNewTargetName] = useState('');

  const handleOpenNewModal = () => {
    setNewCode(`SYN-${Date.now().toString().slice(-3)}`);
    setNewTitle('');
    setNewTargetName('');
    setNewModalOpen(true);
  };

  const handleCreateConfirm = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert('Vui lòng nhập tên phản ứng thí nghiệm!');
      return;
    }

    const created = await createNewExperiment({
      code: newCode.trim() || 'SYN-EXP',
      title: newTitle.trim(),
      researcher: newResearcher.trim(),
      labRoom: newLabRoom.trim(),
      targetName: newTargetName.trim() || 'Sản phẩm mục tiêu'
    });

    setNewModalOpen(false);
    setCurrentView('detail');
  };

  const handleSelectExperiment = (id) => {
    setActiveExperimentId(id);
    setCurrentView('detail');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans">
      {/* Navbar with Dual-mode indicator & quick actions */}
      <Navbar
        onOpenNewModal={handleOpenNewModal}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {currentView === 'dashboard' ? (
          <Dashboard
            onSelectExperiment={handleSelectExperiment}
            onOpenNewModal={handleOpenNewModal}
          />
        ) : (
          <ExperimentDetail
            onBackToDashboard={() => setCurrentView('dashboard')}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium text-slate-700">
            <FlaskConical className="w-4 h-4 text-indigo-600" />
            <span>MedChem ELN - Nhật Ký Nghiên Cứu Tổng Hợp Hóa Dược</span>
          </div>
          <div>
            Hỗ trợ chế độ Kép (Firebase Realtime Cloud & Offline LocalStorage) • Chuẩn GLP Lab Dược
          </div>
        </div>
      </footer>

      {/* MODAL: CREATE NEW EXPERIMENT */}
      {newModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 my-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Beaker className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-slate-900">
                    Khởi Tạo Thí Nghiệm Mới
                  </h3>
                  <p className="text-xs text-slate-500">
                    Khai báo thông tin ban đầu cho nhật ký tổng hợp hóa dược
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateConfirm} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Mã TN:
                  </label>
                  <input
                    type="text"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="SYN-01"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold text-indigo-700 focus:outline-none min-h-[44px]"
                  />
                </div>

                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Sản phẩm mục tiêu dự kiến:
                  </label>
                  <input
                    type="text"
                    value={newTargetName}
                    onChange={(e) => setNewTargetName(e.target.value)}
                    placeholder="VD: Dẫn xuất Coumarin / Chalcone..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Tên phản ứng / Thí nghiệm (*):
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="VD: Tổng hợp 4-Methylumbelliferone bằng phản ứng Pechmann"
                  required
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Nghiên cứu viên:
                  </label>
                  <input
                    type="text"
                    value={newResearcher}
                    onChange={(e) => setNewResearcher(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Phòng thí nghiệm:
                  </label>
                  <input
                    type="text"
                    value={newLabRoom}
                    onChange={(e) => setNewLabRoom(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none min-h-[44px]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setNewModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm text-slate-600 hover:bg-slate-100 font-medium min-h-[44px]"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md min-h-[44px] flex items-center gap-1.5"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Tạo & Mở Nhật Ký</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ExperimentProvider>
      <AppContent />
    </ExperimentProvider>
  );
}
