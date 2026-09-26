import React from 'react';
import {
  TestTube,
  Waves,
  Thermometer,
  Gauge,
  Sparkles,
  Layers,
  FileText,
  CheckCircle2,
  Droplets,
  Wind,
  Scale,
  Plus,
  Trash2
} from 'lucide-react';
import { parseDecimal } from './StoichiometryTable';

export const WorkupSection = ({ workupData, onChange, massUnit = 'g' }) => {
  const {
    quenching = '',
    extractionSolvent = '',
    washing = '',
    dryingAgent = 'Na2SO4 khan',
    rotavaporTemp = '40°C',
    rotavaporPressure = '250 mbar',
    residueAppearance = '',
    crudeTubes = [],
    crudeTareMass = '',
    crudeGrossMass = '',
    crudeMass = 0,
    workupNotes = ''
  } = workupData || {};

  // Normalize crude tubes (backward-compatible)
  const normalizedCrudeTubes = (Array.isArray(crudeTubes) && crudeTubes.length > 0)
    ? crudeTubes
    : [
        {
          id: 'crude-tube-1',
          label: 'Ống 1',
          tareMass: crudeTareMass || '',
          grossMass: crudeGrossMass || '',
          crudeMass: parseDecimal(crudeMass) || 0
        }
      ];

  const handleFieldChange = (field, value) => {
    onChange({
      ...workupData,
      [field]: value
    });
  };

  const recalculateCrudeTubes = (updatedTubes) => {
    const totalMass = updatedTubes.reduce((sum, t) => sum + (t.crudeMass || 0), 0);
    const roundedTotal = parseFloat(totalMass.toFixed(4));
    const firstTare = updatedTubes[0]?.tareMass || '';
    const firstGross = updatedTubes[0]?.grossMass || '';

    onChange({
      ...workupData,
      crudeTubes: updatedTubes,
      crudeTareMass: firstTare,
      crudeGrossMass: firstGross,
      crudeMass: roundedTotal
    });
  };

  const handleCrudeTubeChange = (tubeId, field, val) => {
    const cleanVal = typeof val === 'string' ? val.replace(/[^0-9.,]/g, '') : val;
    const updatedTubes = normalizedCrudeTubes.map((t) => {
      if (t.id !== tubeId) return t;
      const nextTube = { ...t, [field]: cleanVal };
      const tare = parseDecimal(field === 'tareMass' ? cleanVal : t.tareMass);
      const gross = parseDecimal(field === 'grossMass' ? cleanVal : t.grossMass);
      nextTube.crudeMass = parseFloat(Math.max(0, gross - tare).toFixed(4));
      return nextTube;
    });

    recalculateCrudeTubes(updatedTubes);
  };

  const handleCrudeTubeLabelChange = (tubeId, newLabel) => {
    const updatedTubes = normalizedCrudeTubes.map((t) => (t.id === tubeId ? { ...t, label: newLabel } : t));
    onChange({
      ...workupData,
      crudeTubes: updatedTubes
    });
  };

  const handleAddCrudeTube = () => {
    const nextNum = normalizedCrudeTubes.length + 1;
    const newTube = {
      id: `crude-tube-${Date.now()}`,
      label: `Ống ${nextNum}`,
      tareMass: '',
      grossMass: '',
      crudeMass: 0
    };
    const updatedTubes = [...normalizedCrudeTubes, newTube];
    recalculateCrudeTubes(updatedTubes);
  };

  const handleRemoveCrudeTube = (tubeId) => {
    if (normalizedCrudeTubes.length <= 1) return;
    const updatedTubes = normalizedCrudeTubes.filter((t) => t.id !== tubeId);
    recalculateCrudeTubes(updatedTubes);
  };

  // Quick preset helper
  const applyPreset = (presetType) => {
    switch (presetType) {
      case 'etac_brine':
        onChange({
          ...workupData,
          quenching: 'Dập bằng nước đá lạnh (20 mL)',
          extractionSolvent: 'Chiết bằng Ethyl Acetate (EtOAc) 3 x 20 mL',
          washing: 'Rửa dịch chiết hữu cơ bằng Nước cất (15 mL), sau đó rửa Nước muối bão hòa 15 mL',
          dryingAgent: 'Na2SO4 khan'
        });
        break;
      case 'dcm_wash':
        onChange({
          ...workupData,
          quenching: 'Dập từ từ bằng dung dịch NH4Cl bão hòa (15 mL)',
          extractionSolvent: 'Chiết bằng Dichloromethane (DCM) 3 x 25 mL',
          washing: 'Rửa dung dịch NaHCO3 bão hòa (20 mL), sau đó Nước muối bão hòa (20 mL)',
          dryingAgent: 'MgSO4 khan'
        });
        break;
      case 'buchner_filter':
        onChange({
          ...workupData,
          quenching: 'Đổ hỗn hợp vào 50g nước đá vụn, khuấy mạnh kết tủa tạo thành',
          extractionSolvent: 'Lọc hút qua phễu Buchner, không dùng dung môi chiết',
          washing: 'Rửa kết tủa trên phễu 3 lần bằng nước cất lạnh và 1 lần bằng dung môi phân cực kém lạnh',
          dryingAgent: 'Sấy khô trong bình hút ẩm chân không'
        });
        break;
      default:
        break;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden card-print">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 text-white p-3.5 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="p-2 sm:p-2.5 bg-blue-600 rounded-2xl shadow-md text-white flex-shrink-0 mt-0.5 sm:mt-0">
            <Waves className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-lg font-bold text-white leading-snug">
              4. Xử Lý Thô & Cô Quay
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 line-clamp-1 sm:line-clamp-none">
              Quy trình dập phản ứng, chiết tách pha hữu cơ, làm khô và cô quay
            </p>
          </div>
        </div>

        {/* Quick Presets for Gloved Lab Work */}
        <div className="flex overflow-x-auto sm:flex-wrap items-center gap-1.5 no-print w-full sm:w-auto pb-0.5 sm:pb-0 no-scrollbar">
          <span className="text-[11px] text-slate-400 font-medium mr-1 whitespace-nowrap flex-shrink-0">Mẫu nhanh:</span>
          <button
            type="button"
            onClick={() => applyPreset('etac_brine')}
            className="text-[11px] sm:text-xs bg-slate-800 hover:bg-slate-700 text-teal-300 px-2.5 py-1.5 rounded-xl border border-slate-700 transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer"
          >
            EtOAc / Nước muối
          </button>
          <button
            type="button"
            onClick={() => applyPreset('dcm_wash')}
            className="text-[11px] sm:text-xs bg-slate-800 hover:bg-slate-700 text-teal-300 px-2.5 py-1.5 rounded-xl border border-slate-700 transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer"
          >
            DCM / NH4Cl
          </button>
          <button
            type="button"
            onClick={() => applyPreset('buchner_filter')}
            className="text-[11px] sm:text-xs bg-slate-800 hover:bg-slate-700 text-teal-300 px-2.5 py-1.5 rounded-xl border border-slate-700 transition-colors whitespace-nowrap flex-shrink-0 cursor-pointer"
          >
            Lọc Buchner
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Row 1: Quenching & Extraction */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-blue-500" />
              1. Tác nhân dập phản ứng:
            </label>
            <textarea
              rows="2"
              value={quenching}
              onChange={(e) => handleFieldChange('quenching', e.target.value)}
              placeholder="VD: Đổ vào 30mL nước đá vụn; Nhỏ từ từ dung dịch NH4Cl bão hòa dưới 10°C..."
              className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs sm:text-sm focus:outline-none min-h-[44px]"
            ></textarea>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <TestTube className="w-4 h-4 text-emerald-500" />
              2. Dung môi & Số lần chiết:
            </label>
            <textarea
              rows="2"
              value={extractionSolvent}
              onChange={(e) => handleFieldChange('extractionSolvent', e.target.value)}
              placeholder="VD: Chiết bằng Ethyl Acetate (3 x 20 mL) hoặc Dichloromethane (3 x 25 mL)..."
              className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-2.5 text-xs sm:text-sm focus:outline-none min-h-[44px]"
            ></textarea>
          </div>
        </div>

        {/* Row 2: Washing & Drying Agent */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-500" />
              3. Rửa pha hữu cơ:
            </label>
            <input
              type="text"
              value={washing}
              onChange={(e) => handleFieldChange('washing', e.target.value)}
              placeholder="VD: Rửa bằng Nước muối bão hòa 20 mL, NaHCO3 bão hòa 20 mL..."
              className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none min-h-[44px]"
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              4. Chất làm khô:
            </label>
            <div className="flex items-center gap-2">
              <select
                value={dryingAgent}
                onChange={(e) => handleFieldChange('dryingAgent', e.target.value)}
                className="bg-white border border-slate-300 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium focus:outline-none min-h-[44px] flex-1"
              >
                <option value="Na2SO4 khan">Na2SO4 khan (Natri sulfat khan)</option>
                <option value="MgSO4 khan">MgSO4 khan (Magie sulfat khan)</option>
                <option value="CaCl2 khan">CaCl2 khan</option>
                <option value="K2CO3 khan">K2CO3 khan (cho base hữu cơ)</option>
                <option value="Sấy chân không">Sấy chân không (không dùng muối hút ẩm)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Row 3: Rotavapor Parameters (Cô quay) */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Wind className="w-4 h-4 text-teal-600" />
            Thông số máy cô quay chân không
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <Thermometer className="w-4 h-4 text-rose-500" /> Nhiệt độ bồn nước (°C):
              </label>
              <input
                type="text"
                value={rotavaporTemp}
                onChange={(e) => handleFieldChange('rotavaporTemp', e.target.value)}
                placeholder="40°C - 45°C"
                className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs sm:text-sm font-mono focus:outline-none min-h-[44px]"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                <Gauge className="w-4 h-4 text-sky-500" /> Áp suất chân không (mbar):
              </label>
              <input
                type="text"
                value={rotavaporPressure}
                onChange={(e) => handleFieldChange('rotavaporPressure', e.target.value)}
                placeholder="VD: 240 mbar (EtOAc) / 750 mbar (DCM)"
                className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs sm:text-sm font-mono focus:outline-none min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Eppendorf Tare Weighing for Crude Residue (Cân cắn thô trước khi lên cột) */}
        <div className="bg-gradient-to-br from-amber-50/70 to-slate-50 border border-amber-200 p-4 sm:p-5 rounded-2xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/70 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-amber-950 flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-600" />
                Cân Khối Lượng Cắn Thô (Ống Eppendorf) ({normalizedCrudeTubes.length} ống)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cân trừ bì vỏ ống để xác định khối lượng cắn thô trước khi nạp cột
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddCrudeTube}
              className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm min-h-[38px] cursor-pointer no-print"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm ống Eppendorf</span>
            </button>
          </div>

          {/* List of Crude Eppendorf Tubes */}
          <div className="space-y-2.5">
            {normalizedCrudeTubes.map((tube, index) => (
              <div
                key={tube.id || index}
                className="bg-white p-3 sm:p-3.5 rounded-2xl border border-amber-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                {/* Tube Label */}
                <div className="flex items-center gap-2 md:w-36 flex-shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 flex-shrink-0"></span>
                  <input
                    type="text"
                    value={tube.label}
                    onChange={(e) => handleCrudeTubeLabelChange(tube.id, e.target.value)}
                    placeholder={`Ống ${index + 1}`}
                    className="font-bold text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:bg-white focus:outline-none w-full"
                    title="Nhấn để đổi tên ống"
                  />
                </div>

                {/* 3 Mass inputs */}
                <div className="grid grid-cols-3 gap-2 flex-1">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                      m(vỏ) ({massUnit}):
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={tube.tareMass ?? ''}
                      onChange={(e) => handleCrudeTubeChange(tube.id, 'tareMass', e.target.value)}
                      placeholder="1.0520"
                      className="w-full text-right font-mono font-bold text-xs sm:text-sm bg-slate-50 focus:bg-white border border-slate-300 focus:border-amber-500 rounded-xl px-2.5 py-1.5 focus:outline-none min-h-[40px]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                      m(vỏ+cắn thô) ({massUnit}):
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={tube.grossMass ?? ''}
                      onChange={(e) => handleCrudeTubeChange(tube.id, 'grossMass', e.target.value)}
                      placeholder="2.8450"
                      className="w-full text-right font-mono font-bold text-xs sm:text-sm bg-slate-50 focus:bg-white border border-slate-300 focus:border-amber-500 rounded-xl px-2.5 py-1.5 focus:outline-none min-h-[40px]"
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-amber-800 uppercase leading-none">
                      m(cắn thô):
                    </span>
                    <span className="font-mono font-extrabold text-amber-950 text-xs sm:text-sm text-right mt-1">
                      {(tube.crudeMass || 0).toFixed(4)} <span className="font-normal text-[10px]">{massUnit}</span>
                    </span>
                  </div>
                </div>

                {/* Delete Tube button if > 1 tube */}
                {normalizedCrudeTubes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveCrudeTube(tube.id)}
                    className="text-slate-400 hover:text-rose-500 p-2 rounded-lg no-print self-end md:self-center cursor-pointer"
                    title="Xóa ống này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Aggregate Crude Mass Summary Banner */}
          <div className="bg-amber-100/90 border border-amber-300 p-3.5 sm:p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-200 text-amber-900 rounded-xl font-bold flex-shrink-0">
                <Scale className="w-5 h-5 text-amber-800" />
              </div>
              <div>
                <span className="text-xs font-bold text-amber-950 uppercase tracking-wide block">
                  Tổng khối lượng cắn thô nạp cột ({normalizedCrudeTubes.length} ống):
                </span>
                <span className="text-[11px] text-amber-800">
                  Tự động cộng dồn từ tất cả các ống Eppendorf cô quay cắn thô
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center">
              <input
                type="text"
                inputMode="decimal"
                value={crudeMass ?? ''}
                onChange={(e) => handleFieldChange('crudeMass', e.target.value.replace(/[^0-9.,]/g, ''))}
                title="Nhấn để chỉnh sửa hoặc nhập tay tổng khối lượng cắn thô nếu cần"
                placeholder="0.0000"
                className="w-36 text-right font-mono font-extrabold text-xl text-amber-950 bg-white border border-amber-300 focus:border-amber-500 rounded-xl px-3 py-1.5 focus:outline-none min-h-[44px]"
              />
              <span className="font-bold text-sm text-amber-900">{massUnit}</span>
            </div>
          </div>
        </div>

          {/* Residue Appearance */}
          <div className="mt-4">
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Cảm quan cắn sau khi cô quay:
            </label>
            <input
              type="text"
              value={residueAppearance}
              onChange={(e) => handleFieldChange('residueAppearance', e.target.value)}
              placeholder="VD: Dầu sệt màu vàng nâu; Cắn xốp vô định hình; Bột kết tinh trắng ngà..."
              className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium focus:outline-none min-h-[44px]"
            />
            {/* Quick tags */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {[
                'Dầu đặc màu vàng sậm',
                'Dầu không màu',
                'Cắn vô định hình màu vàng',
                'Bột kết tinh màu trắng',
                'Khối nhựa nâu dính đáy bình'
              ].map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => handleFieldChange('residueAppearance', text)}
                  className="text-[11px] bg-white hover:bg-teal-50 hover:text-teal-800 text-slate-700 px-2 py-1 rounded-md border border-slate-200 transition-colors"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>

        {/* Additional Workup Notes */}
        <div>
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5 mb-1.5">
            <FileText className="w-4 h-4 text-slate-600" />
            Ghi chú chi tiết quá trình xử lý thô:
          </label>
          <textarea
            rows="2"
            value={workupNotes}
            onChange={(e) => handleFieldChange('workupNotes', e.target.value)}
            placeholder="Ghi chú hiện tượng nhũ hóa, cách phá bọt (thêm vài giọt EtOH/brine), thời gian sấy..."
            className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 rounded-xl p-3 text-xs sm:text-sm focus:outline-none min-h-[44px]"
          ></textarea>
        </div>
      </div>
    </div>
  );
};
