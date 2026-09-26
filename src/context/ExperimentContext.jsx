import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  saveExperimentData,
  deleteExperimentData,
  loadExperimentsData,
  isFirebaseConfigured,
  uploadImage
} from '../services/firebase';

const ExperimentContext = createContext();

export const ExperimentProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [allExperiments, setAllExperiments] = useState([]);
  const allExperimentsRef = useRef([]);
  const [activeExperimentId, setActiveExperimentId] = useState(null);
  const [syncMode, setSyncMode] = useState('local'); // 'firebase' | 'local'
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Initialize and load experiments
  useEffect(() => {
    // Purge old sample experiment if it exists in localStorage
    try {
      const existing = JSON.parse(localStorage.getItem('medchem_experiments') || '[]');
      const cleaned = existing.filter((e) => e.id !== 'EXP-2025-COU-01');
      if (cleaned.length !== existing.length) {
        localStorage.setItem('medchem_experiments', JSON.stringify(cleaned));
      }
    } catch (e) {
      // Ignore
    }

    const isCloud = isFirebaseConfigured();
    setSyncMode(isCloud ? 'firebase' : 'local');

    const unsubscribe = loadExperimentsData((loadedData, mode) => {
      setSyncMode(mode);
      const incoming = loadedData || [];
      // Merge with any newer in-memory state so active edits are never overwritten by an older network snapshot
      const currentMem = allExperimentsRef.current || [];
      const mergedMap = new Map();

      for (const item of incoming) {
        if (item && item.id) mergedMap.set(item.id, item);
      }
      for (const memItem of currentMem) {
        if (!memItem || !memItem.id) continue;
        const incItem = mergedMap.get(memItem.id);
        if (!incItem) {
          mergedMap.set(memItem.id, memItem);
        } else {
          const tMem = new Date(memItem.updatedAt || memItem.createdAt || 0).getTime();
          const tInc = new Date(incItem.updatedAt || incItem.createdAt || 0).getTime();
          if (tMem > tInc) {
            mergedMap.set(memItem.id, memItem);
          }
        }
      }

      const finalData = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.updatedAt || b.date || 0) - new Date(a.updatedAt || a.date || 0)
      );
      allExperimentsRef.current = finalData;
      setAllExperiments(finalData);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Strict Per-User Data Isolation: Each student only sees their own experiments!
  const experiments = useMemo(() => {
    if (!currentUser) return [];

    return allExperiments.filter((exp) => {
      // 1. Matches creatorId
      if (exp.creatorId && currentUser.uid && exp.creatorId === currentUser.uid) {
        return true;
      }
      // 2. Matches creatorEmail
      if (exp.creatorEmail && currentUser.email && exp.creatorEmail.trim().toLowerCase() === currentUser.email.trim().toLowerCase()) {
        return true;
      }
      // 3. Matches researcher display name
      if (
        currentUser.displayName &&
        exp.researcher &&
        exp.researcher.trim().toLowerCase() === currentUser.displayName.trim().toLowerCase()
      ) {
        return true;
      }
      // 4. Matches Student ID (MSSV) in researcher or notes
      if (
        currentUser.studentId &&
        ((exp.researcher && exp.researcher.includes(currentUser.studentId)) ||
          (exp.notes && exp.notes.includes(currentUser.studentId)))
      ) {
        return true;
      }
      return false;
    });
  }, [allExperiments, currentUser]);

  // Keep activeExperimentId valid within user's own experiments
  useEffect(() => {
    if (experiments.length > 0) {
      setActiveExperimentId((prev) => (prev && experiments.some((e) => e.id === prev) ? prev : experiments[0].id));
    } else {
      setActiveExperimentId(null);
    }
  }, [experiments]);

  const activeExperiment = experiments.find((e) => e.id === activeExperimentId) || (experiments.length > 0 ? experiments[0] : null);

  // Save/Update experiment synchronously in ref + state and persist to LocalStorage, IndexedDB & Firebase
  const updateExperiment = async (id, updatedFields) => {
    if (!id) return;
    setIsSyncing(true);

    const baseList = allExperimentsRef.current.length > 0 ? allExperimentsRef.current : allExperiments;
    const target = baseList.find((e) => e.id === id);
    if (!target) {
      setIsSyncing(false);
      return;
    }

    const merged = {
      ...target,
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };

    const nextList = baseList.map((e) => (e.id === id ? merged : e));
    allExperimentsRef.current = nextList;
    setAllExperiments(nextList);

    try {
      await saveExperimentData(merged);
      setLastSaved(new Date());
    } catch (err) {
      console.error('Failed to save experiment:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // Create new experiment strictly tagged to currentUser
  const createNewExperiment = async (customMeta = {}) => {
    const newId = `EXP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Date.now()).slice(-4)}`;
    const newExperiment = {
      id: newId,
      code: customMeta.code || `SYN-${experiments.length + 1}`,
      title: customMeta.title || 'Thí nghiệm tổng hợp mới',
      researcher: currentUser?.displayName || customMeta.researcher || 'Nghiên cứu viên',
      labRoom: customMeta.labRoom || 'Phòng Thí Nghiệm Hóa Dược',
      creatorId: currentUser?.uid || null,
      creatorEmail: currentUser?.email || null,
      creatorName: currentUser?.displayName || currentUser?.email || 'Nghiên cứu viên',
      date: new Date().toISOString().split('T')[0],
      status: 'draft',
      // Configurable units: 'g' / 'mol' or 'mg' / 'mmol'
      units: {
        mass: customMeta.massUnit || 'g', // 'g' | 'mg'
        mole: customMeta.moleUnit || 'mol', // 'mol' | 'mmol'
      },
      targetMolecule: {
        name: customMeta.targetName || 'Sản phẩm mục tiêu',
        molecularFormula: '',
        molecularWeight: '0',
        smiles: '',
        appearance: ''
      },
      // Equipment / Glassware Preparation Checklist
      equipment: [
        { id: `eq-${Date.now()}-1`, name: 'Bình cầu 2 cổ 100 mL', quantity: 1, checked: false, notes: 'Sấy khô 110°C' },
        { id: `eq-${Date.now()}-2`, name: 'Sinh hàn hồi lưu', quantity: 1, checked: false, notes: 'Nối ống nước làm mát' },
        { id: `eq-${Date.now()}-3`, name: 'Cá từ khuấy', quantity: 1, checked: false, notes: 'Teflon sạch' },
        { id: `eq-${Date.now()}-4`, name: 'Bếp khuấy từ gia nhiệt', quantity: 1, checked: false, notes: 'Kiểm tra tốc độ khuấy' },
        { id: `eq-${Date.now()}-5`, name: 'Ống đong 50 mL', quantity: 1, checked: false, notes: 'Đong dung môi' },
        { id: `eq-${Date.now()}-6`, name: 'Phễu chiết 125 mL', quantity: 1, checked: false, notes: 'Chuẩn bị cho bước chiết' },
        { id: `eq-${Date.now()}-7`, name: 'Cốc Becher 100 mL', quantity: 2, checked: false, notes: 'Đựng pha hữu cơ/nước' }
      ],
      // Realistic Multi-Reagent Starting Template: SM + Reagent + Catalyst + Base/Acid + Solvent
      stoichiometry: [
        {
          id: `reagent-${Date.now()}-1`,
          type: 'starting_material',
          name: 'Chất tham gia 1',
          formula: '',
          mw: '150.0',
          purity: '99.0',
          density: '1.0',
          isLimiting: true,
          theoMass: '1.50',
          actualMass: '1.50',
          actualVolume: '0',
          moles: 0.0099,
          eq: 1.0,
          molarRatio: 1.0,
          notes: 'Chất giới hạn (Tỉ lệ mốc 1.00)'
        },
        {
          id: `reagent-${Date.now()}-2`,
          type: 'reagent',
          name: 'Thuốc thử 2',
          formula: '',
          mw: '120.0',
          purity: '98.0',
          density: '1.0',
          isLimiting: false,
          theoMass: '1.45',
          actualMass: '1.45',
          actualVolume: '1.45',
          moles: 0.0118,
          eq: 1.19,
          molarRatio: 1.19,
          notes: 'Thuốc thử chính (lấy dư)'
        },
        {
          id: `reagent-${Date.now()}-3`,
          type: 'catalyst',
          name: 'Xúc tác 3',
          formula: '',
          mw: '98.0',
          purity: '98.0',
          density: '1.84',
          isLimiting: false,
          theoMass: '0.15',
          actualMass: '0.15',
          actualVolume: '0.08',
          moles: 0.0015,
          eq: 0.15,
          molarRatio: 0.15,
          notes: '0.15 tỉ lệ mol xúc tác'
        },
        {
          id: `reagent-${Date.now()}-4`,
          type: 'base_acid',
          name: 'Dung dịch HCl 10%',
          formula: '',
          mw: '0',
          purity: '10.0',
          concentrationPercent: '10',
          density: '1.05',
          isLimiting: false,
          theoMass: '0',
          actualMass: '0',
          actualVolume: '5.0',
          moles: 0,
          eq: 0,
          molarRatio: 0,
          notes: 'Nhỏ giọt từ từ ở 0 - 5°C'
        },
        {
          id: `reagent-${Date.now()}-5`,
          type: 'solvent',
          name: 'Dichloromethane (DCM)',
          formula: '',
          mw: '84.93',
          purity: '99.5',
          density: '1.33',
          isLimiting: false,
          theoMass: '0',
          actualMass: '0',
          actualVolume: '20.0',
          moles: 0,
          eq: 0,
          molarRatio: 0,
          notes: 'Dung môi phản ứng chính'
        }
      ],
      reactionTimer: {
        status: 'idle',
        totalSeconds: 0,
        lastStartTime: null,
        temperature: 'Khuấy nhiệt độ phòng (RT)',
        intervals: []
      },
      tlcTimeline: [],
      workup: {
        quenching: '',
        extractionSolvent: '',
        washing: '',
        dryingAgent: 'Na2SO4 khan',
        rotavaporTemp: '40°C',
        rotavaporPressure: '',
        residueAppearance: '',
        crudeTubes: [
          { id: 'crude-tube-1', label: 'Ống 1', tareMass: '0', grossMass: '0', crudeMass: 0 }
        ],
        crudeTareMass: '0',
        crudeGrossMass: '0',
        crudeMass: '0',
        workupNotes: ''
      },
      columnAndYield: {
        columnParams: {
          silicaMass: '30',
          columnSize: '2.0 cm x 30 cm',
          eluentMode: 'gradient', // 'isocratic' | 'gradient'
          isocraticSystem: 'Hexan : EtOAc',
          isocraticRatio: '4 : 1',
          gradientStart: 'Hexan : EtOAc (9 : 1)',
          gradientEnd: 'Hexan : EtOAc (4 : 1)',
          eluentGradient: 'Hexan : EtOAc (9 : 1) -> (4 : 1)'
        },
        totalFractions: 10,
        fractions: Array.from({ length: 10 }, (_, i) => ({
          number: i + 1,
          tlcChecked: false,
          spotPattern: 'empty',
          group: null,
          note: ''
        })),
        fractionGroups: [],
        fractionTlcPlates: [],
        eppendorfYield: {
          tubes: [
            { id: 'tube-1', label: 'Ống 1', tareMass: '0', grossMass: '0', productMass: 0 }
          ],
          tubeTareMass: '0',
          tubeGrossMass: '0',
          productMass: 0,
          targetMW: '0',
          theoreticalYield: 0,
          yieldPercent: 0,
          purityHplc: '0',
          meltingPoint: '',
          productAppearance: '',
          fractionTlcImages: []
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const nextCreatedList = [newExperiment, ...allExperimentsRef.current];
    allExperimentsRef.current = nextCreatedList;
    setAllExperiments(nextCreatedList);
    setActiveExperimentId(newId);
    await saveExperimentData(newExperiment);
    setLastSaved(new Date());
    return newExperiment;
  };

  // Delete experiment
  const deleteExperiment = async (id) => {
    const nextDeletedList = allExperimentsRef.current.filter((e) => e.id !== id);
    allExperimentsRef.current = nextDeletedList;
    setAllExperiments(nextDeletedList);
    if (activeExperimentId === id) {
      const remaining = experiments.filter((e) => e.id !== id);
      setActiveExperimentId(remaining.length > 0 ? remaining[0].id : null);
    }
    await deleteExperimentData(id);
  };

  // Duplicate experiment
  const duplicateExperiment = async (id) => {
    const original =
      experiments.find((e) => e.id === id) ||
      allExperimentsRef.current.find((e) => e.id === id) ||
      allExperiments.find((e) => e.id === id);
    if (!original) return;

    const dupId = `EXP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Date.now()).slice(-4)}`;
    const duplicated = {
      ...JSON.parse(JSON.stringify(original)),
      id: dupId,
      code: `${original.code}-COPY`,
      title: `${original.title} (Bản sao)`,
      date: new Date().toISOString().split('T')[0],
      creatorId: currentUser?.uid || null,
      creatorEmail: currentUser?.email || null,
      creatorName: currentUser?.displayName || currentUser?.email || 'Nghiên cứu viên',
      researcher: currentUser?.displayName || original.researcher,
      status: 'draft',
      reactionTimer: {
        status: 'idle',
        totalSeconds: 0,
        lastStartTime: null,
        temperature: original.reactionTimer?.temperature || '',
        intervals: []
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const nextDupList = [duplicated, ...allExperimentsRef.current];
    allExperimentsRef.current = nextDupList;
    setAllExperiments(nextDupList);
    setActiveExperimentId(dupId);
    await saveExperimentData(duplicated);
    setLastSaved(new Date());
  };

  // Export all user's data to JSON
  const exportAllToJson = () => {
    if (experiments.length === 0) {
      alert('Chưa có dữ liệu thí nghiệm để xuất tệp JSON.');
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(experiments, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `MedChem_ELN_${currentUser?.displayName || 'Student'}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import from JSON
  const importFromJson = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const tagged = parsed.map((item) => ({
              ...item,
              creatorId: currentUser?.uid || item.creatorId,
              creatorEmail: currentUser?.email || item.creatorEmail,
              creatorName: currentUser?.displayName || item.creatorName,
              updatedAt: new Date().toISOString()
            }));
            for (const item of tagged) {
              await saveExperimentData(item);
            }
            const nextImportList = [...tagged, ...allExperimentsRef.current];
            allExperimentsRef.current = nextImportList;
            setAllExperiments(nextImportList);
            setActiveExperimentId(tagged[0].id);
            setLastSaved(new Date());
            resolve({ success: true, count: tagged.length });
          } else {
            reject(new Error('Tệp JSON không đúng định dạng danh sách thí nghiệm'));
          }
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  };

  return (
    <ExperimentContext.Provider
      value={{
        experiments, // Strictly filtered to currentUser
        allExperiments,
        activeExperiment,
        activeExperimentId,
        setActiveExperimentId,
        updateExperiment,
        createNewExperiment,
        deleteExperiment,
        duplicateExperiment,
        exportAllToJson,
        importFromJson,
        syncMode,
        isSyncing,
        lastSaved,
        uploadImage
      }}
    >
      {children}
    </ExperimentContext.Provider>
  );
};

export const useExperiment = () => {
  const context = useContext(ExperimentContext);
  if (!context) {
    throw new Error('useExperiment must be used within an ExperimentProvider');
  }
  return context;
};
