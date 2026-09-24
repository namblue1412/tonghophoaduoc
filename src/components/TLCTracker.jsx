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
  X,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Droplet
} from 'lucide-react';
import { useExperiment } from '../context/ExperimentContext';

export const TLCTracker = ({ tlcList = [], onChange, currentTimerSeconds = 0 }) => {
  const { uploadImage } = useExperiment();
  const [modalOpen, setModalOpen] = useState(false);
  
  // Lightbox state
  const [lightboxData, setLightboxData] = useState(null); // { images, activeType: 'uv254'|'uv365'|'reagent', title, minute }

  const [uploading, setUploading] = useState(false);

  // Form state for adding/editing a TLC plate
  const [newMinute, setNewMinute] = useState('');
  const [newEluent, setNewEluent] = useState('Hexan : EtOAc (3 : 1)');
  const [selectedStainName, setSelectedStainName] = useState('Vanillin / H2SO4');
  const [customStainName, setCustomStainName] = useState('');
  const [newObservation, setNewObservation] = useState('');
  const [newSpots, setNewSpots] = useState([
    { label: 'Chất đầu (SM)', rf: '' },
    { label: 'Sản phẩm (P)', rf: '' }
  ]);

  // 3 Photos state: { preview, file }
  const [photo254, setPhoto254] = useState({ preview: null, file: null });
  const [photo365, setPhoto365] = useState({ preview: null, file: null });
  const [photoReagent, setPhotoReagent] = useState({ preview: null, file: null });

  // Separate hidden file & camera inputs for all 3 photo slots
  const cam254Ref = useRef(null);
  const file254Ref = useRef(null);

  const cam365Ref = useRef(null);
  const file365Ref = useRef(null);

  const camReagentRef = useRef(null);
  const fileReagentRef = useRef(null);

  // Active view tab per TLC plate in gallery (keyed by plate id)
  const [activeTabPerPlate, setActiveTabPerPlate] = useState({});

  const COMMON_STAINS = [
    'Vanillin / H2SO4',
    'H2SO4 cồn 10%',
    'KMnO4',
    'Ninhydrin',
    'Dragendorff',
    'Iodine (I2)',
    'PMA (Phosphomolybdic)',
    'FeCl3 5%',
    'Anisaldehyde',
    'Khác (Tự nhập)'
  ];

  const COMMON_ELUENTS = [
    'Hexan : EtOAc (4 : 1)',
    'Hexan : EtOAc (3 : 1)',
    'Hexan : EtOAc (2 : 1)',
    'Hexan : EtOAc (1 : 1)',
    'DCM : MeOH (95 : 5)',
    'DCM : MeOH (9 : 1)',
    'Petroleum Ether : Acetone (5 : 1)'
  ];

  // Open Add Modal
  const handleOpenAddModal = () => {
    const currentMins = Math.floor(currentTimerSeconds / 60);
    setNewMinute(currentMins > 0 ? String(currentMins) : '15');
    setNewObservation('');
    setPhoto254({ preview: null, file: null });
    setPhoto365({ preview: null, file: null });
    setPhotoReagent({ preview: null, file: null });
    setCustomStainName('');
    setSelectedStainName('Vanillin / H2SO4');
    setNewSpots([
      { label: 'Chất đầu (SM)', rf: '' },
      { label: 'Sản phẩm (P)', rf: '' }
    ]);
    setModalOpen(true);
  };

  // Helper to handle local image selection
  const handlePhotoSelect = (e, setPhotoState) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoState({ preview: reader.result, file });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = null;
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

  // Save TLC plate with 3 photos
  const handleSaveTLC = async () => {
    if (!newMinute) {
      alert('Vui lòng nhập thời điểm chấm TLC (phút)');
      return;
    }

    setUploading(true);

    let url254 = photo254.preview || '';
    if (photo254.file) {
      try {
        url254 = await uploadImage(photo254.file, 'tlc_uv254');
      } catch (err) {
        console.warn('Upload 254 error:', err);
      }
    }

    let url365 = photo365.preview || '';
    if (photo365.file) {
      try {
        url365 = await uploadImage(photo365.file, 'tlc_uv365');
      } catch (err) {
        console.warn('Upload 365 error:', err);
      }
    }

    let urlReagent = photoReagent.preview || '';
    if (photoReagent.file) {
      try {
        urlReagent = await uploadImage(photoReagent.file, 'tlc_reagent');
      } catch (err) {
        console.warn('Upload reagent error:', err);
      }
    }

    const minNum = parseInt(newMinute, 10) || 0;
    const hours = Math.floor(minNum / 60);
    const mins = minNum % 60;
    let formattedTime = `${minNum} phút`;
    if (hours > 0) {
      formattedTime = mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    const finalStain = selectedStainName === 'Khác (Tự nhập)'
      ? (customStainName.trim() || 'Thuốc thử hiện màu')
      : selectedStainName;

    const newPlate = {
      id: `tlc-${Date.now()}`,
      minute: minNum,
      timeFormatted: formattedTime,
      timestamp: new Date().toISOString(),
      eluent: newEluent,
      stainName: finalStain,
      // 3 separate photos:
      images: {
        uv254: url254 || null,
        uv365: url365 || null,
        reagent: urlReagent || null
      },
      // Backward compatibility fallback
      imageUrl: url254 || url365 || urlReagent || '',
      spots: newSpots.filter((s) => s.rf.trim() !== '' || s.label.trim() !== ''),
      observations: newObservation || 'Theo dõi tiến trình phản ứng'
    };

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

  // Open Lightbox
  const openLightbox = (plate, type) => {
    const images = {
      uv254: plate.images?.uv254 || plate.imageUrl || null,
      uv365: plate.images?.uv365 || null,
      reagent: plate.images?.reagent || null,
    };
    setLightboxData({
      images,
      activeType: type,
      plateId: plate.id,
      title: plate.timeFormatted || `${plate.minute} phút`,
      stainName: plate.stainName || 'Thuốc thử',
      eluent: plate.eluent
    });
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden card-print">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl shadow-md text-white flex-shrink-0">
            <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              3. Theo Dõi Sắc Ký Mỏng (TLC 3 Ảnh: UV 254 / 365 / Thuốc Thử)
              <span className="text-xs bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 px-2 py-0.5 rounded-full font-mono font-medium">
                {tlcList.length} bản mỏng
              </span>
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Chụp & so sánh 3 ảnh chuẩn Lab: UV 254 nm (tắt quang), UV 365 nm (phát quang) và 1 thuốc thử hiện màu
            </p>
          </div>
        </div>

        {/* Add TLC Button - Mobile Friendly Big Tap Target */}
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-4 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer no-print min-h-[48px] w-full sm:w-auto"
        >
          <Camera className="w-4 h-4" />
          <span>Thêm Bản Mỏng (3 Ảnh)</span>
        </button>
      </div>

      {/* Timeline Gallery */}
      <div className="p-4 sm:p-6">
        {tlcList && tlcList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tlcList.map((plate) => {
              const currentTab = activeTabPerPlate[plate.id] || 'uv254';
              const img254 = plate.images?.uv254 || plate.imageUrl;
              const img365 = plate.images?.uv365;
              const imgReagent = plate.images?.reagent;
              const stainLabel = plate.stainName || 'Thuốc thử';

              // Get active image to show in main preview
              let activeImg = null;
              if (currentTab === 'uv254') activeImg = img254;
              else if (currentTab === 'uv365') activeImg = img365;
              else if (currentTab === 'reagent') activeImg = imgReagent;

              // Fallback if active is null
              if (!activeImg) {
                activeImg = img254 || img365 || imgReagent;
              }

              return (
                <div
                  key={plate.id}
                  className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden hover:shadow-md transition-all flex flex-col justify-between"
                >
                  {/* Plate Header Bar */}
                  <div className="p-3 bg-white border-b border-slate-200 flex items-center justify-between">
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

                  {/* 3 Photos Tab Selector - Mobile First */}
                  <div className="bg-slate-900 p-1.5 flex items-center gap-1 border-b border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveTabPerPlate({ ...activeTabPerPlate, [plate.id]: 'uv254' })}
                      className={`flex-1 py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                        currentTab === 'uv254'
                          ? 'bg-emerald-500 text-slate-950 shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Sun className="w-3 h-3 text-emerald-300" />
                      <span>UV 254</span>
                      {img254 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTabPerPlate({ ...activeTabPerPlate, [plate.id]: 'uv365' })}
                      className={`flex-1 py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 ${
                        currentTab === 'uv365'
                          ? 'bg-violet-500 text-white shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Moon className="w-3 h-3 text-violet-300" />
                      <span>UV 365</span>
                      {img365 && <span className="w-1.5 h-1.5 rounded-full bg-violet-400"></span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTabPerPlate({ ...activeTabPerPlate, [plate.id]: 'reagent' })}
                      className={`flex-1 py-1.5 px-1 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1 truncate ${
                        currentTab === 'reagent'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Droplet className="w-3 h-3 text-amber-300 flex-shrink-0" />
                      <span className="truncate">Thuốc thử</span>
                      {imgReagent && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"></span>}
                    </button>
                  </div>

                  {/* Active Photo Main Display with Tap to Zoom */}
                  <div className="relative bg-slate-950 aspect-[4/3] flex items-center justify-center overflow-hidden group">
                    {activeImg ? (
                      <img
                        src={activeImg}
                        alt={`TLC ${currentTab} at ${plate.timeFormatted}`}
                        className="w-full h-full object-contain cursor-pointer transition-transform duration-300 active:scale-95"
                        onClick={() => openLightbox(plate, currentTab)}
                      />
                    ) : (
                      <div className="text-center p-6 text-slate-500">
                        <FileImage className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <span className="text-xs text-slate-400">
                          Chưa có ảnh {currentTab === 'uv254' ? 'UV 254 nm' : currentTab === 'uv365' ? 'UV 365 nm' : `Thuốc thử (${stainLabel})`}
                        </span>
                      </div>
                    )}

                    {/* Active Type Floating Badge */}
                    <div className="absolute top-2 left-2 pointer-events-none">
                      {currentTab === 'uv254' && (
                        <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/50 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
                          UV 254 nm (Tắt huỳnh quang)
                        </span>
                      )}
                      {currentTab === 'uv365' && (
                        <span className="bg-violet-950/80 text-violet-300 border border-violet-500/50 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
                          UV 365 nm (Phát huỳnh quang)
                        </span>
                      )}
                      {currentTab === 'reagent' && (
                        <span className="bg-amber-950/80 text-amber-300 border border-amber-500/50 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
                          {stainLabel}
                        </span>
                      )}
                    </div>

                    {/* Zoom button */}
                    {activeImg && (
                      <button
                        type="button"
                        onClick={() => openLightbox(plate, currentTab)}
                        className="absolute bottom-2 right-2 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl backdrop-blur-sm no-print min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="Phóng to ảnh"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* 3 Mini Thumbnails Strip */}
                  <div className="bg-slate-900 px-3 py-2 border-t border-slate-800 flex items-center gap-2">
                    {/* Slot 1: 254 */}
                    <button
                      type="button"
                      onClick={() => setActiveTabPerPlate({ ...activeTabPerPlate, [plate.id]: 'uv254' })}
                      className={`relative w-12 h-12 rounded-lg overflow-hidden border flex items-center justify-center transition-all ${
                        currentTab === 'uv254' ? 'ring-2 ring-emerald-400 border-transparent' : 'border-slate-700 opacity-60'
                      }`}
                    >
                      {img254 ? (
                        <img src={img254} alt="254" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[9px] text-slate-500">254</span>
                      )}
                    </button>

                    {/* Slot 2: 365 */}
                    <button
                      type="button"
                      onClick={() => setActiveTabPerPlate({ ...activeTabPerPlate, [plate.id]: 'uv365' })}
                      className={`relative w-12 h-12 rounded-lg overflow-hidden border flex items-center justify-center transition-all ${
                        currentTab === 'uv365' ? 'ring-2 ring-violet-400 border-transparent' : 'border-slate-700 opacity-60'
                      }`}
                    >
                      {img365 ? (
                        <img src={img365} alt="365" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[9px] text-slate-500">365</span>
                      )}
                    </button>

                    {/* Slot 3: Reagent */}
                    <button
                      type="button"
                      onClick={() => setActiveTabPerPlate({ ...activeTabPerPlate, [plate.id]: 'reagent' })}
                      className={`relative w-12 h-12 rounded-lg overflow-hidden border flex items-center justify-center transition-all ${
                        currentTab === 'reagent' ? 'ring-2 ring-amber-400 border-transparent' : 'border-slate-700 opacity-60'
                      }`}
                    >
                      {imgReagent ? (
                        <img src={imgReagent} alt="Stain" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[9px] text-slate-500">Thuốc</span>
                      )}
                    </button>

                    <div className="ml-auto text-[11px] text-slate-400 truncate">
                      Hệ: <span className="font-mono text-slate-200">{plate.eluent || '3:1'}</span>
                    </div>
                  </div>

                  {/* Details Card */}
                  <div className="p-4 space-y-3 bg-white">
                    {/* Rf Spots Table */}
                    {plate.spots && plate.spots.length > 0 && (
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 space-y-1">
                        {plate.spots.map((spot, spIdx) => (
                          <div key={spIdx} className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-medium truncate pr-2">{spot.label}:</span>
                            <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                              Rf = {spot.rf || '--'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Observations */}
                    <div className="text-xs text-slate-700 bg-amber-50/70 p-2.5 rounded-xl border border-amber-200/70">
                      <strong className="text-amber-900 block mb-0.5">Nhận xét:</strong>
                      {plate.observations || 'Tiến trình bình thường.'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            <Layers className="w-12 h-12 mx-auto text-indigo-300 mb-3" />
            <h4 className="text-sm font-bold text-slate-800 mb-1">Chưa có bản mỏng TLC nào</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Nhấn nút bên dưới để mở Camera điện thoại chụp 3 ảnh (UV 254, UV 365 và 1 thuốc thử hiện màu).
            </p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold px-5 py-3 rounded-2xl inline-flex items-center gap-2 shadow-md min-h-[48px]"
            >
              <Camera className="w-4 h-4" />
              <span>Chụp bản mỏng TLC 3 ảnh</span>
            </button>
          </div>
        )}
      </div>

      {/* ADD TLC MODAL (3 PHOTOS: UV 254, UV 365, REAGENT) */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-4 sm:p-6 shadow-2xl border border-slate-200 my-6 space-y-4">
            {/* Modal Title */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900">
                    Thêm Bản Mỏng TLC (3 Ảnh Chuẩn Lab)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Input 3 ảnh: Đèn UV 254, Đèn UV 365 và 1 Thuốc thử hiện màu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Time Point & Eluent */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Thời điểm (phút):
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    inputMode="numeric"
                    value={newMinute}
                    onChange={(e) => setNewMinute(e.target.value)}
                    placeholder="30"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold focus:outline-none min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setNewMinute(String(Math.floor(currentTimerSeconds / 60)))}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 p-2.5 rounded-xl border border-indigo-200 text-xs font-semibold whitespace-nowrap min-h-[44px]"
                    title="Lấy số phút từ đồng hồ đang chạy"
                  >
                    Sync ({Math.floor(currentTimerSeconds / 60)}m)
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Hệ dung môi (Eluent):
                </label>
                <input
                  type="text"
                  value={newEluent}
                  onChange={(e) => setNewEluent(e.target.value)}
                  placeholder="Hexan : EtOAc (3 : 1)"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none min-h-[44px]"
                />
              </div>
            </div>

            {/* 3 PHOTO INPUT SECTIONS (UV 254, UV 365, REAGENT) */}
            <div className="space-y-3 pt-1">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                3 Khung Ảnh Bản Mỏng Sắc Ký:
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* 1. UV 254 nm */}
                <div className="bg-slate-900 text-white p-3 rounded-2xl border border-emerald-900 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                      <Sun className="w-3.5 h-3.5" /> 1. UV 254 nm
                    </span>
                    {photo254.preview && (
                      <button
                        type="button"
                        onClick={() => setPhoto254({ preview: null, file: null })}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {photo254.preview ? (
                    <div className="relative aspect-[3/4] bg-black rounded-xl overflow-hidden mb-2">
                      <img src={photo254.preview} alt="UV 254" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-[3/4] bg-slate-800/80 rounded-xl border border-dashed border-slate-700 flex flex-col items-center justify-center p-2 text-center text-slate-400 text-xs mb-2">
                      <Sun className="w-6 h-6 text-emerald-400 opacity-60 mb-1" />
                      <span>Tắt huỳnh quang</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => cam254Ref.current?.click()}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2 px-1 rounded-xl text-xs flex items-center justify-center gap-1 min-h-[44px]"
                    >
                      <Camera className="w-3.5 h-3.5" /> Chụp
                    </button>
                    <button
                      type="button"
                      onClick={() => file254Ref.current?.click()}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2 px-1 rounded-xl text-xs flex items-center justify-center gap-1 min-h-[44px] border border-slate-700"
                    >
                      <Upload className="w-3.5 h-3.5" /> Tải
                    </button>
                  </div>

                  <input
                    type="file"
                    ref={cam254Ref}
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handlePhotoSelect(e, setPhoto254)}
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={file254Ref}
                    accept="image/*"
                    onChange={(e) => handlePhotoSelect(e, setPhoto254)}
                    className="hidden"
                  />
                </div>

                {/* 2. UV 365 nm */}
                <div className="bg-slate-900 text-white p-3 rounded-2xl border border-violet-900 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-violet-400 flex items-center gap-1">
                      <Moon className="w-3.5 h-3.5" /> 2. UV 365 nm
                    </span>
                    {photo365.preview && (
                      <button
                        type="button"
                        onClick={() => setPhoto365({ preview: null, file: null })}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {photo365.preview ? (
                    <div className="relative aspect-[3/4] bg-black rounded-xl overflow-hidden mb-2">
                      <img src={photo365.preview} alt="UV 365" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-[3/4] bg-slate-800/80 rounded-xl border border-dashed border-slate-700 flex flex-col items-center justify-center p-2 text-center text-slate-400 text-xs mb-2">
                      <Moon className="w-6 h-6 text-violet-400 opacity-60 mb-1" />
                      <span>Phát huỳnh quang</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => cam365Ref.current?.click()}
                      className="bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2 px-1 rounded-xl text-xs flex items-center justify-center gap-1 min-h-[44px]"
                    >
                      <Camera className="w-3.5 h-3.5" /> Chụp
                    </button>
                    <button
                      type="button"
                      onClick={() => file365Ref.current?.click()}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2 px-1 rounded-xl text-xs flex items-center justify-center gap-1 min-h-[44px] border border-slate-700"
                    >
                      <Upload className="w-3.5 h-3.5" /> Tải
                    </button>
                  </div>

                  <input
                    type="file"
                    ref={cam365Ref}
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handlePhotoSelect(e, setPhoto365)}
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={file365Ref}
                    accept="image/*"
                    onChange={(e) => handlePhotoSelect(e, setPhoto365)}
                    className="hidden"
                  />
                </div>

                {/* 3. Thuốc thử hiện màu */}
                <div className="bg-slate-900 text-white p-3 rounded-2xl border border-amber-900 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                      <Droplet className="w-3.5 h-3.5" /> 3. Thuốc Thử
                    </span>
                    {photoReagent.preview && (
                      <button
                        type="button"
                        onClick={() => setPhotoReagent({ preview: null, file: null })}
                        className="text-slate-400 hover:text-rose-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {photoReagent.preview ? (
                    <div className="relative aspect-[3/4] bg-black rounded-xl overflow-hidden mb-2">
                      <img src={photoReagent.preview} alt="Thuốc thử" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="aspect-[3/4] bg-slate-800/80 rounded-xl border border-dashed border-slate-700 flex flex-col items-center justify-center p-2 text-center text-slate-400 text-xs mb-2">
                      <Droplet className="w-6 h-6 text-amber-400 opacity-60 mb-1" />
                      <span>Hiện màu hóa học</span>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => camReagentRef.current?.click()}
                      className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold py-2 px-1 rounded-xl text-xs flex items-center justify-center gap-1 min-h-[44px]"
                    >
                      <Camera className="w-3.5 h-3.5" /> Chụp
                    </button>
                    <button
                      type="button"
                      onClick={() => fileReagentRef.current?.click()}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2 px-1 rounded-xl text-xs flex items-center justify-center gap-1 min-h-[44px] border border-slate-700"
                    >
                      <Upload className="w-3.5 h-3.5" /> Tải
                    </button>
                  </div>

                  <input
                    type="file"
                    ref={camReagentRef}
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handlePhotoSelect(e, setPhotoReagent)}
                    className="hidden"
                  />
                  <input
                    type="file"
                    ref={fileReagentRef}
                    accept="image/*"
                    onChange={(e) => handlePhotoSelect(e, setPhotoReagent)}
                    className="hidden"
                  />
                </div>
              </div>

              {/* Tên thuốc thử hiện màu đã dùng */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Tên thuốc thử hiện màu (cho ảnh 3):
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COMMON_STAINS.map((stain) => (
                    <button
                      key={stain}
                      type="button"
                      onClick={() => setSelectedStainName(stain)}
                      className={`text-xs px-2.5 py-1.5 rounded-xl font-medium transition-all ${
                        selectedStainName === stain
                          ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                          : 'bg-white text-slate-700 border border-slate-300'
                      }`}
                    >
                      {stain}
                    </button>
                  ))}
                </div>

                {selectedStainName === 'Khác (Tự nhập)' && (
                  <input
                    type="text"
                    value={customStainName}
                    onChange={(e) => setCustomStainName(e.target.value)}
                    placeholder="Nhập tên thuốc thử (VD: DNP, Ceric Ammonium Molybdate...)"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none min-h-[44px]"
                  />
                )}
              </div>
            </div>

            {/* Rf Spots Table */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Hệ số lưu giữ Rf:
                </label>
                <button
                  type="button"
                  onClick={addSpotRow}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
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
                      placeholder="Tên vết (VD: SM, P, Vết phụ)"
                      className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm min-h-[44px]"
                    />
                    <div className="flex items-center gap-1 w-28">
                      <span className="text-xs font-mono text-slate-500">Rf:</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={spot.rf}
                        onChange={(e) => updateSpotRow(idx, 'rf', e.target.value)}
                        placeholder="0.45"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-xs sm:text-sm font-mono font-bold text-indigo-700 text-center min-h-[44px]"
                      />
                    </div>
                    {newSpots.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSpotRow(idx)}
                        className="p-2 text-slate-400 hover:text-rose-600 min-h-[44px]"
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
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Nhận xét & Đánh giá phản ứng:
              </label>
              <textarea
                rows="2"
                value={newObservation}
                onChange={(e) => setNewObservation(e.target.value)}
                placeholder="VD: UV 254 tắt quang vết Rf 0.22, UV 365 phát huỳnh quang xanh tím, Vanillin hiện màu tím sậm..."
                className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 rounded-xl p-3 text-xs sm:text-sm focus:outline-none min-h-[48px]"
              ></textarea>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-3 rounded-2xl text-xs sm:text-sm text-slate-600 hover:bg-slate-100 font-semibold min-h-[48px]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveTLC}
                disabled={uploading}
                className="px-6 py-3 rounded-2xl text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md min-h-[48px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {uploading ? 'Đang lưu ảnh...' : 'Lưu Bản Mỏng (3 Ảnh)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL WITH 3-TAB SWITCHER */}
      {lightboxData && (
        <div
          className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col items-center justify-between p-3 sm:p-5 animate-in fade-in"
        >
          {/* Lightbox Header Bar */}
          <div className="w-full max-w-4xl flex items-center justify-between text-white pb-3 border-b border-slate-800">
            <div>
              <h4 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <span>Bản mỏng {lightboxData.title}</span>
                <span className="text-xs text-slate-400 font-mono">({lightboxData.eluent})</span>
              </h4>
            </div>

            <button
              type="button"
              onClick={() => setLightboxData(null)}
              className="bg-slate-800 hover:bg-rose-600 text-white p-2.5 rounded-full"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Lightbox Image Container */}
          <div className="relative flex-1 w-full max-w-4xl flex items-center justify-center p-2 overflow-hidden">
            {lightboxData.images[lightboxData.activeType] ? (
              <img
                src={lightboxData.images[lightboxData.activeType]}
                alt={`Zoom ${lightboxData.activeType}`}
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
              />
            ) : (
              <div className="text-center text-slate-500">
                <FileImage className="w-16 h-16 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Chưa có ảnh ở chế độ {lightboxData.activeType}</p>
              </div>
            )}
          </div>

          {/* Lightbox 3-Wavelength Switcher (Bottom Bar) */}
          <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 p-2 rounded-2xl backdrop-blur-sm flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLightboxData({ ...lightboxData, activeType: 'uv254' })}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                lightboxData.activeType === 'uv254'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>UV 254 nm</span>
            </button>

            <button
              type="button"
              onClick={() => setLightboxData({ ...lightboxData, activeType: 'uv365' })}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                lightboxData.activeType === 'uv365'
                  ? 'bg-violet-500 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>UV 365 nm</span>
            </button>

            <button
              type="button"
              onClick={() => setLightboxData({ ...lightboxData, activeType: 'reagent' })}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 truncate ${
                lightboxData.activeType === 'reagent'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Droplet className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{lightboxData.stainName || 'Thuốc thử'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
