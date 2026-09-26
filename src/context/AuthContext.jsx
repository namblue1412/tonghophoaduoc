import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  isAuthAvailable,
  firebaseSignIn,
  firebaseSignUp,
  firebaseSignOut,
  subscribeFirebaseAuthState,
  hashPassword,
  saveLabAccount,
  findLabAccount
} from '../services/firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState(isAuthAvailable() ? 'firebase' : 'local');

  // Load initial user state - Require explicit authentication
  useEffect(() => {
    if (isAuthAvailable()) {
      setAuthMode('firebase');
      const unsubscribe = subscribeFirebaseAuthState((user) => {
        if (user) {
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName || user.email?.split('@')[0] || 'Sinh viên',
            isLocal: false
          });
        } else {
          // Check cached session
          const cachedLocal = localStorage.getItem('medchem_current_student');
          if (cachedLocal) {
            try {
              const parsed = JSON.parse(cachedLocal);
              if (parsed && parsed.uid && parsed.uid !== 'student-default') {
                setCurrentUser(parsed);
              } else {
                localStorage.removeItem('medchem_current_student');
                setCurrentUser(null);
              }
            } catch (e) {
              localStorage.removeItem('medchem_current_student');
              setCurrentUser(null);
            }
          } else {
            setCurrentUser(null);
          }
        }
        setLoading(false);
      });
      return () => unsubscribe();
    } else {
      // Local mode
      setAuthMode('local');
      const cached = localStorage.getItem('medchem_current_student');
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          // Purge old 'student-default' guest bypass so users MUST log in with password
          if (parsed && parsed.uid && parsed.uid !== 'student-default') {
            setCurrentUser(parsed);
          } else {
            localStorage.removeItem('medchem_current_student');
            setCurrentUser(null);
          }
        } catch (e) {
          localStorage.removeItem('medchem_current_student');
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    }
  }, []);

  // Register function with strict validation & SHA-256 salted password hashing
  const register = async ({ email, password, displayName, studentId }) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = displayName.trim();
    const cleanStudentId = (studentId || '').trim();

    if (!cleanEmail) {
      throw new Error('Vui lòng nhập Email hoặc tên tài khoản!');
    }
    if (!cleanName) {
      throw new Error('Vui lòng nhập Họ và tên sinh viên!');
    }
    if (!password || password.length < 4) {
      throw new Error('Mật khẩu phải có ít nhất 4 ký tự!');
    }

    if (isAuthAvailable()) {
      const user = await firebaseSignUp(cleanEmail, password, cleanName);
      const studentProfile = {
        uid: user.uid,
        email: user.email,
        displayName: cleanName || user.email?.split('@')[0],
        studentId: cleanStudentId,
        isLocal: false
      };
      setCurrentUser(studentProfile);
      localStorage.setItem('medchem_current_student', JSON.stringify(studentProfile));
      return studentProfile;
    } else {
      // Local & Firebase Realtime Database Account Mode
      // Check if account already exists
      const existingByEmail = await findLabAccount(cleanEmail);
      if (existingByEmail) {
        throw new Error(`Tài khoản với Email "${cleanEmail}" đã tồn tại! Vui lòng chuyển sang tab Đăng Nhập.`);
      }
      if (cleanStudentId) {
        const existingByStudentId = await findLabAccount(cleanStudentId);
        if (existingByStudentId) {
          throw new Error(`MSSV "${cleanStudentId}" đã được đăng ký! Vui lòng chuyển sang tab Đăng Nhập.`);
        }
      }

      // Hash password securely
      const passwordHash = await hashPassword(password);
      const newUid = `stu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      const newAccount = {
        uid: newUid,
        email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@lab.local`,
        displayName: cleanName,
        studentId: cleanStudentId,
        passwordHash,
        createdAt: new Date().toISOString(),
        isLocal: true
      };

      await saveLabAccount(newAccount);

      const sessionProfile = {
        uid: newAccount.uid,
        email: newAccount.email,
        displayName: newAccount.displayName,
        studentId: newAccount.studentId,
        isLocal: true
      };

      setCurrentUser(sessionProfile);
      localStorage.setItem('medchem_current_student', JSON.stringify(sessionProfile));
      return sessionProfile;
    }
  };

  // Login function with strict password verification
  const login = async ({ email, password }) => {
    const cleanIdentifier = email.trim();
    if (!cleanIdentifier) {
      throw new Error('Vui lòng nhập Email, MSSV hoặc Tên đăng nhập!');
    }
    if (!password) {
      throw new Error('Vui lòng nhập mật khẩu của bạn!');
    }

    if (isAuthAvailable()) {
      const user = await firebaseSignIn(cleanIdentifier, password);
      const studentProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email?.split('@')[0],
        isLocal: false
      };
      setCurrentUser(studentProfile);
      localStorage.setItem('medchem_current_student', JSON.stringify(studentProfile));
      return studentProfile;
    } else {
      // Local & Firebase Realtime Database Account Mode
      const found = await findLabAccount(cleanIdentifier);
      if (!found) {
        throw new Error('Tài khoản không tồn tại trên hệ thống! Vui lòng kiểm tra lại thông tin hoặc chọn tab "Tạo Tài Khoản" để đăng ký.');
      }

      // Verify Password Hash
      const inputHash = await hashPassword(password);
      if (found.passwordHash) {
        if (found.passwordHash !== inputHash) {
          throw new Error('Mật khẩu không chính xác! Vui lòng kiểm tra lại.');
        }
      } else {
        // If legacy account had no password hash, bind it to this password
        found.passwordHash = inputHash;
        await saveLabAccount(found);
      }

      const sessionProfile = {
        uid: found.uid,
        email: found.email,
        displayName: found.displayName || found.email?.split('@')[0] || 'Sinh viên',
        studentId: found.studentId || '',
        isLocal: true
      };

      setCurrentUser(sessionProfile);
      localStorage.setItem('medchem_current_student', JSON.stringify(sessionProfile));
      return sessionProfile;
    }
  };

  // Logout function
  const logout = async () => {
    if (isAuthAvailable()) {
      await firebaseSignOut();
    }
    localStorage.removeItem('medchem_current_student');
    setCurrentUser(null);
  };

  // List of local lab students
  const getLabStudents = () => {
    try {
      return JSON.parse(localStorage.getItem('medchem_lab_students') || '[]');
    } catch {
      return [];
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        authMode,
        isAuthModalOpen,
        setIsAuthModalOpen,
        register,
        login,
        logout,
        getLabStudents
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
