import React, { useState, useRef } from 'react';
import {
  Grid,
  Filter,
  Layers,
  Camera,
  Upload,
  Plus,
  Trash2,
  Scale,
  Award,
  Sparkles,
  ChevronRight,
  CheckCircle,
  HelpCircle,
  Info,
  Maximize2,
  X
} from 'lucide-react';
import { useExperiment } from '../context/ExperimentContext';

export const ColumnFractionManager = ({
  columnData,
  onChange,
  limitingMoles = 0,
  targetMW = 0
}) => {
  const { uploadImage } = useExperiment();
  const fileInputRef = useRef(null);

  const {
    columnParams = {
      silicaMass: 30,
      columnSize: '2.0 cm x 30 cm',
      eluentGradient: 'Hexan : EtOAc (9:1) -> (4:1)'
    },
    totalFractions = 30,
    fractions = [],
    fractionGroups = [],
    eppendorfYield = {
      tubeTareMass: 0,
      tubeGrossMass: 0,
      productMass: 0,
      targetMW: 0,
      theoreticalYield: 0,
      yieldPercent: 0,
      purityHplc: 0,
      meltingPoint: '',
      productAppearance: '',
      fractionTlcImages: []
    }
  } = columnData || {};

  // Local state for grouping builder
  const [groupName, setGroupName] = useState('Nhóm sản phẩm chính (Pure Product)');
  const [fromFraction, setFromFraction] = useState(8);
  const [toFraction, setToFraction] = useState(15);
  const [groupColor, setGroupColor] = useState('#10b981');
  const [lightboxImage, setLightboxImage] = useState(null);

  // Resize fraction grid if user changes total count N
  const handleFractionCountChange = (newCount) => {
    const count = Math.max(1, Math.min(100, parseInt(newCount, 10) || 1));
    const currentFractions = [...(fractions || [])];
    let newFractionsList = [];

    for (let i = 1; i <= count; i++) {
      const existing = currentFractions.find((f) => f.number === i);
      if (existing) {
        newFractionsList.push(existing);
      } else {
        newFractionsList.push({
          number: i,
          tlcChecked: false,
          spotPattern: 'empty',
          group: null,
          note: ''
        });
      }
    }

    onChange({
      ...columnData,
      totalFractions: count,
      fractions: newFractionsList
    });
  };

  // Toggle fraction status when user clicks an individual tube
  const toggleFractionState = (fractionNumber) => {
    const patterns = ['empty', 'product', 'impurity', 'mixed'];
    const updated = fractions.map((f) => {
      if (f.number === fractionNumber) {
        const nextIndex = (patterns.indexOf(f.spotPattern || 'empty') + 1) % patterns.length;
        const nextPattern = patterns[nextIndex];
        return {
          ...f,
          spotPattern: nextPattern,
          tlcChecked: nextPattern !== 'empty',
        };
      }
      return f;
    });

    onChange({
      ...columnData,
      fractions: updated
    });
  };

  // Add pooled fraction group (e.g. F8 -> F15)
  const handleAddGroup = () => {
    const start = Math.min(fromFraction, toFraction);
    const end = Math.max(fromFraction, toFraction);
    const numbers = [];
    for (let i = start; i <= end; i++) numbers.push(i);

    const newGroupId = `group-${Date.now()}`;
    const newGroup = {
      id: newGroupId,
      name: groupName || `Phân đoạn F${start}-F${end}`,
      range: `F${start} - F${end}`,
      fractionNumbers: numbers,
      color: groupColor
    };

    // Mark fractions as product or belonging to group
    const updatedFractions = fractions.map((f) => {
      if (numbers.includes(f.number)) {
        return {
          ...f,
          group: newGroupId,
          spotPattern: groupColor === '#10b981' ? 'product' : 'impurity',
          tlcChecked: true
        };
      }
      return f;
    });

    onChange({
      ...columnData,
      fractions: updatedFractions,
      fractionGroups: [...fractionGroups, newGroup]
    });
  };

  // Remove a group
  const handleRemoveGroup = (groupId) => {
    const updatedGroups = fractionGroups.filter((g) => g.id !== groupId);
    const updatedFractions = fractions.map((f) => {
      if (f.group === groupId) {
        return { ...f, group: null };
      }
      return f;
    });

    onChange({
      ...columnData,
      fractionGroups: updatedGroups,
      fractions: updatedFractions
    });
  };

  // Calculate Eppendorf analytical balance yield
  const handleEppendorfChange = (field, val) => {
    const updatedYield = {
      ...eppendorfYield,
      [field]: val
    };

    const tare = field === 'tubeTareMass' ? parseFloat(val) || 0 : parseFloat(eppendorfYield.tubeTareMass) || 0;
    const gross = field === 'tubeGrossMass' ? parseFloat(val) || 0 : parseFloat(eppendorfYield.tubeGrossMass) || 0;
    const mw = targetMW > 0 ? targetMW : (field === 'targetMW' ? parseFloat(val) || 0 : parseFloat(eppendorfYield.targetMW) || 0);

    const productMass = Math.max(0, gross - tare);
    updatedYield.productMass = parseFloat(productMass.toFixed(4));

    // Theoretical yield: moles_limiting * targetMW
    let theoYield = 0;
    let yieldPct = 0;
    if (limitingMoles > 0 && mw > 0) {
      theoYield = limitingMoles * mw;
      updatedYield.theoreticalYield = parseFloat(theoYield.toFixed(4));
      if (theoYield > 0 && productMass > 0) {
        yieldPct = (productMass / theoYield) * 100;
        updatedYield.yieldPercent = parseFloat(yieldPct.toFixed(2));
      } else {
        updatedYield.yieldPercent = 0;
      }
    }

    onChange({
      ...columnData,
      eppendorfYield: updatedYield
    });
  };

  // Upload fraction TLC plate
  const handleUploadFractionTlc = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await uploadImage(file, 'fraction_tlc');
      const currentList = eppendorfYield.fractionTlcImages || [];
      handleEppendorfChange('fractionTlcImages', [...currentList, url]);
      e.target.value = null;
    }
  };

  const getTubeColorClass = (pattern) => {
    switch (pattern) {
      case 'product':
        return 'bg-emerald-500 text-white border-emerald-600 ring-2 ring-emerald-300 font-bold';
      case 'impurity':
        return 'bg-amber-400 text-slate-900 border-amber-500 font-bold';
      case 'mixed':
        return 'bg-purple-500 text-white border-purple-600 font-bold';
      default:
        return 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300';
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden card-print">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl shadow-md text-white">
            <Filter className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              5. Sắc Ký Cột & Cân Cắn Eppendorf (Column & Yield)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Quản lý phân đoạn ống nghiệm (F1 - FN), gộp phân đoạn và tính hiệu suất cân 4 số lẻ
            </p>
          </div>
        </div>

        {/* Total fractions input */}
        <div className="flex items-center gap-2 no-print bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700">
          <span className="text-xs text-slate-300 font-medium">Số phân đoạn (N):</span>
          <input
            type="number"
            min="5"
            max="100"
            value={totalFractions}
            onChange={(e) => handleFractionCountChange(e.target.value)}
            className="w-16 bg-slate-900 text-indigo-300 font-mono font-bold text-center border border-slate-600 rounded-lg py-1 px-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Column Setup Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="font-semibold text-slate-600 block mb-1">Khối lượng Silicagel (g):</span>
            <input
              type="number"
              value={columnParams.silicaMass || ''}
              onChange={(e) =>
                onChange({
                  ...columnData,
                  columnParams: { ...columnParams, silicaMass: parseFloat(e.target.value) || 0 }
                })
              }
              placeholder="VD: 30"
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none min-h-[38px]"
            />
          </div>
          <div>
            <span className="font-semibold text-slate-600 block mb-1">Kích thước cột (Đường kính x Cao):</span>
            <input
              type="text"
              value={columnParams.columnSize || ''}
              onChange={(e) =>
                onChange({
                  ...columnData,
                  columnParams: { ...columnParams, columnSize: e.target.value }
                })
              }
              placeholder="VD: 2.5 cm x 35 cm"
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none min-h-[38px]"
            />
          </div>
          <div>
            <span className="font-semibold text-slate-600 block mb-1">Hệ Gradient dung môi:</span>
            <input
              type="text"
              value={columnParams.eluentGradient || ''}
              onChange={(e) =>
                onChange({
                  ...columnData,
                  columnParams: { ...columnParams, eluentGradient: e.target.value }
                })
              }
              placeholder="Hexan -> EtOAc..."
              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none min-h-[38px]"
            />
          </div>
        </div>

        {/* Interactive Fraction Grid (F1 -> FN) */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-2">
              <Grid className="w-4 h-4 text-indigo-600" />
              Lưới phân đoạn ống nghiệm (Bấm vào ống để đổi trạng thái):
            </h3>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-white border border-slate-300"></span> Trống
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-emerald-500"></span> Sản phẩm chính
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-amber-400"></span> Tạp chất
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-3.5 rounded-full bg-purple-500"></span> Hỗn hợp / Đuôi
              </span>
            </div>
          </div>

          {/* Test Tube Grid */}
          <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2 p-3 bg-slate-50/80 rounded-2xl border border-slate-200">
            {fractions.map((f) => (
              <button
                key={f.number}
                type="button"
                onClick={() => toggleFractionState(f.number)}
                className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs transition-all transform active:scale-95 shadow-sm min-h-[50px] cursor-pointer ${getTubeColorClass(
                  f.spotPattern
                )}`}
                title={`Ống F${f.number}: ${f.spotPattern || 'Trống'} (Bấm để đổi)`}
              >
                <span className="font-mono text-xs">F{f.number}</span>
                <span className="text-[10px] opacity-80 uppercase leading-none mt-1">
                  {f.spotPattern === 'product'
                    ? 'Pure'
                    : f.spotPattern === 'impurity'
                    ? 'Imp'
                    : f.spotPattern === 'mixed'
                    ? 'Mix'
                    : '-'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Fraction Pooling / Grouping Tool */}
        <div className="bg-indigo-50/40 border border-indigo-100 p-4 rounded-2xl space-y-3 no-print">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              Gom Nhóm Phân Đoạn (Fraction Pooling):
            </h4>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="text-xs text-slate-600 block mb-1">Tên nhóm:</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="VD: Nhóm sản phẩm chính..."
                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none min-h-[40px]"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs text-slate-600 block mb-1">Từ ống:</label>
                <input
                  type="number"
                  min="1"
                  max={totalFractions}
                  value={fromFraction}
                  onChange={(e) => setFromFraction(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-center focus:outline-none min-h-[40px]"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-slate-600 block mb-1">Đến ống:</label>
                <input
                  type="number"
                  min="1"
                  max={totalFractions}
                  value={toFraction}
                  onChange={(e) => setToFraction(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-center focus:outline-none min-h-[40px]"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddGroup}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold text-xs py-2 px-3 rounded-lg shadow-sm flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Gộp nhóm (Pool)</span>
              </button>
            </div>
          </div>

          {/* List of active groups */}
          {fractionGroups && fractionGroups.length > 0 && (
            <div className="pt-2 flex flex-wrap gap-2">
              {fractionGroups.map((g) => (
                <div
                  key={g.id}
                  className="bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm flex items-center gap-2 text-xs"
                >
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="font-semibold text-slate-800">{g.name}</span>
                  <span className="font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                    {g.range}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveGroup(g.id)}
                    className="text-slate-400 hover:text-rose-600 p-0.5 ml-1"
                    title="Xóa nhóm này"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Eppendorf Analytical Balance Yield Calculator (4 Decimal Places) */}
        <div className="bg-gradient-to-br from-emerald-50/60 to-slate-50 border border-emerald-200/80 p-5 rounded-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
            <h3 className="text-sm sm:text-base font-bold text-emerald-950 flex items-center gap-2">
              <Scale className="w-5 h-5 text-emerald-600" />
              Cân Khối Lượng Cắn Eppendorf (Cân Phân Tích 4 Số Lẻ) & Tính Hiệu Suất
            </h3>
            <span className="text-xs bg-emerald-100 text-emerald-900 px-2.5 py-1 rounded-full font-mono font-semibold">
              Chuẩn Lab Dược
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* m vỏ */}
            <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm">
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                m(vỏ) Eppendorf (g):
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={eppendorfYield.tubeTareMass || ''}
                onChange={(e) => handleEppendorfChange('tubeTareMass', e.target.value)}
                placeholder="1.0520"
                className="w-full text-right font-mono font-bold text-base bg-slate-50 focus:bg-white border border-slate-300 focus:border-emerald-500 rounded-lg p-2 focus:outline-none min-h-[44px]"
              />
              <span className="text-[11px] text-slate-400 block mt-1">Khối lượng vỏ ống rỗng</span>
            </div>

            {/* m vỏ + cắn */}
            <div className="bg-white p-3.5 rounded-xl border border-emerald-100 shadow-sm">
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                m(vỏ + cắn) sau cô quay (g):
              </label>
              <input
                type="number"
                step="0.0001"
                min="0"
                value={eppendorfYield.tubeGrossMass || ''}
                onChange={(e) => handleEppendorfChange('tubeGrossMass', e.target.value)}
                placeholder="2.4962"
                className="w-full text-right font-mono font-bold text-base bg-slate-50 focus:bg-white border border-slate-300 focus:border-emerald-500 rounded-lg p-2 focus:outline-none min-h-[44px]"
              />
              <span className="text-[11px] text-slate-400 block mt-1">Vỏ kèm sản phẩm đã khô</span>
            </div>

            {/* m sản phẩm thực tế */}
            <div className="bg-emerald-100/70 p-3.5 rounded-xl border border-emerald-300 shadow-sm flex flex-col justify-between">
              <div className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                m(sản phẩm) thu được:
              </div>
              <div className="font-mono text-2xl font-extrabold text-emerald-900 text-right my-1">
                {eppendorfYield.productMass?.toFixed(4) || '0.0000'}{' '}
                <span className="text-sm font-normal text-emerald-700">g</span>
              </div>
              <div className="text-[11px] text-emerald-800 font-medium">
                = m(vỏ+cắn) - m(vỏ)
              </div>
            </div>

            {/* % Hiệu suất phản ứng */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-3.5 rounded-xl shadow-md flex flex-col justify-between">
              <div className="text-xs font-semibold text-indigo-200 flex items-center justify-between">
                <span>% Hiệu suất (Yield):</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div className="font-mono text-3xl font-extrabold text-amber-400 text-right my-1">
                {eppendorfYield.yieldPercent ? `${eppendorfYield.yieldPercent.toFixed(1)}%` : '0.0%'}
              </div>
              <div className="text-[11px] text-slate-300 font-mono">
                Lý thuyết: {eppendorfYield.theoreticalYield?.toFixed(4) || '0.0000'} g
              </div>
            </div>
          </div>

          {/* Product Appearance & Quality Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Điểm nóng chảy (Tnc °C):
              </label>
              <input
                type="text"
                value={eppendorfYield.meltingPoint || ''}
                onChange={(e) => handleEppendorfChange('meltingPoint', e.target.value)}
                placeholder="VD: 185 - 187°C"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-mono focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Độ tinh khiết HPLC / NMR (%):
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={eppendorfYield.purityHplc || ''}
                onChange={(e) => handleEppendorfChange('purityHplc', parseFloat(e.target.value) || 0)}
                placeholder="98.5%"
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-mono font-bold text-indigo-700 focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Cảm quan sản phẩm tinh khiết:
              </label>
              <input
                type="text"
                value={eppendorfYield.productAppearance || ''}
                onChange={(e) => handleEppendorfChange('productAppearance', e.target.value)}
                placeholder="VD: Tinh thể hình kim màu trắng ngà..."
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none min-h-[44px]"
              />
            </div>
          </div>

          {/* Upload Fraction TLC Plates */}
          <div className="pt-2 border-t border-emerald-200/60">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-indigo-600" />
                Ảnh bản mỏng TLC kiểm tra các phân đoạn cạnh nhau:
              </label>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm no-print min-h-[36px]"
              >
                <Upload className="w-3.5 h-3.5" /> Tải ảnh TLC phân đoạn
              </button>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleUploadFractionTlc}
                className="hidden"
              />
            </div>

            {/* Gallery of Fraction TLCs */}
            {eppendorfYield.fractionTlcImages && eppendorfYield.fractionTlcImages.length > 0 ? (
              <div className="flex flex-wrap gap-3">
                {eppendorfYield.fractionTlcImages.map((img, idx) => (
                  <div
                    key={idx}
                    className="relative w-28 h-28 bg-slate-900 rounded-xl overflow-hidden border border-slate-300 shadow-sm group"
                  >
                    <img
                      src={img}
                      alt={`Fraction TLC ${idx + 1}`}
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform"
                      onClick={() => setLightboxImage(img)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updated = eppendorfYield.fractionTlcImages.filter((_, i) => i !== idx);
                        handleEppendorfChange('fractionTlcImages', updated);
                      }}
                      className="absolute top-1 right-1 bg-slate-900/80 hover:bg-rose-600 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity no-print"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Chưa có ảnh bản mỏng kiểm tra phân đoạn nào được tải lên.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* LIGHTBOX MODAL */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex items-center justify-center">
            <img
              src={lightboxImage}
              alt="Fraction TLC Zoom"
              className="max-w-full max-h-[90vh] object-contain rounded-xl shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute top-4 right-4 bg-slate-800/80 hover:bg-rose-600 text-white p-2.5 rounded-full backdrop-blur-sm"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
