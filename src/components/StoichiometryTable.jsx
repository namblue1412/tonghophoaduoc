import React, { useState } from 'react';
import {
  Scale,
  Plus,
  Trash2,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  Calculator,
  Beaker,
  Droplet,
  Layers,
  Sparkles,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';

export const StoichiometryTable = ({ reagents, onChange, targetMolecule, onTargetChange }) => {
  const [mobileView, setMobileView] = useState('auto'); // 'auto' | 'card' | 'table'

  // Identify limiting reagent
  const limitingReagent = reagents.find((r) => r.isLimiting) || reagents[0];
  const limitingMoles = limitingReagent ? parseFloat(limitingReagent.moles) || 0 : 0;

  // Re-calculate row moles and equivalents
  const calculateRowValues = (row, isLimitingRow = false, currentLimitingMoles = limitingMoles) => {
    const mw = parseFloat(row.mw) || 0;
    const actualMass = parseFloat(row.actualMass) || 0;
    const actualVolume = parseFloat(row.actualVolume) || 0;
    const density = parseFloat(row.density) || 0;
    const purity = parseFloat(row.purity) || 100;
    const purityFactor = purity > 0 ? purity / 100 : 1;

    let effectiveMass = actualMass;
    if ((!actualMass || actualMass === 0) && actualVolume > 0 && density > 0) {
      effectiveMass = actualVolume * density;
    }

    let moles = 0;
    if (mw > 0 && effectiveMass > 0) {
      moles = (effectiveMass * purityFactor) / mw;
    }

    const baseLimiting = isLimitingRow ? moles : currentLimitingMoles;
    const eq = baseLimiting > 0 && moles > 0 ? (moles / baseLimiting) : 0;

    return {
      ...row,
      moles: parseFloat(moles.toFixed(5)),
      eq: parseFloat(eq.toFixed(3)),
    };
  };

  // Handle individual cell change
  const handleCellChange = (id, field, value) => {
    const updated = reagents.map((r) => {
      if (r.id !== id) return r;
      const updatedRow = { ...r, [field]: value };

      // If user inputs volume & density but no mass, auto-calc mass
      if (field === 'actualVolume' || field === 'density') {
        const v = field === 'actualVolume' ? parseFloat(value) || 0 : parseFloat(r.actualVolume) || 0;
        const d = field === 'density' ? parseFloat(value) || 0 : parseFloat(r.density) || 0;
        if (v > 0 && d > 0 && (!r.actualMass || r.actualMass === 0)) {
          updatedRow.actualMass = parseFloat((v * d).toFixed(4));
        }
      }

      return updatedRow;
    });

    // Re-evaluate moles for all rows
    const currentLim = updated.find((r) => r.isLimiting) || updated[0];
    const tempLimRow = calculateRowValues(currentLim, true);
    const newLimitingMoles = tempLimRow.moles;

    const finalReagents = updated.map((r) => {
      if (r.id === currentLim?.id) {
        return { ...tempLimRow, isLimiting: true };
      }
      return calculateRowValues(r, false, newLimitingMoles);
    });

    onChange(finalReagents);
  };

  // Set Limiting Reagent
  const setLimiting = (id) => {
    const updated = reagents.map((r) => ({
      ...r,
      isLimiting: r.id === id,
    }));

    const newLim = updated.find((r) => r.isLimiting);
    const calculatedLim = calculateRowValues(newLim, true);
    const limMoles = calculatedLim.moles;

    const finalReagents = updated.map((r) => {
      if (r.id === id) return calculatedLim;
      return calculateRowValues(r, false, limMoles);
    });

    onChange(finalReagents);
  };

  // Add new reagent row
  const addReagent = (type = 'reagent') => {
    const newRow = {
      id: `reagent-${Date.now()}`,
      type,
      name: type === 'solvent' ? 'Dung môi' : type === 'catalyst' ? 'Xúc tác' : 'Thuốc thử mới',
      formula: '',
      mw: 100,
      purity: 99.0,
      density: 1.0,
      isLimiting: reagents.length === 0,
      theoMass: 1.0,
      actualMass: 0,
      actualVolume: 0,
      moles: 0,
      eq: reagents.length === 0 ? 1.0 : 1.0,
      notes: ''
    };

    const calculated = calculateRowValues(newRow, newRow.isLimiting);
    onChange([...reagents, calculated]);
  };

  // Remove reagent row
  const removeReagent = (id) => {
    if (reagents.length <= 1) {
      alert('Phản ứng cần ít nhất một chất tham gia!');
      return;
    }
    const filtered = reagents.filter((r) => r.id !== id);
    if (!filtered.some((r) => r.isLimiting)) {
      filtered[0].isLimiting = true;
    }

    const currentLim = filtered.find((r) => r.isLimiting);
    const limRow = calculateRowValues(currentLim, true);
    const limMoles = limRow.moles;

    const finalReagents = filtered.map((r) => {
      if (r.id === currentLim.id) return limRow;
      return calculateRowValues(r, false, limMoles);
    });

    onChange(finalReagents);
  };

  // Auto-calculate theoretical mass from desired equivalents & limiting reagent
  const autoScaleTheoreticalMass = () => {
    if (!limitingReagent || limitingMoles <= 0) {
      alert('Vui lòng nhập khối lượng và phân tử lượng hợp lệ cho chất giới hạn trước!');
      return;
    }

    const updated = reagents.map((r) => {
      if (r.isLimiting) {
        return r;
      }
      const mw = parseFloat(r.mw) || 0;
      const purity = (parseFloat(r.purity) || 100) / 100;
      const targetEq = parseFloat(r.eq) || 1.0;

      if (mw > 0 && purity > 0) {
        const requiredMoles = targetEq * limitingMoles;
        const requiredTheoMass = (requiredMoles * mw) / purity;
        return {
          ...r,
          theoMass: parseFloat(requiredTheoMass.toFixed(4)),
        };
      }
      return r;
    });

    onChange(updated);
    alert('Đã tự động tính toán Khối lượng lý thuyết (Theo Mass) dựa theo tỉ lệ đương lượng (eq) của chất giới hạn!');
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'starting_material':
        return { label: 'Chất đầu', color: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'reagent':
        return { label: 'Thuốc thử', color: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'catalyst':
        return { label: 'Xúc tác', color: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'solvent':
        return { label: 'Dung môi', color: 'bg-slate-100 text-slate-800 border-slate-300' };
      default:
        return { label: 'Chất phản ứng', color: 'bg-slate-100 text-slate-800 border-slate-300' };
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden card-print">
      {/* Module Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl shadow-md text-white flex-shrink-0">
            <Scale className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              1. Cân đong & Nạp liệu (Stoichiometry)
              <span className="text-xs bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 px-2 py-0.5 rounded-full font-mono font-medium">
                {reagents.length} chất
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Tự động tính số mol (n = m/M) và tỉ lệ đương lượng (eq) theo chất giới hạn
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 no-print w-full sm:w-auto justify-between sm:justify-end">
          <button
            type="button"
            onClick={autoScaleTheoreticalMass}
            className="bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer font-semibold border border-indigo-400/30 min-h-[44px]"
            title="Tự động tính khối lượng lý thuyết cần cân từ đương lượng (eq)"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-200" />
            <span>Tính m lý thuyết (eq)</span>
          </button>
        </div>
      </div>

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
              className="bg-white border border-indigo-200 px-3 py-2 rounded-xl text-indigo-950 font-bold focus:ring-2 focus:ring-indigo-400 focus:outline-none min-h-[44px] flex-1 text-xs sm:text-sm"
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
              <span className="text-slate-600 font-medium">M:</span>
              <input
                type="number"
                step="0.01"
                inputMode="decimal"
                value={targetMolecule.molecularWeight || ''}
                onChange={(e) => onTargetChange?.('molecularWeight', parseFloat(e.target.value) || 0)}
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
            Chất giới hạn: <strong className="font-bold underline text-emerald-950">{limitingReagent?.name || 'Chưa chọn'}</strong>{' '}
            ({limitingReagent?.moles ? `${limitingReagent.moles} mol` : '0 mol'} = <strong>1.00 eq</strong>)
          </span>
        </div>
      </div>

      {/* MOBILE CARD VIEW (Optimized for Mobile Phone Screens) */}
      <div className="block md:hidden p-3 space-y-3 bg-slate-50/50">
        {reagents.map((row) => {
          const typeBadge = getTypeLabel(row.type);
          const isLim = row.isLimiting;

          return (
            <div
              key={row.id}
              className={`p-3.5 rounded-2xl border transition-all space-y-3 ${
                isLim
                  ? 'bg-emerald-50/40 border-emerald-300 shadow-sm'
                  : 'bg-white border-slate-200'
              }`}
            >
              {/* Card Header: Limiting radio + Type + Delete */}
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 cursor-pointer min-h-[40px]">
                  <input
                    type="radio"
                    name="limitingReagentGroupMobile"
                    checked={Boolean(isLim)}
                    onChange={() => setLimiting(row.id)}
                    className="w-5 h-5 text-emerald-600 focus:ring-emerald-500 accent-emerald-600"
                  />
                  <span className={`text-xs font-bold ${isLim ? 'text-emerald-900' : 'text-slate-600'}`}>
                    {isLim ? 'Chất giới hạn (1.00 eq)' : 'Chọn làm mốc (eq)'}
                  </span>
                </label>

                <div className="flex items-center gap-1.5">
                  <select
                    value={row.type}
                    onChange={(e) => handleCellChange(row.id, 'type', e.target.value)}
                    className={`text-xs font-semibold px-2 py-1.5 rounded-xl border focus:outline-none min-h-[40px] ${typeBadge.color}`}
                  >
                    <option value="starting_material">Chất đầu</option>
                    <option value="reagent">Thuốc thử</option>
                    <option value="catalyst">Xúc tác</option>
                    <option value="solvent">Dung môi</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => removeReagent(row.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 rounded-xl min-h-[40px] min-w-[40px] flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Chemical Name & Formula */}
              <div className="space-y-1">
                <input
                  type="text"
                  value={row.name || ''}
                  onChange={(e) => handleCellChange(row.id, 'name', e.target.value)}
                  placeholder="Tên hóa chất (VD: 4-Hydroxycoumarin)..."
                  className="w-full bg-slate-50 focus:bg-white border border-slate-300 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none min-h-[44px]"
                />
                <input
                  type="text"
                  value={row.formula || ''}
                  onChange={(e) => handleCellChange(row.id, 'formula', e.target.value)}
                  placeholder="Công thức (C6H6O2)..."
                  className="w-full bg-transparent border-0 border-b border-slate-200 text-xs font-mono text-slate-500 px-2 py-1 focus:outline-none"
                />
              </div>

              {/* Numeric Inputs Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500 block mb-0.5">M (g/mol):</span>
                  <input
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    value={row.mw ?? ''}
                    onChange={(e) => handleCellChange(row.id, 'mw', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 font-mono font-semibold focus:outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <span className="text-slate-500 block mb-0.5">Độ sạch (%):</span>
                  <input
                    type="number"
                    step="0.1"
                    inputMode="decimal"
                    value={row.purity ?? 99}
                    onChange={(e) => handleCellChange(row.id, 'purity', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-2 font-mono focus:outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <span className="text-amber-800 font-bold block mb-0.5">m thực tế (g):</span>
                  <input
                    type="number"
                    step="0.0001"
                    inputMode="decimal"
                    value={row.actualMass ?? ''}
                    onChange={(e) => handleCellChange(row.id, 'actualMass', e.target.value)}
                    placeholder="0.0000"
                    className="w-full bg-amber-50 border border-amber-300 rounded-xl px-2.5 py-2 font-mono font-bold text-amber-950 focus:outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <span className="text-slate-500 block mb-0.5">V (mL) / d (g/mL):</span>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={row.actualVolume ?? ''}
                      onChange={(e) => handleCellChange(row.id, 'actualVolume', e.target.value)}
                      placeholder="mL"
                      className="w-1/2 bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 font-mono focus:outline-none min-h-[44px]"
                    />
                    <input
                      type="number"
                      step="0.001"
                      inputMode="decimal"
                      value={row.density ?? ''}
                      onChange={(e) => handleCellChange(row.id, 'density', e.target.value)}
                      placeholder="d"
                      className="w-1/2 bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 font-mono focus:outline-none min-h-[44px]"
                    />
                  </div>
                </div>
              </div>

              {/* Calculated badges */}
              <div className="flex items-center justify-between bg-slate-100/70 p-2.5 rounded-xl border border-slate-200">
                <div className="text-xs">
                  <span className="text-slate-500 block text-[11px]">Số mol thực (n):</span>
                  <span className="font-mono font-bold text-indigo-700 text-sm">
                    {row.moles > 0 ? `${row.moles < 0.001 ? row.moles.toExponential(3) : row.moles.toFixed(4)} mol` : '--'}
                  </span>
                </div>

                <div className="text-xs text-right">
                  <span className="text-slate-500 block text-[11px]">Đương lượng (eq):</span>
                  <span className={`font-mono font-bold text-sm px-2 py-0.5 rounded-md ${
                    isLim ? 'bg-emerald-200 text-emerald-950' : 'bg-white text-emerald-800 border border-slate-200'
                  }`}>
                    {row.eq > 0 ? `${row.eq.toFixed(2)} eq` : '--'}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* DESKTOP / TABLET FULL SPREADSHEET TABLE */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left text-xs sm:text-sm border-collapse min-w-[920px]">
          <thead>
            <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-semibold uppercase text-[11px] tracking-wider">
              <th className="py-3 px-3 text-center w-16">Giới hạn</th>
              <th className="py-3 px-3 w-32">Phân loại</th>
              <th className="py-3 px-3">Tên hóa chất / Công thức</th>
              <th className="py-3 px-2 text-right w-24">M (g/mol)</th>
              <th className="py-3 px-2 text-right w-24">Độ sạch (%)</th>
              <th className="py-3 px-2 text-right w-28">m thực (g)</th>
              <th className="py-3 px-2 text-right w-24">V thực (mL)</th>
              <th className="py-3 px-2 text-right w-24">d (g/mL)</th>
              <th className="py-3 px-2 text-right w-28 bg-indigo-50/60 text-indigo-900 font-bold">Số mol (n)</th>
              <th className="py-3 px-2 text-right w-24 bg-emerald-50/60 text-emerald-900 font-bold">Đương lượng (eq)</th>
              <th className="py-3 px-3 w-40">Ghi chú</th>
              <th className="py-3 px-2 text-center w-12 no-print">Xóa</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {reagents.map((row) => {
              const typeBadge = getTypeLabel(row.type);
              const isLim = row.isLimiting;

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
                        name="limitingReagentGroup"
                        checked={Boolean(isLim)}
                        onChange={() => setLimiting(row.id)}
                        className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                        title="Đặt làm chất giới hạn (1.00 eq)"
                      />
                    </label>
                  </td>

                  <td className="py-2.5 px-2">
                    <select
                      value={row.type}
                      onChange={(e) => handleCellChange(row.id, 'type', e.target.value)}
                      className={`text-xs font-semibold px-2 py-1.5 rounded-lg border focus:outline-none w-full min-h-[38px] ${typeBadge.color}`}
                    >
                      <option value="starting_material">Chất đầu</option>
                      <option value="reagent">Thuốc thử</option>
                      <option value="catalyst">Xúc tác</option>
                      <option value="solvent">Dung môi</option>
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
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={row.mw ?? ''}
                      onChange={(e) => handleCellChange(row.id, 'mw', e.target.value)}
                      className="w-full text-right font-mono font-semibold bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs sm:text-sm focus:outline-none min-h-[38px]"
                    />
                  </td>

                  <td className="py-2.5 px-2 text-right">
                    <input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      value={row.purity ?? 99}
                      onChange={(e) => handleCellChange(row.id, 'purity', e.target.value)}
                      className="w-full text-right font-mono bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs sm:text-sm focus:outline-none min-h-[38px]"
                    />
                  </td>

                  <td className="py-2.5 px-2 text-right">
                    <input
                      type="number"
                      step="0.0001"
                      inputMode="decimal"
                      value={row.actualMass ?? ''}
                      onChange={(e) => handleCellChange(row.id, 'actualMass', e.target.value)}
                      placeholder="0.0000"
                      className="w-full text-right font-mono font-bold text-slate-900 bg-amber-50/50 focus:bg-white border border-amber-200 rounded-lg px-2 py-1.5 text-xs sm:text-sm focus:outline-none min-h-[38px]"
                    />
                  </td>

                  <td className="py-2.5 px-2 text-right">
                    <input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={row.actualVolume ?? ''}
                      onChange={(e) => handleCellChange(row.id, 'actualVolume', e.target.value)}
                      placeholder="mL"
                      className="w-full text-right font-mono bg-slate-50 focus:bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs sm:text-sm focus:outline-none min-h-[38px]"
                    />
                  </td>

                  <td className="py-2.5 px-2 text-right">
                    <input
                      type="number"
                      step="0.001"
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
                        {row.moles < 0.001 ? row.moles.toExponential(3) : row.moles.toFixed(4)}
                        <span className="text-[10px] text-indigo-500 font-normal ml-0.5">mol</span>
                      </span>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  <td className="py-2.5 px-2 text-right bg-emerald-50/40 font-mono font-bold text-emerald-950 text-xs sm:text-sm">
                    {row.eq > 0 ? (
                      <span className={isLim ? 'text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded' : 'text-slate-800'}>
                        {row.eq.toFixed(2)}
                        <span className="text-[10px] text-emerald-600 font-normal ml-0.5">eq</span>
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
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg min-h-[38px] min-w-[38px] flex items-center justify-center"
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

      {/* Footer Add Buttons & Stoichiometric Summary */}
      <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="grid grid-cols-3 gap-2 no-print">
          <button
            type="button"
            onClick={() => addReagent('reagent')}
            className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs px-3 py-2.5 rounded-2xl flex items-center justify-center gap-1 font-bold shadow-sm min-h-[46px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thuốc thử</span>
          </button>
          <button
            type="button"
            onClick={() => addReagent('catalyst')}
            className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs px-3 py-2.5 rounded-2xl flex items-center justify-center gap-1 font-bold shadow-sm min-h-[46px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Xúc tác</span>
          </button>
          <button
            type="button"
            onClick={() => addReagent('solvent')}
            className="bg-slate-700 hover:bg-slate-800 active:bg-slate-900 text-white text-xs px-3 py-2.5 rounded-2xl flex items-center justify-center gap-1 font-bold shadow-sm min-h-[46px]"
          >
            <Plus className="w-4 h-4" />
            <span>+ Dung môi</span>
          </button>
        </div>

        {/* Moles & Batch Size Summary */}
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs font-mono text-slate-600 bg-white px-3.5 py-2.5 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            Quy mô:{' '}
            <strong className="text-indigo-900 font-bold">
              {limitingMoles > 0 ? `${(limitingMoles * 1000).toFixed(1)} mmol` : '0 mmol'}
            </strong>
          </div>
          <div className="w-px h-4 bg-slate-200"></div>
          <div>
            Tổng m:{' '}
            <strong className="text-slate-900 font-bold">
              {reagents.reduce((sum, r) => sum + (parseFloat(r.actualMass) || 0), 0).toFixed(3)} g
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};
