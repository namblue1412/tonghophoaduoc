import React from 'react';
import {
  Scale,
  Plus,
  Trash2,
  CheckCircle2,
  Beaker,
  Droplet,
  Layers,
  Sparkles,
  FlaskRound,
  TestTube2,
  Sliders
} from 'lucide-react';

// Unified decimal parser supporting both comma ',' and dot '.'
export const parseDecimal = (val) => {
  if (val === null || val === undefined || val === '') return 0;
  const normalized = String(val).replace(',', '.');
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
};

export const StoichiometryTable = ({
  reagents = [],
  onChange,
  targetMolecule,
  onTargetChange,
  units = { mass: 'g', mole: 'mol' },
  onUnitsChange
}) => {
  const massUnit = units?.mass || 'g'; // 'g' | 'mg'
  const moleUnit = units?.mole || 'mol'; // 'mol' | 'mmol'
  const [unitToast, setUnitToast] = useState(null);

  // Partition into Active Reactants (need molar ratio) vs Medium vs Solvent
  const activeReagents = reagents.filter((r) => r.type !== 'base_acid' && r.type !== 'solvent');
  const mediumReagents = reagents.filter((r) => r.type === 'base_acid');
  const solventReagents = reagents.filter((r) => r.type === 'solvent');

  // Identify limiting reagent from active reagents
  const limitingReagent = activeReagents.find((r) => r.isLimiting) || activeReagents[0];
  const limitingMoles = limitingReagent ? parseDecimal(limitingReagent.moles) : 0;

  // Re-calculate row moles and molar ratio (tỉ lệ mol)
  const calculateRowValues = (row, isLimitingRow = false, currentLimitingMoles = limitingMoles, activeMassUnit = massUnit) => {
    // For medium and solvent, do not calculate moles or molar ratio
    if (row.type === 'base_acid' || row.type === 'solvent') {
      return {
        ...row,
        moles: 0,
        eq: 0,
        molarRatio: 0
      };
    }

    const mw = parseDecimal(row.mw);
    const actualMass = parseDecimal(row.actualMass);
    const actualVolume = parseDecimal(row.actualVolume);
    const density = parseDecimal(row.density);
    const purity = row.purity !== undefined && row.purity !== '' ? parseDecimal(row.purity) : 100;
    const purityFactor = purity > 0 ? purity / 100 : 1;

    let effectiveMass = actualMass;
    if ((!actualMass || actualMass === 0) && actualVolume > 0 && density > 0) {
      if (activeMassUnit === 'mg') {
        effectiveMass = actualVolume * density * 1000;
      } else {
        effectiveMass = actualVolume * density;
      }
    }

    let moles = 0;
    if (mw > 0 && effectiveMass > 0) {
      moles = (effectiveMass * purityFactor) / mw;
    }

    const baseLimiting = isLimitingRow ? moles : currentLimitingMoles;
    const ratio = baseLimiting > 0 && moles > 0 ? moles / baseLimiting : 0;

    return {
      ...row,
      moles: parseFloat(moles.toFixed(5)),
      eq: parseFloat(ratio.toFixed(3)),
      molarRatio: parseFloat(ratio.toFixed(3))
    };
  };

  // Update cell change
  const handleCellChange = (id, field, rawValue) => {
    const cleaned = typeof rawValue === 'string' ? rawValue.replace(/[^0-9.,-]/g, '') : rawValue;

    const updated = reagents.map((r) => {
      if (r.id !== id) return r;
      const updatedRow = { ...r, [field]: cleaned };

      // Auto-compute mass if user inputs volume and density
      if (field === 'actualVolume' || field === 'density') {
        const v = parseDecimal(field === 'actualVolume' ? cleaned : r.actualVolume);
        const d = parseDecimal(field === 'density' ? cleaned : r.density);
        const currentMass = parseDecimal(r.actualMass);
        if (v > 0 && d > 0 && currentMass === 0) {
          const calcMass = massUnit === 'mg' ? v * d * 1000 : v * d;
          updatedRow.actualMass = String(parseFloat(calcMass.toFixed(4)));
        }
      }

      return updatedRow;
    });

    // Re-evaluate moles for active rows
    const curActive = updated.filter((r) => r.type !== 'base_acid' && r.type !== 'solvent');
    const currentLim = curActive.find((r) => r.isLimiting) || curActive[0];
    const tempLimRow = currentLim ? calculateRowValues(currentLim, true) : null;
    const newLimitingMoles = tempLimRow ? tempLimRow.moles : 0;

    const finalReagents = updated.map((r) => {
      if (r.type === 'base_acid' || r.type === 'solvent') return r;
      if (r.id === currentLim?.id) {
        return { ...tempLimRow, isLimiting: true };
      }
      return calculateRowValues(r, false, newLimitingMoles);
    });

    onChange(finalReagents);
  };

  // Set Limiting Reagent (only among active reactants)
  const setLimiting = (id) => {
    const updated = reagents.map((r) => ({
      ...r,
      isLimiting: r.id === id
    }));

    const curActive = updated.filter((r) => r.type !== 'base_acid' && r.type !== 'solvent');
    const newLim = curActive.find((r) => r.isLimiting) || curActive[0];
    const calculatedLim = newLim ? calculateRowValues(newLim, true) : null;
    const limMoles = calculatedLim ? calculatedLim.moles : 0;

    const finalReagents = updated.map((r) => {
      if (r.type === 'base_acid' || r.type === 'solvent') return r;
      if (r.id === id) return calculatedLim;
      return calculateRowValues(r, false, limMoles);
    });

    onChange(finalReagents);
  };

  // Add new reactant / substance
  const addReagent = (type = 'reagent', customName = '', customNotes = '') => {
    let defaultName = customName || 'Thuốc thử mới';
    let defaultNotes = customNotes || '';
    if (type === 'starting_material') {
      defaultName = customName || 'Chất tham gia mới';
      defaultNotes = customNotes || 'Chất phản ứng chính';
    } else if (type === 'catalyst') {
      defaultName = customName || 'Xúc tác mới';
      defaultNotes = customNotes || 'Xúc tác phản ứng';
    } else if (type === 'base_acid') {
      defaultName = customName || 'Dung dịch môi trường';
      defaultNotes = customNotes || '';
    } else if (type === 'solvent') {
      defaultName = customName || 'Dung môi phản ứng';
      defaultNotes = customNotes || '';
    }

    const isFirstActive = type !== 'base_acid' && type !== 'solvent' && activeReagents.length === 0;

    const newRow = {
      id: `reagent-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      name: defaultName,
      formula: '',
      mw: type === 'base_acid' || type === 'solvent' ? '0' : '100.0',
      purity: type === 'base_acid' ? '10.0' : '99.0', // Used as C% for medium
      concentrationPercent: type === 'base_acid' ? '10' : '',
      density: '1.0',
      isLimiting: isFirstActive,
      theoMass: '1.0',
      actualMass: '0',
      actualVolume: '0',
      moles: 0,
      eq: 1.0,
      molarRatio: 1.0,
      notes: defaultNotes
    };

    const calculated = calculateRowValues(newRow, newRow.isLimiting);
    onChange([...reagents, calculated]);
  };

  // Remove row
  const removeReagent = (id) => {
    const target = reagents.find((r) => r.id === id);
    if (!target) return;

    if (target.type !== 'base_acid' && target.type !== 'solvent' && activeReagents.length <= 1) {
      alert('Phản ứng cần ít nhất một chất tham gia!');
      return;
    }

    const filtered = reagents.filter((r) => r.id !== id);
    const remainingActive = filtered.filter((r) => r.type !== 'base_acid' && r.type !== 'solvent');

    if (remainingActive.length > 0 && !remainingActive.some((r) => r.isLimiting)) {
      remainingActive[0].isLimiting = true;
    }

    const currentLim = remainingActive.find((r) => r.isLimiting);
    const limRow = currentLim ? calculateRowValues(currentLim, true) : null;
    const limMoles = limRow ? limRow.moles : 0;

    const finalReagents = filtered.map((r) => {
      if (r.type === 'base_acid' || r.type === 'solvent') return r;
      if (r.id === currentLim?.id) return limRow;
      return calculateRowValues(r, false, limMoles);
    });

    onChange(finalReagents);
  };

  // Auto-calculate theoretical mass from molar ratio (tỉ lệ mol)
  const autoScaleTheoreticalMass = () => {
    if (!limitingReagent || limitingMoles <= 0) {
      alert('Vui lòng nhập khối lượng và phân tử lượng hợp lệ cho chất giới hạn trước!');
      return;
    }

    const updated = reagents.map((r) => {
      if (r.type === 'base_acid' || r.type === 'solvent' || r.isLimiting) return r;
      const mw = parseDecimal(r.mw);
      const purity = parseDecimal(r.purity) > 0 ? parseDecimal(r.purity) / 100 : 1;
      const targetRatio = parseDecimal(r.molarRatio || r.eq) || 1.0;

      if (mw > 0 && purity > 0) {
        const requiredMoles = targetRatio * limitingMoles;
        const requiredTheoMass = (requiredMoles * mw) / purity;
        return {
          ...r,
          theoMass: String(parseFloat(requiredTheoMass.toFixed(4)))
        };
      }
      return r;
    });

    onChange(updated);
    alert(`Đã tính khối lượng lý thuyết cho tất cả các chất dựa theo tỉ lệ mol của ${limitingReagent.name}!`);
  };

  // Toggle Units (g/mol vs mg/mmol) with automatic bidirectional conversion
  const toggleUnitScale = (newMassUnit, newMoleUnit) => {
    if (newMassUnit === massUnit) return;

    const factor = newMassUnit === 'mg' ? 1000 : 0.001;

    // Convert mass values of all active reactants
    const convertedReagents = reagents.map((r) => {
      if (r.type === 'base_acid' || r.type === 'solvent') {
        return r;
      }
      const actualM = parseDecimal(r.actualMass);
      const theoM = parseDecimal(r.theoMass);

      const nextRow = { ...r };
      if (actualM > 0) {
        const converted = actualM * factor;
        nextRow.actualMass = String(parseFloat(converted.toFixed(newMassUnit === 'mg' ? 2 : 5)));
      }
      if (theoM > 0) {
        const converted = theoM * factor;
        nextRow.theoMass = String(parseFloat(converted.toFixed(newMassUnit === 'mg' ? 2 : 5)));
      }
      return nextRow;
    });

    // Re-evaluate moles with newMassUnit
    const curActive = convertedReagents.filter((r) => r.type !== 'base_acid' && r.type !== 'solvent');
    const currentLim = curActive.find((r) => r.isLimiting) || curActive[0];
    const tempLimRow = currentLim ? calculateRowValues(currentLim, true, 0, newMassUnit) : null;
    const newLimitingMoles = tempLimRow ? tempLimRow.moles : 0;

    const finalReagents = convertedReagents.map((r) => {
      if (r.type === 'base_acid' || r.type === 'solvent') return r;
      if (r.id === currentLim?.id) {
        return { ...tempLimRow, isLimiting: true };
      }
      return calculateRowValues(r, false, newLimitingMoles, newMassUnit);
    });

    onChange(finalReagents);
    onUnitsChange?.({ mass: newMassUnit, mole: newMoleUnit }, finalReagents);

    setUnitToast(
      newMassUnit === 'mg'
        ? 'Đã tự động quy đổi dữ liệu: g/mol ➔ mg/mmol (x1000)'
        : 'Đã tự động quy đổi dữ liệu: mg/mmol ➔ g/mol (:1000)'
    );
    setTimeout(() => setUnitToast(null), 3500);
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'starting_material':
        return { label: 'Chất tham gia', color: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'reagent':
        return { label: 'Thuốc thử', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'catalyst':
        return { label: 'Xúc tác', color: 'bg-amber-100 text-amber-800 border-amber-300' };
      default:
        return { label: 'Chất phản ứng', color: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
  };

  // Quick preset shortcuts for medium & solvent
  const MEDIUM_PRESETS = [
    { name: 'Dung dịch HCl 10%', c: '10', notes: 'Nhỏ giọt từ từ ở 0-5°C' },
    { name: 'Dung dịch HCl đặc (37%)', c: '37', notes: 'Nhỏ giọt trong tủ hút' },
    { name: 'Dung dịch NaOH 10%', c: '10', notes: 'Làm lạnh trước khi nhỏ giọt' },
    { name: 'Dung dịch NaOH 20%', c: '20', notes: 'Duy trì pH kiềm' },
    { name: 'Dung dịch H2SO4 20%', c: '20', notes: 'Thêm cẩn thận trên đá' },
    { name: 'Axit Axetic (AcOH)', c: '99', notes: 'Môi trường phản ứng' },
    { name: 'Triethylamine (TEA)', c: '99', notes: 'Base hữu cơ' },
    { name: 'Dung dịch NaHCO3 bão hoà', c: '8', notes: 'Trung hoà axit' }
  ];

  const SOLVENT_PRESETS = [
    { name: 'Dichloromethane (DCM)', notes: 'Dung môi khan' },
    { name: 'Tetrahydrofuran (THF)', notes: 'Dung môi khan, cất qua Na/Benzophenone' },
    { name: 'Ethyl Acetate (EtOAc)', notes: 'Dung môi phản ứng' },
    { name: 'Hexan', notes: 'Dung môi không phân cực' },
    { name: 'Ethanol (EtOH)', notes: 'Dung môi hoàn lưu' },
    { name: 'Methanol (MeOH)', notes: 'Dung môi phản ứng' },
    { name: 'N,N-Dimethylformamide (DMF)', notes: 'Dung môi phân cực phi proton' },
    { name: 'Nước cất (H2O)', notes: 'Pha nước' }
  ];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden card-print space-y-0">
      {/* Module Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-md text-white flex-shrink-0">
            <Scale className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              1. Cân đong & Nạp liệu
              <span className="text-xs bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 px-2 py-0.5 rounded-full font-mono font-medium">
                {activeReagents.length} chất tham gia
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Bảng tính số mol và tỉ lệ mol phản ứng (chuẩn hóa theo chất giới hạn)
            </p>
          </div>
        </div>

        {/* Unit Selector & Action Button */}
        <div className="flex flex-wrap items-center gap-2 no-print w-full sm:w-auto justify-between sm:justify-end">
          {/* Unit Toggle: g/mol vs mg/mmol */}
          <div className="bg-slate-800/90 border border-slate-700 p-1 rounded-2xl flex items-center gap-1">
            <span className="text-[11px] text-slate-400 font-semibold px-2">Đơn vị:</span>
            <button
              type="button"
              onClick={() => toggleUnitScale('g', 'mol')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] cursor-pointer ${
                massUnit === 'g'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              g / mol
            </button>
            <button
              type="button"
              onClick={() => toggleUnitScale('mg', 'mmol')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all min-h-[38px] cursor-pointer ${
                massUnit === 'mg'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              mg / mmol
            </button>
          </div>

          <button
            type="button"
            onClick={autoScaleTheoreticalMass}
            className="bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs px-3.5 py-2 rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer font-bold border border-indigo-400/30 min-h-[44px]"
            title="Tính khối lượng lý thuyết từ tỉ lệ mol"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            <span>Tính m theo tỉ lệ mol</span>
          </button>
        </div>
      </div>

      {/* Unit Auto-Conversion Toast Notification */}
      {unitToast && (
        <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2.5 flex items-center justify-between animate-in fade-in slide-in-from-top-1 no-print">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-200 flex-shrink-0" />
            {unitToast}
          </span>
          <button
            type="button"
            onClick={() => setUnitToast(null)}
            className="text-white hover:text-emerald-100 p-1 rounded-lg text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Target Molecule Quick Bar */}
      {targetMolecule && (
        <div className="bg-indigo-50/70 border-b border-indigo-100 p-3 sm:px-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <span className="font-bold text-indigo-950 flex items-center gap-1.5 flex-shrink-0">
              <Beaker className="w-4 h-4 text-indigo-600" /> Sản phẩm mục tiêu:
            </span>
            <input
              type="text"
              value={targetMolecule.name || ''}
              onChange={(e) => onTargetChange?.('name', e.target.value)}
              placeholder="Tên sản phẩm..."
              className="bg-white border border-indigo-200 px-3 py-2 rounded-xl text-indigo-950 font-bold focus:outline-none min-h-[44px] flex-1 text-xs sm:text-sm"
            />
          </div>
          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <span className="text-slate-600 font-medium">CTHH:</span>
              <input
                type="text"
                value={targetMolecule.molecularFormula || ''}
                onChange={(e) => onTargetChange?.('molecularFormula', e.target.value)}
                placeholder="C10H8O3"
                className="bg-white border border-indigo-200 px-2 py-2 rounded-xl font-mono text-xs w-full sm:w-28 text-slate-800 focus:outline-none min-h-[44px]"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-1 sm:flex-initial">
              <span className="text-slate-600 font-medium">M (g/mol):</span>
              <input
                type="text"
                inputMode="decimal"
                value={targetMolecule.molecularWeight ?? ''}
                onChange={(e) => onTargetChange?.('molecularWeight', e.target.value.replace(/[^0-9.,-]/g, ''))}
                placeholder="176.17"
                className="bg-white border border-indigo-200 px-2 py-2 rounded-xl font-mono font-bold text-xs w-full sm:w-24 text-indigo-700 focus:outline-none min-h-[44px]"
              />
            </div>
          </div>
        </div>
      )}

      {/* Limiting Reagent Banner */}
      <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2.5 sm:px-6 flex items-center justify-between text-xs text-emerald-900">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>
            Chất giới hạn (Tỉ lệ mốc 1.00):{' '}
            <strong className="font-bold underline text-emerald-950">{limitingReagent?.name || 'Chưa chọn'}</strong>{' '}
            ({limitingMoles > 0 ? `${limitingMoles} ${moleUnit}` : `0 ${moleUnit}`} = <strong>Tỉ lệ 1.00</strong>)
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 1: CÁC CHẤT THAM GIA, THUỐC THỬ & XÚC TÁC        */}
      {/* (CÓ TÍNH SỐ MOL & TỈ LỆ MOL)                              */}
      {/* ========================================================= */}
      <div className="p-3 sm:p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            A. Các chất tham gia phản ứng & Xúc tác (Tính Tỉ Lệ Mol)
          </h3>
          <span className="text-[11px] text-slate-500 font-mono">
            {activeReagents.length} chất tham gia
          </span>
        </div>

        {/* MOBILE CARD VIEW (Phone screens) */}
        <div className="block md:hidden space-y-3">
          {activeReagents.map((row) => {
            const typeBadge = getTypeLabel(row.type);
            const isLim = row.isLimiting;
            const ratioVal = row.molarRatio ?? row.eq ?? 0;

            return (
              <div
                key={row.id}
                className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
                  isLim
                    ? 'bg-emerald-50/50 border-emerald-300 shadow-sm'
                    : 'bg-white border-slate-200'
                }`}
              >
                {/* Header: Radio Limiting + Type select + Delete */}
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 cursor-pointer min-h-[44px]">
                    <input
                      type="radio"
                      name="limitingReagentGroupMobile"
                      checked={Boolean(isLim)}
                      onChange={() => setLimiting(row.id)}
                      className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                    />
                    <span className={`text-xs font-bold ${isLim ? 'text-emerald-900' : 'text-slate-600'}`}>
                      {isLim ? 'Chất giới hạn (Mốc 1.00)' : 'Chọn làm mốc'}
                    </span>
                  </label>

                  <div className="flex items-center gap-1.5">
                    <select
                      value={row.type}
                      onChange={(e) => handleCellChange(row.id, 'type', e.target.value)}
                      className={`text-xs font-semibold px-2 py-1.5 rounded-xl border focus:outline-none min-h-[44px] ${typeBadge.color}`}
                    >
                      <option value="starting_material">Chất tham gia</option>
                      <option value="reagent">Thuốc thử</option>
                      <option value="catalyst">Xúc tác</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => removeReagent(row.id)}
                      className="p-2 text-slate-400 hover:text-rose-600 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                      title="Xóa chất này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Name & Formula */}
                <div className="space-y-1">
                  <input
                    type="text"
                    value={row.name || ''}
                    onChange={(e) => handleCellChange(row.id, 'name', e.target.value)}
                    placeholder="Tên hóa chất (VD: 4-hydroxycoumarin)..."
                    className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none min-h-[44px]"
                  />
                  <input
                    type="text"
                    value={row.formula || ''}
                    onChange={(e) => handleCellChange(row.id, 'formula', e.target.value)}
                    placeholder="Công thức (C9H6O3)..."
                    className="w-full bg-transparent border-0 border-b border-slate-200 text-xs font-mono text-slate-500 px-2 py-1 focus:outline-none"
                  />
                </div>

                {/* Numeric Inputs Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5">M (g/mol):</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.mw ?? ''}
                      onChange={(e) => handleCellChange(row.id, 'mw', e.target.value)}
                      placeholder="162.14"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 font-mono font-bold focus:outline-none min-h-[44px]"
                    />
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-0.5">Độ sạch (%):</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.purity ?? '99'}
                      onChange={(e) => handleCellChange(row.id, 'purity', e.target.value)}
                      placeholder="99"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 font-mono focus:outline-none min-h-[44px]"
                    />
                  </div>

                  <div>
                    <span className="text-amber-800 font-bold block mb-0.5">
                      m thực tế ({massUnit}):
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={row.actualMass ?? ''}
                      onChange={(e) => handleCellChange(row.id, 'actualMass', e.target.value)}
                      placeholder={massUnit === 'mg' ? '150.0' : '1.5000'}
                      className="w-full bg-amber-50 border border-amber-300 rounded-xl px-2.5 py-2 font-mono font-bold text-amber-950 focus:outline-none min-h-[44px]"
                    />
                  </div>

                  <div>
                    <span className="text-slate-500 block mb-0.5">V (mL) / d (g/mL):</span>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.actualVolume ?? ''}
                        onChange={(e) => handleCellChange(row.id, 'actualVolume', e.target.value)}
                        placeholder="mL"
                        className="w-1/2 bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 font-mono focus:outline-none min-h-[44px]"
                      />
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.density ?? ''}
                        onChange={(e) => handleCellChange(row.id, 'density', e.target.value)}
                        placeholder="d"
                        className="w-1/2 bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 font-mono focus:outline-none min-h-[44px]"
                      />
                    </div>
                  </div>
                </div>

                {/* Calculated: Số Mol & Tỉ Lệ Mol */}
                <div className="flex items-center justify-between bg-slate-100/70 p-2.5 rounded-xl border border-slate-200">
                  <div className="text-xs">
                    <span className="text-slate-500 block text-[11px]">Số mol (n):</span>
                    <span className="font-mono font-bold text-indigo-700 text-sm">
                      {row.moles > 0 ? `${row.moles < 0.001 ? row.moles.toExponential(3) : row.moles} ${moleUnit}` : '--'}
                    </span>
                  </div>

                  <div className="text-xs text-right">
                    <span className="text-slate-500 block text-[11px]">Tỉ lệ mol:</span>
                    <span className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded-md ${
                      isLim ? 'bg-emerald-200 text-emerald-950 font-extrabold' : 'bg-white text-emerald-800 border border-slate-200'
                    }`}>
                      {ratioVal > 0 ? (isLim ? '1.00 (mốc)' : `${ratioVal}`) : '--'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* DESKTOP / IPAD SPREADSHEET TABLE */}
        <div className="hidden md:block overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-3 text-center w-16">Giới hạn</th>
                <th className="py-3 px-3 w-40">Phân loại</th>
                <th className="py-3 px-3">Tên hóa chất / Công thức</th>
                <th className="py-3 px-2 text-right w-24">M (g/mol)</th>
                <th className="py-3 px-2 text-right w-24">Độ sạch (%)</th>
                <th className="py-3 px-2 text-right w-28">m thực ({massUnit})</th>
                <th className="py-3 px-2 text-right w-24">V (mL)</th>
                <th className="py-3 px-2 text-right w-24">d (g/mL)</th>
                <th className="py-3 px-2 text-right w-28 bg-indigo-50/60 text-indigo-900 font-bold">Số mol ({moleUnit})</th>
                <th className="py-3 px-2 text-right w-28 bg-emerald-50/60 text-emerald-900 font-bold">Tỉ lệ mol</th>
                <th className="py-3 px-3 w-40">Ghi chú</th>
                <th className="py-3 px-2 text-center w-12 no-print">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {activeReagents.map((row) => {
                const typeBadge = getTypeLabel(row.type);
                const isLim = row.isLimiting;
                const ratioVal = row.molarRatio ?? row.eq ?? 0;

                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      isLim ? 'bg-emerald-50/30 font-medium' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 text-center">
                      <label className="inline-flex items-center justify-center cursor-pointer p-1">
                        <input
                          type="radio"
                          name="limitingReagentGroupDesktop"
                          checked={Boolean(isLim)}
                          onChange={() => setLimiting(row.id)}
                          className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                          title="Đặt làm chất giới hạn (Mốc tỉ lệ 1.00)"
                        />
                      </label>
                    </td>

                    <td className="py-2.5 px-2">
                      <select
                        value={row.type}
                        onChange={(e) => handleCellChange(row.id, 'type', e.target.value)}
                        className={`text-xs font-semibold px-2 py-1.5 rounded-lg border focus:outline-none w-full min-h-[38px] ${typeBadge.color}`}
                      >
                        <option value="starting_material">Chất tham gia</option>
                        <option value="reagent">Thuốc thử</option>
                        <option value="catalyst">Xúc tác</option>
                      </select>
                    </td>

                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={row.name || ''}
                        onChange={(e) => handleCellChange(row.id, 'name', e.target.value)}
                        placeholder="Tên chất..."
                        className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-medium focus:outline-none min-h-[38px]"
                      />
                      <input
                        type="text"
                        value={row.formula || ''}
                        onChange={(e) => handleCellChange(row.id, 'formula', e.target.value)}
                        placeholder="CTHH"
                        className="w-full mt-1 bg-transparent border-0 border-b border-dashed border-slate-300 text-[11px] font-mono text-slate-500 px-1 py-0.5 focus:outline-none"
                      />
                    </td>

                    <td className="py-2.5 px-2 text-right">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.mw ?? ''}
                        onChange={(e) => handleCellChange(row.id, 'mw', e.target.value)}
                        className="w-full text-right font-mono font-semibold bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs sm:text-sm focus:outline-none min-h-[38px]"
                      />
                    </td>

                    <td className="py-2.5 px-2 text-right">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.purity ?? '99'}
                        onChange={(e) => handleCellChange(row.id, 'purity', e.target.value)}
                        className="w-full text-right font-mono bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs sm:text-sm focus:outline-none min-h-[38px]"
                      />
                    </td>

                    <td className="py-2.5 px-2 text-right">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.actualMass ?? ''}
                        onChange={(e) => handleCellChange(row.id, 'actualMass', e.target.value)}
                        placeholder="0.00"
                        className="w-full text-right font-mono font-bold text-slate-900 bg-amber-50/50 focus:bg-white border border-amber-200 rounded-lg px-2 py-1.5 text-xs sm:text-sm focus:outline-none min-h-[38px]"
                      />
                    </td>

                    <td className="py-2.5 px-2 text-right">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.actualVolume ?? ''}
                        onChange={(e) => handleCellChange(row.id, 'actualVolume', e.target.value)}
                        placeholder="mL"
                        className="w-full text-right font-mono bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs sm:text-sm focus:outline-none min-h-[38px]"
                      />
                    </td>

                    <td className="py-2.5 px-2 text-right">
                      <input
                        type="text"
                        inputMode="decimal"
                        value={row.density ?? ''}
                        onChange={(e) => handleCellChange(row.id, 'density', e.target.value)}
                        placeholder="1.00"
                        className="w-full text-right font-mono bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs sm:text-sm focus:outline-none min-h-[38px]"
                      />
                    </td>

                    <td className="py-2.5 px-2 text-right bg-indigo-50/40 font-mono font-bold text-indigo-950 text-xs sm:text-sm">
                      {row.moles > 0 ? (
                        <span>
                          {row.moles < 0.001 ? row.moles.toExponential(3) : row.moles}
                          <span className="text-[10px] text-indigo-500 font-normal ml-0.5">{moleUnit}</span>
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-2.5 px-2 text-right bg-emerald-50/40 font-mono font-bold text-emerald-950 text-xs sm:text-sm">
                      {ratioVal > 0 ? (
                        <span className={isLim ? 'text-emerald-800 bg-emerald-100 font-bold px-2 py-0.5 rounded' : 'text-slate-800'}>
                          {isLim ? '1.00' : ratioVal}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      <input
                        type="text"
                        value={row.notes || ''}
                        onChange={(e) => handleCellChange(row.id, 'notes', e.target.value)}
                        placeholder="Ghi chú..."
                        className="w-full bg-transparent border-0 border-b border-slate-200 text-xs text-slate-600 py-1 focus:outline-none min-h-[36px]"
                      />
                    </td>

                    <td className="py-2.5 px-2 text-center no-print">
                      <button
                        type="button"
                        onClick={() => removeReagent(row.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
                        title="Xóa chất này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Buttons to Add Active Reactants */}
        <div className="flex flex-wrap items-center gap-2 pt-1 no-print">
          <button
            type="button"
            onClick={() => addReagent('starting_material')}
            className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 font-bold shadow-sm min-h-[44px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm Chất tham gia</span>
          </button>
          <button
            type="button"
            onClick={() => addReagent('reagent')}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 font-bold shadow-sm min-h-[44px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm Thuốc thử</span>
          </button>
          <button
            type="button"
            onClick={() => addReagent('catalyst')}
            className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 font-bold shadow-sm min-h-[44px] cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm Xúc tác</span>
          </button>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SECTION 2: DUNG DỊCH MÔI TRƯỜNG & DUNG MÔI PHẢN ỨNG      */}
      {/* (PHA SẴN THEO C% & THỂ TÍCH - KHÔNG TÍNH TỈ LỆ MOL)      */}
      {/* ========================================================= */}
      <div className="border-t border-slate-200 bg-slate-50/60 p-3 sm:p-5 space-y-5">
        <div>
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-600"></span>
            B. Dung dịch Môi trường & Dung môi phản ứng (Pha sẵn & Lấy theo thể tích)
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Các dung dịch pha sẵn hoặc dung môi phản ứng chỉ cần xác định nồng độ C% và thể tích nạp (mL), không tính tỉ lệ mol.
          </p>
        </div>

        {/* 1. DUNG DỊCH MÔI TRƯỜNG (BASE / ACID) */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-purple-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                <TestTube2 className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-purple-950">
                  Dung dịch Môi trường
                </h4>
                <span className="text-[11px] text-purple-600 font-medium">
                  {mediumReagents.length} môi trường đã khai báo
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => addReagent('base_acid')}
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 min-h-[38px] cursor-pointer no-print"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Thêm môi trường</span>
            </button>
          </div>

          {/* Quick presets for Medium */}
          <div className="no-print flex flex-wrap items-center gap-1.5 bg-purple-50/60 p-2 rounded-xl border border-purple-100">
            <span className="text-[11px] font-semibold text-purple-800 mr-1">Gợi ý nhanh:</span>
            {MEDIUM_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => addReagent('base_acid', preset.name, preset.notes)}
                className="text-[11px] bg-white hover:bg-purple-100 text-purple-900 border border-purple-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                {preset.name}
              </button>
            ))}
          </div>

          {/* List of Medium items */}
          {mediumReagents.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              Chưa khai báo dung dịch môi trường nào. Bấm gợi ý ở trên hoặc nút thêm nếu phản ứng cần axit/base/dung dịch đệm.
            </p>
          ) : (
            <div className="space-y-2">
              {mediumReagents.map((mRow) => (
                <div
                  key={mRow.id}
                  className="bg-purple-50/30 border border-purple-100 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2">
                    {/* Tên môi trường */}
                    <div className="sm:col-span-5">
                      <span className="text-[10px] text-purple-700 font-bold block sm:hidden">Môi trường:</span>
                      <input
                        type="text"
                        value={mRow.name || ''}
                        onChange={(e) => handleCellChange(mRow.id, 'name', e.target.value)}
                        placeholder="Tên môi trường (VD: Dung dịch HCl 10%)..."
                        className="w-full bg-white border border-purple-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-purple-950 focus:outline-none min-h-[38px]"
                      />
                    </div>

                    {/* Nồng độ C% */}
                    <div className="sm:col-span-3">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-500 whitespace-nowrap font-medium">Nồng độ C%:</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={mRow.concentrationPercent || mRow.purity || ''}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9.,-]/g, '');
                            handleCellChange(mRow.id, 'concentrationPercent', val);
                            handleCellChange(mRow.id, 'purity', val);
                          }}
                          placeholder="10%"
                          className="w-full bg-white border border-purple-200 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-center text-purple-900 focus:outline-none min-h-[38px]"
                        />
                      </div>
                    </div>

                    {/* Thể tích V (mL) */}
                    <div className="sm:col-span-4">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-500 whitespace-nowrap font-medium">Thể tích:</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={mRow.actualVolume || ''}
                          onChange={(e) => handleCellChange(mRow.id, 'actualVolume', e.target.value)}
                          placeholder="V (mL)"
                          className="w-full bg-white border border-purple-200 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none min-h-[38px]"
                        />
                        <span className="text-xs text-slate-500 font-semibold">mL</span>
                      </div>
                    </div>
                  </div>

                  {/* Ghi chú & Nút Xoá */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={mRow.notes || ''}
                      onChange={(e) => handleCellChange(mRow.id, 'notes', e.target.value)}
                      placeholder="Ghi chú (nhỏ giọt, pH...)..."
                      className="bg-transparent border-0 border-b border-purple-200 text-xs text-purple-800 px-2 py-1 focus:outline-none w-full sm:w-48 min-h-[36px]"
                    />
                    <button
                      type="button"
                      onClick={() => removeReagent(mRow.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer no-print"
                      title="Xóa môi trường này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 2. DUNG MÔI PHẢN ỨNG */}
        <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
                <Droplet className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                  Dung môi phản ứng
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">
                  {solventReagents.length} dung môi
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => addReagent('solvent')}
              className="bg-slate-700 hover:bg-slate-800 text-white text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 min-h-[38px] cursor-pointer no-print"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Thêm dung môi</span>
            </button>
          </div>

          {/* Quick presets for Solvent */}
          <div className="no-print flex flex-wrap items-center gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-600 mr-1">Gợi ý nhanh:</span>
            {SOLVENT_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => addReagent('solvent', preset.name, preset.notes)}
                className="text-[11px] bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              >
                {preset.name}
              </button>
            ))}
          </div>

          {/* List of Solvent items */}
          {solventReagents.length === 0 ? (
            <p className="text-xs text-slate-400 italic py-2">
              Chưa khai báo dung môi. Bấm nút gợi ý hoặc thêm dung môi để ghi nhận lượng nạp (mL).
            </p>
          ) : (
            <div className="space-y-2">
              {solventReagents.map((sRow) => (
                <div
                  key={sRow.id}
                  className="bg-slate-50/70 border border-slate-200 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                >
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2">
                    {/* Tên dung môi */}
                    <div className="sm:col-span-7">
                      <span className="text-[10px] text-slate-600 font-bold block sm:hidden">Dung môi:</span>
                      <input
                        type="text"
                        value={sRow.name || ''}
                        onChange={(e) => handleCellChange(sRow.id, 'name', e.target.value)}
                        placeholder="Tên dung môi (VD: Dichloromethane DCM)..."
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:outline-none min-h-[38px]"
                      />
                    </div>

                    {/* Thể tích V (mL) */}
                    <div className="sm:col-span-5">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-slate-500 whitespace-nowrap font-medium">Thể tích:</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={sRow.actualVolume || ''}
                          onChange={(e) => handleCellChange(sRow.id, 'actualVolume', e.target.value)}
                          placeholder="V (mL)"
                          className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none min-h-[38px]"
                        />
                        <span className="text-xs text-slate-500 font-semibold">mL</span>
                      </div>
                    </div>
                  </div>

                  {/* Ghi chú & Nút Xoá */}
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={sRow.notes || ''}
                      onChange={(e) => handleCellChange(sRow.id, 'notes', e.target.value)}
                      placeholder="Ghi chú (làm khan, sấy...)..."
                      className="bg-transparent border-0 border-b border-slate-200 text-xs text-slate-600 px-2 py-1 focus:outline-none w-full sm:w-48 min-h-[36px]"
                    />
                    <button
                      type="button"
                      onClick={() => removeReagent(sRow.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer no-print"
                      title="Xóa dung môi này"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Batch Scale & Totals Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono text-slate-600 bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            Quy mô nạp liệu:{' '}
            <strong className="text-indigo-900 font-bold">
              {limitingMoles > 0 ? `${limitingMoles} ${moleUnit}` : `0 ${moleUnit}`}
            </strong>{' '}
            (Chất giới hạn: {limitingReagent?.name || 'Chưa chọn'})
          </div>
          <div className="w-px h-4 bg-slate-200 hidden sm:block"></div>
          <div>
            Tổng khối lượng chất rắn/tham gia:{' '}
            <strong className="text-slate-900 font-bold">
              {activeReagents.reduce((sum, r) => sum + parseDecimal(r.actualMass), 0).toFixed(3)} {massUnit}
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};
