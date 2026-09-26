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
  FlaskConical,
  LayoutList,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { useExperiment } from '../context/ExperimentContext';
import { useDevice } from '../context/DeviceContext';
import { ApparatusPreparation } from '../components/ApparatusPreparation';
import { StoichiometryTable, parseDecimal } from '../components/StoichiometryTable';
import { ReactionTimer } from '../components/ReactionTimer';
import { TLCTracker } from '../components/TLCTracker';
import { WorkupSection } from '../components/WorkupSection';
import { ColumnFractionManager } from '../components/ColumnFractionManager';

const WORKFLOW_STAGES = [
  {
    id: 'apparatus',
    sectionId: 'section-apparatus',
    shortLabel: 'Dụng cụ',
    fullLabel: '0. Chuẩn bị dụng cụ',
    icon: FlaskConical,
    accent: 'text-teal-400',
    activeBg: 'bg-teal-600 text-white'
  },
  {
    id: 'stoichiometry',
    sectionId: 'section-stoichiometry',
    shortLabel: 'Cân đong',
    fullLabel: '1. Bảng cân đong',
    icon: Scale,
    accent: 'text-teal-400',
    activeBg: 'bg-teal-600 text-white'
  },
  {
    id: 'timer',
    sectionId: 'section-timer',
    shortLabel: 'Bấm giờ',
    fullLabel: '2. Thời gian phản ứng',
    icon: Timer,
    accent: 'text-emerald-400',
    activeBg: 'bg-emerald-600 text-white'
  },
  {
    id: 'tlc',
    sectionId: 'section-tlc',
    shortLabel: 'TLC',
    fullLabel: '3. Sắc ký bản mỏng',
    icon: Layers,
    accent: 'text-sky-400',
    activeBg: 'bg-sky-600 text-white'
  },
  {
    id: 'workup',
    sectionId: 'section-workup',
    shortLabel: 'Xử lý',
    fullLabel: '4. Xử lý & Cô quay',
    icon: Waves,
    accent: 'text-blue-400',
    activeBg: 'bg-blue-600 text-white'
  },
  {
    id: 'column',
    sectionId: 'section-column',
    shortLabel: 'Sắc ký cột',
    fullLabel: '5. Cột & Hiệu suất',
    icon: Filter,
    accent: 'text-amber-400',
    activeBg: 'bg-amber-600 text-white'
  }
];

export const ExperimentDetail = ({ onBackToDashboard }) => {
  const {
    activeExperiment,
    updateExperiment,
    duplicateExperiment,
    restoreExperiment,
    permanentlyDeleteExperiment,
    isSyncing
  } = useExperiment();

  const { isIPhone, isIPad, isMac } = useDevice();

  const [saveToast, setSaveToast] = useState(false);
  const [activeNav, setActiveNav] = useState('stoichiometry');
  // viewMode: 'all' (full scroll) | 'focus' (single step focus - great for iPad & iPhone)
  const [viewMode, setViewMode] = useState('all');

  // Mini live timer calculation
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
          className="mt-4 bg-teal-600 text-white px-5 py-2.5 rounded-2xl text-sm font-semibold shadow-md cursor-pointer"
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

  const handleUnitsChange = (newUnits, convertedReagents) => {
    const oldMassUnit = activeExperiment.units?.mass || 'g';
    const newMassUnit = newUnits?.mass || 'g';

    if (oldMassUnit === newMassUnit) {
      updateExperiment(activeExperiment.id, {
        units: newUnits,
        ...(convertedReagents ? { stoichiometry: convertedReagents } : {})
      });
      return;
    }

    const factor = newMassUnit === 'mg' ? 1000 : 0.001;

    let updatedWorkup = activeExperiment.workup;
    if (updatedWorkup) {
      const updatedCrudeTubes = (updatedWorkup.crudeTubes || []).map((t) => {
        const tare = parseDecimal(t.tareMass);
        const gross = parseDecimal(t.grossMass);
        const crude = t.crudeMass ? parseDecimal(t.crudeMass) : 0;
        return {
          ...t,
          tareMass: tare > 0 ? String(parseFloat((tare * factor).toFixed(newMassUnit === 'mg' ? 2 : 4))) : t.tareMass,
          grossMass: gross > 0 ? String(parseFloat((gross * factor).toFixed(newMassUnit === 'mg' ? 2 : 4))) : t.grossMass,
          crudeMass: crude > 0 ? parseFloat((crude * factor).toFixed(newMassUnit === 'mg' ? 2 : 4)) : 0
        };
      });
      const oldCrude = parseDecimal(updatedWorkup.crudeMass);
      updatedWorkup = {
        ...updatedWorkup,
        crudeTubes: updatedCrudeTubes,
        crudeMass: oldCrude > 0 ? parseFloat((oldCrude * factor).toFixed(newMassUnit === 'mg' ? 2 : 4)) : updatedWorkup.crudeMass
      };
    }

    let updatedColumn = activeExperiment.columnAndYield;
    if (updatedColumn?.eppendorfYield) {
      const updatedTubes = (updatedColumn.eppendorfYield.tubes || []).map((t) => {
        const tare = parseDecimal(t.tareMass);
        const gross = parseDecimal(t.grossMass);
        const prod = t.productMass ? parseDecimal(t.productMass) : 0;
        return {
          ...t,
          tareMass: tare > 0 ? String(parseFloat((tare * factor).toFixed(newMassUnit === 'mg' ? 2 : 4))) : t.tareMass,
          grossMass: gross > 0 ? String(parseFloat((gross * factor).toFixed(newMassUnit === 'mg' ? 2 : 4))) : t.grossMass,
          productMass: prod > 0 ? parseFloat((prod * factor).toFixed(newMassUnit === 'mg' ? 2 : 4)) : 0
        };
      });
      const oldProd = parseDecimal(updatedColumn.eppendorfYield.productMass);
      const oldByprod = parseDecimal(updatedColumn.eppendorfYield.byproductMass);
      const oldTheo = parseDecimal(updatedColumn.eppendorfYield.theoreticalYield);
      updatedColumn = {
        ...updatedColumn,
        eppendorfYield: {
          ...updatedColumn.eppendorfYield,
          tubes: updatedTubes,
          productMass: oldProd > 0 ? parseFloat((oldProd * factor).toFixed(newMassUnit === 'mg' ? 2 : 4)) : updatedColumn.eppendorfYield.productMass,
          byproductMass: oldByprod > 0 ? parseFloat((oldByprod * factor).toFixed(newMassUnit === 'mg' ? 2 : 4)) : (updatedColumn.eppendorfYield.byproductMass || 0),
          theoreticalYield: oldTheo > 0 ? parseFloat((oldTheo * factor).toFixed(newMassUnit === 'mg' ? 2 : 4)) : updatedColumn.eppendorfYield.theoreticalYield
        }
      };
    }

    updateExperiment(activeExperiment.id, {
      units: newUnits,
      ...(convertedReagents ? { stoichiometry: convertedReagents } : {}),
      ...(updatedWorkup ? { workup: updatedWorkup } : {}),
      ...(updatedColumn ? { columnAndYield: updatedColumn } : {})
    });
  };

  // Summary metrics for badges
  const equipmentList = activeExperiment.equipment || [];
  const readyEquipCount = equipmentList.filter((item) => item.checked || item.prepared).length;
  const activeReagentCount = (activeExperiment.stoichiometry || []).filter(
    (r) => r.type !== 'base_acid' && r.type !== 'solvent'
  ).length;
  const tlcCount = (activeExperiment.tlcTimeline || []).length;
  const crudeMassVal = parseDecimal(activeExperiment.workup?.crudeMass);
  const yieldPctVal = activeExperiment.columnAndYield?.eppendorfYield?.yieldPercent;
  const massUnit = activeExperiment.units?.mass || 'g';

  const getStageBadgeText = (stageId) => {
    switch (stageId) {
      case 'apparatus':
        return equipmentList.length > 0 ? `${readyEquipCount}/${equipmentList.length}` : '0';
      case 'stoichiometry':
        return `${activeReagentCount} chất`;
      case 'timer':
        return totalCurrentTimer > 0 ? formatTime(totalCurrentTimer) : '00:00';
      case 'tlc':
        return `${tlcCount} bản`;
      case 'workup':
        return crudeMassVal > 0 ? `${crudeMassVal}${massUnit}` : '--';
      case 'column':
        return yieldPctVal > 0 ? `${yieldPctVal.toFixed(1)}%` : '--';
      default:
        return '';
    }
  };

  // Find limiting reagent moles & target MW for yield calculation (only among active reactants)
  const activeReagents = (activeExperiment.stoichiometry || []).filter(
    (r) => r.type !== 'base_acid' && r.type !== 'solvent'
  );
  const limitingReagent =
    activeReagents.find((r) => r.isLimiting) ||
    activeReagents[0];
  const limitingMoles = limitingReagent
    ? parseFloat(String(limitingReagent.moles).replace(',', '.')) || 0
    : 0;
  const targetMW =
    parseFloat(String(activeExperiment.targetMolecule?.molecularWeight).replace(',', '.')) || 0;

  const handleManualSave = () => {
    updateExperiment(activeExperiment.id, {});
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const handleStageSelect = (sectionId, navName) => {
    setActiveNav(navName);
    if (viewMode === 'all') {
      setTimeout(() => {
        const element = document.getElementById(sectionId);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 20);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const currentStageIndex = WORKFLOW_STAGES.findIndex((s) => s.id === activeNav);
  const prevStage = currentStageIndex > 0 ? WORKFLOW_STAGES[currentStageIndex - 1] : null;
  const nextStage =
    currentStageIndex < WORKFLOW_STAGES.length - 1
      ? WORKFLOW_STAGES[currentStageIndex + 1]
      : null;

  // Helper to render the 6 modules (all at once or focused single stage)
  const renderModules = () => (
    <div className="space-y-4 sm:space-y-6">
      {activeExperiment.inTrash && (
        <div className="bg-rose-50 border border-rose-300 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print shadow-xs">
          <div className="flex items-center gap-2.5 text-rose-900">
            <Trash2 className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <div className="text-xs sm:text-sm">
              <span className="font-bold">Dự án này đang nằm trong Thùng rác.</span>{' '}
              <span>Bạn có thể xem lại nội dung hoặc khôi phục về danh sách dự án chính.</span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={() => restoreExperiment(activeExperiment.id)}
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục dự án</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                if (
                  window.confirm(
                    `Xóa vĩnh viễn dự án "${activeExperiment.code}: ${activeExperiment.title}" khỏi cơ sở dữ liệu đám mây?\n\nHành động này không thể hoàn tác!`
                  )
                ) {
                  await permanentlyDeleteExperiment(activeExperiment.id);
                  onBackToDashboard?.();
                }
              }}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa vĩnh viễn</span>
            </button>
          </div>
        </div>
      )}

      {(viewMode === 'all' || activeNav === 'apparatus') && (
        <section id="section-apparatus" className="scroll-mt-28">
          <ApparatusPreparation
            equipment={activeExperiment.equipment || []}
            onChange={handleEquipmentChange}
          />
        </section>
      )}

      {(viewMode === 'all' || activeNav === 'stoichiometry') && (
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
      )}

      {(viewMode === 'all' || activeNav === 'timer') && (
        <section id="section-timer" className="scroll-mt-28">
          <ReactionTimer
            timerData={activeExperiment.reactionTimer}
            onChange={handleTimerChange}
            experimentStatus={activeExperiment.status}
            onStatusChange={handleStatusChange}
          />
        </section>
      )}

      {(viewMode === 'all' || activeNav === 'tlc') && (
        <section id="section-tlc" className="scroll-mt-28">
          <TLCTracker
            tlcList={activeExperiment.tlcTimeline || []}
            onChange={handleTlcChange}
            currentTimerSeconds={totalCurrentTimer}
          />
        </section>
      )}

      {(viewMode === 'all' || activeNav === 'workup') && (
        <section id="section-workup" className="scroll-mt-28">
          <WorkupSection
            workupData={activeExperiment.workup}
            onChange={handleWorkupChange}
            massUnit={activeExperiment.units?.mass || 'g'}
            moleUnit={activeExperiment.units?.mole || 'mol'}
            limitingMoles={limitingMoles}
            targetMW={targetMW}
          />
        </section>
      )}

      {(viewMode === 'all' || activeNav === 'column') && (
        <section id="section-column" className="scroll-mt-28">
          <ColumnFractionManager
            columnData={activeExperiment.columnAndYield}
            onChange={handleColumnChange}
            limitingMoles={limitingMoles}
            targetMW={targetMW}
            rawTargetMW={activeExperiment.targetMolecule?.molecularWeight ?? ''}
            onTargetMWChange={(val) => handleTargetChange('molecularWeight', val)}
            crudeMass={crudeMassVal}
            massUnit={activeExperiment.units?.mass || 'g'}
            moleUnit={activeExperiment.units?.mole || 'mol'}
          />
        </section>
      )}

      {/* Step-by-step Prev/Next Footer when in Focus Mode */}
      {viewMode === 'focus' && (
        <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-sm flex items-center justify-between gap-3 no-print">
          {prevStage ? (
            <button
              type="button"
              onClick={() => handleStageSelect(prevStage.sectionId, prevStage.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-bold min-h-[44px] cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>{prevStage.shortLabel}</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={() => setViewMode('all')}
            className="text-xs font-semibold text-teal-700 hover:underline px-2 py-1 cursor-pointer"
          >
            Hiện toàn bộ quy trình
          </button>

          {nextStage ? (
            <button
              type="button"
              onClick={() => handleStageSelect(nextStage.sectionId, nextStage.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold min-h-[44px] cursor-pointer shadow-sm transition-colors"
            >
              <span>Tiếp: {nextStage.shortLabel}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleManualSave}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold min-h-[44px] cursor-pointer shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Sổ Tay</span>
            </button>
          )}
        </div>
      )}
    </div>
  );

  // ============================================================================
  // LAYOUT 1: MAC / LAPTOP WIDESCREEN WORKSTATION (Full-Width 1440px Canvas)
  // ============================================================================
  if (isMac) {
    return (
      <div className="max-w-[1440px] mx-auto px-6 py-5 space-y-5 pb-20">
        {/* Top Action, Live Timer & View Mode Bar */}
        <div className="flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onBackToDashboard}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-teal-700 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-xl border border-slate-200 shadow-xs transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Danh sách phản ứng</span>
            </button>

            {/* Segmented Mode Switcher: Toàn trang vs Từng mục */}
            <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-xs inline-flex items-center">
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  viewMode === 'all'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Toàn trang</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('focus')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  viewMode === 'focus'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Từng mục</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Live Reaction Timer Pill */}
            <button
              type="button"
              onClick={() => handleStageSelect('section-timer', 'timer')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                activeExperiment.reactionTimer?.status === 'running'
                  ? 'bg-slate-900 text-white border-emerald-500/60 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300 shadow-xs'
              }`}
              title="Chuyển đến đồng hồ phản ứng"
            >
              <Timer
                className={`w-4 h-4 ${
                  activeExperiment.reactionTimer?.status === 'running'
                    ? 'text-emerald-400 animate-spin'
                    : 'text-teal-600'
                }`}
              />
              <span className="text-slate-400 font-medium">Thời gian khuấy:</span>
              <span className="font-mono tabular-nums font-extrabold text-sm">
                {formatTime(totalCurrentTimer)}
              </span>
              {activeExperiment.reactionTimer?.status === 'running' && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              )}
            </button>

            <button
              type="button"
              onClick={() => duplicateExperiment(activeExperiment.id)}
              className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>Nhân bản</span>
            </button>

            <button
              onClick={handleManualSave}
              disabled={isSyncing}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saveToast ? 'Đã lưu!' : isSyncing ? 'Đang lưu...' : 'Lưu sổ tay'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold px-3.5 py-2 rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="In sổ tay"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>In sổ tay</span>
            </button>
          </div>
        </div>

        {/* Full-Width Widescreen Experiment Dossier Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm card-print">
          <div className="grid grid-cols-12 gap-5 items-center">
            {/* Left 8 cols: Code, Date, Status + Title */}
            <div className="col-span-8 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <input
                  type="text"
                  value={activeExperiment.code || ''}
                  onChange={(e) => handleMetaChange('code', e.target.value)}
                  placeholder="Mã TN"
                  className="w-32 font-mono tabular-nums font-bold text-xs bg-teal-50 border border-teal-200 text-teal-800 px-3 py-1.5 rounded-xl focus:outline-none uppercase"
                />

                <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <input
                    type="date"
                    value={activeExperiment.date || ''}
                    onChange={(e) => handleMetaChange('date', e.target.value)}
                    className="bg-transparent text-xs font-mono tabular-nums text-slate-700 focus:outline-none"
                  />
                </div>

                <select
                  value={activeExperiment.status || 'draft'}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="text-xs font-bold px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none"
                >
                  <option value="draft">Bản nháp</option>
                  <option value="running">Đang khuấy</option>
                  <option value="paused">Tạm dừng</option>
                  <option value="workup">Xử lý thô</option>
                  <option value="purification">Sắc ký cột</option>
                  <option value="completed">Hoàn thành</option>
                </select>
              </div>

              <input
                type="text"
                value={activeExperiment.title || ''}
                onChange={(e) => handleMetaChange('title', e.target.value)}
                placeholder="Tên phản ứng thí nghiệm..."
                className="w-full text-2xl font-extrabold text-slate-900 border-0 border-b-2 border-transparent focus:border-teal-600 py-0.5 focus:outline-none transition-colors"
              />
            </div>

            {/* Right 4 cols: Researcher & Lab Room */}
            <div className="col-span-4 grid grid-cols-1 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
                <input
                  type="text"
                  value={activeExperiment.researcher || ''}
                  onChange={(e) => handleMetaChange('researcher', e.target.value)}
                  placeholder="Nghiên cứu viên..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <input
                  type="text"
                  value={activeExperiment.labRoom || ''}
                  onChange={(e) => handleMetaChange('labRoom', e.target.value)}
                  placeholder="Phòng thí nghiệm..."
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sticky 6-Stage Horizontal Workstation Bar */}
        <div className="sticky top-16 z-30 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-2xl shadow-md border border-slate-800 grid grid-cols-6 gap-1.5 no-print">
          {WORKFLOW_STAGES.map((stage) => {
            const Icon = stage.icon;
            const isActive = activeNav === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => handleStageSelect(stage.sectionId, stage.id)}
                className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? stage.activeBg + ' shadow-sm'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2 truncate">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : stage.accent}`} />
                  <span className="truncate">{stage.fullLabel}</span>
                </span>
                <span
                  className={`font-mono tabular-nums text-[10px] px-2 py-0.5 rounded-md ml-1.5 flex-shrink-0 ${
                    isActive
                      ? 'bg-black/20 text-white'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {getStageBadgeText(stage.id)}
                </span>
              </button>
            );
          })}
        </div>

        {/* FULL-WIDTH MAIN WORKSTATION CANVAS (100% of 1440px width) */}
        <div className="min-w-0">
          {renderModules()}
        </div>
      </div>
    );
  }

  // ============================================================================
  // LAYOUT 2: IPAD LAB WORKBENCH (Dedicated Tablet Hybrid Interface)
  // ============================================================================
  if (isIPad) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-5 py-4 space-y-4 pb-20">
        {/* Top Action & View Mode Bar */}
        <div className="flex items-center justify-between gap-2 no-print">
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToDashboard}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-slate-700 hover:text-teal-700 bg-white hover:bg-slate-50 px-3.5 py-2 rounded-2xl border border-slate-200 shadow-xs min-h-[42px] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Danh Sách</span>
            </button>

            {/* Segmented Mode Switcher: Toàn trang vs Từng bước */}
            <div className="bg-white p-1 rounded-2xl border border-slate-200 shadow-xs inline-flex items-center">
              <button
                type="button"
                onClick={() => setViewMode('all')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                  viewMode === 'all'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Toàn trang</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('focus')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                  viewMode === 'focus'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Từng mục</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {saveToast && (
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-2 rounded-xl border border-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đã lưu!
              </span>
            )}

            <button
              onClick={handleManualSave}
              disabled={isSyncing}
              className="bg-teal-600 hover:bg-teal-700 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-2xl flex items-center gap-1.5 shadow-md min-h-[42px] cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSyncing ? 'Đang lưu...' : 'Lưu Sổ Tay'}</span>
            </button>

            <button
              onClick={() => window.print()}
              className="bg-white hover:bg-slate-50 text-slate-700 text-xs sm:text-sm font-semibold px-3.5 py-2 rounded-2xl border border-slate-200 flex items-center gap-1.5 shadow-xs min-h-[42px] cursor-pointer"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>In sổ tay</span>
            </button>
          </div>
        </div>

        {/* iPad 2-Zone Experiment Dossier Card */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200 shadow-sm card-print">
          <div className="grid grid-cols-12 gap-4 items-center">
            {/* Left 7 cols: Code, Date, Status + Title */}
            <div className="col-span-7 space-y-2.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={activeExperiment.code || ''}
                  onChange={(e) => handleMetaChange('code', e.target.value)}
                  placeholder="Mã TN"
                  className="w-28 font-mono tabular-nums font-bold text-xs sm:text-sm bg-teal-50 border border-teal-200 text-teal-800 px-3 py-2 rounded-xl focus:outline-none uppercase min-h-[42px]"
                />

                <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl min-h-[42px]">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <input
                    type="date"
                    value={activeExperiment.date || ''}
                    onChange={(e) => handleMetaChange('date', e.target.value)}
                    className="bg-transparent text-xs font-mono tabular-nums text-slate-700 focus:outline-none"
                  />
                </div>

                <select
                  value={activeExperiment.status || 'draft'}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="text-xs font-bold px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none min-h-[42px]"
                >
                  <option value="draft">Bản nháp</option>
                  <option value="running">Đang khuấy</option>
                  <option value="paused">Tạm dừng</option>
                  <option value="workup">Xử lý thô</option>
                  <option value="purification">Sắc ký cột</option>
                  <option value="completed">Hoàn thành</option>
                </select>
              </div>

              <input
                type="text"
                value={activeExperiment.title || ''}
                onChange={(e) => handleMetaChange('title', e.target.value)}
                placeholder="Tên phản ứng thí nghiệm..."
                className="w-full text-lg sm:text-xl font-extrabold text-slate-900 border-0 border-b-2 border-transparent focus:border-teal-600 py-0.5 focus:outline-none transition-colors"
              />
            </div>

            {/* Right 5 cols: Researcher & Lab Room */}
            <div className="col-span-5 grid grid-cols-1 gap-2 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <input
                  type="text"
                  value={activeExperiment.researcher || ''}
                  onChange={(e) => handleMetaChange('researcher', e.target.value)}
                  placeholder="Nghiên cứu viên..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-800 focus:outline-none min-h-[38px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <Building className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <input
                  type="text"
                  value={activeExperiment.labRoom || ''}
                  onChange={(e) => handleMetaChange('labRoom', e.target.value)}
                  placeholder="Phòng thí nghiệm..."
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none min-h-[38px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* iPad Sticky 6-Stage Workbench Dock */}
        <div className="sticky top-16 z-30 bg-slate-900/95 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-slate-800 grid grid-cols-6 gap-1.5 no-print">
          {WORKFLOW_STAGES.map((stage) => {
            const Icon = stage.icon;
            const isActive = activeNav === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => handleStageSelect(stage.sectionId, stage.id)}
                className={`flex flex-col items-center justify-center py-2 px-1.5 rounded-xl transition-all cursor-pointer min-h-[54px] ${
                  isActive
                    ? stage.activeBg + ' shadow-md'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : stage.accent}`} />
                  <span className="text-xs font-bold whitespace-nowrap">{stage.shortLabel}</span>
                </div>
                <span
                  className={`text-[10px] font-mono tabular-nums mt-0.5 px-1.5 py-0.2 rounded ${
                    isActive ? 'text-white/90 font-semibold' : 'text-slate-400'
                  }`}
                >
                  {getStageBadgeText(stage.id)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Render Synthesis Modules */}
        {renderModules()}
      </div>
    );
  }

  // ============================================================================
  // LAYOUT 3: IPHONE ONE-HANDED MOBILE LAB BENCH
  // ============================================================================
  return (
    <div className="max-w-xl mx-auto px-3 py-3 space-y-3.5 pb-28">
      {/* Top Navigation & Action Bar */}
      <div className="flex items-center justify-between gap-1.5 no-print">
        <button
          onClick={onBackToDashboard}
          className="flex items-center gap-1 text-xs font-semibold text-slate-700 bg-white px-3 py-2 rounded-2xl border border-slate-200 shadow-xs min-h-[40px] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Danh Sách</span>
        </button>

        {/* Quick Focus vs Full Scroll Switcher on iPhone */}
        <div className="bg-white p-0.5 rounded-xl border border-slate-200 inline-flex items-center">
          <button
            type="button"
            onClick={() => setViewMode('all')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
              viewMode === 'all' ? 'bg-teal-600 text-white' : 'text-slate-600'
            }`}
          >
            Toàn bộ
          </button>
          <button
            type="button"
            onClick={() => setViewMode('focus')}
            className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer ${
              viewMode === 'focus' ? 'bg-teal-600 text-white' : 'text-slate-600'
            }`}
          >
            Từng mục
          </button>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleManualSave}
            disabled={isSyncing}
            className="bg-teal-600 active:bg-teal-800 text-white text-xs font-bold px-3 py-2 rounded-2xl flex items-center gap-1 shadow-sm min-h-[40px] cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{saveToast ? 'Đã lưu!' : 'Lưu'}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="bg-white text-slate-700 p-2 rounded-2xl border border-slate-200 shadow-xs min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
            title="In sổ tay"
          >
            <Printer className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      {/* Compact Single-Card Metadata Header on iPhone */}
      <div className="bg-white rounded-3xl p-3.5 border border-slate-200 shadow-xs space-y-2.5 card-print">
        <div className="grid grid-cols-12 items-center gap-1.5">
          <input
            type="text"
            value={activeExperiment.code || ''}
            onChange={(e) => handleMetaChange('code', e.target.value)}
            placeholder="Mã TN"
            className="col-span-3 font-mono tabular-nums font-bold text-xs bg-teal-50 border border-teal-200 text-teal-800 px-2 py-2 rounded-xl focus:outline-none min-h-[40px] uppercase"
          />

          <div className="col-span-5 flex items-center gap-1 text-xs text-slate-500 bg-slate-50 border border-slate-200 px-2 py-2 rounded-xl min-h-[40px] min-w-0">
            <input
              type="date"
              value={activeExperiment.date || ''}
              onChange={(e) => handleMetaChange('date', e.target.value)}
              className="bg-transparent text-xs font-mono tabular-nums text-slate-700 focus:outline-none w-full min-w-0"
            />
          </div>

          <select
            value={activeExperiment.status || 'draft'}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="col-span-4 text-xs font-bold px-2 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 focus:outline-none min-h-[40px] truncate"
          >
            <option value="draft">Bản nháp</option>
            <option value="running">Đang khuấy</option>
            <option value="paused">Tạm dừng</option>
            <option value="workup">Xử lý thô</option>
            <option value="purification">Sắc ký cột</option>
            <option value="completed">Hoàn thành</option>
          </select>
        </div>

        <input
          type="text"
          value={activeExperiment.title || ''}
          onChange={(e) => handleMetaChange('title', e.target.value)}
          placeholder="Tên phản ứng thí nghiệm..."
          className="w-full text-base font-extrabold text-slate-900 border-0 border-b border-slate-200 focus:border-teal-600 py-1 focus:outline-none"
        />

        <div className="grid grid-cols-2 gap-1.5 text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 min-w-0">
            <User className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
            <input
              type="text"
              value={activeExperiment.researcher || ''}
              onChange={(e) => handleMetaChange('researcher', e.target.value)}
              placeholder="Người thực hiện..."
              className="w-full min-w-0 bg-transparent text-xs font-semibold text-slate-800 focus:outline-none truncate"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 min-w-0">
            <Building className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <input
              type="text"
              value={activeExperiment.labRoom || ''}
              onChange={(e) => handleMetaChange('labRoom', e.target.value)}
              placeholder="Phòng lab..."
              className="w-full min-w-0 bg-transparent text-xs font-medium text-slate-700 focus:outline-none truncate"
            />
          </div>
        </div>
      </div>

      {/* Render Synthesis Modules */}
      {renderModules()}

      {/* FLOATING MINI LIVE TIMER BAR ON IPHONE */}
      {activeExperiment.reactionTimer?.status === 'running' && (
        <div className="fixed bottom-16 left-3 right-3 z-40 mb-safe animate-in slide-in-from-bottom-4 no-print">
          <div
            onClick={() => handleStageSelect('section-timer', 'timer')}
            className="bg-slate-900/95 text-white p-2.5 rounded-2xl shadow-2xl border border-emerald-500/50 backdrop-blur-md flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
              <div>
                <div className="text-[10px] text-emerald-300 uppercase tracking-wider font-bold leading-none">
                  Phản ứng đang khuấy
                </div>
                <div className="font-mono tabular-nums text-sm font-extrabold text-white mt-0.5">
                  {formatTime(totalCurrentTimer)}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleStageSelect('section-timer', 'timer');
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer"
            >
              Xem đồng hồ
            </button>
          </div>
        </div>
      )}

      {/* IPHONE BOTTOM NAVIGATION BAR (Thumb Zone Optimized & Compact) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 no-print pb-safe">
        <div className="grid grid-cols-6 h-14 items-center px-1">
          {WORKFLOW_STAGES.map((stage) => {
            const Icon = stage.icon;
            const isActive = activeNav === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => handleStageSelect(stage.sectionId, stage.id)}
                className={`relative flex flex-col items-center justify-center h-full transition-colors cursor-pointer ${
                  isActive ? `${stage.accent} font-bold` : 'text-slate-400'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 w-6 h-0.5 rounded-full bg-teal-400" />
                )}
                <Icon className="w-4 h-4 mb-0.5" />
                <span className="text-[10px] leading-tight whitespace-nowrap">
                  {stage.shortLabel}
                </span>
                {stage.id === 'timer' &&
                  activeExperiment.reactionTimer?.status === 'running' && (
                    <span className="absolute top-1.5 right-2.5 w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
