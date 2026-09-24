import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  saveExperimentData,
  deleteExperimentData,
  loadExperimentsData,
  isFirebaseConfigured,
  uploadImage
} from '../services/firebase';

const ExperimentContext = createContext();

export const ExperimentProvider = ({ children }) => {
  const [experiments, setExperiments] = useState([]);
  const [activeExperimentId, setActiveExperimentId] = useState(null);
  const [syncMode, setSyncMode] = useState('local'); // 'firebase' | 'local'
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Initialize and load experiments (NO auto-seed of sample data)
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
      const safeData = loadedData || [];
      setExperiments(safeData);
      if (safeData.length > 0) {
        setActiveExperimentId((prev) => (prev && safeData.some((e) => e.id === prev) ? prev : safeData[0].id));
      } else {
        setActiveExperimentId(null);
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const activeExperiment = experiments.find((e) => e.id === activeExperimentId) || (experiments.length > 0 ? experiments[0] : null);

  // Save/Update experiment
  const updateExperiment = async (id, updatedFields) => {
    setIsSyncing(true);
    let target = experiments.find((e) => e.id === id);
    if (!target) {
      setIsSyncing(false);
      return;
    }

    const merged = {
      ...target,
      ...updatedFields,
      updatedAt: new Date().toISOString()
    };

    const newExperiments = experiments.map((e) => (e.id === id ? merged : e));
    setExperiments(newExperiments);

    await saveExperimentData(merged);
    setIsSyncing(false);
    setLastSaved(new Date());
  };

  // Create new experiment
  const createNewExperiment = async (customMeta = {}) => {
    const newId = `EXP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Date.now()).slice(-4)}`;
    const newExperiment = {
      id: newId,
      code: customMeta.code || `SYN-${experiments.length + 1}`,
      title: customMeta.title || 'Thí nghiệm tổng hợp mới',
      researcher: customMeta.researcher || 'Nghiên cứu viên',
      labRoom: customMeta.labRoom || 'Phòng Thí Nghiệm Hóa Dược',
      date: new Date().toISOString().split('T')[0],
      status: 'draft',
      targetMolecule: {
        name: customMeta.targetName || 'Sản phẩm mục tiêu',
        molecularFormula: '',
        molecularWeight: 0,
        smiles: '',
        appearance: ''
      },
      stoichiometry: [
        {
          id: `reagent-${Date.now()}-1`,
          type: 'starting_material',
          name: 'Chất đầu A',
          formula: '',
          mw: 100,
          purity: 99.0,
          density: 1.0,
          isLimiting: true,
          theoMass: 1.0,
          actualMass: 1.0,
          actualVolume: 1.0,
          moles: 0.0099,
          eq: 1.0,
          notes: 'Chất giới hạn'
        },
        {
          id: `reagent-${Date.now()}-2`,
          type: 'reagent',
          name: 'Thuốc thử B',
          formula: '',
          mw: 120,
          purity: 98.0,
          density: 1.0,
          isLimiting: false,
          theoMass: 1.2,
          actualMass: 1.2,
          actualVolume: 1.2,
          moles: 0.0098,
          eq: 0.99,
          notes: ''
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
        crudeMass: 0,
        workupNotes: ''
      },
      columnAndYield: {
        columnParams: {
          silicaMass: 30,
          columnSize: '2.0 cm x 30 cm',
          eluentGradient: 'Hexan : EtOAc (9:1) -> (4:1)'
        },
        totalFractions: 24,
        fractions: Array.from({ length: 24 }, (_, i) => ({
          number: i + 1,
          tlcChecked: false,
          spotPattern: 'empty',
          group: null,
          note: ''
        })),
        fractionGroups: [],
        eppendorfYield: {
          tubeTareMass: 0,
          tubeGrossMass: 0,
          productMass: 0,
          targetMW: 0,
          theoreticalYield: 0,
          yieldPercent: 0,
          purityHplc: 0,
          meltingPoint: '',
          productAppearance: '',
          fractionTlcImages: []
        }
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updated = [newExperiment, ...experiments];
    setExperiments(updated);
    setActiveExperimentId(newId);
    await saveExperimentData(newExperiment);
    return newExperiment;
  };

  // Delete experiment
  const deleteExperiment = async (id) => {
    const filtered = experiments.filter((e) => e.id !== id);
    setExperiments(filtered);
    if (activeExperimentId === id) {
      setActiveExperimentId(filtered.length > 0 ? filtered[0].id : null);
    }
    await deleteExperimentData(id);
  };

  // Duplicate experiment
  const duplicateExperiment = async (id) => {
    const original = experiments.find((e) => e.id === id);
    if (!original) return;

    const dupId = `EXP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(Date.now()).slice(-4)}`;
    const duplicated = {
      ...JSON.parse(JSON.stringify(original)),
      id: dupId,
      code: `${original.code}-COPY`,
      title: `${original.title} (Bản sao)`,
      date: new Date().toISOString().split('T')[0],
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

    const updated = [duplicated, ...experiments];
    setExperiments(updated);
    setActiveExperimentId(dupId);
    await saveExperimentData(duplicated);
  };

  // Export all data to JSON
  const exportAllToJson = () => {
    if (experiments.length === 0) {
      alert('Chưa có dữ liệu thí nghiệm để xuất tệp JSON.');
      return;
    }
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(experiments, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `MedChem_ELN_Backup_${new Date().toISOString().slice(0, 10)}.json`);
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
            for (const item of parsed) {
              await saveExperimentData(item);
            }
            setExperiments(parsed);
            setActiveExperimentId(parsed[0].id);
            resolve({ success: true, count: parsed.length });
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
        experiments,
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
