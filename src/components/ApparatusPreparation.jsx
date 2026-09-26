import React, { useState } from 'react';
import {
  FlaskConical,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';

const COMMON_PRESETS = [
  { name: 'Bình cầu 2 cổ 100 mL', quantity: 1, notes: 'Sấy khô 110°C' },
  { name: 'Bình cầu 3 cổ 250 mL', quantity: 1, notes: 'Lắp nhiệt kế + sinh hàn' },
  { name: 'Sinh hàn hồi lưu', quantity: 1, notes: 'Nối ống nước làm mát' },
  { name: 'Cá từ khuấy', quantity: 1, notes: 'Cá từ bọc Teflon cỡ vừa' },
  { name: 'Bếp khuấy từ gia nhiệt', quantity: 1, notes: 'Kiểm tra cảm biến nhiệt' },
  { name: 'Ống đong 50 mL', quantity: 1, notes: 'Đong dung môi' },
  { name: 'Phễu chiết 125 mL', quantity: 1, notes: 'Khoá Teflon kín khít' },
  { name: 'Cốc Becher 100 mL', quantity: 2, notes: 'Đựng pha hữu cơ/nước' },
  { name: 'Nhiệt kế thủy ngân (0-150°C)', quantity: 1, notes: 'Gắn cổ nhánh bình cầu' },
  { name: 'Bình tam giác 100 mL', quantity: 2, notes: 'Hứng dịch lọc' },
  { name: 'Phễu lọc Buchner & bình lọc hút', quantity: 1, notes: 'Kèm giấy lọc vừa khít' },
  { name: 'Bể đá muối (0 - 5°C)', quantity: 1, notes: 'Làm lạnh khi nhỏ giọt' },
  { name: 'Cột sắc ký thuỷ tinh (ĐK 2cm)', quantity: 1, notes: 'Kèm bông gòn + khoá' }
];

export const ApparatusPreparation = ({
  equipment = [],
  onChange
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  // Safe list
  const list = Array.isArray(equipment) ? equipment : [];

  const completedCount = list.filter((item) => item.checked).length;
  const totalCount = list.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Toggle item checked
  const toggleChecked = (id) => {
    const updated = list.map((item) =>
      item.id === id ? { ...item, checked: !item.checked } : item
    );
    onChange(updated);
  };

  // Update item fields
  const handleItemChange = (id, field, value) => {
    const updated = list.map((item) => {
      if (item.id !== id) return item;
      return { ...item, [field]: value };
    });
    onChange(updated);
  };

  // Adjust quantity (+ / -)
  const adjustQuantity = (id, delta) => {
    const updated = list.map((item) => {
      if (item.id !== id) return item;
      const current = parseInt(item.quantity, 10) || 1;
      const next = Math.max(1, current + delta);
      return { ...item, quantity: next };
    });
    onChange(updated);
  };

  // Add new custom equipment
  const addEquipmentItem = (name = '', quantity = 1, notes = '') => {
    const newItem = {
      id: `equip-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: name || 'Dụng cụ mới',
      quantity: quantity || 1,
      checked: false,
      notes: notes || ''
    };
    onChange([...list, newItem]);
  };

  // Remove equipment item
  const removeEquipmentItem = (id) => {
    onChange(list.filter((item) => item.id !== id));
  };

  // Mark all completed or uncheck all
  const toggleCheckAll = () => {
    const allChecked = totalCount > 0 && completedCount === totalCount;
    const updated = list.map((item) => ({ ...item, checked: !allChecked }));
    onChange(updated);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden card-print">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-teal-600 rounded-2xl shadow-md text-white flex-shrink-0">
            <FlaskConical className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              0. Chuẩn bị Dụng cụ & Thiết bị
              <span className="text-xs bg-teal-500/30 text-teal-300 border border-teal-400/40 px-2 py-0.5 rounded-full font-mono font-medium">
                {completedCount}/{totalCount} sẵn sàng
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Kiểm tra số lượng bình cầu, sinh hàn, cá từ và dụng cụ trước khi tiến hành
            </p>
          </div>
        </div>

        {/* Header Action Controls */}
        <div className="flex items-center gap-2 no-print">
          {totalCount > 0 && (
            <button
              type="button"
              onClick={toggleCheckAll}
              className="text-xs bg-teal-800/60 hover:bg-teal-700 text-teal-100 px-3 py-1.5 rounded-xl border border-teal-600/40 transition-colors font-medium min-h-[38px] cursor-pointer"
            >
              {completedCount === totalCount ? 'Bỏ chọn tất cả' : 'Đã chuẩn bị hết'}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
            title={isExpanded ? 'Thu gọn' : 'Mở rộng'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      {totalCount > 0 && (
        <div className="bg-slate-100 h-1.5 w-full">
          <div
            className="bg-teal-500 h-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {isExpanded && (
        <div className="p-4 sm:p-5 space-y-4">
          {/* Quick-add presets chips */}
          <div className="no-print space-y-2 bg-teal-50/50 p-3 rounded-2xl border border-teal-100">
            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
              <Sparkles className="w-3.5 h-3.5 text-teal-600" />
              <span>Gợi ý thêm nhanh dụng cụ phòng lab (1 chạm):</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_PRESETS.map((preset) => {
                const alreadyAdded = list.some((i) => i.name.toLowerCase() === preset.name.toLowerCase());
                return (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => addEquipmentItem(preset.name, preset.quantity, preset.notes)}
                    className={`text-[11px] px-2.5 py-1.5 rounded-xl border transition-all flex items-center gap-1 cursor-pointer min-h-[36px] ${
                      alreadyAdded
                        ? 'bg-teal-100/70 border-teal-300 text-teal-900'
                        : 'bg-white hover:bg-teal-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Plus className="w-3 h-3 text-teal-600" />
                    <span>{preset.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* List of items */}
          {list.length === 0 ? (
            <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
              <FlaskConical className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              <p className="text-xs font-semibold text-slate-500">Chưa có dụng cụ nào trong danh sách chuẩn bị.</p>
              <p className="text-[11px] text-slate-400 mt-1">Bấm các nút gợi ý nhanh ở trên hoặc nút Thêm dụng cụ bên dưới.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {list.map((item, index) => {
                const isChecked = Boolean(item.checked);
                return (
                  <div
                    key={item.id || index}
                    className={`p-3 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      isChecked
                        ? 'bg-teal-50/40 border-teal-200 shadow-none'
                        : 'bg-white border-slate-200 shadow-sm hover:border-slate-300'
                    }`}
                  >
                    {/* Checkbox & Name */}
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleChecked(item.id)}
                        className="cursor-pointer flex-shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        title={isChecked ? 'Đánh dấu chưa chuẩn bị' : 'Đánh dấu đã chuẩn bị xong'}
                      >
                        {isChecked ? (
                          <CheckCircle2 className="w-5 h-5 text-teal-600 fill-teal-100" />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 hover:text-teal-500" />
                        )}
                      </button>

                      <div className="flex-1 min-w-0 space-y-1">
                        <input
                          type="text"
                          value={item.name || ''}
                          onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                          placeholder="Tên dụng cụ (VD: Bình cầu 2 cổ 100 mL)..."
                          className={`w-full bg-transparent border-0 border-b border-dashed border-slate-200 font-semibold text-xs sm:text-sm focus:outline-none focus:border-teal-600 py-1 transition-colors ${
                            isChecked ? 'text-slate-500 line-through decoration-slate-300' : 'text-slate-900'
                          }`}
                        />
                        <input
                          type="text"
                          value={item.notes || ''}
                          onChange={(e) => handleItemChange(item.id, 'notes', e.target.value)}
                          placeholder="Quy cách / Ghi chú (VD: Sấy khô 110°C, bọc giấy bạc)..."
                          className="w-full bg-transparent border-0 text-[11px] text-slate-400 focus:outline-none focus:text-slate-700 py-0.5"
                        />
                      </div>
                    </div>

                    {/* Quantity Selector & Delete Button */}
                    <div className="flex items-center justify-between sm:justify-end gap-2 pl-12 sm:pl-0">
                      {/* Quantity Controller with Touch Buttons */}
                      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl p-0.5">
                        <span className="text-[11px] text-slate-500 font-semibold px-2">SL:</span>
                        <button
                          type="button"
                          onClick={() => adjustQuantity(item.id, -1)}
                          className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 active:bg-slate-300 border border-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer text-sm shadow-sm"
                          title="Giảm 1"
                        >
                          -
                        </button>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={item.quantity ?? 1}
                          onChange={(e) => {
                            const val = e.target.value.replace(/[^0-9]/g, '');
                            handleItemChange(item.id, 'quantity', val ? parseInt(val, 10) : 1);
                          }}
                          className="w-10 text-center font-mono font-bold text-xs bg-transparent focus:outline-none text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => adjustQuantity(item.id, 1)}
                          className="w-8 h-8 rounded-lg bg-white hover:bg-slate-200 active:bg-slate-300 border border-slate-200 flex items-center justify-center font-bold text-slate-700 cursor-pointer text-sm shadow-sm"
                          title="Tăng 1"
                        >
                          +
                        </button>
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => removeEquipmentItem(item.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center transition-colors no-print cursor-pointer"
                        title="Xóa dụng cụ này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add custom equipment button */}
          <div className="pt-2 no-print flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => addEquipmentItem()}
              className="bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-xs px-4 py-2.5 rounded-2xl flex items-center gap-1.5 font-bold shadow-sm transition-all min-h-[44px] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm dụng cụ khác</span>
            </button>

            <span className="text-[11px] text-slate-500 font-mono">
              Tổng số lượng chi tiết:{' '}
              <strong className="text-teal-900">
                {list.reduce((sum, item) => sum + (parseInt(item.quantity, 10) || 1), 0)}
              </strong>{' '}
              món
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
