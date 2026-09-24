import React, { useState, useRef } from 'react';
import {
  FlaskConical,
  PlusCircle,
  Download,
  Upload,
  Printer,
  Cloud,
  HardDrive,
  Copy,
  Trash2,
  ChevronDown,
  Menu,
  X,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useExperiment } from '../context/ExperimentContext';

export const Navbar = ({ onOpenNewModal, onToggleListDrawer }) => {
  const {
    experiments,
    activeExperiment,
    activeExperimentId,
    setActiveExperimentId,
    duplicateExperiment,
    deleteExperiment,
    exportAllToJson,
    importFromJson,
    syncMode,
    isSyncing,
    lastSaved
  } = useExperiment();

  const [showDropdown, setShowDropdown] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const fileInputRef = useRef(null);

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const res = await importFromJson(file);
        alert(`Đã khôi phục thành công ${res.count} thí nghiệm!`);
      } catch (err) {
        alert('Lỗi nhập file: ' + err.message);
      }
      e.target.value = null;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'running':
        return <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 border border-emerald-300 animate-pulse"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Đang khuấy</span>;
      case 'paused':
        return <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 border border-amber-300"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Tạm dừng</span>;
      case 'workup':
        return <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 border border-blue-300">Xử lý thô</span>;
      case 'purification':
        return <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 border border-purple-300">Sắc ký cột</span>;
      case 'completed':
        return <span className="bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 border border-slate-300"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hoàn thành</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full font-semibold border border-slate-200">Bản nháp</span>;
    }
  };

  return (
    <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-40 border-b border-slate-800 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo & Experiment Selector */}
          <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
            <div className="flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 p-2 sm:p-2.5 rounded-xl shadow-md transition-all">
              <FlaskConical className="w-6 h-6 text-white" />
              <div className="hidden sm:block text-left">
                <div className="font-extrabold text-base tracking-tight leading-none text-white">MedChem ELN</div>
                <div className="text-[10px] text-indigo-200 font-medium tracking-wider uppercase mt-0.5">Lab Notebook</div>
              </div>
            </div>

              {/* Experiment dropdown selector */}
            <div className="relative flex-1 max-w-xs sm:max-w-sm">
              <button
                type="button"
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left px-3 py-2 rounded-xl text-sm font-medium flex items-center justify-between transition-colors focus:ring-2 focus:ring-indigo-400"
              >
                <div className="truncate pr-2">
                  {activeExperiment ? (
                    <>
                      <span className="text-indigo-400 font-mono font-bold mr-1.5">{activeExperiment.code}:</span>
                      <span className="text-slate-200">{activeExperiment.title}</span>
                    </>
                  ) : (
                    <span className="text-slate-400 text-xs">Chưa có thí nghiệm • Bấm tạo mới</span>
                  )}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
              </button>

              {showDropdown && (
                <div className="absolute left-0 mt-2 w-72 sm:w-96 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Danh sách thí nghiệm ({experiments.length})</span>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        onOpenNewModal?.();
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Tạo mới
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {experiments.length > 0 ? (
                      experiments.map((exp) => (
                        <div
                          key={exp.id}
                          onClick={() => {
                            setActiveExperimentId(exp.id);
                            setShowDropdown(false);
                          }}
                          className={`px-3 py-2.5 hover:bg-indigo-50 cursor-pointer flex items-center justify-between transition-colors ${
                            exp.id === activeExperimentId ? 'bg-indigo-50/70 font-semibold text-indigo-950' : ''
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">{exp.code}</span>
                              <span className="text-xs text-slate-400 font-mono">{exp.date}</span>
                            </div>
                            <div className="text-xs truncate text-slate-700 mt-1">{exp.title}</div>
                          </div>
                          <div className="flex-shrink-0">
                            {getStatusBadge(exp.status)}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-6 px-4 text-center text-xs text-slate-500">
                        Chưa có thí nghiệm nào. Nhấn "Tạo mới" để bắt đầu!
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Status indicator on desktop */}
            <div className="hidden md:flex items-center">
              {activeExperiment && getStatusBadge(activeExperiment.status)}
            </div>
          </div>

          {/* Sync Mode Indicator & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dual Mode Indicator */}
            <div
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                syncMode === 'firebase'
                  ? 'bg-emerald-950/60 border-emerald-600 text-emerald-400'
                  : 'bg-indigo-950/60 border-indigo-700 text-indigo-300'
              }`}
              title={
                syncMode === 'firebase'
                  ? 'Đang đồng bộ trực tuyến với Firebase Realtime Database & Storage'
                  : 'Đang lưu nội bộ trên máy (LocalStorage Dual-Mode Fallback) - Không sợ mất điện hay rớt mạng'
              }
            >
              {syncMode === 'firebase' ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Firebase Cloud</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Offline LocalStorage</span>
                </>
              )}
              {isSyncing && <RefreshCw className="w-3 h-3 animate-spin text-slate-400 ml-1" />}
            </div>

            {/* Primary Action: Tạo thí nghiệm mới */}
            <button
              onClick={onOpenNewModal}
              className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition-all cursor-pointer min-h-[44px]"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Thí nghiệm mới</span>
              <span className="sm:hidden">Mới</span>
            </button>

            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={() => activeExperimentId && duplicateExperiment(activeExperimentId)}
                title="Sao chép thí nghiệm này thành bản ghi mới"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-xl text-xs font-medium transition-colors border border-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <Copy className="w-4 h-4 text-slate-300" />
              </button>

              <button
                onClick={handlePrint}
                title="In Phiếu Nhật Ký Thí Nghiệm (Laboratory Notebook Printout)"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-xl text-xs font-medium transition-colors border border-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <Printer className="w-4 h-4 text-slate-300" />
              </button>

              <button
                onClick={exportAllToJson}
                title="Sao lưu toàn bộ nhật ký ra tệp JSON"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-xl text-xs font-medium transition-colors border border-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <Download className="w-4 h-4 text-slate-300" />
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                title="Khôi phục nhật ký từ tệp JSON"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-xl text-xs font-medium transition-colors border border-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <Upload className="w-4 h-4 text-slate-300" />
              </button>
            </div>

            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile slide-down menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-800 py-3 space-y-2 animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between px-2 text-xs text-slate-400 pb-2 border-b border-slate-800">
              <span className="flex items-center gap-1.5">
                {syncMode === 'firebase' ? <Cloud className="w-3.5 h-3.5 text-emerald-400" /> : <HardDrive className="w-3.5 h-3.5 text-indigo-400" />}
                {syncMode === 'firebase' ? 'Firebase Cloud Mode' : 'LocalStorage Offline Mode'}
              </span>
              <span>{activeExperiment?.code}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  activeExperimentId && duplicateExperiment(activeExperimentId);
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl text-xs font-medium min-h-[48px]"
              >
                <Copy className="w-4 h-4 text-indigo-400" />
                <span>Nhân bản</span>
              </button>

              <button
                onClick={() => {
                  handlePrint();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl text-xs font-medium min-h-[48px]"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>In Phiếu ELN</span>
              </button>

              <button
                onClick={() => {
                  exportAllToJson();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl text-xs font-medium min-h-[48px]"
              >
                <Download className="w-4 h-4 text-blue-400" />
                <span>Xuất JSON</span>
              </button>

              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl text-xs font-medium min-h-[48px]"
              >
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Nhập JSON</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Input for JSON restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".json"
        className="hidden"
      />
    </header>
  );
};
