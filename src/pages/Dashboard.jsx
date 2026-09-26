import React, { useState } from 'react';
import {
  FlaskConical,
  Plus,
  Search,
  Clock,
  Award,
  User,
  Copy,
  Trash2,
  RotateCcw,
  Eye,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Layers,
  Smartphone,
  Tablet,
  Laptop
} from 'lucide-react';
import { useExperiment } from '../context/ExperimentContext';
import { useAuth } from '../context/AuthContext';
import { useDevice } from '../context/DeviceContext';

export const Dashboard = ({ onSelectExperiment, onOpenNewModal }) => {
  const {
    experiments,
    trashedExperiments = [],
    duplicateExperiment,
    moveToTrash,
    restoreExperiment,
    permanentlyDeleteExperiment,
    emptyTrash
  } = useExperiment();
  const { currentUser } = useAuth();
  const { isIPhone, isIPad, isMac, deviceLabel } = useDevice();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const isTrashView = statusFilter === 'trash';
  const sourceList = isTrashView ? trashedExperiments : experiments;

  // Filtered experiments
  const filtered = sourceList.filter((exp) => {
    const matchesSearch =
      (exp.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exp.code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exp.researcher || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (exp.creatorName || '').toLowerCase().includes(searchTerm.toLowerCase());

    if (isTrashView) return matchesSearch;
    const matchesStatus = statusFilter === 'all' || exp.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate quick stats
  const totalCount = experiments.length;
  const runningCount = experiments.filter((e) => e.status === 'running').length;
  const completedCount = experiments.filter((e) => e.status === 'completed').length;

  // Average yield calculation
  const yields = experiments
    .map((e) => e.columnAndYield?.eppendorfYield?.yieldPercent)
    .filter((y) => typeof y === 'number' && y > 0);
  const avgYield =
    yields.length > 0 ? (yields.reduce((a, b) => a + b, 0) / yields.length).toFixed(1) : '--';

  const formatSecondsToHours = (seconds) => {
    if (!seconds) return '0h';
    const hrs = (seconds / 3600).toFixed(1);
    return `${hrs}h`;
  };

  const formatTrashDate = (isoStr) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return '';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'running':
        return (
          <span className="bg-emerald-100 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 border border-emerald-300 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Đang khuấy
          </span>
        );
      case 'paused':
        return (
          <span className="bg-amber-100 text-amber-800 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 border border-amber-300 whitespace-nowrap">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            Tạm dừng
          </span>
        );
      case 'workup':
        return (
          <span className="bg-blue-100 text-blue-800 text-xs px-2.5 py-1 rounded-full font-semibold border border-blue-300 whitespace-nowrap">
            Xử lý thô
          </span>
        );
      case 'purification':
        return (
          <span className="bg-purple-100 text-purple-800 text-xs px-2.5 py-1 rounded-full font-semibold border border-purple-300 whitespace-nowrap">
            Sắc ký cột
          </span>
        );
      case 'completed':
        return (
          <span className="bg-slate-100 text-slate-800 text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1 border border-slate-300 whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Hoàn thành
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full font-semibold border border-slate-200 whitespace-nowrap">
            Bản nháp
          </span>
        );
    }
  };

  const DeviceIcon = isIPhone ? Smartphone : isIPad ? Tablet : Laptop;

  return (
    <div
      className={`mx-auto px-3 sm:px-5 lg:px-6 py-4 sm:py-6 space-y-4 sm:space-y-6 ${
        isMac ? 'max-w-[1440px]' : isIPad ? 'max-w-6xl' : 'max-w-xl'
      }`}
    >
      {/* Top Banner & Quick Instrument Overview */}
      <div className="bg-slate-900 rounded-3xl p-4 sm:p-6 text-white shadow-lg border border-slate-800 relative overflow-hidden">
        <div
          className={`flex ${
            isIPhone ? 'flex-col gap-3.5' : 'flex-row items-center justify-between gap-5'
          }`}
        >
          <div>
            <div className="inline-flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 text-teal-300 text-[11px] font-semibold px-2.5 py-1 rounded-full mb-2">
              <DeviceIcon className="w-3.5 h-3.5 text-teal-400" />
              <span>Chế độ {deviceLabel}</span>
            </div>
            <h1
              className={`font-extrabold tracking-tight text-white ${
                isIPhone ? 'text-xl' : isIPad ? 'text-2xl' : 'text-3xl'
              }`}
            >
              Sổ Tay Nghiên Cứu Tổng Hợp Hóa Dược
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm mt-1 max-w-2xl">
              Ghi chép quy trình thực nghiệm, giám sát sắc ký bản mỏng, sắc ký cột và hiệu suất sản phẩm.
            </p>
          </div>

          <button
            onClick={onOpenNewModal}
            className={`bg-teal-600 hover:bg-teal-500 active:bg-teal-700 text-white font-bold px-5 py-3 rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all transform active:scale-95 cursor-pointer min-h-[46px] flex-shrink-0 ${
              isIPhone ? 'w-full' : ''
            }`}
          >
            <Plus className="w-5 h-5" />
            <span>Tạo Thí Nghiệm Mới</span>
          </button>
        </div>

        {/* Unified Laboratory Metric Instrument Bar */}
        <div
          className={`grid gap-2.5 sm:gap-4 mt-4 sm:mt-5 pt-4 sm:pt-5 border-t border-slate-800 ${
            isIPhone ? 'grid-cols-2' : 'grid-cols-4'
          }`}
        >
          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-800">
            <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
              <FlaskConical className="w-3.5 h-3.5 text-teal-400" /> Tổng phản ứng
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-white font-mono tabular-nums mt-1">
              {totalCount}
            </div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-800">
            <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-emerald-400" /> Đang khuấy
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-emerald-400 font-mono tabular-nums mt-1">
              {runningCount}
            </div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-800">
            <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" /> Hoàn thành
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-sky-400 font-mono tabular-nums mt-1">
              {completedCount}
            </div>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-2xl border border-slate-800">
            <div className="text-slate-400 text-xs font-medium flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-400" /> Hiệu suất TB
            </div>
            <div className="text-xl sm:text-2xl font-extrabold text-amber-400 font-mono tabular-nums mt-1">
              {avgYield}
              {avgYield !== '--' ? '%' : ''}
            </div>
          </div>
        </div>
      </div>

      {/* Scope Filter & Search Toolbar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl shadow-sm border border-slate-200 space-y-3">
        {/* User Identity Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs flex-shrink-0">
              {(currentUser?.displayName || currentUser?.email || 'U')[0]}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 flex items-center gap-2">
                <span>{currentUser?.displayName || 'Nghiên cứu viên'}</span>
                {currentUser?.studentId && (
                  <span className="text-[10px] bg-teal-50 text-teal-700 font-mono font-bold px-2 py-0.5 rounded-full border border-teal-200">
                    MSSV: {currentUser.studentId}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                {currentUser?.email || 'Danh sách thí nghiệm cá nhân'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                !isTrashView
                  ? 'bg-teal-50 text-teal-800 border-teal-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {experiments.length} dự án chính
            </button>

            <button
              type="button"
              onClick={() => setStatusFilter(isTrashView ? 'all' : 'trash')}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-colors cursor-pointer ${
                isTrashView
                  ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                  : trashedExperiments.length > 0
                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title="Mở thùng rác để xem hoặc khôi phục dự án đã xóa"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Thùng rác ({trashedExperiments.length})</span>
            </button>
          </div>
        </div>

        {/* Search Input & Status Buttons */}
        <div
          className={`flex ${
            isIPhone ? 'flex-col' : 'flex-row items-center justify-between'
          } gap-3`}
        >
          {/* Search Input */}
          <div className={`relative ${isIPhone ? 'w-full' : isIPad ? 'w-72' : 'w-96'}`}>
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={
                isTrashView
                  ? 'Tìm dự án trong thùng rác...'
                  : 'Tìm theo mã, tên phản ứng...'
              }
              className="w-full bg-slate-50 border border-slate-200 focus:border-teal-600 rounded-xl pl-10 pr-3 py-2 text-xs sm:text-sm focus:outline-none min-h-[42px]"
            />
          </div>

          {/* Status Filter Buttons + Trash Tab */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-0.5 no-scrollbar">
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
                className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors min-h-[40px] cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                {tab.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setStatusFilter('trash')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors min-h-[40px] flex items-center gap-1.5 cursor-pointer ${
                isTrashView
                  ? 'bg-rose-600 text-white shadow-sm'
                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Thùng rác ({trashedExperiments.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* TRASH MANAGEMENT BANNER WHEN VIEWING TRASH */}
      {isTrashView && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-700 rounded-xl flex-shrink-0 mt-0.5">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-rose-950 flex items-center gap-2">
                <span>Thùng rác dự án ({trashedExperiments.length})</span>
              </h2>
              <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                Các dự án bạn xóa sẽ nằm tạm tại đây để tránh xóa nhầm. Bạn có thể bấm vào từng dự án để xem lại chi tiết, nhấn <strong>Khôi phục</strong> để đưa về danh sách chính, hoặc nhấn <strong>Dọn sạch thùng rác</strong> để xóa vĩnh viễn khỏi cơ sở dữ liệu đám mây.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {trashedExperiments.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (
                    window.confirm(
                      `Bạn có chắc chắn muốn DỌN SẠCH THÙNG RÁC (${trashedExperiments.length} dự án)?\n\nToàn bộ các dự án trong thùng rác sẽ bị xóa hoàn toàn trên cơ sở dữ liệu đám mây và không thể khôi phục!`
                    )
                  ) {
                    emptyTrash();
                  }
                }}
                className="bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[42px] w-full sm:w-auto"
              >
                <Trash2 className="w-4 h-4" />
                <span>Dọn sạch thùng rác ({trashedExperiments.length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Experiment Cards Grid - Device Adaptive: 1 col on iPhone, 2 cols on iPad, 3 cols on Mac */}
      {filtered.length > 0 ? (
        <div
          className={`grid gap-4 sm:gap-5 ${
            isIPhone ? 'grid-cols-1' : isIPad ? 'grid-cols-2' : 'grid-cols-3'
          }`}
        >
          {filtered.map((exp) => {
            const activeReagents = (exp.stoichiometry || []).filter(
              (r) => r.type !== 'base_acid' && r.type !== 'solvent'
            );
            const limiting =
              activeReagents.find((r) => r.isLimiting) || activeReagents[0];
            const expMoleUnit = exp.units?.mole || 'mol';
            const limitingMolesVal = Number(limiting?.moles) || 0;
            const scaleMmol =
              expMoleUnit === 'mmol' ? limitingMolesVal : limitingMolesVal * 1000;
            const yieldPct = exp.columnAndYield?.eppendorfYield?.yieldPercent;
            const stirringTime = exp.reactionTimer?.totalSeconds || 0;
            const tlcCount = exp.tlcTimeline?.length || 0;

            return (
              <div
                key={exp.id}
                onClick={() => onSelectExperiment(exp.id)}
                className={`bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all p-4 sm:p-5 flex flex-col justify-between cursor-pointer group ${
                  isTrashView
                    ? 'border-rose-200 hover:border-rose-400 bg-rose-50/20'
                    : 'border-slate-200 hover:border-teal-400'
                }`}
              >
                <div>
                  {/* Top Bar: Code + Date + Status */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`font-mono tabular-nums font-bold text-xs px-2.5 py-1 rounded-lg border ${
                        isTrashView
                          ? 'bg-rose-50 text-rose-800 border-rose-200'
                          : 'bg-teal-50 text-teal-800 border-teal-200'
                      }`}
                    >
                      {exp.code || 'EXP'}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-mono tabular-nums">
                        {exp.date}
                      </span>
                      {isTrashView ? (
                        <span className="bg-rose-100 text-rose-800 text-[11px] px-2.5 py-1 rounded-full font-bold border border-rose-300 whitespace-nowrap">
                          Trong thùng rác
                        </span>
                      ) : (
                        getStatusBadge(exp.status)
                      )}
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
                    {exp.trashedAt && isTrashView ? (
                      <span className="text-[11px] text-rose-600 font-medium truncate ml-2">
                        Xóa lúc: {formatTrashDate(exp.trashedAt)}
                      </span>
                    ) : exp.labRoom ? (
                      <span className="text-[11px] text-slate-400 truncate ml-2">
                        {exp.labRoom}
                      </span>
                    ) : null}
                  </div>

                  {/* Chemistry Key Indicators */}
                  <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl">
                      <span className="text-slate-400 text-[11px] block">Chất giới hạn:</span>
                      <span className="font-semibold text-slate-800 truncate block">
                        {limiting?.name || 'Chưa chọn'}
                      </span>
                    </div>

                    <div className="bg-slate-50 p-2.5 rounded-xl">
                      <span className="text-slate-400 text-[11px] block">Quy mô:</span>
                      <span className="font-mono tabular-nums font-bold text-teal-700">
                        {scaleMmol > 0
                          ? `${scaleMmol < 1 ? scaleMmol.toFixed(2) : scaleMmol.toFixed(1)} mmol`
                          : '--'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bottom Bar: Stats & Quick Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs gap-2">
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="flex items-center gap-1" title="Tổng thời gian khuấy">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {formatSecondsToHours(stirringTime)}
                    </span>
                    <span className="flex items-center gap-1" title="Số bản sắc ký">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      {tlcCount} TLC
                    </span>
                    {yieldPct ? (
                      <span
                        className="flex items-center gap-1 text-emerald-600 font-bold font-mono tabular-nums"
                        title="Hiệu suất"
                      >
                        <Award className="w-3.5 h-3.5" />
                        {yieldPct.toFixed(1)}%
                      </span>
                    ) : null}
                  </div>

                  {/* Action Buttons: Normal View vs Trash View */}
                  <div
                    className="flex items-center gap-1.5"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isTrashView ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onSelectExperiment(exp.id)}
                          className="px-2.5 py-1.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold transition-colors min-h-[36px] flex items-center gap-1 cursor-pointer"
                          title="Xem chi tiết nội dung dự án"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Xem</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => restoreExperiment(exp.id)}
                          className="px-2.5 py-1.5 text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl font-bold transition-colors min-h-[36px] flex items-center gap-1 cursor-pointer"
                          title="Khôi phục dự án về danh sách chính"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Khôi phục</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Xóa vĩnh viễn dự án "${exp.code}: ${exp.title}" khỏi cơ sở dữ liệu?\n\nLưu ý: Hành động này sẽ xóa hoàn toàn dữ liệu trên đám mây và không thể khôi phục!`
                              )
                            ) {
                              permanentlyDeleteExperiment(exp.id);
                            }
                          }}
                          className="p-2 text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                          title="Xóa hoàn toàn khỏi cơ sở dữ liệu"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => duplicateExperiment(exp.id)}
                          className="p-2 text-teal-700 hover:bg-teal-50 rounded-xl transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
                          title="Nhân bản thí nghiệm"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (
                              window.confirm(
                                `Chuyển thí nghiệm "${exp.code}: ${exp.title}" vào Thùng rác?\n(Nếu xóa nhầm, bạn có thể vào mục Thùng rác để xem lại hoặc khôi phục)`
                              )
                            ) {
                              moveToTrash(exp.id);
                            }
                          }}
                          className="p-2 text-rose-700 hover:bg-rose-50 rounded-xl transition-colors min-h-[38px] min-w-[38px] flex items-center justify-center cursor-pointer"
                          title="Chuyển vào thùng rác"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 shadow-sm">
          {isTrashView ? (
            <>
              <Trash2 className="w-16 h-16 text-slate-300 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 mb-1">
                Thùng rác đang trống
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-4">
                Không có dự án nào trong thùng rác.
              </p>
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-5 py-2.5 rounded-2xl text-xs sm:text-sm shadow-sm inline-flex items-center gap-2 cursor-pointer"
              >
                <span>Quay lại danh sách dự án</span>
              </button>
            </>
          ) : (
            <>
              <FlaskConical className="w-16 h-16 text-teal-500 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-800 mb-1">
                {experiments.length === 0
                  ? 'Chưa có thí nghiệm nào'
                  : 'Không tìm thấy thí nghiệm phù hợp'}
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-4">
                {experiments.length === 0
                  ? 'Nhấn nút bên dưới để tạo thí nghiệm đầu tiên.'
                  : 'Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.'}
              </p>
              {experiments.length === 0 && (
                <button
                  onClick={onOpenNewModal}
                  className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-5 py-2.5 rounded-2xl text-sm shadow-md inline-flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tạo Thí Nghiệm Đầu Tiên</span>
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
