import React, { createContext, useContext, useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import {
  saveExperimentData,
  deleteExperimentData,
  permanentlyDeleteExperimentsBatch,
  loadExperimentsData,
  isFirebaseConfigured,
  uploadImage,
  importDemoExperiments,
  refreshDemoData,
  isDeletedRecord
} from '../services/firebase';
import { changedFields, deriveExperiment, mergePatch } from '../domain/experiment.js';
import { prepareDemoImport } from '../domain/demoImport.js';
import { localDate } from '../domain/chemistry.js';

const ExperimentContext = createContext();

export const ExperimentProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [allExperiments, setAllExperiments] = useState([]);
  const allExperimentsRef = useRef([]);
  const pendingSaveIdsRef = useRef(new Map());
  const [syncError, setSyncError] = useState('');
  const beginSave = (id) => {
    pendingSaveIdsRef.current.set(id, (pendingSaveIdsRef.current.get(id) || 0) + 1);
    setIsSyncing(true);
    setSyncError('');
  };
  const endSave = (id) => {
    const count = (pendingSaveIdsRef.current.get(id) || 1) - 1;
    if (count > 0) pendingSaveIdsRef.current.set(id, count);
    else pendingSaveIdsRef.current.delete(id);
    setIsSyncing(pendingSaveIdsRef.current.size > 0);
    if (!pendingSaveIdsRef.current.size) void refreshDemoData();
  };
  const requireSuccess = (result) => {
    if (!result?.success) throw result?.error || new Error('Không lưu được dữ liệu demo.');
    if (!result.pending) setLastSaved(new Date());
    return result;
  };
  const [activeExperimentId, setActiveExperimentId] = useState(null);
  const [syncMode, setSyncMode] = useState('firebase');
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Initialize and subscribe directly to Firebase Cloud
  useEffect(() => {
    allExperimentsRef.current = [];
    setAllExperiments([]);
    setActiveExperimentId(null);
    setSyncError('');
    setLastSaved(null);
    pendingSaveIdsRef.current.clear();
    setIsSyncing(false);
    if (!currentUser?.uid) return;
    const isCloud = isFirebaseConfigured();
    setSyncMode(isCloud ? 'firebase' : 'local');

    const unsubscribe = loadExperimentsData((loadedData, mode) => {
      setSyncMode(mode);
      const incoming = (loadedData || []).filter((item) => !isDeletedRecord(item) && item.creatorId === currentUser.uid).map(deriveExperiment);

      // Only preserve in-memory items that are actively being saved right now by user interaction
      const currentMem = allExperimentsRef.current || [];
      const mergedMap = new Map();

      for (const item of incoming) {
        if (item && item.id) mergedMap.set(item.id, item);
      }
      for (const memItem of currentMem) {
        if (isDeletedRecord(memItem) || memItem.creatorId !== currentUser.uid) continue;
        if (!pendingSaveIdsRef.current.has(memItem.id)) continue;
        const incItem = mergedMap.get(memItem.id);
        if (!incItem && !memItem.revision) mergedMap.set(memItem.id, memItem);
        else if (incItem && !incItem.inTrash && !incItem.demoConflict && (memItem.revision || 0) > (incItem.revision || 0)) mergedMap.set(memItem.id, memItem);
      }

      const finalData = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.updatedAt || b.date || 0) - new Date(a.updatedAt || a.date || 0)
      );
      allExperimentsRef.current = finalData;
      setAllExperiments(finalData);
    }, currentUser.uid, (error) => setSyncError(error.message));

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [currentUser?.uid]);

  // Strict Per-User Data Isolation: All experiments belonging to currentUser
  const userExperiments = useMemo(() => {
    if (!currentUser) return [];

    return allExperiments.filter((exp) =>
      !isDeletedRecord(exp) && exp.creatorId === currentUser.uid
    );
  }, [allExperiments, currentUser]);

  // Active experiments (not in Trash)
  const experiments = useMemo(() => {
    return userExperiments.filter((exp) => !exp.inTrash);
  }, [userExperiments]);

  // Trashed experiments (in Trash bin)
  const trashedExperiments = useMemo(() => {
    return userExperiments
      .filter((exp) => Boolean(exp.inTrash))
      .sort((a, b) => new Date(b.trashedAt || b.updatedAt || 0) - new Date(a.trashedAt || a.updatedAt || 0));
  }, [userExperiments]);

  // Keep activeExperimentId valid within user's experiments (including when inspecting a trashed experiment)
  useEffect(() => {
    if (userExperiments.length > 0) {
      setActiveExperimentId((prev) => {
        if (prev && userExperiments.some((e) => e.id === prev)) return prev;
        return experiments.length > 0 ? experiments[0].id : null;
      });
    } else {
      setActiveExperimentId(null);
    }
  }, [userExperiments, experiments]);

  const activeExperiment =
    userExperiments.find((e) => e.id === activeExperimentId) ||
    (experiments.length > 0 ? experiments[0] : null);

  // Save/Update experiment continuously on user interaction directly to Firebase Cloud
  const updateExperiment = async (id, updatedFields) => {
    if (!id) return;
    setIsSyncing(true);
    beginSave(id);

    const baseList = allExperimentsRef.current.length > 0 ? allExperimentsRef.current : allExperiments;
    const target = baseList.find((e) => e.id === id);
    if (!target) {
      endSave(id);
      return;
    }

    if (target.creatorId !== currentUser?.uid || target.inTrash) {
      endSave(id);
      setSyncError('Không được chỉnh sửa bản trong thùng rác hoặc của người khác.');
      return { success: false };
    }
    const renderedBase = allExperiments.find((e) => e.id === id) || target;
    const patch = changedFields(renderedBase, { ...renderedBase, ...updatedFields }) || {};
    const merged = deriveExperiment({
      ...mergePatch(target, patch),
      revision: (target.revision || 0) + 1,
      updatedAt: new Date().toISOString()
    });

    const nextList = baseList.map((e) => (e.id === id ? merged : e));
    allExperimentsRef.current = nextList;
    setAllExperiments(nextList);

    try {
      const result = requireSuccess(await saveExperimentData(merged, { base: target, patch, user: currentUser }));
      return result;
    } catch (err) {
      console.error('Failed to save experiment:', err);
      setSyncError(err.message);
      return { success: false, error: err };
    } finally {
      endSave(id);
    }
  };

  // Create new experiment strictly tagged to currentUser
  const createNewExperiment = async (customMeta = {}) => {
    const newId = `EXP-${crypto.randomUUID()}`;
    let newExperiment = {
      id: newId,
      code: customMeta.code || `SYN-${experiments.length + 1}`,
      title: customMeta.title || 'Thí nghiệm tổng hợp mới',
      researcher: currentUser?.displayName || customMeta.researcher || 'Nghiên cứu viên',
      labRoom: customMeta.labRoom || 'Phòng Thí Nghiệm Hóa Dược',
      creatorId: currentUser?.uid || null,
      creatorEmail: currentUser?.email || null,
      creatorName: currentUser?.displayName || currentUser?.email || 'Nghiên cứu viên',
      date: localDate(),
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
          mw: '36.46',
          concUnit: 'C%',
          concentrationBasis: 'w/w',
          nFactor: '1',
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

    newExperiment = deriveExperiment(newExperiment);
    beginSave(newId);
    const nextCreatedList = [newExperiment, ...allExperimentsRef.current];
    allExperimentsRef.current = nextCreatedList;
    setAllExperiments(nextCreatedList);
    setActiveExperimentId(newId);
    try {
      const result = requireSuccess(await saveExperimentData(newExperiment, { user: currentUser }));
      return result.data;
    } catch (error) {
      setSyncError(error.message);
      throw error;
    } finally {
      endSave(newId);
    }
    return newExperiment;
  };

  // Move experiment to Trash (soft delete so user can inspect or restore if accidentally deleted)
  const moveToTrash = async (id) => {
    if (!id) return;
    setIsSyncing(true);
    beginSave(id);

    const baseList = allExperimentsRef.current.length > 0 ? allExperimentsRef.current : allExperiments;
    const target = baseList.find((e) => e.id === id);
    if (!target) {
      endSave(id);
      return;
    }

    const nowIso = new Date().toISOString();
    const trashedExp = {
      ...target,
      inTrash: true,
      trashedAt: nowIso,
      updatedAt: nowIso
    };

    const nextList = baseList.map((e) => (e.id === id ? trashedExp : e));
    allExperimentsRef.current = nextList;
    setAllExperiments(nextList);

    if (activeExperimentId === id) {
      const remainingActive = experiments.filter((e) => e.id !== id);
      setActiveExperimentId(remainingActive.length > 0 ? remainingActive[0].id : null);
    }

    try {
      requireSuccess(await saveExperimentData(trashedExp, { base: target, patch: { inTrash: true, trashedAt: nowIso }, kind: 'trash', user: currentUser }));
    } catch (error) {
      setSyncError(error.message);
    } finally {
      endSave(id);
    }
  };

  // Restore experiment from Trash back to active list
  const restoreExperiment = async (id) => {
    if (!id) return;
    setIsSyncing(true);
    beginSave(id);

    const baseList = allExperimentsRef.current.length > 0 ? allExperimentsRef.current : allExperiments;
    const target = baseList.find((e) => e.id === id);
    if (!target) {
      endSave(id);
      return;
    }

    const nowIso = new Date().toISOString();
    const restoredExp = {
      ...target,
      inTrash: false,
      trashedAt: null,
      updatedAt: nowIso
    };

    const nextList = baseList.map((e) => (e.id === id ? restoredExp : e));
    allExperimentsRef.current = nextList;
    setAllExperiments(nextList);

    try {
      requireSuccess(await saveExperimentData(restoredExp, { base: target, patch: { inTrash: false, trashedAt: null }, kind: 'restore', user: currentUser }));
    } catch (error) {
      setSyncError(error.message);
    } finally {
      endSave(id);
    }
  };

  // Permanently delete a single experiment from Firebase Realtime Database
  const permanentlyDeleteExperiment = async (id) => {
    if (!id) return;
    beginSave(id);

    try {
      requireSuccess(await deleteExperimentData(id));
    } catch (error) {
      setSyncError(error.message);
    } finally {
      endSave(id);
    }
  };

  // Empty Trash: permanently delete all trashed experiments of currentUser from Firebase Realtime Database
  const emptyTrash = async () => {
    const trashedIds = trashedExperiments.map((e) => e.id).filter(Boolean);
    if (trashedIds.length === 0) return;

    trashedIds.forEach(beginSave);
    try {
      requireSuccess(await permanentlyDeleteExperimentsBatch(trashedIds));
    } catch (error) {
      setSyncError(error.message);
    } finally {
      trashedIds.forEach(endSave);
    }
  };

  // Default deleteExperiment moves to Trash so user is protected from accidental deletion
  const deleteExperiment = moveToTrash;

  // Duplicate experiment
  const duplicateExperiment = async (id) => {
    const original =
      experiments.find((e) => e.id === id) ||
      allExperimentsRef.current.find((e) => e.id === id) ||
      allExperiments.find((e) => e.id === id);
    if (!original) return;

    const dupId = `EXP-${crypto.randomUUID()}`;
    const duplicated = {
      ...JSON.parse(JSON.stringify(original)),
      id: dupId,
      code: `${original.code}-COPY`,
      title: `${original.title} (Lần chạy mới)`,
      revision: 0, auditTrail: [], tlcTimeline: [], analytics: { records: [] },
      workup: { ...original.workup, crudeTubes: [], crudeTareMass: '0', crudeGrossMass: '0', crudeMass: 0, crudeMassSource: 'tubes' },
      columnAndYield: { ...original.columnAndYield, fractions: (original.columnAndYield?.fractions || []).map((f) => ({ ...f, group: null, groupTag: null, groupColor: null, spotPattern: 'empty', tlcChecked: false })), fractionGroups: [], fractionTlcPlates: [], eppendorfYield: { tubes: [], productMass: 0, tubeTareMass: '0', tubeGrossMass: '0', purityHplc: '', assayMassPercent: '' } },
      date: localDate(),
      creatorId: currentUser?.uid || null,
      creatorEmail: currentUser?.email || null,
      creatorName: currentUser?.displayName || currentUser?.email || 'Nghiên cứu viên',
      researcher: currentUser?.displayName || original.researcher,
      status: 'draft',
      inTrash: false,
      trashedAt: null,
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

    beginSave(dupId);
    const nextDupList = [duplicated, ...allExperimentsRef.current];
    allExperimentsRef.current = nextDupList;
    setAllExperiments(nextDupList);
    setActiveExperimentId(dupId);
    try {
      requireSuccess(await saveExperimentData(deriveExperiment(duplicated), { user: currentUser }));
    } catch (error) {
      setSyncError(error.message);
    } finally {
      endSave(dupId);
    }
  };

  // Export all user's data to JSON
  const exportAllToJson = () => {
    if (userExperiments.length === 0) {
      alert('Chưa có dữ liệu thí nghiệm để xuất tệp JSON.');
      return;
    }
    const dataStr = URL.createObjectURL(new Blob([JSON.stringify(userExperiments, null, 2)], { type: 'application/json' }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `MedChem_ELN_${currentUser?.displayName || 'Student'}_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    setTimeout(() => URL.revokeObjectURL(dataStr), 10000);
  };

  // Import from JSON
  const importFromJson = async (file) => {
    if (!currentUser?.uid) throw new Error('Chọn tài khoản demo trước khi nhập.');
    if (file.size > 50 * 1024 * 1024) throw new Error('Tệp JSON tối đa 50 MB.');
    const importUser = currentUser;
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          if (file.size > 50 * 1024 * 1024) throw new Error('Tệp JSON tối đa 50 MB.');
          const { items: parsed, remoteAssetCount, weighingWarnings } = prepareDemoImport(JSON.parse(e.target.result));
          const tagged = parsed.map((item) => ({
            ...item, id: `EXP-${crypto.randomUUID()}`, sourceId: item.id,
            revision: 0, auditTrail: [], inTrash: false, trashedAt: null,
            creatorId: importUser.uid, creatorEmail: importUser.email,
            creatorName: importUser.displayName, researcher: item.researcher || importUser.displayName,
            updatedAt: new Date().toISOString()
          }));
          const result = requireSuccess(await importDemoExperiments(tagged, importUser));
          setActiveExperimentId(tagged[0].id);
          resolve({ success: true, count: result.count, remoteAssetCount, weighingWarnings });
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
        experiments, // Active experiments strictly filtered to currentUser
        trashedExperiments, // Trashed experiments strictly filtered to currentUser
        allExperiments,
        activeExperiment,
        activeExperimentId,
        setActiveExperimentId,
        updateExperiment,
        createNewExperiment,
        deleteExperiment,
        moveToTrash,
        restoreExperiment,
        permanentlyDeleteExperiment,
        emptyTrash,
        duplicateExperiment,
        exportAllToJson,
        importFromJson,
        syncError,
        clearSyncError: () => setSyncError(''),
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
