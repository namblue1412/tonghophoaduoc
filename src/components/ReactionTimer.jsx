import React, { useState, useEffect, useRef } from 'react';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Clock,
  Thermometer,
  RotateCw,
  PlusCircle,
  FileText,
  AlertTriangle,
  History,
  CheckCircle,
  Edit3,
  Trash2,
  Plus,
  X,
  Save,
  AlertCircle
} from 'lucide-react';

export const ReactionTimer = ({ timerData, onChange, experimentStatus, onStatusChange }) => {
  const {
    status = 'idle', // 'idle' | 'running' | 'paused' | 'stopped'
    totalSeconds = 0,
    lastStartTime = null,
    temperature = '',
    stirringSpeed = '600 rpm',
    intervals = []
  } = timerData || {};

  const [currentSessionSeconds, setCurrentSessionSeconds] = useState(0);
  const [justPausedSessionId, setJustPausedSessionId] = useState(null);
  const intervalRef = useRef(null);

  // Edit Session Modal State
  const [editingSession, setEditingSession] = useState(null);

  // Add Manual Session Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [manualSessionData, setManualSessionData] = useState({
    hours: '1',
    minutes: '0',
    seconds: '0',
    note: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Live timer tick when status is 'running'
  useEffect(() => {
    if (status === 'running') {
      const startTime = lastStartTime ? new Date(lastStartTime).getTime() : Date.now();

      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const diffSeconds = Math.max(0, Math.floor((now - startTime) / 1000));
        setCurrentSessionSeconds(diffSeconds);
      }, 1000);
    } else {
      setCurrentSessionSeconds(0);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [status, lastStartTime]);

  // Format seconds to HH:mm:ss
  const formatTime = (secs) => {
    const s = Math.max(0, Math.floor(secs));
    const hours = Math.floor(s / 3600);
    const minutes = Math.floor((s % 3600) / 60);
    const seconds = s % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const calculateTotalSeconds = (intervalList) => {
    return (intervalList || []).reduce((acc, it) => acc + (Number(it.durationSeconds) || 0), 0);
  };

  const grandTotalSeconds = totalSeconds + (status === 'running' ? currentSessionSeconds : 0);

  // START / RESUME: 1-Tap instant response
  const handleStart = () => {
    const nowIso = new Date().toISOString();
    const nextTimer = {
      ...timerData,
      status: 'running',
      lastStartTime: nowIso
    };
    onChange(nextTimer, 'running');
  };

  // PAUSE: 1-Tap instant pause, immediately adds session and updates total
  const handlePause = () => {
    const nowIso = new Date().toISOString();
    const sessionDuration = Math.max(1, currentSessionSeconds);
    const sessionNum = (intervals?.length || 0) + 1;
    const newInterval = {
      id: `interval-${Date.now()}`,
      startTime: lastStartTime || nowIso,
      endTime: nowIso,
      durationSeconds: sessionDuration,
      note: `Phiên #${sessionNum}`
    };

    const updatedIntervals = [newInterval, ...(intervals || [])];
    const newTotal = calculateTotalSeconds(updatedIntervals);

    const nextTimer = {
      ...timerData,
      status: 'paused',
      totalSeconds: newTotal,
      lastStartTime: null,
      intervals: updatedIntervals
    };

    onChange(nextTimer, 'paused');
    setJustPausedSessionId(newInterval.id);
  };

  // QUÊN BẤM DỪNG: 1-Tap stops and opens edit modal immediately
  const handlePauseAndEdit = () => {
    const nowIso = new Date().toISOString();
    const sessionDuration = Math.max(1, currentSessionSeconds);
    const sessionNum = (intervals?.length || 0) + 1;
    const newInterval = {
      id: `interval-${Date.now()}`,
      startTime: lastStartTime || nowIso,
      endTime: nowIso,
      durationSeconds: sessionDuration,
      note: `Phiên #${sessionNum}`
    };

    const updatedIntervals = [newInterval, ...(intervals || [])];
    const newTotal = calculateTotalSeconds(updatedIntervals);

    const nextTimer = {
      ...timerData,
      status: 'paused',
      totalSeconds: newTotal,
      lastStartTime: null,
      intervals: updatedIntervals
    };

    onChange(nextTimer, 'paused');

    // Open edit modal directly
    const h = Math.floor(sessionDuration / 3600);
    const m = Math.floor((sessionDuration % 3600) / 60);
    const s = sessionDuration % 60;
    setEditingSession({
      id: newInterval.id,
      hours: h.toString(),
      minutes: m.toString(),
      seconds: s.toString(),
      note: newInterval.note,
      date: new Date().toISOString().split('T')[0]
    });
  };

  // RESUME
  const handleResume = () => {
    handleStart();
  };

  // STOP / FINISH REACTION: 1-Tap concludes reaction
  const handleStop = () => {
    let updatedIntervals = [...(intervals || [])];

    if (status === 'running') {
      const nowIso = new Date().toISOString();
      const sessionDuration = Math.max(1, currentSessionSeconds);
      const sessionNum = (intervals?.length || 0) + 1;
      updatedIntervals.unshift({
        id: `interval-${Date.now()}`,
        startTime: lastStartTime || nowIso,
        endTime: nowIso,
        durationSeconds: sessionDuration,
        note: `Phiên #${sessionNum} (Kết thúc)`
      });
    }

    const finalTotal = calculateTotalSeconds(updatedIntervals);

    const nextTimer = {
      ...timerData,
      status: 'stopped',
      totalSeconds: finalTotal,
      lastStartTime: null,
      intervals: updatedIntervals
    };

    onChange(nextTimer, 'workup');
  };

  // RESET TIMER
  const handleReset = () => {
    if (window.confirm('Đặt lại toàn bộ thời gian và xoá lịch sử các phiên khuấy?')) {
      onChange(
        {
          ...timerData,
          status: 'idle',
          totalSeconds: 0,
          lastStartTime: null,
          intervals: []
        },
        'draft'
      );
    }
  };

  // DELETE SPECIFIC SESSION
  const handleDeleteSession = (sessionId) => {
    if (window.confirm('Bạn có chắc muốn xoá phiên khuấy này khỏi nhật ký?')) {
      const updatedIntervals = (intervals || []).filter((item) => item.id !== sessionId);
      const newTotal = calculateTotalSeconds(updatedIntervals);
      onChange({
        ...timerData,
        totalSeconds: newTotal,
        intervals: updatedIntervals
      });
      if (justPausedSessionId === sessionId) {
        setJustPausedSessionId(null);
      }
    }
  };

  // START EDITING SESSION
  const handleStartEdit = (session) => {
    const totalSec = session.durationSeconds || 0;
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    setEditingSession({
      id: session.id,
      hours: h.toString(),
      minutes: m.toString(),
      seconds: s.toString(),
      note: session.note || '',
      date: session.startTime ? new Date(session.startTime).toISOString().split('T')[0] : ''
    });
  };

  // SAVE EDITED SESSION
  const handleSaveEdit = () => {
    if (!editingSession) return;
    const h = parseInt(editingSession.hours, 10) || 0;
    const m = parseInt(editingSession.minutes, 10) || 0;
    const s = parseInt(editingSession.seconds, 10) || 0;
    const newDuration = Math.max(0, h * 3600 + m * 60 + s);

    const updatedIntervals = (intervals || []).map((it) => {
      if (it.id === editingSession.id) {
        return {
          ...it,
          durationSeconds: newDuration,
          note: editingSession.note.trim()
        };
      }
      return it;
    });

    const newTotal = calculateTotalSeconds(updatedIntervals);

    onChange({
      ...timerData,
      totalSeconds: newTotal,
      intervals: updatedIntervals
    });

    setEditingSession(null);
  };

  // SAVE MANUAL ADDED SESSION
  const handleSaveManualAdd = () => {
    const h = parseInt(manualSessionData.hours, 10) || 0;
    const m = parseInt(manualSessionData.minutes, 10) || 0;
    const s = parseInt(manualSessionData.seconds, 10) || 0;
    const durationSeconds = Math.max(1, h * 3600 + m * 60 + s);
    const sessionNum = (intervals?.length || 0) + 1;
    const dateIso = manualSessionData.date ? new Date(manualSessionData.date).toISOString() : new Date().toISOString();

    const newInterval = {
      id: `interval-${Date.now()}`,
      startTime: dateIso,
      endTime: dateIso,
      durationSeconds,
      note: manualSessionData.note.trim() || `Phiên #${sessionNum} (Thêm thủ công)`
    };

    const updatedIntervals = [newInterval, ...(intervals || [])];
    const newTotal = calculateTotalSeconds(updatedIntervals);

    onChange({
      ...timerData,
      totalSeconds: newTotal,
      intervals: updatedIntervals
    });

    setIsAddModalOpen(false);
    setManualSessionData({
      hours: '1',
      minutes: '0',
      seconds: '0',
      note: '',
      date: new Date().toISOString().split('T')[0]
    });
  };

  // Keydown Listeners for Modals (Esc & Enter)
  const handleSaveEditRef = useRef(handleSaveEdit);
  handleSaveEditRef.current = handleSaveEdit;

  const handleSaveManualAddRef = useRef(handleSaveManualAdd);
  handleSaveManualAddRef.current = handleSaveManualAdd;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (editingSession) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setEditingSession(null);
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || e.target.tagName !== 'TEXTAREA')) {
          e.preventDefault();
          handleSaveEditRef.current();
        }
      } else if (isAddModalOpen) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsAddModalOpen(false);
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || e.target.tagName !== 'TEXTAREA')) {
          e.preventDefault();
          handleSaveManualAddRef.current();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingSession, isAddModalOpen]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden card-print">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 text-white p-3.5 sm:p-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="p-2 sm:p-2.5 bg-emerald-600 rounded-2xl shadow-md text-white flex-shrink-0 mt-0.5 sm:mt-0">
            <Timer className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-lg font-bold text-white leading-snug">
              2. Thời Gian Phản Ứng
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 line-clamp-1 sm:line-clamp-none">
              Theo dõi thời gian khuấy và lưu lịch sử các phiên phản ứng
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {status === 'running' && (
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 animate-pulse whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Đang đếm giờ
            </span>
          )}
          {status === 'paused' && (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-400/30 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span> Tạm dừng
            </span>
          )}
          {status === 'stopped' && (
            <span className="bg-slate-800 text-slate-200 border border-slate-700 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Đã hoàn tất
            </span>
          )}
          {status === 'idle' && (
            <span className="bg-slate-800 text-slate-400 border border-slate-700 px-2.5 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold whitespace-nowrap">
              Chưa bắt đầu
            </span>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Main Big Digital Clock & Primary Lab Action Buttons */}
        <div className="bg-slate-900 rounded-2xl p-5 sm:p-7 text-white text-center shadow-inner relative overflow-hidden border border-slate-800">
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>

          <div className="relative z-10">
            <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">
              Tổng thời gian khuấy tích luỹ
            </div>

            {/* Giant Clock display */}
            <div
              className={`font-mono text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-wider my-3 transition-colors ${
                status === 'running'
                  ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.3)] animate-lab-pulse'
                  : status === 'paused'
                  ? 'text-amber-400'
                  : 'text-slate-300'
              }`}
            >
              {formatTime(grandTotalSeconds)}
            </div>

            {/* Current Session Sub-timer & Quick helper */}
            {status === 'running' && (
              <div className="flex flex-wrap items-center justify-center gap-2 mt-1">
                <span className="text-xs sm:text-sm text-emerald-300/90 font-mono font-semibold">
                  Phiên hiện tại: +{formatTime(currentSessionSeconds)}
                </span>
                <span className="text-slate-500 hidden sm:inline">•</span>
                <button
                  type="button"
                  onClick={handlePauseAndEdit}
                  className="text-xs text-amber-300 hover:text-amber-200 underline font-medium cursor-pointer"
                  title="Tạm dừng ngay và chỉnh lại số giờ thực tế"
                >
                  Quên bấm dừng? Dừng & Sửa giờ ngay
                </button>
              </div>
            )}

            {/* Big Action Buttons - 1 Click Responsiveness */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4 no-print">
              {status === 'idle' && (
                <button
                  type="button"
                  onClick={handleStart}
                  className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-base sm:text-lg px-8 py-3.5 rounded-2xl shadow-lg shadow-emerald-900/40 flex items-center gap-2.5 transition-all transform active:scale-95 cursor-pointer min-h-[56px] min-w-[180px] justify-center"
                >
                  <Play className="w-6 h-6 fill-current" />
                  <span>Bắt đầu</span>
                </button>
              )}

              {status === 'running' && (
                <button
                  type="button"
                  onClick={handlePause}
                  className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-amber-950 font-bold text-base sm:text-lg px-8 py-3.5 rounded-2xl shadow-lg shadow-amber-950/40 flex items-center gap-2.5 transition-all transform active:scale-95 cursor-pointer min-h-[56px] min-w-[180px] justify-center"
                >
                  <Pause className="w-6 h-6 fill-current" />
                  <span>Tạm dừng</span>
                </button>
              )}

              {status === 'paused' && (
                <button
                  type="button"
                  onClick={handleResume}
                  className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-base sm:text-lg px-8 py-3.5 rounded-2xl shadow-lg shadow-emerald-900/40 flex items-center gap-2.5 transition-all transform active:scale-95 cursor-pointer min-h-[56px] min-w-[180px] justify-center"
                >
                  <Play className="w-6 h-6 fill-current" />
                  <span>Tiếp tục</span>
                </button>
              )}

              {/* Stop & proceed to Workup */}
              {(status === 'running' || status === 'paused') && (
                <button
                  type="button"
                  onClick={handleStop}
                  className="bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-sm sm:text-base px-6 py-3.5 rounded-2xl shadow-md flex items-center gap-2 transition-all cursor-pointer min-h-[56px]"
                >
                  <CheckCircle className="w-5 h-5 text-indigo-200" />
                  <span>Hoàn tất phản ứng</span>
                </button>
              )}

              {/* Reset Button */}
              {status !== 'idle' && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white p-3.5 rounded-2xl transition-all cursor-pointer min-h-[56px] min-w-[56px] flex items-center justify-center border border-slate-700"
                  title="Đặt lại đồng hồ về 0"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Reaction Parameters Bar: Nhiệt độ, Tốc độ khuấy */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <Thermometer className="w-4 h-4 text-rose-500" /> Nhiệt độ phản ứng (°C):
            </label>
            <input
              type="text"
              value={temperature || ''}
              onChange={(e) => onChange({ ...timerData, temperature: e.target.value })}
              placeholder="VD: Bể đá 0 - 5°C, Hồi lưu 80°C, RT (28°C)..."
              className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none min-h-[44px]"
            />
          </div>

          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5 mb-1.5">
              <RotateCw className="w-4 h-4 text-indigo-500" /> Tốc độ khuấy từ:
            </label>
            <input
              type="text"
              value={stirringSpeed || ''}
              onChange={(e) => onChange({ ...timerData, stirringSpeed: e.target.value })}
              placeholder="VD: 500 - 600 rpm, khuấy đều tạo phễu sâu..."
              className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs sm:text-sm font-medium focus:ring-1 focus:ring-indigo-500 focus:outline-none min-h-[44px]"
            />
          </div>
        </div>

        {/* Reaction Sessions History (Lịch sử các phiên khuấy) */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-600" />
                Lịch sử các phiên khuấy ({intervals?.length || 0})
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Tổng cộng: <strong className="font-mono text-indigo-700 font-bold">{formatTime(totalSeconds)}</strong> • Bạn có thể sửa giờ hoặc thêm/xoá phiên nếu quên bấm dừng
              </p>
            </div>

            {/* Button Add Manual Session */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer min-h-[38px]"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm phiên thủ công</span>
            </button>
          </div>

          {intervals && intervals.length > 0 ? (
            <div className="space-y-2.5">
              {intervals.map((session, index) => {
                const sessionNum = intervals.length - index;
                const startStr = session.startTime
                  ? new Date(session.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                  : '--:--';
                const endStr = session.endTime
                  ? new Date(session.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                  : '--:--';
                const dateStr = session.startTime ? new Date(session.startTime).toLocaleDateString('vi-VN') : '';
                const isRecentlyPaused = justPausedSessionId === session.id;

                return (
                  <div
                    key={session.id || index}
                    className={`p-3 rounded-xl border text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                      isRecentlyPaused
                        ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-300'
                        : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-2.5 flex-1">
                      <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-1 rounded text-xs font-mono flex-shrink-0">
                        Phiên #{sessionNum}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-slate-800 flex items-center gap-2 flex-wrap">
                          <span>{session.note || 'Phiên khuấy phản ứng'}</span>
                          {isRecentlyPaused && (
                            <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-1.5 py-0.5 rounded">
                              Vừa tạm dừng
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 text-xs mt-0.5">
                          {dateStr} • {startStr} ➔ {endStr}
                        </div>
                      </div>
                    </div>

                    {/* Time & Action buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                      <div className="font-mono font-bold text-indigo-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs sm:text-sm">
                        +{formatTime(session.durationSeconds)}
                      </div>

                      {/* Edit Button */}
                      <button
                        type="button"
                        onClick={() => handleStartEdit(session)}
                        className="bg-white hover:bg-indigo-50 text-indigo-700 border border-slate-200 hover:border-indigo-300 px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer min-h-[36px]"
                        title="Chỉnh sửa số giờ/phút hoặc ghi chú"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Sửa</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => handleDeleteSession(session.id)}
                        className="bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-200 hover:border-rose-300 p-1.5 rounded-lg transition-all cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                        title="Xoá phiên khuấy này"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs space-y-1">
              <div>Chưa có phiên khuấy nào được ghi nhận.</div>
              <div className="text-slate-500">
                Nhấn <strong>Bắt đầu</strong> để bấm giờ trực tiếp, hoặc nhấn <strong>Thêm phiên thủ công</strong> nếu đã khuấy trước đó.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL: CHỈNH SỬA PHIÊN KHUẤY (Điều chỉnh khi quên bấm dừng) */}
      {editingSession && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-indigo-600">
                <div className="p-2 bg-indigo-100 rounded-xl">
                  <Edit3 className="w-5 h-5 text-indigo-700" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900">
                    Chỉnh Sửa Giờ Phiên Khuấy
                  </h3>
                  <p className="text-xs text-slate-500">
                    Điều chỉnh lại thời gian thực tế nếu bạn quên bấm dừng
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Time inputs: Hours, Minutes, Seconds */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 block">
                Thời lượng khuấy thực tế của phiên này:
              </label>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Số giờ:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="999"
                    value={editingSession.hours}
                    onChange={(e) =>
                      setEditingSession({ ...editingSession, hours: e.target.value })
                    }
                    className="w-full text-center font-mono font-bold text-lg bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-1.5 focus:outline-none min-h-[44px]"
                    autoFocus
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Giờ (h)</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Số phút:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={editingSession.minutes}
                    onChange={(e) =>
                      setEditingSession({ ...editingSession, minutes: e.target.value })
                    }
                    className="w-full text-center font-mono font-bold text-lg bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-1.5 focus:outline-none min-h-[44px]"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Phút (m)</span>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                  <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                    Số giây:
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="59"
                    value={editingSession.seconds}
                    onChange={(e) =>
                      setEditingSession({ ...editingSession, seconds: e.target.value })
                    }
                    className="w-full text-center font-mono font-bold text-lg bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-1.5 focus:outline-none min-h-[44px]"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">Giây (s)</span>
                </div>
              </div>

              {/* Total preview */}
              <div className="bg-indigo-50 text-indigo-900 border border-indigo-200 px-3 py-2 rounded-xl text-xs flex items-center justify-between">
                <span>Thời gian quy đổi:</span>
                <span className="font-mono font-bold text-sm">
                  {formatTime(
                    (parseInt(editingSession.hours, 10) || 0) * 3600 +
                      (parseInt(editingSession.minutes, 10) || 0) * 60 +
                      (parseInt(editingSession.seconds, 10) || 0)
                  )}
                </span>
              </div>
            </div>

            {/* Note input */}
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Ghi chú phiên / Lý do chỉnh sửa:
              </label>
              <input
                type="text"
                value={editingSession.note}
                onChange={(e) =>
                  setEditingSession({ ...editingSession, note: e.target.value })
                }
                placeholder="VD: Quên bấm dừng, chỉnh lại 2h30m; Khuấy hồi lưu 80°C..."
                className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none min-h-[44px]"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm text-slate-600 hover:bg-slate-100 font-medium min-h-[44px]"
              >
                Hủy (Esc)
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md min-h-[44px] flex items-center gap-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Lưu thay đổi (Enter)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: THÊM PHIÊN KHUẤY THỦ CÔNG */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-indigo-600">
                <div className="p-2 bg-indigo-100 rounded-xl">
                  <PlusCircle className="w-5 h-5 text-indigo-700" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900">
                    Thêm Phiên Khuấy Thủ Công
                  </h3>
                  <p className="text-xs text-slate-500">
                    Dành cho các phiên đã khuấy trước đó hoặc quên bấm giờ
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Inputs: Date & Duration */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ngày thực hiện phiên:
                </label>
                <input
                  type="date"
                  value={manualSessionData.date}
                  onChange={(e) =>
                    setManualSessionData({ ...manualSessionData, date: e.target.value })
                  }
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none min-h-[44px]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Thời lượng khuấy:
                </label>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Số giờ:
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="999"
                      value={manualSessionData.hours}
                      onChange={(e) =>
                        setManualSessionData({ ...manualSessionData, hours: e.target.value })
                      }
                      className="w-full text-center font-mono font-bold text-lg bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-1.5 focus:outline-none min-h-[44px]"
                      autoFocus
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Giờ (h)</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Số phút:
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={manualSessionData.minutes}
                      onChange={(e) =>
                        setManualSessionData({ ...manualSessionData, minutes: e.target.value })
                      }
                      className="w-full text-center font-mono font-bold text-lg bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-1.5 focus:outline-none min-h-[44px]"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Phút (m)</span>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                    <label className="text-[11px] font-semibold text-slate-500 block mb-1">
                      Số giây:
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="59"
                      value={manualSessionData.seconds}
                      onChange={(e) =>
                        setManualSessionData({ ...manualSessionData, seconds: e.target.value })
                      }
                      className="w-full text-center font-mono font-bold text-lg bg-white border border-slate-300 focus:border-indigo-500 rounded-lg p-1.5 focus:outline-none min-h-[44px]"
                    />
                    <span className="text-[10px] text-slate-400 block mt-0.5">Giây (s)</span>
                  </div>
                </div>
              </div>

              {/* Note input */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Ghi chú phiên:
                </label>
                <input
                  type="text"
                  value={manualSessionData.note}
                  onChange={(e) =>
                    setManualSessionData({ ...manualSessionData, note: e.target.value })
                  }
                  placeholder="VD: Khuấy cách thủy 60°C qua đêm; Bổ sung thêm chất phản ứng..."
                  className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none min-h-[44px]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm text-slate-600 hover:bg-slate-100 font-medium min-h-[44px]"
              >
                Hủy (Esc)
              </button>
              <button
                type="button"
                onClick={handleSaveManualAdd}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-md min-h-[44px] flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm phiên (Enter)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
