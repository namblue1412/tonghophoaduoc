import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { User, LogIn, UserPlus, X, Lock, Mail, GraduationCap, ShieldCheck, FlaskConical, AlertCircle, CheckCircle2 } from 'lucide-react';

export const AuthModal = ({ isOpen = true, onClose, isPage = false }) => {
  const { login, register, authMode } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' | 'register'

  // Form states
  const [displayName, setDisplayName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen && !isPage) return;
    setErrorMsg('');
    setSuccessMsg('');
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isPage && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isPage]);

  if (!isOpen && !isPage) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      if (tab === 'login') {
        if (!email.trim()) {
          throw new Error('Vui lòng nhập Email, Mã số sinh viên hoặc Tên tài khoản!');
        }
        if (!password) {
          throw new Error('Vui lòng nhập mật khẩu!');
        }
        await login({ email: email.trim(), password });
        setSuccessMsg('Đăng nhập thành công!');
        if (!isPage && onClose) {
          setTimeout(onClose, 400);
        }
      } else {
        if (!displayName.trim()) {
          throw new Error('Vui lòng nhập Họ và tên sinh viên!');
        }
        if (!email.trim()) {
          throw new Error('Vui lòng nhập Email hoặc tên tài khoản!');
        }
        if (password.length < 4) {
          throw new Error('Mật khẩu tối thiểu 4 ký tự!');
        }
        await register({
          email: email.trim(),
          password,
          displayName: displayName.trim(),
          studentId: studentId.trim()
        });
        setSuccessMsg('Tạo tài khoản thành công!');
        if (!isPage && onClose) {
          setTimeout(onClose, 400);
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      let msg = err.message || 'Đã có lỗi xảy ra';
      if (msg.includes('auth/invalid-email')) msg = 'Định dạng Email không hợp lệ';
      if (msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password') || msg.includes('auth/invalid-credential')) {
        msg = 'Email/MSSV hoặc mật khẩu không chính xác!';
      }
      if (msg.includes('auth/email-already-in-use')) msg = 'Email này đã được đăng ký tài khoản!';
      if (msg.includes('auth/weak-password')) msg = 'Mật khẩu quá ngắn (tối thiểu 6 ký tự)!';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const content = (
    <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-200 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-3 text-indigo-700">
          <div className="p-3 bg-gradient-to-br from-indigo-600 to-teal-500 rounded-2xl shadow-md text-white">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-extrabold text-lg sm:text-xl text-slate-900 tracking-tight">
              {tab === 'login' ? 'Đăng Nhập Sổ Tay Hóa Dược' : 'Tạo Tài Khoản Sinh Viên'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Phòng Thí Nghiệm Hóa Dược • Quản lý nhật ký nghiên cứu
            </p>
          </div>
        </div>
        {!isPage && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Security Privacy Notice */}
      <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-3 text-xs text-indigo-900 flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed text-[11px] sm:text-xs">
          <strong>Bảo mật phòng thí nghiệm:</strong> Mỗi sinh viên đăng nhập bằng tài khoản của mình và <strong>chỉ xem được các dự án thí nghiệm của chính mình</strong>.
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1">
        <button
          type="button"
          onClick={() => {
            setTab('login');
            setErrorMsg('');
            setSuccessMsg('');
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all min-h-[40px] cursor-pointer ${
            tab === 'login' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Đăng Nhập</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('register');
            setErrorMsg('');
            setSuccessMsg('');
          }}
          className={`flex-1 py-2 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all min-h-[40px] cursor-pointer ${
            tab === 'register' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Tạo Tài Khoản Mới</span>
        </button>
      </div>

      {/* Feedback Messages */}
      {errorMsg && (
        <div className="bg-rose-50 text-rose-700 text-xs p-3 rounded-2xl border border-rose-200 flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 text-xs p-3 rounded-2xl border border-emerald-200 flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {tab === 'register' && (
          <>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Họ và tên sinh viên (*):
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  required
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="VD: Nguyễn Văn Nam"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Mã số sinh viên (MSSV):
              </label>
              <div className="relative">
                <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
                <input
                  type="text"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="VD: 20214567"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
                />
              </div>
            </div>
          </>
        )}

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            {tab === 'login' ? 'Email / MSSV / Tên đăng nhập (*):' : 'Email hoặc Tên tài khoản (*):'}
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={tab === 'login' ? 'VD: sinhvien@lab.vn hoặc MSSV' : 'VD: sinhvien@lab.vn'}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
              autoFocus={tab === 'login'}
            />
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-slate-700 block mb-1">
            Mật khẩu (*):
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Nhập mật khẩu của bạn..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
            />
          </div>
          {tab === 'register' && (
            <p className="text-[11px] text-slate-400 mt-1">
              Mật khẩu được mã hóa an toàn bằng SHA-256 trước khi lưu.
            </p>
          )}
        </div>

        {/* Submit button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-400 text-white font-bold text-xs sm:text-sm py-3 rounded-2xl shadow-md flex items-center justify-center gap-2 transition-all min-h-[46px] cursor-pointer"
          >
            {isSubmitting ? (
              <span>Đang kiểm tra bảo mật...</span>
            ) : tab === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Đăng Nhập Vào Lab</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Hoàn Tất Tạo Tài Khoản</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  if (isPage) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 pt-safe pb-safe">
        {content}
        <div className="mt-6 text-center text-xs text-slate-400">
          MedChem ELN • Sổ Tay Nghiên Cứu Tổng Hợp Hóa Dược • Phiên bản Lab 2026
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 pt-safe pb-safe animate-in fade-in">
      {content}
    </div>
  );
};
