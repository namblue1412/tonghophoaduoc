import React, { useState, useRef, useEffect } from 'react';
import {
  FileImage,
  Camera,
  Upload,
  Plus,
  Trash2,
  Maximize2,
  Clock,
  Layers,
  CheckCircle2,
  X,
  Sun,
  Moon,
  Droplet,
  ChevronRight,
  Pencil,
  Download
} from 'lucide-react';
import { useExperiment } from '../context/ExperimentContext';
import { parseDecimal } from './StoichiometryTable';

export const TLCTracker = ({ tlcList = [], onChange, currentTimerSeconds = 0 }) => {
  const { uploadImage } = useExperiment();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlateId, setEditingPlateId] = useState(null);
  
  // Lightbox state
  const [lightboxData, setLightboxData] = useState(null);

  const [uploading, setUploading] = useState(false);

  // Form state for adding/editing a TLC plate
  const [newMinute, setNewMinute] = useState('');
  const [newEluent, setNewEluent] = useState('Hexan : EtOAc (3 : 1)');
  const [selectedStainName, setSelectedStainName] = useState('Vanillin / H2SO4');
  const [customStainName, setCustomStainName] = useState('');
  const [newObservation, setNewObservation] = useState('');
  const [solventFrontCm, setSolventFrontCm] = useState('5.0');
  const [newSpots, setNewSpots] = useState([
    { label: 'Chất tham gia', distCm: '', rf: '' },
    { label: 'Sản phẩm', distCm: '', rf: '' }
  ]);

  // Active slot inside modal: 'uv254' | 'uv365' | 'reagent'
  const [activePhotoSlot, setActivePhotoSlot] = useState('uv254');

  // 3 Photos state: { preview, file }
  const [photo254, setPhoto254] = useState({ preview: null, file: null });
  const [photo365, setPhoto365] = useState({ preview: null, file: null });
  const [photoReagent, setPhotoReagent] = useState({ preview: null, file: null });

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
    setEditingPlateId(null);
    const currentMins = Math.floor(currentTimerSeconds / 60);
    setNewMinute(currentMins > 0 ? String(currentMins) : '15');
    setNewObservation('');
    setPhoto254({ preview: null, file: null });
    setPhoto365({ preview: null, file: null });
    setPhotoReagent({ preview: null, file: null });
    setActivePhotoSlot('uv254');
    setCustomStainName('');
    setSelectedStainName('Vanillin / H2SO4');
    setSolventFrontCm('5.0');
    setNewSpots([
      { label: 'Chất tham gia', distCm: '', rf: '' },
      { label: 'Sản phẩm', distCm: '', rf: '' }
    ]);
    setModalOpen(true);
  };

  // Open Edit Modal for an existing TLC plate
  const handleOpenEditModal = (plate) => {
    setEditingPlateId(plate.id);
    setNewMinute(String(plate.minute ?? ''));
    setNewEluent(plate.eluent || 'Hexan : EtOAc (3 : 1)');
    const isStandard = COMMON_STAINS.includes(plate.stainName);
    if (isStandard) {
      setSelectedStainName(plate.stainName);
      setCustomStainName('');
    } else {
      setSelectedStainName('Khác (Tự nhập)');
      setCustomStainName(plate.stainName || '');
    }
    setNewObservation(plate.observations || '');
    setSolventFrontCm(plate.solventFrontCm || '5.0');
    setNewSpots(
      plate.spots?.length
        ? plate.spots.map((s) => ({
            label: s.label || '',
            distCm: String(s.distCm ?? ''),
            rf: String(s.rf ?? '')
          }))
        : [
            { label: 'Chất tham gia', distCm: '', rf: '' },
            { label: 'Sản phẩm', distCm: '', rf: '' }
          ]
    );
    setPhoto254({ preview: plate.images?.uv254 || plate.imageUrl || null, file: null });
    setPhoto365({ preview: plate.images?.uv365 || null, file: null });
    setPhotoReagent({ preview: plate.images?.reagent || null, file: null });
    setActivePhotoSlot('uv254');
    setModalOpen(true);
  };

  // Helper to handle local image selection via native label input
  const handlePhotoSelect = (e, setPhotoState) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoState({ preview: reader.result, file });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Add/remove custom Rf spot row
  const addSpotRow = () => {
    setNewSpots([...newSpots, { label: `Vết phụ ${newSpots.length}`, distCm: '', rf: '' }]);
  };

  const removeSpotRow = (idx) => {
    setNewSpots(newSpots.filter((_, i) => i !== idx));
  };

  const handleSolventFrontChange = (rawVal) => {
    const cleaned = rawVal.replace(/[^0-9.,]/g, '');
    setSolventFrontCm(cleaned);
    const frontNum = parseFloat(cleaned.replace(',', '.')) || 0;
    if (frontNum > 0) {
      setNewSpots((prev) =>
        prev.map((s) => {
          const dNum = parseFloat(String(s.distCm || '').replace(',', '.')) || 0;
          if (dNum > 0) {
            return { ...s, rf: (dNum / frontNum).toFixed(2) };
          }
          return s;
        })
      );
    }
  };

  const updateSpotRow = (idx, field, rawVal) => {
    const updated = [...newSpots];
    if (field === 'distCm') {
      const cleanedDist = typeof rawVal === 'string' ? rawVal.replace(/[^0-9.,]/g, '') : rawVal;
      updated[idx].distCm = cleanedDist;
      const distNum = parseFloat(String(cleanedDist).replace(',', '.')) || 0;
      const frontNum = parseFloat(String(solventFrontCm).replace(',', '.')) || 0;
      if (distNum > 0 && frontNum > 0) {
        updated[idx].rf = (distNum / frontNum).toFixed(2);
      }
    } else if (field === 'rf') {
      updated[idx].rf = typeof rawVal === 'string' ? rawVal.replace(/[^0-9.,-]/g, '') : rawVal;
    } else {
      updated[idx][field] = rawVal;
    }
    setNewSpots(updated);
  };

  // Save or update TLC plate with 3 photos
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

    const platePayload = {
      minute: minNum,
      timeFormatted: formattedTime,
      timestamp: new Date().toISOString(),
      eluent: newEluent,
      stainName: finalStain,
      solventFrontCm: solventFrontCm || '',
      images: {
        uv254: url254 || null,
        uv365: url365 || null,
        reagent: urlReagent || null
      },
      imageUrl: url254 || url365 || urlReagent || '',
      spots: newSpots.filter((s) => s.rf.trim() !== '' || s.label.trim() !== ''),
      observations: newObservation || 'Theo dõi tiến trình phản ứng'
    };

    let updatedList;
    if (editingPlateId) {
      updatedList = tlcList.map((p) =>
        p.id === editingPlateId ? { ...p, ...platePayload } : p
      );
    } else {
      const newPlate = {
        id: `tlc-${Date.now()}`,
        ...platePayload
      };
      updatedList = [...tlcList, newPlate];
    }

    updatedList.sort((a, b) => (a.minute || 0) - (b.minute || 0));
    onChange(updatedList);

    setUploading(false);
    setModalOpen(false);
    setEditingPlateId(null);
  };

  // Keyboard shortcut handlers: Esc to close, Enter to save
  const handleSaveTLCRef = useRef();
  handleSaveTLCRef.current = handleSaveTLC;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (lightboxData) {
          setLightboxData(null);
          return;
        }
        if (modalOpen) {
          setModalOpen(false);
          return;
        }
      }

      if (e.key === 'Enter') {
        if (e.target && e.target.tagName === 'TEXTAREA') return;
        if (modalOpen && !uploading) {
          e.preventDefault();
          handleSaveTLCRef.current?.();
        }
      }
    };

    if (modalOpen || lightboxData) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [modalOpen, lightboxData, uploading]);

  // Delete TLC plate
  const handleDeletePlate = (id) => {
    if (window.confirm('Xóa bản mỏng TLC này?')) {
      onChange(tlcList.filter((p) => p.id !== id));
    }
  };

  // Auto-download all uploaded photos of a TLC plate
  const handleDownloadPlateImages = async (plate) => {
    const imagesToDownload = [];
    if (plate.images?.uv254) {
      imagesToDownload.push({ url: plate.images.uv254, name: `TLC_${plate.minute}m_UV254.jpg` });
    } else if (plate.imageUrl) {
      imagesToDownload.push({ url: plate.imageUrl, name: `TLC_${plate.minute}m_UV254.jpg` });
    }
    if (plate.images?.uv365) {
      imagesToDownload.push({ url: plate.images.uv365, name: `TLC_${plate.minute}m_UV365.jpg` });
    }
    if (plate.images?.reagent) {
      const stainSafe = (plate.stainName || 'Reagent').replace(/[^a-zA-Z0-9]/g, '_');
      imagesToDownload.push({ url: plate.images.reagent, name: `TLC_${plate.minute}m_${stainSafe}.jpg` });
    }

    if (imagesToDownload.length === 0) {
      alert('Bản mỏng này chưa có ảnh chụp nào để tải về!');
      return;
    }

    for (let i = 0; i < imagesToDownload.length; i++) {
      const item = imagesToDownload[i];
      try {
        if (item.url.startsWith('data:')) {
          const link = document.createElement('a');
          link.href = item.url;
          link.download = item.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          try {
            const resp = await fetch(item.url, { mode: 'cors' });
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = item.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
          } catch {
            const link = document.createElement('a');
            link.href = item.url;
            link.download = item.name;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
        if (i < imagesToDownload.length - 1) {
          await new Promise((r) => setTimeout(r, 350));
        }
      } catch (err) {
        console.error('Lỗi khi tải ảnh:', err);
      }
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
      <div className="bg-slate-900 border-b border-slate-800 text-white p-3.5 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="p-2 sm:p-2.5 bg-sky-600 rounded-2xl shadow-md text-white flex-shrink-0 mt-0.5 sm:mt-0">
            <Layers className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h2 className="text-sm sm:text-lg font-bold text-white leading-snug">
                3. Sắc Ký Lớp Mỏng
              </h2>
              <span className="text-[11px] sm:text-xs bg-sky-500/20 text-sky-300 border border-sky-400/40 px-2 py-0.5 rounded-full font-mono tabular-nums font-semibold whitespace-nowrap flex-shrink-0">
                {tlcList.length} bản mỏng
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 line-clamp-1 sm:line-clamp-none">
              Theo dõi tiến trình phản ứng (UV 254 nm, UV 365 nm, Thuốc thử)
            </p>
          </div>
        </div>

        {/* Add TLC Button */}
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs sm:text-sm font-bold px-4 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer no-print min-h-[48px] w-full sm:w-auto"
        >
          <Camera className="w-4 h-4" />
          <span>+ Thêm Bản Mỏng TLC</span>
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

              let activeImg = null;
              if (currentTab === 'uv254') activeImg = img254;
              else if (currentTab === 'uv365') activeImg = img365;
              else if (currentTab === 'reagent') activeImg = imgReagent;

              if (!activeImg) {
                activeImg = img254 || img365 || imgReagent;
              }

              return (
                <div
                  key={plate.id}
                  className="bg-slate-50 rounded-3xl border border-slate-200 overflow-hidden hover:shadow-md transition-all flex flex-col justify-between"
                >
                  {/* Plate Header Bar */}
                  <div className="p-3.5 bg-white border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-xl font-mono flex items-center gap-1 shadow-sm">
                        <Clock className="w-3.5 h-3.5" /> {plate.timeFormatted || `${plate.minute}m`}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {plate.timestamp ? new Date(plate.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 no-print">
                      <button
                        type="button"
                        onClick={() => handleDownloadPlateImages(plate)}
                        className="text-slate-500 hover:text-indigo-600 p-2 rounded-xl hover:bg-indigo-50 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                        title="Tải tất cả ảnh sắc ký của bản mỏng này"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(plate)}
                        className="text-slate-500 hover:text-teal-700 p-2 rounded-xl hover:bg-teal-50 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                        title="Chỉnh sửa thông tin bản mỏng"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePlate(plate.id)}
                        className="text-slate-500 hover:text-rose-700 p-2 rounded-xl hover:bg-rose-50 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                        title="Xóa bản mỏng này"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 3 Photos Tab Selector */}
                  <div className="bg-slate-900 p-1.5 flex items-center gap-1 border-b border-slate-800">
                    <button
                      type="button"
                      onClick={() => setActiveTabPerPlate({ ...activeTabPerPlate, [plate.id]: 'uv254' })}
                      className={`flex-1 py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 min-h-[40px] ${
                        currentTab === 'uv254'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Sun className="w-3.5 h-3.5" />
                      <span>UV 254</span>
                      {img254 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTabPerPlate({ ...activeTabPerPlate, [plate.id]: 'uv365' })}
                      className={`flex-1 py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 min-h-[40px] ${
                        currentTab === 'uv365'
                          ? 'bg-violet-600 text-white shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Moon className="w-3.5 h-3.5" />
                      <span>UV 365</span>
                      {img365 && <span className="w-1.5 h-1.5 rounded-full bg-violet-300"></span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTabPerPlate({ ...activeTabPerPlate, [plate.id]: 'reagent' })}
                      className={`flex-1 py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 min-h-[40px] truncate ${
                        currentTab === 'reagent'
                          ? 'bg-amber-500 text-amber-950 shadow-xs'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <Droplet className="w-3.5 h-3.5 flex-shrink-0" />
                      <span className="truncate">Thuốc thử</span>
                      {imgReagent && <span className="w-1.5 h-1.5 rounded-full bg-amber-300 flex-shrink-0"></span>}
                    </button>
                  </div>

                  {/* Active Photo Main Display with Tap to Zoom */}
                  <div className="relative bg-slate-950 aspect-[4/3] flex items-center justify-center overflow-hidden">
                    {activeImg ? (
                      <img
                        src={activeImg}
                        alt={`TLC ${currentTab}`}
                        className="w-full h-full object-contain cursor-pointer active:scale-95 transition-transform"
                        onClick={() => openLightbox(plate, currentTab)}
                      />
                    ) : (
                      <div className="text-center p-6 text-slate-500">
                        <FileImage className="w-12 h-12 mx-auto mb-2 opacity-40" />
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

                    {/* Floating Zoom & Download Actions */}
                    {activeImg && (
                      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 no-print">
                        <button
                          type="button"
                          onClick={() => handleDownloadPlateImages(plate)}
                          className="p-2.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl backdrop-blur-sm min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-colors"
                          title="Tải tất cả ảnh sắc ký của bản mỏng này"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openLightbox(plate, currentTab)}
                          className="p-2.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl backdrop-blur-sm min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer transition-colors"
                          title="Phóng to ảnh"
                        >
                          <Maximize2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 3 Mini Thumbnails Strip */}
                  <div className="bg-slate-900 px-3 py-2 border-t border-slate-800 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setActiveTabPerPlate({ ...activeTabPerPlate, [plate.id]: 'uv254' })}
                      className={`relative w-12 h-12 rounded-xl overflow-hidden border flex items-center justify-center transition-all ${
                        currentTab === 'uv254' ? 'ring-2 ring-emerald-400 border-transparent' : 'border-slate-700 opacity-60'
                      }`}
                    >
                      {img254 ? (
                        <img src={img254} alt="254" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500">254</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTabPerPlate({ ...activeTabPerPlate, [plate.id]: 'uv365' })}
                      className={`relative w-12 h-12 rounded-xl overflow-hidden border flex items-center justify-center transition-all ${
                        currentTab === 'uv365' ? 'ring-2 ring-violet-400 border-transparent' : 'border-slate-700 opacity-60'
                      }`}
                    >
                      {img365 ? (
                        <img src={img365} alt="365" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500">365</span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTabPerPlate({ ...activeTabPerPlate, [plate.id]: 'reagent' })}
                      className={`relative w-12 h-12 rounded-xl overflow-hidden border flex items-center justify-center transition-all ${
                        currentTab === 'reagent' ? 'ring-2 ring-amber-400 border-transparent' : 'border-slate-700 opacity-60'
                      }`}
                    >
                      {imgReagent ? (
                        <img src={imgReagent} alt="Thuốc thử" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] font-bold text-slate-500">Thuốc</span>
                      )}
                    </button>

                    <div className="ml-auto text-xs text-slate-400 truncate">
                      Hệ: <span className="font-mono text-slate-200 font-bold">{plate.eluent || '3:1'}</span>
                    </div>
                  </div>

                  {/* Details Card */}
                  <div className="p-4 space-y-3 bg-white">
                    {/* Rf Spots Table */}
                    {plate.spots && plate.spots.length > 0 && (
                      <div className="bg-slate-50 rounded-2xl p-2.5 border border-slate-200 space-y-1">
                        {plate.spots.map((spot, spIdx) => (
                          <div key={spIdx} className="flex items-center justify-between text-xs">
                            <span className="text-slate-600 font-medium truncate pr-2">{spot.label}:</span>
                            <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
                              Rf = {spot.rf || '--'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Observations */}
                    <div className="text-xs text-slate-700 bg-amber-50/70 p-3 rounded-2xl border border-amber-200/70">
                      <strong className="text-amber-900 block mb-0.5">Nhận xét:</strong>
                      {plate.observations || 'Tiến trình bình thường.'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            <Layers className="w-14 h-14 mx-auto text-indigo-300 mb-3" />
            <h4 className="text-base font-bold text-slate-800 mb-1">Chưa có bản mỏng TLC nào</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mb-4">
              Nhấn nút bên dưới để mở Camera điện thoại chụp 3 ảnh (UV 254, UV 365 và 1 thuốc thử hiện màu).
            </p>
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold px-6 py-3 rounded-2xl inline-flex items-center gap-2 shadow-md min-h-[48px]"
            >
              <Camera className="w-4 h-4" />
              <span>Chụp bản mỏng TLC 3 ảnh</span>
            </button>
          </div>
        )}
      </div>

      {/* ADD TLC MODAL - FULL SCREEN MOBILE SHEET DIALOG WITH SMOOTH TOUCH SCROLL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingPlateId ? 'Chỉnh Sửa Bản Mỏng TLC' : 'Thêm Bản Mỏng TLC'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Thời điểm, hệ dung môi, vết Rf & 3 ảnh
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                title="Đóng (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 touch-pan-y">
              {/* Time Point & Eluent */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Thời điểm (phút):
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={newMinute}
                      onChange={(e) => setNewMinute(e.target.value.replace(/[^0-9.,-]/g, ''))}
                      placeholder="30"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold focus:outline-none min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={() => setNewMinute(String(Math.floor(currentTimerSeconds / 60)))}
                      className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-xl border border-indigo-200 text-xs font-bold whitespace-nowrap min-h-[44px] cursor-pointer"
                      title="Lấy số phút từ đồng hồ đang chạy"
                    >
                      Đồng bộ ({Math.floor(currentTimerSeconds / 60)}p)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Hệ dung môi:
                  </label>
                  <input
                    type="text"
                    value={newEluent}
                    onChange={(e) => setNewEluent(e.target.value)}
                    placeholder="Hexan : EtOAc (3 : 1)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono focus:outline-none min-h-[44px]"
                  />
                  <div className="flex items-center gap-1 overflow-x-auto pt-1.5 pb-0.5 no-scrollbar">
                    {COMMON_ELUENTS.map((el) => (
                      <button
                        key={el}
                        type="button"
                        onClick={() => setNewEluent(el)}
                        className="text-[10px] bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 border border-slate-200 px-2 py-0.5 rounded-lg whitespace-nowrap flex-shrink-0 cursor-pointer"
                      >
                        {el}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3 Photo Slots Switcher (Tabs) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Chọn Ảnh Cần Nạp / Chụp:
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setActivePhotoSlot('uv254')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 min-h-[42px] ${
                      activePhotoSlot === 'uv254'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>1. UV 254</span>
                    {photo254.preview && <span className="w-2 h-2 rounded-full bg-emerald-300"></span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePhotoSlot('uv365')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 min-h-[42px] ${
                      activePhotoSlot === 'uv365'
                        ? 'bg-violet-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>2. UV 365</span>
                    {photo365.preview && <span className="w-2 h-2 rounded-full bg-violet-300"></span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivePhotoSlot('reagent')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 min-h-[42px] truncate ${
                      activePhotoSlot === 'reagent'
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <Droplet className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">3. Thuốc Thử</span>
                    {photoReagent.preview && <span className="w-2 h-2 rounded-full bg-amber-300 flex-shrink-0"></span>}
                  </button>
                </div>

                {/* ACTIVE PHOTO SLOT INTERACTIVE CARD */}
                <div className="bg-slate-900 rounded-3xl p-4 text-white border border-slate-800 space-y-3">
                  {/* Slot Title Banner */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold flex items-center gap-2">
                      {activePhotoSlot === 'uv254' && (
                        <>
                          <Sun className="w-4 h-4 text-emerald-400" />
                          <span className="text-emerald-400">1. Đèn UV 254 nm</span>
                        </>
                      )}
                      {activePhotoSlot === 'uv365' && (
                        <>
                          <Moon className="w-4 h-4 text-violet-400" />
                          <span className="text-violet-400">2. Đèn UV 365 nm</span>
                        </>
                      )}
                      {activePhotoSlot === 'reagent' && (
                        <>
                          <Droplet className="w-4 h-4 text-amber-400" />
                          <span className="text-amber-400">3. Hiện màu bằng Thuốc Thử</span>
                        </>
                      )}
                    </span>

                    {/* Clear Button if preview exists */}
                    {((activePhotoSlot === 'uv254' && photo254.preview) ||
                      (activePhotoSlot === 'uv365' && photo365.preview) ||
                      (activePhotoSlot === 'reagent' && photoReagent.preview)) && (
                      <button
                        type="button"
                        onClick={() => {
                          if (activePhotoSlot === 'uv254') setPhoto254({ preview: null, file: null });
                          if (activePhotoSlot === 'uv365') setPhoto365({ preview: null, file: null });
                          if (activePhotoSlot === 'reagent') setPhotoReagent({ preview: null, file: null });
                        }}
                        className="text-xs text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Xóa ảnh
                      </button>
                    )}
                  </div>

                  {/* Photo Preview Box */}
                  <div className="relative aspect-[4/3] bg-black/80 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                    {activePhotoSlot === 'uv254' && photo254.preview && (
                      <img src={photo254.preview} alt="UV 254" className="w-full h-full object-contain" />
                    )}
                    {activePhotoSlot === 'uv365' && photo365.preview && (
                      <img src={photo365.preview} alt="UV 365" className="w-full h-full object-contain" />
                    )}
                    {activePhotoSlot === 'reagent' && photoReagent.preview && (
                      <img src={photoReagent.preview} alt="Thuốc thử" className="w-full h-full object-contain" />
                    )}

                    {/* Placeholder when no photo taken */}
                    {!((activePhotoSlot === 'uv254' && photo254.preview) ||
                      (activePhotoSlot === 'uv365' && photo365.preview) ||
                      (activePhotoSlot === 'reagent' && photoReagent.preview)) && (
                      <div className="text-center p-6 text-slate-400">
                        <Camera className="w-10 h-10 mx-auto mb-2 opacity-50 text-indigo-400" />
                        <p className="text-xs font-medium">Chưa có ảnh cho vị trí này</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">Nhấn một trong 2 nút bên dưới để chụp hoặc tải</p>
                      </div>
                    )}
                  </div>

                  {/* NATIVE LABEL CAMERA & GALLERY BUTTONS (100% RELIABLE ON MOBILE) */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    {/* CAMERA BUTTON: Native Label with capture="environment" */}
                    <label className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-3.5 px-3 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md select-none touch-manipulation min-h-[50px]">
                      <Camera className="w-5 h-5 flex-shrink-0" />
                      <span>Mở Camera Chụp</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          if (activePhotoSlot === 'uv254') handlePhotoSelect(e, setPhoto254);
                          else if (activePhotoSlot === 'uv365') handlePhotoSelect(e, setPhoto365);
                          else handlePhotoSelect(e, setPhotoReagent);
                        }}
                        className="sr-only"
                      />
                    </label>

                    {/* GALLERY BUTTON: Native Label without capture */}
                    <label className="bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 font-bold py-3.5 px-3 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm select-none touch-manipulation min-h-[50px] border border-slate-700">
                      <Upload className="w-5 h-5 flex-shrink-0" />
                      <span>Chọn Từ Thư Viện</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (activePhotoSlot === 'uv254') handlePhotoSelect(e, setPhoto254);
                          else if (activePhotoSlot === 'uv365') handlePhotoSelect(e, setPhoto365);
                          else handlePhotoSelect(e, setPhotoReagent);
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>

                {/* Staining Reagent Picker (when reagent slot is selected or always visible) */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    Tên thuốc thử hiện màu đã dùng:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_STAINS.map((stain) => (
                      <button
                        key={stain}
                        type="button"
                        onClick={() => setSelectedStainName(stain)}
                        className={`text-xs px-2.5 py-1.5 rounded-xl font-medium transition-all ${
                          selectedStainName === stain
                            ? 'bg-amber-500 text-amber-950 font-bold shadow-xs'
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
                      placeholder="Nhập tên thuốc thử..."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none min-h-[44px]"
                    />
                  )}
                </div>
              </div>

              {/* Rf Spots Table with Automatic Ruler Calculator (Rf = d_vet / d_dm) */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-800 block">
                      Hệ số lưu giữ Rf (Nhập trực tiếp hoặc đo thước cm):
                    </label>
                    <span className="text-[11px] text-slate-500">
                      Nếu nhập d(vết) và tuyến dung môi d(dm), phần mềm tự chia Rf = d(vết)/d(dm)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-xl border border-slate-300">
                      <span className="text-[11px] font-semibold text-slate-600">d(dm):</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={solventFrontCm}
                        onChange={(e) => handleSolventFrontChange(e.target.value)}
                        placeholder="5.0"
                        className="w-12 text-center font-mono font-bold text-xs text-teal-800 focus:outline-none"
                      />
                      <span className="text-[11px] font-mono text-slate-400">cm</span>
                    </div>
                    <button
                      type="button"
                      onClick={addSpotRow}
                      className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1.5 rounded-xl font-bold flex items-center gap-1 min-h-[34px] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" /> Thêm vết
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {newSpots.map((spot, idx) => (
                    <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-white p-2 rounded-xl border border-slate-200">
                      <input
                        type="text"
                        value={spot.label}
                        onChange={(e) => updateSpotRow(idx, 'label', e.target.value)}
                        placeholder="Tên vết (VD: Chất tham gia, Sản phẩm...)"
                        className="flex-1 min-w-[130px] bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-medium focus:outline-none min-h-[38px]"
                      />
                      <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-mono text-slate-500">d(vết):</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={spot.distCm || ''}
                            onChange={(e) => updateSpotRow(idx, 'distCm', e.target.value)}
                            placeholder="cm"
                            title="Khoảng cách vết chạy (cm) để tự chia Rf"
                            className="w-14 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-mono text-center focus:outline-none min-h-[38px]"
                          />
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[11px] font-mono font-bold text-indigo-700">Rf:</span>
                          <input
                            type="text"
                            inputMode="decimal"
                            value={spot.rf}
                            onChange={(e) => updateSpotRow(idx, 'rf', e.target.value)}
                            placeholder="0.45"
                            className="w-16 bg-indigo-50/60 border border-indigo-200 rounded-lg px-2 py-1.5 text-xs sm:text-sm font-mono font-bold text-indigo-800 text-center focus:outline-none min-h-[38px]"
                          />
                        </div>
                        {newSpots.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeSpotRow(idx)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 min-h-[38px] cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Observation Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nhận xét phản ứng:
                </label>
                <textarea
                  rows="2"
                  value={newObservation}
                  onChange={(e) => setNewObservation(e.target.value)}
                  placeholder="VD: Hết sạch chất tham gia, xuất hiện vết sản phẩm chính Rf 0.22..."
                  className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 rounded-xl p-3 text-xs sm:text-sm focus:outline-none min-h-[48px]"
                ></textarea>
              </div>
            </div>

            {/* Modal Fixed Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-white flex-shrink-0">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-3 rounded-2xl text-xs sm:text-sm text-slate-600 hover:bg-slate-100 font-semibold min-h-[48px] cursor-pointer"
              >
                Hủy (Esc)
              </button>
              <button
                type="button"
                onClick={handleSaveTLC}
                disabled={uploading}
                className="px-6 py-3 rounded-2xl text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md min-h-[48px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {uploading ? 'Đang lưu...' : (editingPlateId ? 'Cập Nhật (Enter)' : 'Lưu Bản Mỏng (Enter)')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LIGHTBOX MODAL WITH 3-WAVELENGTH SWITCHER */}
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

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const plate = tlcList.find((p) => p.id === lightboxData.plateId);
                  if (plate) handleDownloadPlateImages(plate);
                }}
                className="bg-slate-800 hover:bg-indigo-600 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Tải tất cả ảnh sắc ký của bản mỏng này"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Tải tất cả ảnh</span>
              </button>

              <button
                type="button"
                onClick={() => setLightboxData(null)}
                className="bg-slate-800 hover:bg-rose-600 text-white p-2.5 rounded-full cursor-pointer transition-colors"
                title="Đóng (Esc)"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
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
                  ? 'bg-emerald-600 text-white shadow-xs'
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
                  ? 'bg-violet-600 text-white shadow-xs'
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
                  ? 'bg-amber-500 text-amber-950 shadow-xs'
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
