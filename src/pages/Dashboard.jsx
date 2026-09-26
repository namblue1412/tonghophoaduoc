import React, { useState } from 'react';
import {
  FlaskConical,
  Plus,
  Search,
  Filter,
  Clock,
  Award,
  Calendar,
  User,
  ChevronRight,
  Copy,
  Trash2,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Activity,
  Layers
} from 'lucide-react';
import { useExperiment } from '../context/ExperimentContext';
import { useAuth } from '../context/AuthContext';

export const Dashboard = ({ onSelectExperiment, onOpenNewModal }) => {
  const { experiments, duplicateExperiment, deleteExperiment } = useExperiment();
  const { currentUser, setIsAuthModalOpen } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [scopeFilter, setScopeFilter] = useState('all'); // 'all' | 'mine'

  // My experiment count
  const myExperimentsCount = experiments.filter(
    (exp) =>
      currentUser &&
      (exp.creatorId === currentUser.uid ||
        exp.creatorEmail === currentUser.email ||
        (currentUser.displayName &&
          (exp.researcher || '').toLowerCase().includes(currentUser.displayName.toLowerCase())))
  ).length;

  // Filtered experiments
  const filtered = experiments.filter((exp) => {
    const matchesSearch =
      (exp.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exp.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exp.researcher || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exp.creatorName || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || exp.status === statusFilter;

    const matchesScope =
      scopeFilter === 'all' ||
      !currentUser ||
      exp.creatorId === currentUser.uid ||
      exp.creatorEmail === currentUser.email ||
      (currentUser.displayName &&
        (exp.researcher || '').toLowerCase().includes(currentUser.displayName.toLowerCase()));

    return matchesSearch && matchesStatus && matchesScope;
  });

  // Calculate quick stats
  const totalCount = experiments.length;
  const runningCount = experiments.filter((e) => e.status === 'running').length;
  const completedCount = experiments.filter((e) => e.status === 'completed').length;
  
  // Average yield calculation
  const yields = experiments
    .map((e) => e.columnAndYield?.eppendorfYield?.yieldPercent)
    .filter((y) => typeof y === 'number' && y > 0);
  const avgYield = yields.length > 0 ? (yields.reduce((a, b) => a + b, 0) / yields.length).toFixed(1) : '--';

  const formatSecondsToHours = (seconds) => {
    if (!seconds) return '0h';
    const hrs = (seconds / 3600).toFixed(1);
    return `${hrs}h`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'running':
        return (
          <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 border border-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Đang khuấy
          </span>
        );
      case 'paused':
        return (
          <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 border border-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Tạm dừng
          </span>
        );
      case 'workup':
        return (
          <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-semibold border border-blue-300">
            Xử lý thô
          </span>
        );
      case 'purification':
        return (
          <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-1 rounded-full font-semibold border border-purple-300">
            Sắc ký cột
          </span>
        );
      case 'completed':
        return (
          <span className="bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 border border-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Hoàn thành
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full font-semibold border border-slate-200">
            Bản nháp
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner & Quick Instrument Overview */}
      <div className="bg-slate-900 rounded-3xl p-6 sm:p-7 text-white shadow-lg border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Sổ Tay Nghiên Cứu Tổng Hợp Hóa Dược
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
              Ghi chép quy trình thực nghiệm, giám sát sắc ký bản mỏng, sắc ký cột và hiệu suất sản phẩm.
            </p>
          </div>

          <button
            onClick={onOpenNewModal}
            className="bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold px-5 py-3 rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer min-h-[48px] self-start md:self-auto"
          >
            <Plus className="w-5 h-5" />
            <span>Tạo Thí Nghiệm Mới</span>
          </button>
        </div>

        {/* Unified Laboratory Metric Instrument Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-850/80 p-3 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-teal-400" /> Tổng phản ứng
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-white font-mono tabular-nums mt-1">
              {totalCount}
            </div>
          </div>

          <div className="bg-slate-850/80 p-3 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" /> Đang khuấy
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono tabular-nums mt-1">
              {runningCount}
            </div>
          </div>

          <div className="bg-slate-850/80 p-3 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" /> Hoàn thành
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-sky-400 font-mono tabular-nums mt-1">
              {completedCount}
            </div>
          </div>

          <div className="bg-slate-850/80 p-3 rounded-xl border border-slate-800">
            <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" /> Hiệu suất TB
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-amber-400 font-mono tabular-nums mt-1">
              {avgYield}{avgYield !== '--' ? '%' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Scope Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
        {/* Scope Tabs: Lab-wide vs Personal */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="inline-flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setScopeFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                scopeFilter === 'all'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả trong Lab ({experiments.length})
            </button>
            <button
              type="button"
              onClick={() => {
                if (!currentUser) {
                  setIsAuthModalOpen(true);
                } else {
                  setScopeFilter('mine');
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                scopeFilter === 'mine'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Thí nghiệm của tôi</span>
              {currentUser && (
                <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded-full text-[10px] font-mono">
                  {myExperimentsCount}
                </span>
              )}
            </button>
          </div>

          {!currentUser && (
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(true)}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Đăng nhập để lọc thí nghiệm cá nhân</span>
            </button>
          )}
        </div>

        {/* Search Input & Status Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã, tên phản ứng, tác giả..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-500 rounded-xl pl-10 pr-3 py-2 text-xs sm:text-sm focus:outline-none min-h-[44px]"
            />
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'running', label: 'Đang khuấy' },
              { id: 'paused', label: 'Tạm dừng' },
              { id: 'workup', label: 'Xử lý thô' },
              { id: 'completed', label: 'Hoàn thành' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors min-h-[38px] cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Experiment Cards Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((exp) => {
            const limiting = exp.stoichiometry?.find((r) => r.isLimiting) || exp.stoichiometry?.[0];
            const yieldPct = exp.columnAndYield?.eppendorfYield?.yieldPercent;
            const stirringTime = exp.reactionTimer?.totalSeconds || 0;
            const tlcCount = exp.tlcTimeline?.length || 0;

            return (
              <div
                key={exp.id}
                onClick={() => onSelectExperiment(exp.id)}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-300 transition-all p-5 flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  {/* Top Bar: Code + Date + Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="font-mono font-bold text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg border border-indigo-200">
                      {exp.code || 'EXP'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono">{exp.date}</span>
                      {getStatusBadge(exp.status)}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors line-clamp-2">
                    {exp.title || 'Thí nghiệm chưa đặt tên'}
                  </h3>

                  {/* Researcher & Lab Room */}
                  <div className="flex items-center justify-between text-xs text-slate-500 mt-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <User className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{exp.researcher || 'Nghiên cứu viên'}</span>
                    </div>
                    {currentUser &&
                      (exp.creatorId === currentUser.uid ||
                        exp.creatorEmail === currentUser.email ||
                        (currentUser.displayName &&
                          (exp.researcher || '').toLowerCase().includes(currentUser.displayName.toLowerCase()))) && (
                        <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ml-1">
                          Của tôi
                        </span>
                      )}
                  </div>

                  {/* Chemistry Key Indicators */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-slate-400 text-[11px] block">Chất giới hạn:</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {limiting?.name || 'Chưa chọn'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2 rounded-xl">
                      <span className="text-slate-400 text-[11px] block">Quy mô:</span>
                      <span className="font-mono font-bold text-indigo-700">
                        {limiting?.moles ? `${(limiting.moles * 1000).toFixed(1)} mmol` : '--'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Bar: Stats & Quick Actions */}
                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="flex items-center gap-1" title="Tổng thời gian khuấy">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formatSecondsToHours(stirringTime)}
                    </span>
                    <span className="flex items-center gap-1" title="Số bản sắc ký">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      {tlcCount} bản sắc ký
                    </span>
                    {yieldPct ? (
                      <span className="flex items-center gap-1 text-emerald-600 font-bold" title="Hiệu suất">
                        <Award className="w-3.5 h-3.5" />
                        {yieldPct.toFixed(1)}%
                      </span>
                    ) : null}
                  </div>

                  {/* Duplicate / Delete Buttons */}
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => duplicateExperiment(exp.id)}
                      className="p-2 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                      title="Nhân bản thí nghiệm"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Bạn có chắc muốn xóa thí nghiệm ${exp.code}?`)) {
                          deleteExperiment(exp.id);
                        }
                      }}
                      className="p-2 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                      title="Xóa thí nghiệm"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
          <FlaskConical className="w-16 h-16 text-indigo-400 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800 mb-1">
            {experiments.length === 0 ? 'Sổ Tay Thí Nghiệm Đang Trống' : 'Không tìm thấy thí nghiệm nào'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-4">
            {experiments.length === 0
              ? 'Hệ thống đã kết nối trực tiếp Firebase Realtime Database. Hãy nhấn nút bên dưới để tạo thí nghiệm đầu tiên và kiểm tra toàn diện các module!'
              : 'Không có kết quả khớp với bộ lọc tìm kiếm. Hãy thử từ khóa khác hoặc bấm nút bên dưới để tạo mới.'}
          </p>
          <button
            onClick={onOpenNewModal}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-6 py-3 rounded-2xl text-xs sm:text-sm shadow-md flex items-center gap-2 mx-auto cursor-pointer min-h-[46px]"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo thí nghiệm đầu tiên</span>
          </button>
        </div>
      )}
    </div>
  );
};
