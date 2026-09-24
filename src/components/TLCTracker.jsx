import React, { useState, useRef } from 'react';
import {
  FileImage,
  Camera,
  Upload,
  Plus,
  Trash2,
  Eye,
  Maximize2,
  Clock,
  Sparkles,
  Layers,
  Tag,
  CheckCircle2,
  X
} from 'lucide-react';
import { useExperiment } from '../context/ExperimentContext';

export const TLCTracker = ({ tlcList = [], onChange, currentTimerSeconds = 0 }) => {
  const { uploadImage } = useExperiment();
  const [modalOpen, setModalOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Form state for adding new TLC plate
  const [newMinute, setNewMinute] = useState('');
  const [newEluent, setNewEluent] = useState('Hexan : EtOAc (3 : 1)');
  const [selectedStains, setSelectedStains] = useState(['UV 254nm']);
  const [newObservation, setNewObservation] = useState('');
  const [newSpots, setNewSpots] = useState([
    { label: 'Chất đầu (SM)', rf: '' },
    { label: 'Sản phẩm (P)', rf: '' }
  ]);
  const [newImagePreview, setNewImagePreview] = useState(null);
  const [newImageFile, setNewImageFile] = useState(null);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const COMMON_STAINS = [
    'UV 254nm',
    'UV 365nm',
    'Vanillin / H2SO4',
    'H2SO4 cồn 10%',
    'KMnO4',
    'Ninhydrin',
    'Dragendorff',
    'Iodine (I2)',
    'FeCl3 5%',
    'PMA (Phosphomolybdic)'
  ];

  const COMMON_ELUENTS = [
    'Hexan : EtOAc (4 : 1)',
    'Hexan : EtOAc (3 : 1)',
    'Hexan : EtOAc (2 : 1)',
    'Hexan : EtOAc (1 : 1)',
    'DCM : MeOH (95 : 5)',
    'DCM : MeOH (9 : 1)',
    'Petroleum Ether : Acetone (5 : 1)',
    'Chloroform : MeOH (9 : 1)'
  ];

  // Open modal and pre-fill current reaction minute from timer
  const handleOpenAddModal = () => {
    const currentMins = Math.floor(currentTimerSeconds / 60);
    setNewMinute(currentMins > 0 ? String(currentMins) : '15');
    setNewObservation('');
    setNewImagePreview(null);
    setNewImageFile(null);
    setModalOpen(true);
  };

  // Toggle stain selection
  const toggleStain = (stain) => {
    if (selectedStains.includes(stain)) {
      setSelectedStains(selectedStains.filter((s) => s !== stain));
    } else {
      setSelectedStains([...selectedStains, stain]);
    }
  };

  // Handle local image selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setNewImagePreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  // Add/remove custom Rf spot row
  const addSpotRow = () => {
    setNewSpots([...newSpots, { label: `Vết phụ ${newSpots.length}`, rf: '' }]);
  };

  const removeSpotRow = (idx) => {
    setNewSpots(newSpots.filter((_, i) => i !== idx));
  };

  const updateSpotRow = (idx, field, val) => {
    const updated = [...newSpots];
    updated[idx][field] = val;
    setNewSpots(updated);
  };

  // Save TLC plate to list
  const handleSaveTLC = async () => {
    if (!newMinute) {
      alert('Vui lòng nhập thời điểm chấm TLC (phút)');
      return;
    }

    setUploading(true);
    let finalImageUrl = newImagePreview || '';

    if (newImageFile) {
      try {
        finalImageUrl = await uploadImage(newImageFile, 'tlc_plates');
      } catch (err) {
        console.warn('Upload error, using local data URL:', err);
      }
    }

    const minNum = parseInt(newMinute, 10) || 0;
    const hours = Math.floor(minNum / 60);
    const mins = minNum % 60;
    let formattedTime = `${minNum} phút`;
    if (hours > 0) {
      formattedTime = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    const newPlate = {
      id: `tlc-${Date.now()}`,
      minute: minNum,
      timeFormatted: formattedTime,
      timestamp: new Date().toISOString(),
      eluent: newEluent,
      visualization: selectedStains,
      spots: newSpots.filter((s) => s.rf.trim() !== '' || s.label.trim() !== ''),
      observations: newObservation || 'Theo dõi tiến trình phản ứng',
      imageUrl: finalImageUrl
    };

    // Sort timeline ascending by minute
    const updatedList = [...tlcList, newPlate].sort((a, b) => (a.minute || 0) - (b.minute || 0));
    onChange(updatedList);

    setUploading(false);
    setModalOpen(false);
  };

  // Delete TLC plate
  const handleDeletePlate = (id) => {
    if (window.confirm('Xóa bản mỏng TLC này?')) {
      onChange(tlcList.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden card-print">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl shadow-md text-white">
            <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              3. Theo Dõi Sắc Ký Mỏng (TLC Timeline Monitor)
              <span className="text-xs bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 px-2 py-0.5 rounded-full font-mono font-medium">
                {tlcList.length} bản mỏng
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Chụp ảnh bản mỏng từ điện thoại, lưu hệ dung môi, hiện màu và hệ số Rf theo dòng thời gian
            </p>
          </div>
        </div>

        {/* Add TLC Button */}
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer no-print min-h-[44px]"
        >
          <Camera className="w-4 h-4" />
          <span>Thêm Bản Mỏng TLC</span>
        </button>
      </div>

      {/* Timeline Gallery */}
      <div className="p-4 sm:p-6">
        {tlcList && tlcList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tlcList.map((plate, idx) => (
              <div
                key={plate.id || idx}
                className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all flex flex-col justify-between group"
              >
                {/* Plate Top Bar */}
                <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-lg font-mono flex items-center gap-1 shadow-sm">
                      <Clock className="w-3 h-3" /> {plate.timeFormatted || `${plate.minute}m`}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      {plate.timestamp ? new Date(plate.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeletePlate(plate.id)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors no-print"
                    title="Xóa bản mỏng này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Plate Image View */}
                <div className="relative bg-slate-900 aspect-[4/3] flex items-center justify-center overflow-hidden">
                  {plate.imageUrl ? (
                    <img
                      src={plate.imageUrl}
                      alt={`TLC plate at ${plate.timeFormatted}`}
                      className="w-full h-full object-contain cursor-pointer hover:scale-105 transition-transform duration-300"
                      onClick={() => setLightboxImage(plate.imageUrl)}
                    />
                  ) : (
                    <div className="text-center p-6 text-slate-500">
                      <FileImage className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <span className="text-xs">Không có hình ảnh</span>
                    </div>
                  )}

                  {plate.imageUrl && (
                    <button
                      type="button"
                      onClick={() => setLightboxImage(plate.imageUrl)}
                      className="absolute bottom-2 right-2 p-2 bg-slate-900/70 hover:bg-slate-900 text-white rounded-xl backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity no-print"
                      title="Phóng to ảnh"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Plate Details */}
                <div className="p-4 space-y-3 flex-1 flex flex-col justify-between bg-white">
                  <div>
                    {/* Eluent */}
                    <div className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
                      <span className="text-indigo-600 font-bold">Hệ dung môi:</span>
                      <span className="font-mono bg-indigo-50 text-indigo-900 px-2 py-0.5 rounded border border-indigo-100">
                        {plate.eluent || 'Chưa ghi'}
                      </span>
                    </div>

                    {/* Staining / Visualization tags */}
                    <div className="flex flex-wrap gap-1 mb-2.5">
                      {plate.visualization?.map((stain, sIdx) => (
                        <span
                          key={sIdx}
                          className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full"
                        >
                          {stain}
                        </span>
                      ))}
                    </div>

                    {/* Rf Spots Table */}
                    {plate.spots && plate.spots.length > 0 && (
                      <div className="bg-slate-50 rounded-xl p-2 border border-slate-200 mb-2.5 space-y-1">
                        {plate.spots.map((spot, spIdx) => (
                          <div key={spIdx} className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-medium truncate pr-2">{spot.label}:</span>
                            <span className="font-mono font-bold text-indigo-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              Rf = {spot.rf || '--'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Observations */}
                    <div className="text-xs text-slate-600 bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60">
                      <strong className="text-amber-900 block mb-0.5">Nhận xét:</strong>
                      {plate.observations || 'Tiến trình bình thường.'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
            <Layers className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <h4 className="text-sm font-bold text-slate-700 mb-1">Chưa có bản mỏng TLC nào</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Nhấn nút bên dưới để mở Camera điện thoại chụp hoặc tải ảnh bản mỏng kiểm tra phản ứng.
            </p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold px-4 py-2.5 rounded-xl inline-flex items-center gap-2 shadow-sm min-h-[44px]"
            >
              <Camera className="w-4 h-4" />
              <span>Chụp / Tải bản mỏng TLC đầu tiên</span>
            </button>
          </div>
        )}
      </div>

      {/* ADD TLC MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 my-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-base sm:text-lg text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-600" />
                Thêm Bản Mỏng Sắc Ký TLC
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Time Point */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Thời điểm chấm (phút thứ):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    value={newMinute}
                    onChange={(e) => setNewMinute(e.target.value)}
                    placeholder="30"
                    className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono font-bold focus:outline-none min-h-[44px]"
                  />
                  <span className="text-xs font-medium text-slate-500">phút</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Đồng bộ đồng hồ:
                </label>
                <button
                  type="button"
                  onClick={() => setNewMinute(String(Math.floor(currentTimerSeconds / 60)))}
                  className="w-full bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl px-2.5 py-2 text-xs font-medium flex items-center justify-center gap-1 min-h-[44px]"
                >
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Lấy phút hiện tại ({Math.floor(currentTimerSeconds / 60)}m)</span>
                </button>
              </div>
            </div>

            {/* Camera / Upload buttons */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1.5">
                Ảnh bản mỏng sắc ký:
              </label>
              <div className="grid grid-cols-2 gap-2">
                {/* Mobile Camera direct trigger */}
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 font-semibold p-3 rounded-xl text-xs sm:text-sm min-h-[48px] cursor-pointer"
                >
                  <Camera className="w-4 h-4 text-emerald-600" />
                  <span>Mở Camera chụp</span>
                </button>

                {/* Upload from Gallery / Computer */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-700 font-semibold p-3 rounded-xl text-xs sm:text-sm min-h-[48px] cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-slate-600" />
                  <span>Chọn từ máy</span>
                </button>
              </div>

              {/* Hidden Inputs */}
              <input
                type="file"
                ref={cameraInputRef}
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {/* Image Preview Box */}
              {newImagePreview && (
                <div className="mt-3 relative rounded-xl overflow-hidden border border-slate-200 max-h-48 bg-slate-900 flex items-center justify-center">
                  <img src={newImagePreview} alt="TLC Preview" className="max-h-48 object-contain" />
                  <button
                    type="button"
                    onClick={() => {
                      setNewImagePreview(null);
                      setNewImageFile(null);
                    }}
                    className="absolute top-2 right-2 bg-slate-900/80 hover:bg-rose-600 text-white p-1 rounded-lg"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Eluent Selection */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Hệ dung môi giải ly (Eluent):
              </label>
              <input
                type="text"
                value={newEluent}
                onChange={(e) => setNewEluent(e.target.value)}
                placeholder="VD: Hexan : EtOAc (3 : 1)"
                className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs sm:text-sm font-mono focus:outline-none min-h-[44px]"
              />
              {/* Quick pills */}
              <div className="flex flex-wrap gap-1 mt-1.5">
                {COMMON_ELUENTS.slice(0, 4).map((sys) => (
                  <button
                    key={sys}
                    type="button"
                    onClick={() => setNewEluent(sys)}
                    className="text-[10px] font-mono bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 px-2 py-1 rounded-md border border-slate-200"
                  >
                    {sys}
                  </button>
                ))}
              </div>
            </div>

            {/* Visualization / Stains (Multi-select) */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Tác nhân hiện màu (Staining Reagents):
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_STAINS.map((stain) => {
                  const isSelected = selectedStains.includes(stain);
                  return (
                    <button
                      key={stain}
                      type="button"
                      onClick={() => toggleStain(stain)}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                        isSelected
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      {stain}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Rf Spot Rows */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  Hệ số lưu giữ Rf:
                </label>
                <button
                  type="button"
                  onClick={addSpotRow}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Thêm vết
                </button>
              </div>

              <div className="space-y-2">
                {newSpots.map((spot, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={spot.label}
                      onChange={(e) => updateSpotRow(idx, 'label', e.target.value)}
                      placeholder="Tên vết (VD: SM, P, Byproduct)"
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs min-h-[38px]"
                    />
                    <div className="flex items-center gap-1 w-28">
                      <span className="text-xs font-mono text-slate-500">Rf:</span>
                      <input
                        type="text"
                        value={spot.rf}
                        onChange={(e) => updateSpotRow(idx, 'rf', e.target.value)}
                        placeholder="0.45"
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-mono font-bold text-indigo-700 text-center min-h-[38px]"
                      />
                    </div>
                    {newSpots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSpotRow(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Observation Notes */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Nhận xét & Đánh giá phản ứng:
              </label>
              <textarea
                rows="2"
                value={newObservation}
                onChange={(e) => setNewObservation(e.target.value)}
                placeholder="VD: Hết chất đầu, xuất hiện vết sản phẩm chính Rf 0.21, còn vết phụ mờ..."
                className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 rounded-xl p-2.5 text-xs sm:text-sm focus:outline-none min-h-[44px]"
              ></textarea>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm text-slate-600 hover:bg-slate-100 font-medium min-h-[44px]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveTLC}
                disabled={uploading}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md min-h-[44px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {uploading ? 'Đang xử lý ảnh...' : 'Lưu Bản Mỏng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL */}
      {lightboxImage && (
        <div
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-zoom-out animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex items-center justify-center">
            <img
              src={lightboxImage}
              alt="TLC Zoom"
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
