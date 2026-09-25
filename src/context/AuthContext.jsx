import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  isAuthAvailable,
  firebaseSignIn,
  firebaseSignUp,
  firebaseSignOut,
  subscribeFirebaseAuthState
} from '../services/firebase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState(isAuthAvailable() ? 'firebase' : 'local');

  // Load initial user state
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
          // If no firebase user, check if there's a cached local student profile
          const cachedLocal = localStorage.getItem('medchem_current_student');
          if (cachedLocal) {
            try {
              setCurrentUser(JSON.parse(cachedLocal));
            } catch (e) {
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
      // Local profile mode
      setAuthMode('local');
      const cached = localStorage.getItem('medchem_current_student');
      if (cached) {
        try {
          setCurrentUser(JSON.parse(cached));
        } catch (e) {
          setCurrentUser(null);
        }
      } else {
        // Default to a friendly student guest if none exists
        const defaultStudent = {
          uid: 'student-default',
          email: 'sinhvien@lab.vn',
          displayName: 'Sinh viên nghiên cứu',
          studentId: '20210001',
          isLocal: true
        };
        localStorage.setItem('medchem_current_student', JSON.stringify(defaultStudent));
        setCurrentUser(defaultStudent);
      }
      setLoading(false);
    }
  }, []);

  // Register function
  const register = async ({ email, password, displayName, studentId }) => {
    if (isAuthAvailable()) {
      const user = await firebaseSignUp(email, password, displayName);
      const studentProfile = {
        uid: user.uid,
        email: user.email,
        displayName: displayName || user.email?.split('@')[0],
        studentId: studentId || '',
        isLocal: false
      };
      setCurrentUser(studentProfile);
      localStorage.setItem('medchem_current_student', JSON.stringify(studentProfile));
      return studentProfile;
    } else {
      // Local mode register
      const cleanEmail = email.trim().toLowerCase();
      const newStudent = {
        uid: `student-${Date.now()}`,
        email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@lab.local`,
        displayName: displayName.trim() || 'Sinh viên',
        studentId: studentId ? studentId.trim() : '',
        isLocal: true
      };

      const existingStudents = JSON.parse(localStorage.getItem('medchem_lab_students') || '[]');
      const filtered = existingStudents.filter((s) => s.email !== newStudent.email);
      localStorage.setItem('medchem_lab_students', JSON.stringify([...filtered, newStudent]));

      setCurrentUser(newStudent);
      localStorage.setItem('medchem_current_student', JSON.stringify(newStudent));
      return newStudent;
    }
  };

  // Login function
  const login = async ({ email, password }) => {
    if (isAuthAvailable()) {
      const user = await firebaseSignIn(email, password);
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
      // Local mode login
      const cleanEmail = email.trim().toLowerCase();
      const existingStudents = JSON.parse(localStorage.getItem('medchem_lab_students') || '[]');
      let found = existingStudents.find(
        (s) => s.email === cleanEmail || s.studentId === email.trim() || s.displayName.toLowerCase() === email.toLowerCase()
      );

      if (!found) {
        // Auto-create local profile if typing a new name/student ID
        found = {
          uid: `student-${Date.now()}`,
          email: cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@lab.local`,
          displayName: email.includes('@') ? email.split('@')[0] : email,
          studentId: '',
          isLocal: true
        };
        localStorage.setItem('medchem_lab_students', JSON.stringify([...existingStudents, found]));
      }

      setCurrentUser(found);
      localStorage.setItem('medchem_current_student', JSON.stringify(found));
      return found;
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
