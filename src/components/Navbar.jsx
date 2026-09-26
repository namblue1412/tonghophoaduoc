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
  Trash2,
  ChevronDown,
  Menu,
  X,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  User,
  LogIn,
  LogOut,
  GraduationCap,
  Smartphone,
  Share2,
  PlusSquare,
  Sparkles,
  LayoutDashboard,
  Home
} from 'lucide-react';
import { useExperiment } from '../context/ExperimentContext';
import { useAuth } from '../context/AuthContext';

export const Navbar = ({
  onOpenNewModal,
  onToggleListDrawer,
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
    deleteExperiment,
    exportAllToJson,
    importFromJson,
    syncMode,
    isSyncing,
    lastSaved
  } = useExperiment();

  const { currentUser, setIsAuthModalOpen, logout } = useAuth();

  const [showDropdown, setShowDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
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
        return <span className="bg-emerald-100 text-emerald-800 text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-semibold flex items-center gap-1 border border-emerald-300 animate-pulse whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Đang khuấy</span>;
      case 'paused':
        return <span className="bg-amber-100 text-amber-800 text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-semibold flex items-center gap-1 border border-amber-300 whitespace-nowrap"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Tạm dừng</span>;
      case 'workup':
        return <span className="bg-blue-100 text-blue-800 text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-semibold flex items-center gap-1 border border-blue-300 whitespace-nowrap">Xử lý thô</span>;
      case 'purification':
        return <span className="bg-purple-100 text-purple-800 text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-semibold flex items-center gap-1 border border-purple-300 whitespace-nowrap">Sắc ký cột</span>;
      case 'completed':
        return <span className="bg-slate-100 text-slate-800 text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-semibold flex items-center gap-1 border border-slate-300 whitespace-nowrap"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Hoàn thành</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full font-semibold border border-slate-200 whitespace-nowrap">Bản nháp</span>;
    }
  };

  return (
    <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-40 border-b border-slate-800 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-18">
          {/* Logo & Experiment Selector */}
          <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
            <button
              type="button"
              onClick={onGoToDashboard}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 p-2 sm:p-2.5 rounded-xl shadow-md transition-all cursor-pointer text-left focus:outline-none flex-shrink-0"
              title="Về trang tổng quan danh sách thí nghiệm / dự án"
            >
              <FlaskConical className="w-5 h-5 sm:w-6 sm:h-6 text-white flex-shrink-0" />
              <div className="hidden sm:block text-left">
                <div className="font-extrabold text-sm sm:text-base tracking-tight leading-none text-white">MedChem ELN</div>
                <div className="text-[10px] text-indigo-200 font-medium tracking-wider uppercase mt-0.5">Sổ Tay Hóa Dược</div>
              </div>
            </button>

            {/* Quick Home / Dashboard button */}
            <button
              type="button"
              onClick={onGoToDashboard}
              className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer min-h-[40px] flex-shrink-0 border ${
                currentView === 'dashboard'
                  ? 'bg-indigo-700/70 border-indigo-500 text-white'
                  : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
              }`}
              title="Xem danh sách tất cả các dự án / thí nghiệm"
            >
              <LayoutDashboard className="w-4 h-4 text-teal-400" />
              <span className="hidden md:inline">Dự án</span>
            </button>

            {/* Experiment selector: Only show Code (kí hiệu) so status badge is never covered */}
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
                className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-left px-2 sm:px-3 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-medium flex items-center gap-1.5 transition-colors focus:ring-2 focus:ring-indigo-400 min-h-[40px] cursor-pointer flex-shrink-0"
                title={
                  activeExperiment
                    ? `${activeExperiment.code}: ${activeExperiment.title} ${currentView === 'dashboard' ? '(Nhấn để vào xem)' : '(Nhấn để đổi thí nghiệm)'}`
                    : 'Chọn thí nghiệm'
                }
              >
                {activeExperiment ? (
                  <span className="text-indigo-400 font-mono font-extrabold text-xs sm:text-sm tracking-wide">
                    {activeExperiment.code}
                  </span>
                ) : (
                  <span className="text-slate-400 text-xs">Chưa chọn</span>
                )}
                <ChevronDown
                  className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowDropdown(!showDropdown);
                  }}
                />
              </button>

              {/* Status badge: ALWAYS fully visible on mobile & desktop */}
              {activeExperiment && (
                <div
                  className="flex-shrink-0 cursor-pointer"
                  onClick={() => {
                    if (currentView === 'dashboard') {
                      onSelectExperiment?.(activeExperiment.id);
                    }
                  }}
                  title={currentView === 'dashboard' ? 'Nhấn để mở chi tiết thí nghiệm' : undefined}
                >
                  {getStatusBadge(activeExperiment.status)}
                </div>
              )}

              {showDropdown && (
                <div className="absolute left-0 top-full mt-2 w-72 sm:w-96 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-3 py-2 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Danh sách thí nghiệm ({experiments.length})</span>
                    <button
                      onClick={() => {
                        setShowDropdown(false);
                        onOpenNewModal?.();
                      }}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
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
                          className={`px-3 py-2.5 hover:bg-indigo-50 cursor-pointer flex items-center justify-between transition-colors ${
                            exp.id === activeExperimentId ? 'bg-indigo-50/70 font-semibold text-indigo-950' : ''
                          }`}
                        >
                          <div className="min-w-0 pr-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">{exp.code}</span>
                              <span className="text-xs text-slate-400 font-mono">{exp.date}</span>
                            </div>
                            <div className="text-xs truncate text-slate-700 mt-1">{exp.title}</div>
                          </div>
                          <div className="flex-shrink-0">
                            {getStatusBadge(exp.status)}
                          </div>
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

          {/* Sync Mode Indicator & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Dual Mode Indicator */}
            <div
              className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${
                syncMode === 'firebase'
                  ? 'bg-emerald-950/60 border-emerald-600 text-emerald-400'
                  : 'bg-indigo-950/60 border-indigo-700 text-indigo-300'
              }`}
              title={
                syncMode === 'firebase'
                  ? 'Đang đồng bộ trực tuyến với Firebase Realtime Database & Storage'
                  : 'Đang lưu nội bộ trên máy (LocalStorage Dual-Mode Fallback) - Không sợ mất điện hay rớt mạng'
              }
            >
              {syncMode === 'firebase' ? (
                <>
                  <Cloud className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Đám mây</span>
                </>
              ) : (
                <>
                  <HardDrive className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Lưu trên máy</span>
                </>
              )}
              {isSyncing && <RefreshCw className="w-3 h-3 animate-spin text-slate-400 ml-1" />}
            </div>

            {/* Primary Action: Tạo thí nghiệm mới */}
            <button
              onClick={onOpenNewModal}
              className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-900/30 transition-all cursor-pointer min-h-[44px]"
            >
              <PlusCircle className="w-4 h-4" />
              <span className="hidden sm:inline">Thí nghiệm mới</span>
              <span className="sm:hidden">Mới</span>
            </button>

            {/* Student Account Button & Profile Dropdown */}
            {currentUser ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-200 transition-colors min-h-[44px] cursor-pointer"
                  title={`Đang đăng nhập: ${currentUser.displayName || currentUser.email}`}
                >
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow-xs">
                    {(currentUser.displayName || currentUser.email || 'U')[0]}
                  </div>
                  <div className="text-left hidden md:block">
                    <div className="text-xs font-bold text-white truncate max-w-[120px]">
                      {currentUser.displayName || 'Sinh viên'}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono leading-none">
                      {currentUser.studentId ? `MSSV: ${currentUser.studentId}` : currentUser.email}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-56 bg-white text-slate-800 rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in">
                    <div className="px-3.5 py-2.5 border-b border-slate-100">
                      <p className="text-[11px] text-slate-400 font-medium">Tài khoản sinh viên</p>
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {currentUser.displayName || 'Nghiên cứu viên'}
                      </p>
                      {currentUser.studentId && (
                        <p className="text-xs text-indigo-600 font-mono font-semibold">
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
                        className="w-full text-left px-3 py-2 text-xs font-medium text-slate-700 hover:bg-teal-50 hover:text-teal-800 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
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
            ) : (
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px] shadow-sm cursor-pointer"
                title="Đăng nhập tài khoản sinh viên nghiên cứu"
              >
                <User className="w-4 h-4" />
                <span className="hidden md:inline">Đăng nhập SV</span>
                <span className="md:hidden">Đăng nhập</span>
              </button>
            )}

            {/* Desktop Action Buttons */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={handleInstallClick}
                title="Thêm vào Màn hình chính (iPhone / iPad / Android)"
                className="bg-slate-800 hover:bg-slate-700 text-teal-300 p-2.5 rounded-xl text-xs font-medium transition-colors border border-teal-500/40 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <Smartphone className="w-4 h-4 text-teal-400" />
              </button>

              <button
                onClick={() => activeExperimentId && duplicateExperiment(activeExperimentId)}
                title="Sao chép thí nghiệm này thành bản ghi mới"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-xl text-xs font-medium transition-colors border border-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <Copy className="w-4 h-4 text-slate-300" />
              </button>

              <button
                onClick={handlePrint}
                title="In sổ tay thí nghiệm"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-xl text-xs font-medium transition-colors border border-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <Printer className="w-4 h-4 text-slate-300" />
              </button>

              <button
                onClick={exportAllToJson}
                title="Sao lưu toàn bộ nhật ký ra tệp JSON"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-xl text-xs font-medium transition-colors border border-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-300" />
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                title="Khôi phục nhật ký từ tệp JSON"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-2.5 rounded-xl text-xs font-medium transition-colors border border-slate-700 min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
              >
                <Upload className="w-4 h-4 text-slate-300" />
              </button>
            </div>

            {/* Mobile Hamburger Menu */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="sm:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile slide-down menu */}
        {mobileMenuOpen && (
          <div className="sm:hidden border-t border-slate-800 py-3 space-y-3 animate-in slide-in-from-top-2">
            {/* Quick Home / Dashboard button */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onGoToDashboard?.();
              }}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600/80 hover:bg-indigo-600 text-white p-2.5 rounded-xl text-xs font-bold min-h-[44px] cursor-pointer transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-teal-300" />
              <span>Xem danh sách tất cả thí nghiệm</span>
            </button>

            {/* Student Auth Bar in Mobile Menu */}
            <div className="bg-slate-850 p-2.5 rounded-xl border border-slate-800">
              {currentUser ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-xs uppercase flex-shrink-0">
                      {(currentUser.displayName || currentUser.email || 'U')[0]}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white truncate">{currentUser.displayName || 'Sinh viên'}</div>
                      <div className="text-[10px] text-slate-400 font-mono truncate">{currentUser.studentId ? `MSSV: ${currentUser.studentId}` : currentUser.email}</div>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      setMobileMenuOpen(false);
                      await logout();
                    }}
                    className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 p-1.5 flex-shrink-0 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Thoát</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setIsAuthModalOpen(true);
                  }}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
                >
                  <User className="w-4 h-4" />
                  <span>Đăng nhập tài khoản sinh viên</span>
                </button>
              )}
            </div>

            {/* Install to Home Screen Shortcut Button */}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleInstallClick();
              }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-900/60 to-indigo-900/60 border border-teal-500/40 text-teal-300 p-2.5 rounded-xl text-xs font-bold min-h-[48px] cursor-pointer"
            >
              <Smartphone className="w-4.5 h-4.5 text-teal-400" />
              <span>Thêm ứng dụng vào Màn hình chính</span>
            </button>

            <div className="flex items-center justify-between px-2 text-xs text-slate-400 pb-2 border-b border-slate-800">
              <span className="flex items-center gap-1.5">
                {syncMode === 'firebase' ? <Cloud className="w-3.5 h-3.5 text-emerald-400" /> : <HardDrive className="w-3.5 h-3.5 text-indigo-400" />}
                {syncMode === 'firebase' ? 'Lưu trữ đám mây' : 'Lưu trữ trên máy'}
              </span>
              <span>{activeExperiment?.code}</span>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => {
                  activeExperimentId && duplicateExperiment(activeExperimentId);
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl text-xs font-medium min-h-[48px]"
              >
                <Copy className="w-4 h-4 text-indigo-400" />
                <span>Nhân bản</span>
              </button>

              <button
                onClick={() => {
                  handlePrint();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl text-xs font-medium min-h-[48px]"
              >
                <Printer className="w-4 h-4 text-emerald-400" />
                <span>In sổ tay thí nghiệm</span>
              </button>

              <button
                onClick={() => {
                  exportAllToJson();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl text-xs font-medium min-h-[48px]"
              >
                <Download className="w-4 h-4 text-blue-400" />
                <span>Xuất JSON</span>
              </button>

              <button
                onClick={() => {
                  fileInputRef.current?.click();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl text-xs font-medium min-h-[48px]"
              >
                <Upload className="w-4 h-4 text-amber-400" />
                <span>Nhập JSON</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden File Input for JSON restore */}
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
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowInstallModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 text-white w-full max-w-lg rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-600 to-teal-500 rounded-2xl shadow-md">
                  <Smartphone className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Thêm vào Màn hình chính</h3>
                  <p className="text-xs text-slate-400">Trải nghiệm như App thật trên iPhone & iPad</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 hover:bg-slate-700 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
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
                <p className="text-xs text-teal-400 font-medium">Sổ Tay Nghiên Cứu Tổng Hợp Hóa Dược</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Toàn màn hình • Chạy offline • Không che khuất thanh địa chỉ</p>
              </div>
            </div>

            {/* Platform Guides */}
            <div className="space-y-3 text-xs">
              {/* iPhone / iPad Guide */}
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/80 space-y-2.5">
                <div className="font-bold text-teal-300 flex items-center gap-1.5 text-sm">
                  <span>🍎</span>
                  <span>Hướng dẫn trên iPhone & iPad (Safari):</span>
                </div>
                <div className="space-y-2 text-slate-300 pl-1">
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">1</span>
                    <p>Nhấn vào biểu tượng <strong>Chia sẻ (Share) 📤</strong> ở thanh công cụ Safari (ở dưới cùng màn hình trên iPhone hoặc góc trên trên iPad).</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">2</span>
                    <p>Cuộn xuống trong danh sách tùy chọn và chạm vào <strong>"Thêm vào MH chính" (Add to Home Screen) ➕</strong>.</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-teal-500/20 text-teal-400 font-bold flex items-center justify-center flex-shrink-0 text-[11px]">3</span>
                    <p>Nhấn <strong>"Thêm" (Add)</strong> ở góc trên bên phải. Icon ứng dụng sẽ xuất hiện ngay trên màn hình chính của bạn!</p>
                  </div>
                </div>
              </div>

              {/* Android Guide */}
              <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/80 space-y-2">
                <div className="font-bold text-indigo-300 flex items-center gap-1.5 text-sm">
                  <span>🤖</span>
                  <span>Hướng dẫn trên Android (Chrome / Cốc Cốc):</span>
                </div>
                <p className="text-slate-300 pl-1">
                  Bấm biểu tượng menu <strong>3 chấm (⋮)</strong> ở góc trên bên phải trình duyệt &rarr; Chọn <strong>"Cài đặt ứng dụng"</strong> hoặc <strong>"Thêm vào Màn hình chính"</strong>.
                </p>

                {deferredPrompt && (
                  <button
                    type="button"
                    onClick={async () => {
                      deferredPrompt.prompt();
                      const { outcome } = await deferredPrompt.userChoice;
                      if (outcome === 'accepted') {
                        setDeferredPrompt(null);
                        setShowInstallModal(false);
                      }
                    }}
                    className="w-full mt-2 bg-teal-600 hover:bg-teal-500 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    <Download className="w-4 h-4" />
                    <span>Cài đặt ngay vào thiết bị</span>
                  </button>
                )}
              </div>
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setShowInstallModal(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-2.5 rounded-2xl text-xs transition-colors min-h-[44px] cursor-pointer"
            >
              Đã hiểu & Đóng
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
