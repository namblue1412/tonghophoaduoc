import React, { useState } from 'react';
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
import { useDevice } from '../context/DeviceContext';

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
  const { isIPhone, isIPad, isMac } = useDevice();
  const massUnit = units?.mass || 'g'; // 'g' | 'mg'
  const moleUnit = units?.mole || 'mol'; // 'mol' | 'mmol'
  const [unitToast, setUnitToast] = useState(null);
  const [ipadTableMode, setIpadTableMode] = useState(false);

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
  const NUMERIC_FIELDS = [
    'mw',
    'purity',
    'actualMass',
    'theoMass',
    'actualVolume',
    'density',
    'concentration',
    'concentrationPercent',
    'molarRatio',
    'eq'
  ];

  // Atomic multi-field row update (prevents stale closure overwrites)
  const handleRowPatch = (id, patch) => {
    const updated = reagents.map((r) => {
      if (r.id !== id) return r;
      const nextRow = { ...r };
      Object.entries(patch).forEach(([field, rawValue]) => {
        nextRow[field] =
          NUMERIC_FIELDS.includes(field) && typeof rawValue === 'string'
            ? rawValue.replace(/[^0-9.,-]/g, '')
            : rawValue;
      });
      return nextRow;
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

  const handleCellChange = (id, field, rawValue) => {
    const cleaned =
      NUMERIC_FIELDS.includes(field) && typeof rawValue === 'string'
        ? rawValue.replace(/[^0-9.,-]/g, '')
        : rawValue;

    const updated = reagents.map((r) => {
      if (r.id !== id) return r;
      const updatedRow = { ...r, [field]: cleaned };

      // Clear manual ratio override when user edits mass or volume directly
      if (field === 'actualMass' || field === 'actualVolume') {
        delete updatedRow.molarRatioInput;
      }

      // Auto-compute mass whenever user inputs volume (or density when volume > 0) for active reactants
      if (r.type !== 'base_acid' && r.type !== 'solvent') {
        if (field === 'actualVolume' || field === 'density') {
          const v = parseDecimal(field === 'actualVolume' ? cleaned : r.actualVolume);
          const d = parseDecimal(field === 'density' ? cleaned : r.density);
          if (v > 0 && d > 0) {
            const calcMass = massUnit === 'mg' ? v * d * 1000 : v * d;
            updatedRow.actualMass = String(parseFloat(calcMass.toFixed(massUnit === 'mg' ? 2 : 4)));
          }
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

  // Direct Molar Ratio input -> Back-calculate required mass (and volume if liquid)
  const handleMolarRatioChange = (id, rawRatio) => {
    const cleaned = typeof rawRatio === 'string' ? rawRatio.replace(/[^0-9.,]/g, '') : String(rawRatio);
    const ratioNum = parseDecimal(cleaned);

    const updated = reagents.map((r) => {
      if (r.id !== id || r.isLimiting) return r;
      const nextRow = {
        ...r,
        molarRatioInput: cleaned,
        molarRatio: ratioNum,
        eq: ratioNum
      };

      if (ratioNum > 0 && limitingMoles > 0) {
        const mw = parseDecimal(r.mw);
        const purity = r.purity !== undefined && r.purity !== '' ? parseDecimal(r.purity) : 100;
        const purityFactor = purity > 0 ? purity / 100 : 1;
        const reqMoles = ratioNum * limitingMoles;

        if (mw > 0 && purityFactor > 0) {
          let reqMass = (reqMoles * mw) / purityFactor;
          // If massUnit and moleUnit are matched (g/mol or mg/mmol), reqMass is already in massUnit
          const decimals = massUnit === 'mg' ? 2 : 4;
          const formattedMass = String(parseFloat(reqMass.toFixed(decimals)));
          nextRow.actualMass = formattedMass;
          nextRow.theoMass = formattedMass;
          nextRow.moles = parseFloat(reqMoles.toFixed(5));

          // Also update volume if density > 0 and row already uses volume
          const d = parseDecimal(r.density);
          if (d > 0 && parseDecimal(r.actualVolume) > 0) {
            const volMl = massUnit === 'mg' ? reqMass / (d * 1000) : reqMass / d;
            nextRow.actualVolume = String(parseFloat(volMl.toFixed(3)));
          }
        }
      }
      return nextRow;
    });

    onChange(updated);
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

  // Add new reactant / substance / medium / solvent
  const addReagent = (type = 'reagent', customName = '', customNotes = '', extra = {}) => {
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
    const defaultConc = extra.c !== undefined ? extra.c : type === 'base_acid' ? '10' : type === 'solvent' ? '99.5' : '';
    const defaultConcUnit = extra.concUnit || 'C%';

    const newRow = {
      id: `reagent-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type,
      name: defaultName,
      formula: extra.formula || '',
      mw: extra.mw || (type === 'base_acid' || type === 'solvent' ? '0' : '100.0'),
      purity: extra.purity || (type === 'base_acid' ? defaultConc : '99.0'),
      concentration: defaultConc,
      concentrationPercent: defaultConc,
      concUnit: defaultConcUnit,
      density: extra.density || '1.0',
      isLimiting: isFirstActive,
      theoMass: '1.0',
      actualMass: extra.actualMass || '0',
      actualVolume: extra.v || '0',
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

  // Auto-calculate actual & theoretical mass from molar ratio (tỉ lệ mol)
  const autoScaleTheoreticalMass = () => {
    if (!limitingReagent || limitingMoles <= 0) {
      setUnitToast('Vui lòng nhập khối lượng (m) và phân tử lượng (M) cho chất giới hạn trước!');
      setTimeout(() => setUnitToast(null), 3500);
      return;
    }

    const decimals = massUnit === 'mg' ? 2 : 4;
    const updated = reagents.map((r) => {
      if (r.type === 'base_acid' || r.type === 'solvent' || r.isLimiting) return r;
      const mw = parseDecimal(r.mw);
      const purity = parseDecimal(r.purity) > 0 ? parseDecimal(r.purity) / 100 : 1;
      const targetRatio = parseDecimal(r.molarRatioInput ?? r.molarRatio ?? r.eq) || 1.0;

      if (mw > 0 && purity > 0) {
        const requiredMoles = targetRatio * limitingMoles;
        const requiredMass = (requiredMoles * mw) / purity;
        const formattedMass = String(parseFloat(requiredMass.toFixed(decimals)));
        return {
          ...r,
          theoMass: formattedMass,
          actualMass: formattedMass,
          moles: parseFloat(requiredMoles.toFixed(5))
        };
      }
      return r;
    });

    onChange(updated);
    setUnitToast(`Đã tự động tính khối lượng (m) các chất theo tỉ lệ mol của ${limitingReagent.name}!`);
    setTimeout(() => setUnitToast(null), 3500);
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

  // Common Pharmaceutical Chemistry Reagents Quick-Insert Library
  const COMMON_CHEMICALS = [
    { name: 'Acid Salicylic', formula: 'C7H6O3', mw: '138.12', purity: '99', density: '1.44', type: 'starting_material', notes: 'Nguyên liệu tổng hợp Aspirin' },
    { name: 'p-Aminophenol', formula: 'C6H7NO', mw: '109.13', purity: '99', density: '1.29', type: 'starting_material', notes: 'Nguyên liệu tổng hợp Paracetamol' },
    { name: '4-Hydroxycoumarin', formula: 'C9H6O3', mw: '162.14', purity: '99', density: '1.30', type: 'starting_material', notes: 'Khung Coumarin' },
    { name: 'Anhydrid axetic (Ac2O)', formula: 'C4H6O3', mw: '102.09', purity: '99', density: '1.08', type: 'reagent', notes: 'Tác nhân acetyl hóa (lỏng)' },
    { name: 'Benzaldehyde', formula: 'C7H6O', mw: '106.12', purity: '99', density: '1.04', type: 'reagent', notes: 'Aldehyde thơm (lỏng)' },
    { name: 'Thionyl clorid (SOCl2)', formula: 'SOCl2', mw: '118.97', purity: '99', density: '1.64', type: 'reagent', notes: 'Tạo clorid acid (nhỏ giọt lạnh)' },
    { name: 'Natri borohydrid (NaBH4)', formula: 'NaBH4', mw: '37.83', purity: '98', density: '1.07', type: 'reagent', notes: 'Tác nhân khử chọn lọc' },
    { name: 'Kali carbonat (K2CO3)', formula: 'K2CO3', mw: '138.21', purity: '99', density: '2.43', type: 'reagent', notes: 'Base vô cơ khan' },
    { name: 'DMAP', formula: 'C7H10N2', mw: '122.17', purity: '99', density: '1.00', type: 'catalyst', notes: 'Xúc tác ái nhân' },
    { name: 'H2SO4 đặc (Xúc tác)', formula: 'H2SO4', mw: '98.08', purity: '98', density: '1.84', type: 'catalyst', notes: 'Xúc tác axit (vài giọt)' }
  ];

  // Quick preset shortcuts for medium & solvent (supports C%, CM, N)
  const MEDIUM_PRESETS = [
    { name: 'Dung dịch HCl', c: '10', concUnit: 'C%', v: '5.0', notes: 'Nhỏ giọt từ từ ở 0-5°C' },
    { name: 'Dung dịch HCl', c: '1.0', concUnit: 'CM', v: '5.0', notes: 'Axit hóa môi trường (1M)' },
    { name: 'Dung dịch HCl đặc', c: '37', concUnit: 'C%', v: '2.0', notes: 'Thao tác trong tủ hút' },
    { name: 'Dung dịch NaOH', c: '10', concUnit: 'C%', v: '5.0', notes: 'Làm lạnh trước khi nhỏ giọt' },
    { name: 'Dung dịch NaOH', c: '2.0', concUnit: 'CM', v: '5.0', notes: 'Duy trì môi trường kiềm (2M)' },
    { name: 'Dung dịch H2SO4', c: '20', concUnit: 'C%', v: '5.0', notes: 'Thêm cẩn thận trên bể đá' },
    { name: 'Dung dịch NaHCO3 bão hoà', c: '8', concUnit: 'C%', v: '10.0', notes: 'Trung hoà axit về pH ~ 7-8' },
    { name: 'Axit Axetic băng (AcOH)', c: '99.5', concUnit: 'C%', v: '5.0', notes: 'Môi trường axit hữu cơ' },
    { name: 'Triethylamine (TEA)', c: '99', concUnit: 'C%', v: '2.0', notes: 'Môi trường base hữu cơ' }
  ];

  const SOLVENT_PRESETS = [
    { name: 'Ethanol (EtOH)', c: '96', concUnit: 'C%', v: '20.0', notes: 'Dung môi hoàn lưu (Ts: 78°C)' },
    { name: 'Ethanol tuyệt đối', c: '99.8', concUnit: 'C%', v: '20.0', notes: 'Dung môi khan (Ts: 78°C)' },
    { name: 'Methanol (MeOH)', c: '99.5', concUnit: 'C%', v: '20.0', notes: 'Dung môi phản ứng (Ts: 65°C)' },
    { name: 'Dichloromethane (DCM)', c: '99.5', concUnit: 'C%', v: '20.0', notes: 'Dung môi khan (Ts: 40°C)' },
    { name: 'Tetrahydrofuran (THF)', c: '99.5', concUnit: 'C%', v: '20.0', notes: 'Dung môi khan (Ts: 66°C)' },
    { name: 'Ethyl Acetate (EtOAc)', c: '99.5', concUnit: 'C%', v: '20.0', notes: 'Dung môi phản ứng (Ts: 77°C)' },
    { name: 'N,N-Dimethylformamide (DMF)', c: '99.8', concUnit: 'C%', v: '10.0', notes: 'Dung môi phân cực phi proton (Ts: 153°C)' },
    { name: 'Nước cất (H2O)', c: '100', concUnit: 'C%', v: '20.0', notes: 'Pha nước (Ts: 100°C)' }
  ];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden card-print space-y-0">
      {/* Module Header */}
      <div className="bg-slate-900 border-b border-slate-800 text-white p-3.5 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="p-2 sm:p-2.5 bg-teal-600 rounded-2xl shadow-md text-white flex-shrink-0 mt-0.5 sm:mt-0">
            <Scale className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="text-sm sm:text-lg font-bold text-white leading-snug">
                1. Cân đong & Nạp liệu
              </h2>
              <span className="text-[11px] sm:text-xs bg-teal-500/20 text-teal-300 border border-teal-400/40 px-2 py-0.5 rounded-full font-mono tabular-nums font-semibold whitespace-nowrap flex-shrink-0">
                {activeReagents.length} chất tham gia
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 line-clamp-1 sm:line-clamp-none">
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
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-600"></span>
            A. Chất tham gia, Thuốc thử & Xúc tác
          </h3>
          <div className="flex items-center gap-2">
            {isIPad && (
              <div className="inline-flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[11px] font-semibold">
                <button
                  type="button"
                  onClick={() => setIpadTableMode(false)}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                    !ipadTableMode ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Thẻ 2 cột (iPad)
                </button>
                <button
                  type="button"
                  onClick={() => setIpadTableMode(true)}
                  className={`px-2.5 py-1 rounded-md cursor-pointer transition-colors ${
                    ipadTableMode ? 'bg-white text-teal-700 shadow-xs' : 'text-slate-600'
                  }`}
                >
                  Dạng bảng
                </button>
              </div>
            )}
            <span className="text-[11px] text-slate-500 font-mono">
              {activeReagents.length} chất
            </span>
          </div>
        </div>

        {/* Quick-Insert Common Pharmaceutical Chemicals Bar */}
        <div className="no-print bg-teal-50/50 border border-teal-100 rounded-2xl p-2.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-teal-900">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-600 flex-shrink-0" />
              <span>Chèn nhanh hóa chất phổ biến (tự điền M, d, độ sạch):</span>
            </span>
            <span className="text-[10px] font-normal text-teal-700 sm:hidden">Vuốt ngang &rarr;</span>
          </div>
          <div className="flex overflow-x-auto sm:flex-wrap gap-1.5 pb-0.5 sm:pb-0 no-scrollbar">
            {COMMON_CHEMICALS.map((chem) => (
              <button
                key={chem.name}
                type="button"
                onClick={() =>
                  addReagent(chem.type, chem.name, chem.notes, {
                    formula: chem.formula,
                    mw: chem.mw,
                    purity: chem.purity,
                    density: chem.density
                  })
                }
                className="text-[11px] bg-white hover:bg-teal-100/70 text-slate-800 border border-teal-200/80 px-2.5 py-1 rounded-xl transition-colors cursor-pointer whitespace-nowrap flex-shrink-0 flex items-center gap-1"
                title={`${chem.name} (${chem.formula}) - M=${chem.mw} g/mol, d=${chem.density} g/mL`}
              >
                <Plus className="w-3 h-3 text-teal-600" />
                <span className="font-semibold">{chem.name}</span>
                <span className="text-[10px] font-mono text-slate-500">({chem.mw})</span>
              </button>
            ))}
          </div>
        </div>

        {/* IPHONE (1-col) & IPAD (2-col) TOUCH CARD VIEW */}
        {(isIPhone || (isIPad && !ipadTableMode)) && (
          <div className={`grid gap-3.5 ${isIPad ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {activeReagents.map((row) => {
            const typeBadge = getTypeLabel(row.type);
            const isLim = row.isLimiting;
            const ratioVal = row.molarRatioInput !== undefined
              ? row.molarRatioInput
              : (row.molarRatio ?? row.eq ?? '');

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

                {/* Calculated: Số Mol & Editable Tỉ Lệ Mol */}
                <div className="flex items-center justify-between gap-2 bg-slate-100/70 p-2.5 rounded-xl border border-slate-200">
                  <div className="text-xs">
                    <span className="text-slate-500 block text-[11px]">Số mol (n):</span>
                    <span className="font-mono font-bold text-indigo-700 text-sm">
                      {row.moles > 0 ? `${row.moles < 0.001 ? row.moles.toExponential(3) : row.moles} ${moleUnit}` : '--'}
                    </span>
                  </div>

                  <div className="text-xs text-right">
                    <span className="text-slate-500 block text-[11px]">
                      {isLim ? 'Tỉ lệ mol (Mốc):' : 'Tỉ lệ mol (sửa để tính m):'}
                    </span>
                    {isLim ? (
                      <span className="font-mono font-extrabold text-sm px-2.5 py-1 rounded-lg bg-emerald-200 text-emerald-950 inline-block mt-0.5">
                        1.00 (mốc)
                      </span>
                    ) : (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={ratioVal}
                        onChange={(e) => handleMolarRatioChange(row.id, e.target.value)}
                        placeholder="1.0"
                        title="Nhập tỉ lệ mol mong muốn (VD: 1.2) để tự tính khối lượng m"
                        className="w-24 text-right font-mono font-bold text-sm px-2.5 py-1 rounded-lg bg-white text-emerald-900 border border-emerald-300 focus:border-emerald-600 focus:outline-none mt-0.5 min-h-[36px]"
                      />
                    )}
                  </div>
                </div>

                {/* Notes on mobile/iPad card */}
                <div>
                  <input
                    type="text"
                    value={row.notes || ''}
                    onChange={(e) => handleCellChange(row.id, 'notes', e.target.value)}
                    placeholder="Ghi chú (VD: Chất giới hạn, cho từ từ...)"
                    className="w-full bg-slate-50 focus:bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-600 focus:outline-none min-h-[38px]"
                  />
                </div>
              </div>
            );
          })}
          </div>
        )}

        {/* MAC / LAPTOP (AND OPTIONAL IPAD) SPREADSHEET TABLE */}
        {(isMac || (isIPad && ipadTableMode)) && (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[960px]">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 border-b border-slate-200 font-semibold uppercase text-[11px] tracking-wider">
                <th className="py-3 px-2 text-center w-14 whitespace-nowrap">Mốc</th>
                <th className="py-3 px-2.5 w-36 min-w-[135px]">Phân loại</th>
                <th className="py-3 px-3 min-w-[240px] w-[26%]">Tên hóa chất / Công thức</th>
                <th className="py-3 px-2 text-right w-22 min-w-[84px] whitespace-nowrap">M (g/mol)</th>
                <th className="py-3 px-2 text-right w-20 min-w-[76px] whitespace-nowrap">Độ sạch (%)</th>
                <th className="py-3 px-2 text-right w-24 min-w-[92px] whitespace-nowrap">m thực ({massUnit})</th>
                <th className="py-3 px-2 text-right w-20 min-w-[76px] whitespace-nowrap">V (mL)</th>
                <th className="py-3 px-2 text-right w-20 min-w-[76px] whitespace-nowrap">d (g/mL)</th>
                <th className="py-3 px-2 text-right w-24 min-w-[96px] bg-indigo-50/60 text-indigo-900 font-bold whitespace-nowrap">Số mol ({moleUnit})</th>
                <th className="py-3 px-2 text-right w-24 min-w-[92px] bg-emerald-50/60 text-emerald-900 font-bold whitespace-nowrap" title="Có thể nhập trực tiếp tỉ lệ mol để tự tính khối lượng m">
                  Tỉ lệ mol ✎
                </th>
                <th className="py-3 px-3 min-w-[150px] w-[15%]">Ghi chú</th>
                <th className="py-3 px-2 text-center w-10 no-print">Xóa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {activeReagents.map((row) => {
                const typeBadge = getTypeLabel(row.type);
                const isLim = row.isLimiting;
                const ratioVal = row.molarRatioInput !== undefined
                  ? row.molarRatioInput
                  : (row.molarRatio ?? row.eq ?? '');

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
                      {isLim ? (
                        <span className="text-emerald-800 bg-emerald-100 font-bold px-2 py-1 rounded-lg inline-block">
                          1.00
                        </span>
                      ) : (
                        <input
                          type="text"
                          inputMode="decimal"
                          value={ratioVal}
                          onChange={(e) => handleMolarRatioChange(row.id, e.target.value)}
                          placeholder="1.0"
                          title="Nhập tỉ lệ mol để tự động tính khối lượng m cần cân"
                          className="w-full text-right font-mono font-bold text-emerald-900 bg-white border border-emerald-300 focus:border-emerald-600 rounded-lg px-2 py-1.5 text-xs sm:text-sm focus:outline-none min-h-[38px]"
                        />
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
        )}

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
      {/* (CHO PHÉP CHỌN ĐƠN VỊ CM / C% / N & SỬA NỒNG ĐỘ TỰ DO)   */}
      {/* ========================================================= */}
      <div className="border-t border-slate-200 bg-slate-50/60 p-3 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-600"></span>
            B. Môi trường & Dung môi phản ứng
          </h3>
          <span className="text-[11px] text-slate-500">
            Hỗ trợ tuỳ chỉnh đơn vị nồng độ <strong>C%</strong>, <strong>CM (mol/L)</strong>, <strong>N</strong> và thể tích (mL)
          </span>
        </div>

        <div className="space-y-4">
          {/* 1. DUNG DỊCH MÔI TRƯỜNG (BASE / ACID / BUFFER) */}
          <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-purple-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-purple-100 text-purple-700 rounded-lg">
                  <TestTube2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-purple-950">
                    1. Dung dịch Môi trường (Acid / Base / Đệm)
                  </h4>
                  <span className="text-[11px] text-purple-600 font-medium">
                    {mediumReagents.length} dung dịch • Chọn C%, CM hoặc N và nhập nồng độ, thể tích
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => addReagent('base_acid')}
                className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 min-h-[38px] cursor-pointer no-print flex-shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Thêm môi trường</span>
              </button>
            </div>

            {/* Quick presets for Medium */}
            <div className="no-print flex flex-wrap items-center gap-1.5 bg-purple-50/60 p-2 rounded-xl border border-purple-100">
              <span className="text-[11px] font-semibold text-purple-800 mr-1">Gợi ý nhanh:</span>
              {MEDIUM_PRESETS.map((preset, idx) => (
                <button
                  key={`${preset.name}-${preset.concUnit}-${idx}`}
                  type="button"
                  onClick={() =>
                    addReagent('base_acid', preset.name, preset.notes, {
                      c: preset.c,
                      concUnit: preset.concUnit,
                      v: preset.v
                    })
                  }
                  className="text-[11px] bg-white hover:bg-purple-100 text-purple-900 border border-purple-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  {preset.name} ({preset.c}{preset.concUnit === 'CM' ? 'M' : '%'})
                </button>
              ))}
            </div>

            {/* List of Medium items */}
            {mediumReagents.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                Chưa có dung dịch môi trường. Bấm gợi ý nhanh hoặc "+ Thêm môi trường" ở trên.
              </p>
            ) : (
              <div className="space-y-2.5">
                {mediumReagents.map((mRow) => {
                  const concVal =
                    mRow.concentration !== undefined
                      ? mRow.concentration
                      : mRow.concentrationPercent !== undefined
                      ? mRow.concentrationPercent
                      : mRow.purity || '';
                  const concUnit = mRow.concUnit || 'C%'; // 'C%' | 'CM' | 'N'
                  const unitSuffix = concUnit === 'CM' ? 'M' : concUnit === 'N' ? 'N' : '%';

                  return (
                    <div
                      key={mRow.id}
                      className="bg-purple-50/30 border border-purple-100 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end"
                    >
                      {/* Tên môi trường */}
                      <div className="sm:col-span-2 lg:col-span-4">
                        <span className="text-[11px] text-purple-900 font-semibold block mb-1">
                          Tên dung dịch môi trường:
                        </span>
                        <input
                          type="text"
                          value={mRow.name || ''}
                          onChange={(e) => handleCellChange(mRow.id, 'name', e.target.value)}
                          placeholder="VD: Dung dịch HCl, NaOH..."
                          className="w-full bg-white border border-purple-200 focus:border-purple-500 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-purple-950 focus:outline-none min-h-[40px]"
                        />
                      </div>

                      {/* Nồng độ + Chọn đơn vị C% / CM / N */}
                      <div className="sm:col-span-1 lg:col-span-3">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[11px] text-slate-700 font-semibold">
                            Nồng độ ({concUnit}):
                          </span>
                          <div className="inline-flex bg-purple-100/80 p-0.5 rounded-md border border-purple-200 text-[10px] font-bold">
                            {['C%', 'CM', 'N'].map((u) => (
                              <button
                                key={u}
                                type="button"
                                onClick={() => handleRowPatch(mRow.id, { concUnit: u })}
                                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                                  concUnit === u
                                    ? 'bg-purple-700 text-white shadow-2xs'
                                    : 'text-purple-800 hover:bg-purple-200/60'
                                }`}
                                title={
                                  u === 'C%'
                                    ? 'Nồng độ phần trăm (C%)'
                                    : u === 'CM'
                                    ? 'Nồng độ mol (CM - mol/L)'
                                    : 'Nồng độ đương lượng (N)'
                                }
                              >
                                {u}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={concVal}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.,-]/g, '');
                              handleRowPatch(mRow.id, {
                                concentration: val,
                                concentrationPercent: val,
                                purity: val
                              });
                            }}
                            placeholder={concUnit === 'CM' ? 'VD: 1.0' : 'VD: 10'}
                            className="w-full bg-white border border-purple-200 focus:border-purple-500 rounded-lg pl-2.5 pr-8 py-1.5 text-xs sm:text-sm font-mono font-bold text-purple-900 focus:outline-none min-h-[40px]"
                          />
                          <span className="absolute right-2.5 text-xs font-mono font-bold text-purple-600 pointer-events-none">
                            {unitSuffix}
                          </span>
                        </div>
                      </div>

                      {/* Thể tích V (mL) */}
                      <div className="sm:col-span-1 lg:col-span-2">
                        <span className="text-[11px] text-slate-700 font-semibold block mb-1">
                          Thể tích (mL):
                        </span>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={mRow.actualVolume ?? ''}
                            onChange={(e) => handleCellChange(mRow.id, 'actualVolume', e.target.value)}
                            placeholder="5.0"
                            className="w-full bg-white border border-purple-200 focus:border-purple-500 rounded-lg pl-2.5 pr-8 py-1.5 text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none min-h-[40px]"
                          />
                          <span className="absolute right-2.5 text-[11px] font-mono text-slate-400 pointer-events-none">
                            mL
                          </span>
                        </div>
                      </div>

                      {/* Ghi chú & Nút Xoá */}
                      <div className="sm:col-span-2 lg:col-span-3 flex items-end gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] text-slate-600 font-semibold block mb-1">
                            Ghi chú thao tác:
                          </span>
                          <input
                            type="text"
                            value={mRow.notes || ''}
                            onChange={(e) => handleCellChange(mRow.id, 'notes', e.target.value)}
                            placeholder="Nhỏ giọt lạnh, chỉnh pH..."
                            className="w-full bg-white border border-purple-200 focus:border-purple-500 rounded-lg px-2.5 py-1.5 text-xs text-purple-950 focus:outline-none min-h-[40px]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeReagent(mRow.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer no-print flex-shrink-0"
                          title="Xóa môi trường này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. DUNG MÔI PHẢN ỨNG */}
          <div className="bg-white rounded-2xl p-3.5 sm:p-4 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-100 text-slate-700 rounded-lg">
                  <Droplet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                    2. Dung môi phản ứng
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {solventReagents.length} dung môi • Tuỳ chỉnh nồng độ/độ tinh khiết (C% hoặc CM) & thể tích (mL)
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => addReagent('solvent')}
                className="bg-slate-700 hover:bg-slate-800 text-white text-xs px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 min-h-[38px] cursor-pointer no-print flex-shrink-0"
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
                  onClick={() =>
                    addReagent('solvent', preset.name, preset.notes, {
                      c: preset.c,
                      concUnit: preset.concUnit,
                      v: preset.v
                    })
                  }
                  className="text-[11px] bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                >
                  {preset.name} ({preset.c}%)
                </button>
              ))}
            </div>

            {/* List of Solvent items */}
            {solventReagents.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-2">
                Chưa có dung môi phản ứng. Bấm gợi ý nhanh hoặc "+ Thêm dung môi" ở trên.
              </p>
            ) : (
              <div className="space-y-2.5">
                {solventReagents.map((sRow) => {
                  const sConcVal =
                    sRow.concentration !== undefined
                      ? sRow.concentration
                      : sRow.concentrationPercent !== undefined
                      ? sRow.concentrationPercent
                      : sRow.purity || '';
                  const sConcUnit = sRow.concUnit || 'C%'; // 'C%' | 'CM' | 'N'
                  const sUnitSuffix = sConcUnit === 'CM' ? 'M' : sConcUnit === 'N' ? 'N' : '%';

                  return (
                    <div
                      key={sRow.id}
                      className="bg-slate-50/70 border border-slate-200 rounded-xl p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end"
                    >
                      {/* Tên dung môi */}
                      <div className="sm:col-span-2 lg:col-span-4">
                        <span className="text-[11px] text-slate-700 font-semibold block mb-1">
                          Tên dung môi phản ứng:
                        </span>
                        <input
                          type="text"
                          value={sRow.name || ''}
                          onChange={(e) => handleCellChange(sRow.id, 'name', e.target.value)}
                          placeholder="VD: Ethanol 96%, DCM khan..."
                          className="w-full bg-white border border-slate-300 focus:border-teal-600 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-slate-900 focus:outline-none min-h-[40px]"
                        />
                      </div>

                      {/* Nồng độ / Độ tinh khiết (C% / CM / N) */}
                      <div className="sm:col-span-1 lg:col-span-3">
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span className="text-[11px] text-slate-700 font-semibold">
                            Nồng độ ({sConcUnit}):
                          </span>
                          <div className="inline-flex bg-slate-200/80 p-0.5 rounded-md border border-slate-300 text-[10px] font-bold">
                            {['C%', 'CM', 'N'].map((u) => (
                              <button
                                key={u}
                                type="button"
                                onClick={() => handleRowPatch(sRow.id, { concUnit: u })}
                                className={`px-1.5 py-0.5 rounded transition-colors cursor-pointer ${
                                  sConcUnit === u
                                    ? 'bg-slate-800 text-white shadow-2xs'
                                    : 'text-slate-700 hover:bg-slate-300/60'
                                }`}
                                title={
                                  u === 'C%'
                                    ? 'Nồng độ phần trăm / Độ tinh khiết (C%)'
                                    : u === 'CM'
                                    ? 'Nồng độ mol (CM - mol/L)'
                                    : 'Nồng độ đương lượng (N)'
                                }
                              >
                                {u}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={sConcVal}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.,-]/g, '');
                              handleRowPatch(sRow.id, {
                                concentration: val,
                                concentrationPercent: val,
                                purity: val
                              });
                            }}
                            placeholder={sConcUnit === 'CM' ? 'VD: 4.0' : 'VD: 96'}
                            className="w-full bg-white border border-slate-300 focus:border-teal-600 rounded-lg pl-2.5 pr-8 py-1.5 text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none min-h-[40px]"
                          />
                          <span className="absolute right-2.5 text-xs font-mono font-bold text-slate-500 pointer-events-none">
                            {sUnitSuffix}
                          </span>
                        </div>
                      </div>

                      {/* Thể tích V (mL) */}
                      <div className="sm:col-span-1 lg:col-span-2">
                        <span className="text-[11px] text-slate-700 font-semibold block mb-1">
                          Thể tích (mL):
                        </span>
                        <div className="relative flex items-center">
                          <input
                            type="text"
                            inputMode="decimal"
                            value={sRow.actualVolume ?? ''}
                            onChange={(e) => handleCellChange(sRow.id, 'actualVolume', e.target.value)}
                            placeholder="20.0"
                            className="w-full bg-white border border-slate-300 focus:border-teal-600 rounded-lg pl-2.5 pr-8 py-1.5 text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none min-h-[40px]"
                          />
                          <span className="absolute right-2.5 text-[11px] font-mono text-slate-400 pointer-events-none">
                            mL
                          </span>
                        </div>
                      </div>

                      {/* Ghi chú & Nút Xoá */}
                      <div className="sm:col-span-2 lg:col-span-3 flex items-end gap-2">
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] text-slate-600 font-semibold block mb-1">
                            Ghi chú:
                          </span>
                          <input
                            type="text"
                            value={sRow.notes || ''}
                            onChange={(e) => handleCellChange(sRow.id, 'notes', e.target.value)}
                            placeholder="Dung môi khan, hoàn lưu..."
                            className="w-full bg-white border border-slate-300 focus:border-teal-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 focus:outline-none min-h-[40px]"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeReagent(sRow.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 rounded-lg min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer no-print flex-shrink-0"
                          title="Xóa dung môi này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Batch Scale, Total Mass, Total Liquid Volume & Flask Size Recommendation */}
        {(() => {
          const totalSolidMass = activeReagents.reduce((sum, r) => sum + parseDecimal(r.actualMass), 0);
          const totalLiquidVol = reagents.reduce((sum, r) => sum + parseDecimal(r.actualVolume), 0);
          let recommendedFlask = 'Bình cầu 50 mL';
          if (totalLiquidVol > 120) recommendedFlask = 'Bình cầu 500 mL';
          else if (totalLiquidVol > 55) recommendedFlask = 'Bình cầu 250 mL';
          else if (totalLiquidVol > 25) recommendedFlask = 'Bình cầu 100 mL';
          else if (totalLiquidVol > 10) recommendedFlask = 'Bình cầu 50 mL';
          else if (totalLiquidVol > 0) recommendedFlask = 'Bình cầu 25 mL - 50 mL';

          return (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono text-slate-600 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Quy mô nạp liệu:</span>
                <strong className="text-indigo-900 font-bold text-sm">
                  {limitingMoles > 0 ? `${limitingMoles} ${moleUnit}` : `0 ${moleUnit}`}
                </strong>{' '}
                <span className="text-[11px] text-slate-500">({limitingReagent?.name || 'Chưa chọn'})</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Tổng khối lượng chất tham gia:</span>
                <strong className="text-slate-900 font-bold text-sm">
                  {totalSolidMass.toFixed(massUnit === 'mg' ? 1 : 3)} {massUnit}
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-sans font-bold">Tổng thể tích dịch & Gợi ý bình cầu:</span>
                <strong className="text-teal-800 font-bold text-sm">
                  {totalLiquidVol.toFixed(1)} mL
                </strong>{' '}
                {totalLiquidVol > 0 && (
                  <span className="text-[11px] bg-teal-50 text-teal-800 border border-teal-200 px-1.5 py-0.5 rounded font-sans font-semibold">
                    ➔ Nên dùng {recommendedFlask}
                  </span>
                )}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
