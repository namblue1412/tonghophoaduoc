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
  CheckCircle
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
  const [pauseNoteModal, setPauseNoteModal] = useState(false);
  const [tempPauseNote, setTempPauseNote] = useState('');
  const intervalRef = useRef(null);

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

  const grandTotalSeconds = totalSeconds + (status === 'running' ? currentSessionSeconds : 0);

  // START REACTION
  const handleStart = () => {
    const nowIso = new Date().toISOString();
    onChange({
      ...timerData,
      status: 'running',
      lastStartTime: nowIso,
    });
    if (experimentStatus !== 'running') {
      onStatusChange?.('running');
    }
  };

  // OPEN PAUSE MODAL
  const handleOpenPause = () => {
    setTempPauseNote('');
    setPauseNoteModal(true);
  };

  // CONFIRM PAUSE
  const confirmPause = () => {
    const nowIso = new Date().toISOString();
    const sessionDuration = currentSessionSeconds;
    const newTotal = totalSeconds + sessionDuration;

    const newInterval = {
      id: `interval-${Date.now()}`,
      startTime: lastStartTime || nowIso,
      endTime: nowIso,
      durationSeconds: sessionDuration,
      note: tempPauseNote.trim() || 'Tạm dừng ngắt quãng phản ứng'
    };

    onChange({
      ...timerData,
      status: 'paused',
      totalSeconds: newTotal,
      lastStartTime: null,
      intervals: [newInterval, ...(intervals || [])]
    });

    setPauseNoteModal(false);
    setTempPauseNote('');
    if (experimentStatus !== 'paused') {
      onStatusChange?.('paused');
    }
  };

  const confirmPauseRef = useRef(confirmPause);
  confirmPauseRef.current = confirmPause;

  useEffect(() => {
    if (!pauseNoteModal) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setPauseNoteModal(false);
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey || e.target.tagName !== 'TEXTAREA')) {
        e.preventDefault();
        confirmPauseRef.current();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pauseNoteModal]);

  // RESUME
  const handleResume = () => {
    handleStart();
  };

  // STOP / FINISH REACTION
  const handleStop = () => {
    if (window.confirm('Bạn có chắc muốn kết thúc giai đoạn khuấy phản ứng để chuyển sang Xử lý thô (Workup)?')) {
      let finalTotal = totalSeconds;
      let updatedIntervals = [...(intervals || [])];

      if (status === 'running') {
        const nowIso = new Date().toISOString();
        finalTotal += currentSessionSeconds;
        updatedIntervals.unshift({
          id: `interval-${Date.now()}`,
          startTime: lastStartTime || nowIso,
          endTime: nowIso,
          durationSeconds: currentSessionSeconds,
          note: 'Kết thúc khuấy phản ứng'
        });
      }

      onChange({
        ...timerData,
        status: 'stopped',
        totalSeconds: finalTotal,
        lastStartTime: null,
        intervals: updatedIntervals
      });

      onStatusChange?.('workup');
    }
  };

  // RESET TIMER
  const handleReset = () => {
    if (window.confirm('Cảnh báo: Đặt lại toàn bộ thời gian phản ứng về 00:00:00?')) {
      onChange({
        ...timerData,
        status: 'idle',
        totalSeconds: 0,
        lastStartTime: null,
        intervals: []
      });
      onStatusChange?.('draft');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden card-print">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl shadow-md text-white">
            <Timer className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              2. Thời Gian Phản Ứng
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Theo dõi thời gian khuấy và lưu lịch sử các phiên phản ứng
            </p>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          {status === 'running' && (
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span> Đang đếm thời gian
            </span>
          )}
          {status === 'paused' && (
            <span className="bg-amber-500/20 text-amber-300 border border-amber-400/30 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span> Tạm dừng (Lưu trữ)
            </span>
          )}
          {status === 'stopped' && (
            <span className="bg-slate-700 text-slate-300 border border-slate-600 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Đã hoàn tất khuấy
            </span>
          )}
          {status === 'idle' && (
            <span className="bg-slate-800 text-slate-400 border border-slate-700 px-3 py-1 rounded-full text-xs font-semibold">
              Chưa bắt đầu
            </span>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Main Big Digital Clock & Primary Lab Action Buttons */}
        <div className="bg-slate-900 rounded-2xl p-5 sm:p-7 text-white text-center shadow-inner relative overflow-hidden border border-slate-800">
          {/* Subtle lab grid background decoration */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:2rem_2rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-20 pointer-events-none"></div>

          <div className="relative z-10">
            <div className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-1">
              Tổng thời gian khuấy thực tế (Accumulated Stirring Time)
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

            {/* Current Session Sub-timer */}
            {status === 'running' && (
              <div className="text-xs sm:text-sm text-emerald-300/80 font-mono mt-1">
                Phiên hiện tại: +{formatTime(currentSessionSeconds)}
              </div>
            )}

            {/* Big 3 Glove-Friendly Action Buttons */}
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-4 no-print">
              {status === 'idle' && (
                <button
                  type="button"
                  onClick={handleStart}
                  className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-base sm:text-lg px-8 py-3.5 rounded-2xl shadow-lg shadow-emerald-900/40 flex items-center gap-2.5 transition-all transform active:scale-95 cursor-pointer min-h-[56px] min-w-[180px] justify-center"
                >
                  <Play className="w-6 h-6 fill-current" />
                  <span>Bắt đầu (Start)</span>
                </button>
              )}

              {status === 'running' && (
                <button
                  type="button"
                  onClick={handleOpenPause}
                  className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold text-base sm:text-lg px-8 py-3.5 rounded-2xl shadow-lg shadow-amber-950/40 flex items-center gap-2.5 transition-all transform active:scale-95 cursor-pointer min-h-[56px] min-w-[180px] justify-center"
                >
                  <Pause className="w-6 h-6 fill-current" />
                  <span>Tạm dừng (Pause)</span>
                </button>
              )}

              {status === 'paused' && (
                <button
                  type="button"
                  onClick={handleResume}
                  className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-base sm:text-lg px-8 py-3.5 rounded-2xl shadow-lg shadow-emerald-900/40 flex items-center gap-2.5 transition-all transform active:scale-95 cursor-pointer min-h-[56px] min-w-[180px] justify-center"
                >
                  <Play className="w-6 h-6 fill-current" />
                  <span>Tiếp tục (Resume)</span>
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

        {/* Reaction Intermittent Logs (Lịch sử các phiên ngắt quãng) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-600" />
              Lịch sử các phiên khuấy ({intervals?.length || 0})
            </h3>
            <span className="text-xs text-slate-500">
              Chi tiết các lần khuấy
            </span>
          </div>

          {intervals && intervals.length > 0 ? (
            <div className="space-y-2.5">
              {intervals.map((session, index) => {
                const sessionNum = intervals.length - index;
                const startStr = session.startTime ? new Date(session.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                const endStr = session.endTime ? new Date(session.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--';
                const dateStr = session.startTime ? new Date(session.startTime).toLocaleDateString('vi-VN') : '';

                return (
                  <div
                    key={session.id || index}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex items-start sm:items-center gap-2.5">
                      <span className="bg-indigo-100 text-indigo-800 font-bold px-2 py-1 rounded text-xs font-mono flex-shrink-0">
                        Phiên #{sessionNum}
                      </span>
                      <div>
                        <div className="font-semibold text-slate-800">
                          {session.note || 'Phiên khuấy phản ứng'}
                        </div>
                        <div className="text-slate-500 text-xs mt-0.5">
                          {dateStr} • {startStr} ➔ {endStr}
                        </div>
                      </div>
                    </div>

                    <div className="font-mono font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-slate-200 self-end sm:self-center">
                      +{formatTime(session.durationSeconds)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
              Chưa có phiên ngắt quãng nào. Nhấn "Bắt đầu" để bấm giờ phản ứng.
            </div>
          )}
        </div>
      </div>

      {/* Pause Note Modal Dialog */}
      {pauseNoteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-2 bg-amber-100 rounded-xl">
                <Pause className="w-5 h-5 fill-current" />
              </div>
              <h3 className="font-bold text-base sm:text-lg text-slate-900">
                Tạm dừng phiên phản ứng
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-600">
              Thời gian phiên này: <strong className="font-mono text-indigo-600 font-bold">{formatTime(currentSessionSeconds)}</strong>. Vui lòng ghi lại lý do ngắt quãng để lưu vào nhật ký thí nghiệm:
            </p>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Lý do tạm dừng / Trạng thái bảo quản:
              </label>
              <textarea
                rows="3"
                value={tempPauseNote}
                onChange={(e) => setTempPauseNote(e.target.value)}
                placeholder="VD: Cất bình phản ứng vào tủ lạnh 4°C qua đêm; Nghỉ trưa; Bổ sung thêm dung môi..."
                className="w-full bg-slate-50 border border-slate-300 focus:border-indigo-500 rounded-xl p-3 text-xs sm:text-sm focus:ring-1 focus:ring-indigo-500 focus:outline-none min-h-[48px]"
                autoFocus
              ></textarea>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPauseNoteModal(false)}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm text-slate-600 hover:bg-slate-100 font-medium min-h-[44px]"
              >
                Hủy (Esc)
              </button>
              <button
                type="button"
                onClick={confirmPause}
                className="px-5 py-2.5 rounded-xl text-xs sm:text-sm bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold shadow-md min-h-[44px]"
              >
                Xác nhận Tạm dừng (Enter)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
