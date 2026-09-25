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
  Scale
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
    crudeTareMass = '',
    crudeGrossMass = '',
    crudeMass = 0,
    workupNotes = ''
  } = workupData || {};

  const handleFieldChange = (field, value) => {
    onChange({
      ...workupData,
      [field]: value
    });
  };

  const handleTareOrGrossChange = (field, val) => {
    const cleanVal = val.replace(/[^0-9.,]/g, '');
    const tare = parseDecimal(field === 'crudeTareMass' ? cleanVal : crudeTareMass);
    const gross = parseDecimal(field === 'crudeGrossMass' ? cleanVal : crudeGrossMass);
    let autoCrude = undefined;
    if (gross > 0 && tare > 0) {
      autoCrude = String(parseFloat(Math.max(0, gross - tare).toFixed(4)));
    }
    onChange({
      ...workupData,
      [field]: cleanVal,
      ...(autoCrude !== undefined ? { crudeMass: autoCrude } : {})
    });
  };

  // Quick preset helper
  const applyPreset = (presetType) => {
    switch (presetType) {
      case 'etac_brine':
        onChange({
          ...workupData,
          quenching: 'Dập bằng nước đá lạnh (20 mL)',
          extractionSolvent: 'Chiết bằng Ethyl Acetate (EtOAc) 3 x 20 mL',
          washing: 'Rửa dịch chiết hữu cơ bằng Nước cất (15 mL), sau đó rửa Nước muối bão hòa (Brine) 15 mL',
          dryingAgent: 'Na2SO4 khan'
        });
        break;
      case 'dcm_wash':
        onChange({
          ...workupData,
          quenching: 'Dập từ từ bằng dung dịch NH4Cl bão hòa (15 mL)',
          extractionSolvent: 'Chiết bằng Dichloromethane (DCM) 3 x 25 mL',
          washing: 'Rửa dung dịch NaHCO3 bão hòa (20 mL), sau đó Brine (20 mL)',
          dryingAgent: 'MgSO4 khan'
        });
        break;
      case 'buchner_filter':
        onChange({
          ...workupData,
          quenching: 'Đổ hỗn hợp vào 50g nước đá vụn, khuấy mạnh kết tủa tạo thành',
          extractionSolvent: 'Lọc hút qua phễu Buchner, không dùng dung môi chiết',
          washing: 'Rửa kết tủa trên phễu 3 lần bằng nước cất lạnh và 1 lần bằng dung môi phân cực kém lạnh',
          dryingAgent: 'Sấy khô chân không (Vacuum desiccator)'
        });
        break;
      default:
        break;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden card-print">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl shadow-md text-white">
            <Waves className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              4. Xử Lý Thô & Cô Quay (Workup & Rotavapor)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Quy trình dập phản ứng, chiết tách pha hữu cơ, làm khô và thông số cô quay chân không
            </p>
          </div>
        </div>

        {/* Quick Presets for Gloved Lab Work */}
        <div className="flex flex-wrap items-center gap-1.5 no-print">
          <span className="text-[11px] text-slate-400 font-medium mr-1">Quy trình mẫu:</span>
          <button
            type="button"
            onClick={() => applyPreset('etac_brine')}
            className="text-xs bg-indigo-800/60 hover:bg-indigo-700 text-indigo-200 px-2.5 py-1.5 rounded-lg border border-indigo-500/30 transition-colors"
          >
            EtOAc / Brine
          </button>
          <button
            type="button"
            onClick={() => applyPreset('dcm_wash')}
            className="text-xs bg-indigo-800/60 hover:bg-indigo-700 text-indigo-200 px-2.5 py-1.5 rounded-lg border border-indigo-500/30 transition-colors"
          >
            DCM / NH4Cl
          </button>
          <button
            type="button"
            onClick={() => applyPreset('buchner_filter')}
            className="text-xs bg-indigo-800/60 hover:bg-indigo-700 text-indigo-200 px-2.5 py-1.5 rounded-lg border border-indigo-500/30 transition-colors"
          >
            Lọc kết tủa Buchner
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Row 1: Quenching & Extraction */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Droplets className="w-4 h-4 text-blue-500" />
              1. Tác nhân dập phản ứng (Quenching):
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
              2. Dung môi & Số lần chiết (Extraction):
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
              3. Rửa pha hữu cơ (Washing):
            </label>
            <input
              type="text"
              value={washing}
              onChange={(e) => handleFieldChange('washing', e.target.value)}
              placeholder="VD: Rửa bằng Nước muối bão hòa (Brine) 20 mL, NaHCO3 bão hòa 20 mL..."
              className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none min-h-[44px]"
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-2">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-500" />
              4. Chất làm khô (Drying Agent):
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
        <div className="bg-gradient-to-br from-indigo-50/50 to-slate-50 border border-indigo-100 p-4 rounded-2xl">
          <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Wind className="w-4 h-4 text-indigo-600" />
            Thông số máy cô quay chân không (Rotavapor Parameters)
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
              <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-600" />
                Cân Khối Lượng Cắn Thô (Ống Eppendorf)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Cân trừ bì vỏ ống để xác định khối lượng cắn thô nạp cột
              </p>
            </div>
            <span className="text-xs bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full font-mono font-medium">
              Trừ bì tự động
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* m vỏ */}
            <div className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-sm">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                m(vỏ Eppendorf rỗng) ({massUnit}):
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={crudeTareMass ?? ''}
                onChange={(e) => handleTareOrGrossChange('crudeTareMass', e.target.value)}
                placeholder="1.0520"
                className="w-full text-right font-mono font-bold text-base bg-slate-50 focus:bg-white border border-slate-300 focus:border-amber-500 rounded-lg p-2 focus:outline-none min-h-[44px]"
              />
              <span className="text-[11px] text-slate-400 block mt-1">Khối lượng vỏ ống khô</span>
            </div>

            {/* m vỏ + cắn */}
            <div className="bg-white p-3.5 rounded-xl border border-amber-200/80 shadow-sm">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                m(vỏ + cắn thô) sau cô quay ({massUnit}):
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={crudeGrossMass ?? ''}
                onChange={(e) => handleTareOrGrossChange('crudeGrossMass', e.target.value)}
                placeholder="2.8450"
                className="w-full text-right font-mono font-bold text-base bg-slate-50 focus:bg-white border border-slate-300 focus:border-amber-500 rounded-lg p-2 focus:outline-none min-h-[44px]"
              />
              <span className="text-[11px] text-slate-400 block mt-1">Vỏ kèm cắn thô đã cô đuổi dung môi</span>
            </div>

            {/* m cắn thô thu được */}
            <div className="bg-amber-100/90 p-3.5 rounded-xl border border-amber-300 shadow-sm flex flex-col justify-between">
              <div>
                <label className="text-xs font-bold text-amber-950 uppercase tracking-wide block">
                  m(cắn thô) nạp cột ({massUnit}):
                </label>
                <span className="text-[11px] text-amber-800 font-medium">
                  = m(vỏ+cắn) - m(vỏ) (hoặc tự nhập)
                </span>
              </div>
              <div className="mt-2">
                <input
                  type="text"
                  inputMode="decimal"
                  value={crudeMass ?? ''}
                  onChange={(e) => handleFieldChange('crudeMass', e.target.value.replace(/[^0-9.,]/g, ''))}
                  placeholder="0.0000"
                  className="w-full text-right font-mono font-extrabold text-xl text-amber-950 bg-white border border-amber-300 focus:border-amber-500 rounded-lg p-2 focus:outline-none min-h-[44px]"
                />
              </div>
            </div>
          </div>
        </div>

          {/* Residue Appearance */}
          <div className="mt-4">
            <label className="text-xs font-semibold text-slate-700 block mb-1.5">
              Cảm quan cắn sau khi cô quay (Crude Residue Appearance):
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
                  className="text-[11px] bg-white hover:bg-indigo-50 text-slate-600 px-2 py-1 rounded-md border border-slate-200"
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
