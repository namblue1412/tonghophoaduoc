import React, { useState, useRef, useEffect } from 'react';
import {
  FlaskConical,
  PlusCircle,
  Download,
  Upload,
  Printer,
  Cloud,
  HardDrive,
  Copy,
  ChevronDown,
  Menu,
  X,
  CheckCircle2,
  RefreshCw,
  User,
  LogOut,
  GraduationCap,
  Smartphone,
  Tablet,
  Laptop,
  LayoutDashboard,
  MoreHorizontal
} from 'lucide-react';
import { useExperiment } from '../context/ExperimentContext';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../context/DeviceContext';

export const Navbar = ({
  onOpenNewModal,
  onSelectExperiment,
  onGoToDashboard,
  currentView
}) => {
  const {
    experiments,
    activeExperiment,
    activeExperimentId,
    setActiveExperimentId,
    duplicateExperiment,
    exportAllToJson,
    importFromJson,
    syncMode,
    isSyncing
  } = useExperiment();

  const { currentUser, setIsAuthModalOpen, logout } = useAuth();
  const {
    deviceType,
    detectedType,
    overrideDevice,
    setOverrideDevice,
    isStandalone,
    isIPhone,
    isIPad,
    isMac
  } = useDevice();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const [showDeviceMenu, setShowDeviceMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      setShowInstallModal(true);
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const res = await importFromJson(file);
        alert(`Đã khôi phục thành công ${res.count} thí nghiệm!`);
      } catch (err) {
        alert('Lỗi nhập file: ' + err.message);
      }
      e.target.value = null;
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'running':
        return (
          <span className="bg-emerald-100 text-emerald-800 text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-semibold flex items-center gap-1 border border-emerald-300 animate-pulse whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Đang khuấy
          </span>
        );
      case 'paused':
        return (
          <span className="bg-amber-100 text-amber-800 text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-semibold flex items-center gap-1 border border-amber-300 whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Tạm dừng
          </span>
        );
      case 'workup':
        return (
          <span className="bg-blue-100 text-blue-800 text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-semibold flex items-center gap-1 border border-blue-300 whitespace-nowrap">
            Xử lý thô
          </span>
        );
      case 'purification':
        return (
          <span className="bg-purple-100 text-purple-800 text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-semibold flex items-center gap-1 border border-purple-300 whitespace-nowrap">
            Sắc ký cột
          </span>
        );
      case 'completed':
        return (
          <span className="bg-slate-100 text-slate-800 text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-semibold flex items-center gap-1 border border-slate-300 whitespace-nowrap">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hoàn thành
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-semibold border border-slate-200 whitespace-nowrap">
            Bản nháp
          </span>
        );
    }
  };

  // Guaranteed inline safe-area padding when running as a Home Screen app on iPhone/iPad
  const safeHeaderStyle = isStandalone
    ? {
        paddingTop: isIPhone
          ? 'max(env(safe-area-inset-top, 0px), 52px)'
          : isIPad
          ? 'max(env(safe-area-inset-top, 0px), 26px)'
          : undefined
      }
    : undefined;

  const DeviceIcon = isIPhone ? Smartphone : isIPad ? Tablet : Laptop;

  return (
    <header
      style={safeHeaderStyle}
      className="bg-slate-900 text-white shadow-lg sticky top-0 z-40 border-b border-slate-800 no-print pt-safe"
    >
      <div className="max-w-[1440px] mx-auto px-3 sm:px-5 lg:px-6">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
          {/* LEFT: Logo & Experiment Selector */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-1 min-w-0">
            <button
              type="button"
              onClick={onGoToDashboard}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 active:bg-teal-700 p-2 sm:px-3 sm:py-2 rounded-xl shadow-md transition-all cursor-pointer text-left focus:outline-none flex-shrink-0 min-h-[40px] min-w-[40px] justify-center"
              title="Về trang tổng quan danh sách thí nghiệm"
            >
              <FlaskConical className="w-4.5 h-4.5 sm:w-5 sm:h-5 text-white flex-shrink-0" />
              {!isIPhone && (
                <div className="text-left">
                  <div className="font-extrabold text-sm tracking-tight leading-none text-white">
                    MedChem ELN
                  </div>
                  {isMac && (
                    <div className="text-[10px] text-teal-100 font-medium tracking-wider uppercase mt-0.5">
                      Sổ Tay Hóa Dược
                    </div>
                  )}
                </div>
              )}
            </button>

            {/* Quick Dashboard button (iPad & Mac) */}
            {!isIPhone && (
              <button
                type="button"
                onClick={onGoToDashboard}
                className={`p-2 sm:px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[40px] flex-shrink-0 border ${
                  currentView === 'dashboard'
                    ? 'bg-teal-700/70 border-teal-500 text-white'
                    : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                }`}
                title="Danh sách tất cả các thí nghiệm"
              >
                <LayoutDashboard className="w-4 h-4 text-teal-400" />
                <span>Dự án</span>
              </button>
            )}

            {/* Experiment selector: Code + optional title on Mac + Status badge */}
            <div className="relative flex items-center gap-1.5 min-w-0">
              <button
                type="button"
                onClick={() => {
                  if (currentView === 'dashboard' && activeExperiment) {
                    onSelectExperiment?.(activeExperiment.id);
                  } else {
                    setShowDropdown(!showDropdown);
                  }
                }}
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors focus:ring-2 focus:ring-teal-400 min-h-[40px] cursor-pointer flex-shrink-0 whitespace-nowrap"
                title={
                  activeExperiment
                    ? `${activeExperiment.code}: ${activeExperiment.title}`
                    : 'Chọn thí nghiệm'
                }
              >
                {activeExperiment ? (
                  <>
                    <span className="text-teal-300 font-mono tabular-nums font-extrabold text-xs sm:text-sm tracking-wide whitespace-nowrap">
                      {activeExperiment.code}
                    </span>
                    {isMac && activeExperiment.title && (
                      <span className="text-slate-300 text-xs truncate max-w-[180px] border-l border-slate-700 pl-2">
                        {activeExperiment.title}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-400 text-xs whitespace-nowrap">Chưa chọn</span>
                )}
                <ChevronDown
                  className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown(!showDropdown);
                  }}
                />
              </button>

              {/* Status badge: ALWAYS visible */}
              {activeExperiment && (
                <div
                  className="flex-shrink-0 cursor-pointer"
                  onClick={() => {
                    if (currentView === 'dashboard') {
                      onSelectExperiment?.(activeExperiment.id);
                    }
                  }}
                >
                  {getStatusBadge(activeExperiment.status)}
                </div>
              )}

              {showDropdown && (
                <div className="absolute left-0 top-full mt-2 w-72 sm:w-96 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3.5 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Danh sách thí nghiệm ({experiments.length})
                    </span>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        onOpenNewModal?.();
                      }}
                      className="text-xs text-teal-600 hover:text-teal-800 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <PlusCircle className="w-3.5 h-3.5" /> Tạo mới
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
                    {experiments.length > 0 ? (
                      experiments.map((exp) => (
                        <div
                          key={exp.id}
                          onClick={() => {
                            setActiveExperimentId(exp.id);
                            onSelectExperiment?.(exp.id);
                            setShowDropdown(false);
                          }}
                          className={`px-3.5 py-2.5 hover:bg-teal-50 cursor-pointer flex items-center justify-between transition-colors ${
                            exp.id === activeExperimentId ? 'bg-teal-50/70 font-semibold text-slate-900' : ''
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono tabular-nums font-bold text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded">
                                {exp.code}
                              </span>
                              <span className="text-xs text-slate-400 font-mono tabular-nums">{exp.date}</span>
                            </div>
                            <div className="text-xs truncate text-slate-700 mt-1">{exp.title}</div>
                          </div>
                          <div className="flex-shrink-0">{getStatusBadge(exp.status)}</div>
                        </div>
                      ))
                    ) : (
                      <div className="py-6 px-4 text-center text-xs text-slate-500">
                        Chưa có thí nghiệm nào. Nhấn "Tạo mới" để bắt đầu!
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Device Selector, Sync Indicator & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {/* Device Auto-Detection & Layout Switcher Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowDeviceMenu(!showDeviceMenu)}
                className="flex items-center gap-1 bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-teal-300 px-2 sm:px-2.5 py-1.5 rounded-xl text-[11px] font-semibold min-h-[38px] sm:min-h-[40px] cursor-pointer transition-colors"
                title="Chế độ hiển thị theo thiết bị (Nhấn để chuyển đổi iPhone / iPad / Mac)"
              >
                <DeviceIcon className="w-3.5 h-3.5 text-teal-400 flex-shrink-0" />
                <span className="hidden xs:inline sm:inline">
                  {isIPhone ? 'iPhone' : isIPad ? 'iPad' : 'Mac'}
                </span>
              </button>

              {showDeviceMenu && (
                <div className="absolute right-0 mt-2 w-56 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 p-1.5 z-50 animate-in fade-in">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Giao diện thiết bị
                    </div>
                  </div>
                  <div className="pt-1 space-y-0.5">
                    {[
                      {
                        id: 'auto',
                        label: `Tự động (${detectedType === 'iphone' ? 'iPhone' : detectedType === 'ipad' ? 'iPad' : 'Mac'})`,
                        icon: DeviceIcon
                      },
                      { id: 'iphone', label: 'Giao diện iPhone', icon: Smartphone },
                      { id: 'ipad', label: 'Giao diện iPad', icon: Tablet },
                      { id: 'mac', label: 'Giao diện Mac / Laptop', icon: Laptop }
                    ].map((opt) => {
                      const Icon = opt.icon;
                      const active = overrideDevice === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setOverrideDevice(opt.id);
                            setShowDeviceMenu(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between cursor-pointer transition-colors ${
                            active
                              ? 'bg-teal-50 text-teal-800'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-teal-600" />
                            <span>{opt.label}</span>
                          </span>
                          {active && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Dual Mode Sync Indicator (Mac only to keep iPad/iPhone clean) */}
            {isMac && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                  syncMode === 'firebase'
                    ? 'bg-emerald-950/60 border-emerald-600 text-emerald-400'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                {syncMode === 'firebase' ? (
                  <>
                    <Cloud className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                    <span>Đám mây</span>
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3.5 h-3.5 text-teal-400" />
                    <span>Lưu trên máy</span>
                  </>
                )}
                {isSyncing && <RefreshCw className="w-3 h-3 animate-spin text-slate-400 ml-1" />}
              </div>
            )}

            {/* Primary Action: Tạo thí nghiệm mới */}
            <button
              onClick={onOpenNewModal}
              className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1 sm:gap-1.5 shadow-md shadow-emerald-900/30 transition-all cursor-pointer min-h-[38px] sm:min-h-[40px] whitespace-nowrap"
            >
              <PlusCircle className="w-4 h-4 flex-shrink-0" />
              <span>{isIPhone ? 'Mới' : 'Thí nghiệm mới'}</span>
            </button>

            {/* Student Account Button & Profile Dropdown (iPad & Mac) */}
            {!isIPhone && currentUser && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-200 transition-colors min-h-[40px] cursor-pointer"
                  title={`Đang đăng nhập: ${currentUser.displayName || currentUser.email}`}
                >
                  <div className="w-6 h-6 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-xs uppercase">
                    {(currentUser.displayName || currentUser.email || 'U')[0]}
                  </div>
                  <div className="text-left hidden lg:block">
                    <div className="text-xs font-bold text-white truncate max-w-[110px]">
                      {currentUser.displayName || 'Sinh viên'}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in">
                    <div className="px-3.5 py-2.5 border-b border-slate-100">
                      <p className="text-[11px] text-slate-400 font-medium">Tài khoản nghiên cứu</p>
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {currentUser.displayName || 'Nghiên cứu viên'}
                      </p>
                      {currentUser.studentId && (
                        <p className="text-xs text-teal-700 font-mono font-semibold">
                          MSSV: {currentUser.studentId}
                        </p>
                      )}
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{currentUser.email}</p>
                    </div>

                    <div className="p-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowUserMenu(false);
                          setIsAuthModalOpen(true);
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <GraduationCap className="w-4 h-4 text-teal-600" />
                        <span>Đổi tài khoản khác</span>
                      </button>

                      <button
                        type="button"
                        onClick={async () => {
                          setShowUserMenu(false);
                          await logout();
                        }}
                        className="w-full text-left px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Đăng xuất</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* IPAD CONSOLIDATED TOOLS POPOVER (Clean iPadOS experience without button crowding) */}
            {isIPad && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowToolsMenu(!showToolsMenu)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors border border-slate-700 min-h-[40px] flex items-center gap-1.5 cursor-pointer"
                >
                  <MoreHorizontal className="w-4 h-4 text-teal-400" />
                  <span>Tiện ích</span>
                </button>

                {showToolsMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white text-slate-800 rounded-2xl shadow-2xl border border-slate-200 p-1.5 z-50 animate-in fade-in space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsMenu(false);
                        activeExperimentId && duplicateExperiment(activeExperimentId);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Copy className="w-4 h-4 text-teal-600" />
                      <span>Nhân bản thí nghiệm</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsMenu(false);
                        handlePrint();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-emerald-600" />
                      <span>In sổ tay</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsMenu(false);
                        exportAllToJson();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-sky-600" />
                      <span>Sao lưu dữ liệu</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsMenu(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-amber-600" />
                      <span>Khôi phục dữ liệu</span>
                    </button>

                    <div className="border-t border-slate-100 my-1"></div>

                    <button
                      type="button"
                      onClick={() => {
                        setShowToolsMenu(false);
                        handleInstallClick();
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-teal-700 hover:bg-teal-50 flex items-center gap-2.5 cursor-pointer"
                    >
                      <Tablet className="w-4 h-4 text-teal-600" />
                      <span>Thêm vào MH chính iPad</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* MAC / LAPTOP ACTION BUTTONS */}
            {isMac && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => activeExperimentId && duplicateExperiment(activeExperimentId)}
                  title="Nhân bản thí nghiệm"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-xl text-xs font-medium transition-colors border border-slate-700 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-slate-300" />
                </button>

                <button
                  onClick={handlePrint}
                  title="In sổ tay thí nghiệm"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-xl text-xs font-medium transition-colors border border-slate-700 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-300" />
                </button>

                <button
                  onClick={exportAllToJson}
                  title="Sao lưu dữ liệu"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-xl text-xs font-medium transition-colors border border-slate-700 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                >
                  <Download className="w-4 h-4 text-slate-300" />
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  title="Khôi phục dữ liệu"
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2 rounded-xl text-xs font-medium transition-colors border border-slate-700 min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-slate-300" />
                </button>
              </div>
            )}

            {/* IPHONE HAMBURGER MENU */}
            {isIPhone && (
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 hover:text-white min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
                aria-label="Mở menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            )}
          </div>
        </div>

        {/* IPHONE SLIDE-DOWN MENU */}
        {isIPhone && mobileMenuOpen && (
          <div className="border-t border-slate-800 py-3 space-y-3 animate-in slide-in-from-top-2">
            {/* Quick Home / Dashboard button */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onGoToDashboard?.();
              }}
              className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-500 text-white p-2.5 rounded-xl text-xs font-bold min-h-[42px] cursor-pointer transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-white" />
              <span>Danh sách tất cả thí nghiệm</span>
            </button>

            {/* Student Auth Bar in Mobile Menu */}
            <div className="bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
              {currentUser ? (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 pr-1">
                    <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-xs uppercase flex-shrink-0">
                      {(currentUser.displayName || currentUser.email || 'U')[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">
                        {currentUser.displayName || 'Sinh viên'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">
                        {currentUser.studentId ? `MSSV: ${currentUser.studentId}` : currentUser.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setIsAuthModalOpen(true);
                      }}
                      className="text-[11px] bg-slate-700 hover:bg-slate-600 text-slate-200 px-2.5 py-1.5 rounded-lg font-medium cursor-pointer"
                    >
                      Đổi TK
                    </button>
                    <button
                      onClick={async () => {
                        setMobileMenuOpen(false);
                        await logout();
                      }}
                      className="text-[11px] bg-rose-950/80 border border-rose-800/60 text-rose-300 hover:text-rose-200 flex items-center gap-1 px-2.5 py-1.5 rounded-lg cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Thoát</span>
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  <span>Đăng nhập</span>
                </button>
              )}
            </div>

            {/* Install to Home Screen Shortcut Button */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleInstallClick();
              }}
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 border border-teal-500/40 text-teal-300 p-2.5 rounded-xl text-xs font-bold min-h-[44px] cursor-pointer"
            >
              <Smartphone className="w-4 h-4 text-teal-400" />
              <span>Thêm vào Màn hình chính</span>
            </button>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  activeExperimentId && duplicateExperiment(activeExperimentId);
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl text-xs font-medium min-h-[44px]"
              >
                <Copy className="w-4 h-4 text-teal-400" />
                <span>Nhân bản</span>
              </button>

              <button
                onClick={() => {
                  handlePrint();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl text-xs font-medium min-h-[44px]"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>In sổ tay</span>
              </button>

              <button
                onClick={() => {
                  exportAllToJson();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl text-xs font-medium min-h-[44px]"
              >
                <Download className="w-4 h-4 text-sky-400" />
                <span>Sao lưu</span>
              </button>

              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl text-xs font-medium min-h-[44px]"
              >
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Khôi phục</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Input for backup restore */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".json"
        className="hidden"
      />

      {/* PWA Add to Home Screen Guidance Modal */}
      {showInstallModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 pt-safe pb-safe animate-in fade-in"
          onClick={() => setShowInstallModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 text-white w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-600 rounded-2xl shadow-md">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Thêm vào Màn hình chính</h3>
                  <p className="text-xs text-slate-400">Mở nhanh trên điện thoại & iPad</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* App Icon & Info */}
            <div className="flex items-center gap-4 bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700">
              <img
                src="/icon-192.png"
                alt="MedChem ELN Icon"
                className="w-14 h-14 rounded-2xl shadow-md border border-slate-600 flex-shrink-0"
              />
              <div>
                <h4 className="font-extrabold text-sm text-white">MedChem ELN</h4>
                <p className="text-xs text-teal-400 font-medium">
                  Sổ Tay Nghiên Cứu Tổng Hợp Hóa Dược
                </p>
              </div>
            </div>

            {/* Platform Guides */}
            <div className="space-y-3 text-xs">
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/80 space-y-2.5">
                <div className="font-bold text-teal-300 flex items-center gap-1.5 text-sm">
                  <span>Trên iPhone & iPad (Safari):</span>
                </div>
                <div className="space-y-2 text-slate-300 pl-1">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                      1
                    </span>
                    <p>
                      Nhấn vào biểu tượng <strong>Chia sẻ</strong> ở thanh công cụ Safari.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                      2
                    </span>
                    <p>
                      Cuộn xuống và chọn <strong>Thêm vào MH chính</strong>.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">
                      3
                    </span>
                    <p>
                      Nhấn <strong>Thêm</strong> ở góc trên bên phải.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowInstallModal(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-2xl text-xs transition-colors min-h-[44px] cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
