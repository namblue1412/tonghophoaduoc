import React, { useState, useEffect } from 'react';
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
  Tag,
  Play,
  Pause,
  Clock,
  FlaskConical
} from 'lucide-react';
import { useExperiment } from '../context/ExperimentContext';
import { ApparatusPreparation } from '../components/ApparatusPreparation';
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

  const [saveToast, setSaveToast] = useState(false);
  const [activeNav, setActiveNav] = useState('stoichiometry');

  // Mini live timer calculation for floating bar
  const [runningSeconds, setRunningSeconds] = useState(0);

  useEffect(() => {
    let interval = null;
    if (activeExperiment?.reactionTimer?.status === 'running') {
      const start = activeExperiment.reactionTimer.lastStartTime
        ? new Date(activeExperiment.reactionTimer.lastStartTime).getTime()
        : Date.now();

      interval = setInterval(() => {
        const diff = Math.max(0, Math.floor((Date.now() - start) / 1000));
        setRunningSeconds(diff);
      }, 1000);
    } else {
      setRunningSeconds(0);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeExperiment?.reactionTimer?.status, activeExperiment?.reactionTimer?.lastStartTime]);

  const formatTime = (secs) => {
    const s = Math.max(0, Math.floor(secs));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const totalCurrentTimer = (activeExperiment?.reactionTimer?.totalSeconds || 0) + runningSeconds;

  if (!activeExperiment) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Beaker className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-700">Chưa chọn thí nghiệm nào</h3>
        <button
          onClick={onBackToDashboard}
          className="mt-4 bg-indigo-600 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold shadow-md cursor-pointer"
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

  const handleEquipmentChange = (newEquipment) => {
    updateExperiment(activeExperiment.id, {
      equipment: newEquipment
    });
  };

  const handleStoichiometryChange = (newReagents) => {
    updateExperiment(activeExperiment.id, {
      stoichiometry: newReagents
    });
  };

  const handleTimerChange = (newTimerData, newStatus) => {
    const patch = {
      reactionTimer: newTimerData
    };
    if (newStatus && newStatus !== activeExperiment.status) {
      patch.status = newStatus;
    }
    updateExperiment(activeExperiment.id, patch);
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

  const handleUnitsChange = (newUnits) => {
    updateExperiment(activeExperiment.id, {
      units: newUnits
    });
  };

  // Find limiting reagent moles & target MW for yield calculation
  const limitingReagent = activeExperiment.stoichiometry?.find((r) => r.isLimiting) || activeExperiment.stoichiometry?.[0];
  const limitingMoles = limitingReagent ? parseFloat(String(limitingReagent.moles).replace(',', '.')) || 0 : 0;
  const targetMW = parseFloat(String(activeExperiment.targetMolecule?.molecularWeight).replace(',', '.')) || 0;

  const handleManualSave = () => {
    updateExperiment(activeExperiment.id, {});
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const scrollToSection = (id, navName) => {
    setActiveNav(navName);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-5 pb-32 sm:pb-20">
      {/* Top Navigation & Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 no-print">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-indigo-600 bg-white hover:bg-slate-50 px-3.5 py-2.5 rounded-2xl border border-slate-200 transition-colors shadow-sm min-h-[44px]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Danh Sách</span>
        </button>

        <div className="flex items-center gap-2">
          {saveToast && (
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-2 rounded-xl border border-emerald-300 flex items-center gap-1 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Đã lưu!
            </span>
          )}

          <button
            onClick={handleManualSave}
            disabled={isSyncing}
            className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-2xl flex items-center gap-1.5 transition-all shadow-md min-h-[44px] cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSyncing ? 'Đang lưu...' : 'Lưu Sổ Tay'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold px-3.5 py-2.5 rounded-2xl border border-slate-200 flex items-center gap-1.5 shadow-sm min-h-[44px]"
            title="In phiếu nhật ký phòng thí nghiệm"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span className="hidden sm:inline">In Phiếu ELN</span>
          </button>
        </div>
      </div>

      {/* Main Experiment Header & Metadata Dossier */}
      <div className="bg-white rounded-3xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4 card-print">
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={activeExperiment.code || ''}
                onChange={(e) => handleMetaChange('code', e.target.value)}
                placeholder="Mã TN (SYN-01)"
                className="font-mono font-bold text-xs sm:text-sm bg-indigo-50 border border-indigo-200 text-indigo-700 px-3 py-2 rounded-xl focus:outline-none min-h-[44px] w-32 uppercase"
              />

              <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl min-h-[44px]">
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
                className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none min-h-[44px]"
              >
                <option value="draft">Bản nháp (Draft)</option>
                <option value="running">Đang khuấy (Running)</option>
                <option value="paused">Tạm dừng (Paused)</option>
                <option value="workup">Xử lý thô (Workup)</option>
                <option value="purification">Sắc ký cột (Purification)</option>
                <option value="completed">Đã hoàn thành (Completed)</option>
              </select>
            </div>

            {/* Editable Title */}
            <input
              type="text"
              value={activeExperiment.title || ''}
              onChange={(e) => handleMetaChange('title', e.target.value)}
              placeholder="Tên phản ứng thí nghiệm..."
              className="w-full text-lg sm:text-2xl font-extrabold text-slate-900 border-0 border-b-2 border-transparent focus:border-teal-600 py-1 focus:outline-none transition-colors"
            />
          </div>

          {/* Researcher & Lab Room */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-2xl border border-slate-200 lg:w-72">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-500 flex-shrink-0" />
              <input
                type="text"
                value={activeExperiment.researcher || ''}
                onChange={(e) => handleMetaChange('researcher', e.target.value)}
                placeholder="Người thực hiện..."
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-semibold focus:outline-none min-h-[40px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <input
                type="text"
                value={activeExperiment.labRoom || ''}
                onChange={(e) => handleMetaChange('labRoom', e.target.value)}
                placeholder="Phòng thí nghiệm..."
                className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-medium focus:outline-none min-h-[40px]"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Sticky Quick-Jump Section Navigator */}
      <div className="hidden md:flex sticky top-16 sm:top-18 z-30 bg-slate-900/90 backdrop-blur-md p-2 rounded-2xl shadow-lg border border-slate-800 items-center justify-between gap-1 overflow-x-auto no-print">
        <button
          type="button"
          onClick={() => scrollToSection('section-apparatus', 'apparatus')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 whitespace-nowrap min-h-[44px] cursor-pointer"
        >
          <FlaskConical className="w-4 h-4 text-teal-400" />
          <span>0. Dụng cụ</span>
        </button>

        <button
          type="button"
          onClick={() => scrollToSection('section-stoichiometry', 'stoichiometry')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 whitespace-nowrap min-h-[44px] cursor-pointer"
        >
          <Scale className="w-4 h-4 text-indigo-400" />
          <span>1. Cân đong</span>
        </button>

        <button
          type="button"
          onClick={() => scrollToSection('section-timer', 'timer')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 whitespace-nowrap min-h-[44px] cursor-pointer"
        >
          <Timer className="w-4 h-4 text-emerald-400" />
          <span>2. Thời gian</span>
        </button>

        <button
          type="button"
          onClick={() => scrollToSection('section-tlc', 'tlc')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 whitespace-nowrap min-h-[44px] cursor-pointer"
        >
          <Layers className="w-4 h-4 text-sky-400" />
          <span>3. Sắc ký TLC</span>
        </button>

        <button
          type="button"
          onClick={() => scrollToSection('section-workup', 'workup')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 whitespace-nowrap min-h-[44px] cursor-pointer"
        >
          <Waves className="w-4 h-4 text-blue-400" />
          <span>4. Xử lý thô</span>
        </button>

        <button
          type="button"
          onClick={() => scrollToSection('section-column', 'column')}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 whitespace-nowrap min-h-[44px] cursor-pointer"
        >
          <Filter className="w-4 h-4 text-amber-400" />
          <span>5. Cột & Hiệu suất</span>
        </button>
      </div>

      {/* Module 0: Apparatus & Glassware Preparation */}
      <section id="section-apparatus" className="scroll-mt-28">
        <ApparatusPreparation
          equipment={activeExperiment.equipment || []}
          onChange={handleEquipmentChange}
        />
      </section>

      {/* Module 1: Stoichiometry Table */}
      <section id="section-stoichiometry" className="scroll-mt-28">
        <StoichiometryTable
          reagents={activeExperiment.stoichiometry || []}
          onChange={handleStoichiometryChange}
          targetMolecule={activeExperiment.targetMolecule}
          onTargetChange={handleTargetChange}
          units={activeExperiment.units || { mass: 'g', mole: 'mol' }}
          onUnitsChange={handleUnitsChange}
        />
      </section>

      {/* Module 2: Reaction Session Timer */}
      <section id="section-timer" className="scroll-mt-28">
        <ReactionTimer
          timerData={activeExperiment.reactionTimer}
          onChange={handleTimerChange}
          experimentStatus={activeExperiment.status}
          onStatusChange={handleStatusChange}
        />
      </section>

      {/* Module 3: TLC Timeline Monitor (3 Photos: UV 254, UV 365, Reagent) */}
      <section id="section-tlc" className="scroll-mt-28">
        <TLCTracker
          tlcList={activeExperiment.tlcTimeline || []}
          onChange={handleTlcChange}
          currentTimerSeconds={totalCurrentTimer}
        />
      </section>

      {/* Module 4: Workup & Rotavapor Section */}
      <section id="section-workup" className="scroll-mt-28">
        <WorkupSection
          workupData={activeExperiment.workup}
          onChange={handleWorkupChange}
          massUnit={activeExperiment.units?.mass || 'g'}
        />
      </section>

      {/* Module 5: Column Chromatography & Eppendorf Yield */}
      <section id="section-column" className="scroll-mt-28">
        <ColumnFractionManager
          columnData={activeExperiment.columnAndYield}
          onChange={handleColumnChange}
          limitingMoles={limitingMoles}
          targetMW={targetMW}
          massUnit={activeExperiment.units?.mass || 'g'}
          moleUnit={activeExperiment.units?.mole || 'mol'}
        />
      </section>

      {/* Printable Signature & GLP Lab Verification Block */}
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

      {/* FLOATING MINI LIVE TIMER BAR (Visible on mobile/tablet when running) */}
      {activeExperiment.reactionTimer?.status === 'running' && (
        <div className="fixed bottom-20 left-4 right-4 z-40 md:hidden animate-in slide-in-from-bottom-4 no-print">
          <div
            onClick={() => scrollToSection('section-timer', 'timer')}
            className="bg-slate-900/95 text-white p-3 rounded-2xl shadow-2xl border border-emerald-500/50 backdrop-blur-md flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping"></span>
              <div>
                <div className="text-[10px] text-emerald-300 uppercase tracking-wider font-bold">
                  Phản ứng đang khuấy:
                </div>
                <div className="font-mono text-base font-extrabold text-white">
                  {formatTime(totalCurrentTimer)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollToSection('section-timer', 'timer');
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl"
            >
              Xem đồng hồ
            </button>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR (Thumb Zone Optimized) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 md:hidden no-print pb-safe">
        <div className="grid grid-cols-6 h-16 items-center px-1">
          <button
            type="button"
            onClick={() => scrollToSection('section-apparatus', 'apparatus')}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              activeNav === 'apparatus' ? 'text-teal-400 font-bold' : 'text-slate-400'
            }`}
          >
            <FlaskConical className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[9px] sm:text-[10px] leading-tight">Dụng cụ</span>
          </button>

          <button
            type="button"
            onClick={() => scrollToSection('section-stoichiometry', 'stoichiometry')}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              activeNav === 'stoichiometry' ? 'text-indigo-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Scale className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[9px] sm:text-[10px] leading-tight">Cân đong</span>
          </button>

          <button
            type="button"
            onClick={() => scrollToSection('section-timer', 'timer')}
            className={`flex flex-col items-center justify-center py-1 transition-colors relative ${
              activeNav === 'timer' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Timer className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[9px] sm:text-[10px] leading-tight">Bấm giờ</span>
            {activeExperiment.reactionTimer?.status === 'running' && (
              <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => scrollToSection('section-tlc', 'tlc')}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              activeNav === 'tlc' ? 'text-sky-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Layers className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[9px] sm:text-[10px] leading-tight">TLC</span>
          </button>

          <button
            type="button"
            onClick={() => scrollToSection('section-workup', 'workup')}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              activeNav === 'workup' ? 'text-blue-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Waves className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[9px] sm:text-[10px] leading-tight">Xử lý</span>
          </button>

          <button
            type="button"
            onClick={() => scrollToSection('section-column', 'column')}
            className={`flex flex-col items-center justify-center py-1 transition-colors ${
              activeNav === 'column' ? 'text-amber-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Filter className="w-4.5 h-4.5 mb-0.5" />
            <span className="text-[9px] sm:text-[10px] leading-tight">Cột & Yield</span>
          </button>
        </div>
      </nav>
    </div>
  );
};
