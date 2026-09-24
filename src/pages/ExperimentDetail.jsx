import React, { useState } from 'react';
import {
  ArrowLeft,
  Save,
  CheckCircle2,
  Calendar,
  User,
  Building,
  Beaker,
  Scale,
  Timer,
  Layers,
  Waves,
  Filter,
  Printer,
  Copy,
  Trash2,
  Share2,
  Sparkles,
  Tag
} from 'lucide-react';
import { useExperiment } from '../context/ExperimentContext';
import { StoichiometryTable } from '../components/StoichiometryTable';
import { ReactionTimer } from '../components/ReactionTimer';
import { TLCTracker } from '../components/TLCTracker';
import { WorkupSection } from '../components/WorkupSection';
import { ColumnFractionManager } from '../components/ColumnFractionManager';

export const ExperimentDetail = ({ onBackToDashboard }) => {
  const {
    activeExperiment,
    updateExperiment,
    deleteExperiment,
    duplicateExperiment,
    isSyncing
  } = useExperiment();

  const [activeTab, setActiveTab] = useState('all'); // 'all' or section id
  const [saveToast, setSaveToast] = useState(false);

  if (!activeExperiment) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Beaker className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-700">Chưa chọn thí nghiệm nào</h3>
        <button
          onClick={onBackToDashboard}
          className="mt-4 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  // Handlers for updating each section
  const handleMetaChange = (field, value) => {
    updateExperiment(activeExperiment.id, { [field]: value });
  };

  const handleTargetChange = (field, value) => {
    updateExperiment(activeExperiment.id, {
      targetMolecule: {
        ...activeExperiment.targetMolecule,
        [field]: value
      }
    });
  };

  const handleStoichiometryChange = (newReagents) => {
    updateExperiment(activeExperiment.id, {
      stoichiometry: newReagents
    });
  };

  const handleTimerChange = (newTimerData) => {
    updateExperiment(activeExperiment.id, {
      reactionTimer: newTimerData
    });
  };

  const handleStatusChange = (newStatus) => {
    updateExperiment(activeExperiment.id, {
      status: newStatus
    });
  };

  const handleTlcChange = (newTlcList) => {
    updateExperiment(activeExperiment.id, {
      tlcTimeline: newTlcList
    });
  };

  const handleWorkupChange = (newWorkupData) => {
    updateExperiment(activeExperiment.id, {
      workup: newWorkupData
    });
  };

  const handleColumnChange = (newColumnData) => {
    updateExperiment(activeExperiment.id, {
      columnAndYield: newColumnData
    });
  };

  // Find limiting reagent moles & target MW for yield calculation
  const limitingReagent = activeExperiment.stoichiometry?.find((r) => r.isLimiting) || activeExperiment.stoichiometry?.[0];
  const limitingMoles = limitingReagent ? parseFloat(limitingReagent.moles) || 0 : 0;
  const targetMW = parseFloat(activeExperiment.targetMolecule?.molecularWeight) || 0;

  const handleManualSave = () => {
    updateExperiment(activeExperiment.id, {});
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Navigation & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 no-print">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-600 hover:text-indigo-600 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 transition-colors shadow-sm min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Về Dashboard</span>
        </button>

        <div className="flex items-center gap-2">
          {saveToast && (
            <span className="text-xs bg-emerald-100 text-emerald-800 font-semibold px-3 py-1.5 rounded-xl border border-emerald-300 flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã lưu thành công!
            </span>
          )}

          <button
            onClick={handleManualSave}
            disabled={isSyncing}
            className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-md min-h-[44px]"
          >
            <Save className="w-4 h-4" />
            <span>{isSyncing ? 'Đang lưu...' : 'Lưu Nhật Ký'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-xl border border-slate-200 flex items-center gap-1.5 shadow-sm min-h-[44px]"
            title="In phiếu nhật ký phòng thí nghiệm"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">In Phiếu ELN</span>
          </button>
        </div>
      </div>

      {/* Main Experiment Header & Metadata Dossier */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200 shadow-sm space-y-5 card-print">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <input
                type="text"
                value={activeExperiment.code || ''}
                onChange={(e) => handleMetaChange('code', e.target.value)}
                placeholder="Mã TN (VD: SYN-01)"
                className="font-mono font-bold text-xs sm:text-sm bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-1.5 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:outline-none min-h-[38px] w-36 uppercase"
              />

              <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-1.5 rounded-xl">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                  type="date"
                  value={activeExperiment.date || ''}
                  onChange={(e) => handleMetaChange('date', e.target.value)}
                  className="bg-transparent text-xs text-slate-700 focus:outline-none"
                />
              </div>

              {/* Status Selector */}
              <select
                value={activeExperiment.status || 'draft'}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:ring-2 focus:ring-indigo-400 focus:outline-none min-h-[38px]"
              >
                <option value="draft">Bản nháp (Draft)</option>
                <option value="running">Đang khuấy phản ứng (Running)</option>
                <option value="paused">Tạm dừng (Paused)</option>
                <option value="workup">Xử lý thô & Chiết (Workup)</option>
                <option value="purification">Sắc ký cột (Purification)</option>
                <option value="completed">Đã hoàn thành (Completed)</option>
              </select>
            </div>

            {/* Editable Title */}
            <input
              type="text"
              value={activeExperiment.title || ''}
              onChange={(e) => handleMetaChange('title', e.target.value)}
              placeholder="Tiêu đề phản ứng tổng hợp..."
              className="w-full text-xl sm:text-2xl font-extrabold text-slate-900 border-0 border-b-2 border-transparent focus:border-indigo-500 px-1 py-1 focus:outline-none rounded"
            />
          </div>

          {/* Researcher & Lab Room */}
          <div className="flex flex-wrap lg:flex-col gap-2.5 text-xs text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 lg:w-72">
            <div className="flex items-center gap-2 flex-1">
              <User className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <input
                type="text"
                value={activeExperiment.researcher || ''}
                onChange={(e) => handleMetaChange('researcher', e.target.value)}
                placeholder="Họ tên nghiên cứu viên"
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none min-h-[36px]"
              />
            </div>

            <div className="flex items-center gap-2 flex-1">
              <Building className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <input
                type="text"
                value={activeExperiment.labRoom || ''}
                onChange={(e) => handleMetaChange('labRoom', e.target.value)}
                placeholder="Phòng thí nghiệm / Đơn vị"
                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium focus:outline-none min-h-[36px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Quick-Jump Section Navigator (Mobile Fume Hood Ready) */}
      <div className="sticky top-16 sm:top-18 z-30 bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl shadow-lg border border-slate-800 flex items-center justify-between gap-1 overflow-x-auto no-print">
        <a
          href="#section-stoichiometry"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 whitespace-nowrap min-h-[44px]"
        >
          <Scale className="w-4 h-4 text-indigo-400" />
          <span>1. Cân đong</span>
        </a>

        <a
          href="#section-timer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 whitespace-nowrap min-h-[44px]"
        >
          <Timer className="w-4 h-4 text-emerald-400" />
          <span>2. Thời gian</span>
        </a>

        <a
          href="#section-tlc"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 whitespace-nowrap min-h-[44px]"
        >
          <Layers className="w-4 h-4 text-sky-400" />
          <span>3. Sắc ký TLC</span>
        </a>

        <a
          href="#section-workup"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 whitespace-nowrap min-h-[44px]"
        >
          <Waves className="w-4 h-4 text-blue-400" />
          <span>4. Xử lý thô</span>
        </a>

        <a
          href="#section-column"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800 whitespace-nowrap min-h-[44px]"
        >
          <Filter className="w-4 h-4 text-amber-400" />
          <span>5. Cột & Hiệu suất</span>
        </a>
      </div>

      {/* Module 1: Stoichiometry Table */}
      <section id="section-stoichiometry" className="scroll-mt-36">
        <StoichiometryTable
          reagents={activeExperiment.stoichiometry || []}
          onChange={handleStoichiometryChange}
          targetMolecule={activeExperiment.targetMolecule}
          onTargetChange={handleTargetChange}
        />
      </section>

      {/* Module 2: Reaction Session Timer */}
      <section id="section-timer" className="scroll-mt-36">
        <ReactionTimer
          timerData={activeExperiment.reactionTimer}
          onChange={handleTimerChange}
          experimentStatus={activeExperiment.status}
          onStatusChange={handleStatusChange}
        />
      </section>

      {/* Module 3: TLC Timeline Monitor */}
      <section id="section-tlc" className="scroll-mt-36">
        <TLCTracker
          tlcList={activeExperiment.tlcTimeline || []}
          onChange={handleTlcChange}
          currentTimerSeconds={activeExperiment.reactionTimer?.totalSeconds || 0}
        />
      </section>

      {/* Module 4: Workup & Rotavapor Section */}
      <section id="section-workup" className="scroll-mt-36">
        <WorkupSection
          workupData={activeExperiment.workup}
          onChange={handleWorkupChange}
        />
      </section>

      {/* Module 5: Column Chromatography & Eppendorf Yield */}
      <section id="section-column" className="scroll-mt-36">
        <ColumnFractionManager
          columnData={activeExperiment.columnAndYield}
          onChange={handleColumnChange}
          limitingMoles={limitingMoles}
          targetMW={targetMW}
        />
      </section>

      {/* Printable Signature & GLP Lab Verification Block (Displayed when printing) */}
      <div className="hidden print-only mt-8 pt-6 border-t-2 border-slate-300 grid grid-cols-2 text-xs">
        <div>
          <p className="font-bold">Nghiên cứu viên thực hiện:</p>
          <p className="mt-1">{activeExperiment.researcher || '...........................................'}</p>
          <p className="mt-12">Ký tên: .......................................</p>
          <p className="text-[10px] text-slate-500 mt-1">Ngày: ....../....../202...</p>
        </div>

        <div>
          <p className="font-bold">Cán bộ phụ trách PTN / Giảng viên hướng dẫn:</p>
          <p className="mt-1">...........................................................................</p>
          <p className="mt-12">Ký duyệt: .......................................</p>
          <p className="text-[10px] text-slate-500 mt-1">Ngày: ....../....../202...</p>
        </div>
      </div>
    </div>
  );
};
