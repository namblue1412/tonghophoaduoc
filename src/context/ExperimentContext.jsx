import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  saveExperimentData,
  deleteExperimentData,
  loadExperimentsData,
  isFirebaseConfigured,
  uploadImage
} from '../services/firebase';

const ExperimentContext = createContext();

// Sample Initial Experiment for Pharmacy / Chemistry research students and researchers
const initialSampleExperiment = {
  id: 'EXP-2025-COU-01',
  code: 'PECH-01',
  title: 'Tổng hợp 7-Hydroxy-4-methylcoumarin (4-Methylumbelliferone)',
  researcher: 'DS. Nguyễn Hoàng Nam',
  labRoom: 'Phòng Hóa Dược 402 - ĐH Y Dược',
  date: new Date().toISOString().split('T')[0],
  status: 'running', // 'draft' | 'running' | 'paused' | 'workup' | 'purification' | 'completed'
  targetMolecule: {
    name: '7-Hydroxy-4-methylcoumarin',
    molecularFormula: 'C10H8O3',
    molecularWeight: 176.17,
    smiles: 'CC1=CC(=O)OC2=C1C=CC(=C2)O',
    appearance: 'Tinh thể hình kim màu trắng ngà'
  },
  stoichiometry: [
    {
      id: 'reagent-1',
      type: 'starting_material', // 'starting_material' | 'reagent' | 'catalyst' | 'solvent'
      name: 'Resorcinol (1,3-dihydroxybenzene)',
      formula: 'C6H6O2',
      mw: 110.11,
      purity: 99.0,
      density: 1.27,
      isLimiting: true,
      theoMass: 1.10,
      actualMass: 1.1012,
      actualVolume: 0,
      moles: 0.0099,
      eq: 1.0,
      notes: 'Bột tinh thể màu trắng, hút ẩm nhẹ'
    },
    {
      id: 'reagent-2',
      type: 'reagent',
      name: 'Ethyl acetoacetate (EAA)',
      formula: 'C6H10O3',
      mw: 130.14,
      purity: 99.0,
      density: 1.028,
      isLimiting: false,
      theoMass: 1.43,
      actualMass: 1.45,
      actualVolume: 1.41,
      moles: 0.0110,
      eq: 1.11,
      notes: 'Chất lỏng trong suốt, lấy dư 10% mol'
    },
    {
      id: 'reagent-3',
      type: 'catalyst',
      name: 'Axit Sulfuric đặc (H2SO4 98%)',
      formula: 'H2SO4',
      mw: 98.08,
      purity: 98.0,
      density: 1.84,
      isLimiting: false,
      theoMass: 0,
      actualMass: 9.20,
      actualVolume: 5.0,
      moles: 0.0919,
      eq: 9.28,
      notes: 'Nhỏ từ từ từng giọt trong bể đá dưới 10°C'
    },
    {
      id: 'solvent-1',
      type: 'solvent',
      name: 'Nước đá vụn (Quench)',
      formula: 'H2O',
      mw: 18.02,
      purity: 100,
      density: 1.0,
      isLimiting: false,
      theoMass: 0,
      actualMass: 50.0,
      actualVolume: 50.0,
      moles: 0,
      eq: 0,
      notes: 'Dùng để dập phản ứng và tạo kết tủa'
    }
  ],
  reactionTimer: {
    status: 'paused', // 'idle' | 'running' | 'paused' | 'stopped'
    totalSeconds: 9900, // 2h 45m
    lastStartTime: null,
    temperature: 'Khấy ở 0 - 5°C (30 ph) rồi nâng lên nhiệt độ phòng (25°C)',
    intervals: [
      {
        id: 'int-1',
        startTime: '2025-09-24T09:00:00.000Z',
        endTime: '2025-09-24T10:30:00.000Z',
        durationSeconds: 5400,
        note: 'Phiên 1: Nhỏ H2SO4 trong bể đá và khuấy 90 phút. Hỗn hợp chuyển từ không màu sang vàng sậm.'
      },
      {
        id: 'int-2',
        startTime: '2025-09-24T11:15:00.000Z',
        endTime: '2025-09-24T12:30:00.000Z',
        durationSeconds: 4500,
        note: 'Phiên 2: Tiếp tục khuấy ở nhiệt độ phòng sau khi tạm dừng kiểm tra TLC lúc 90 phút.'
      }
    ]
  },
  tlcTimeline: [
    {
      id: 'tlc-1',
      minute: 30,
      timeFormatted: '30 phút',
      timestamp: '2025-09-24T09:30:00.000Z',
      eluent: 'Hexan : Ethyl Acetate (3 : 1)',
      visualization: ['UV 254nm', 'Vanillin / H2SO4'],
      spots: [
        { label: 'Chất đầu (Resorcinol)', rf: '0.42' },
        { label: 'Vết sản phẩm mới', rf: '0.21' }
      ],
      observations: 'Chất đầu còn đậm (>60%), bắt đầu xuất hiện vết sản phẩm phân cực hơn (Rf 0.21) phát huỳnh quang xanh tím dưới UV 365nm.',
      imageUrl: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'tlc-2',
      minute: 90,
      timeFormatted: '1 giờ 30 phút',
      timestamp: '2025-09-24T10:30:00.000Z',
      eluent: 'Hexan : Ethyl Acetate (3 : 1)',
      visualization: ['UV 254nm', 'UV 365nm'],
      spots: [
        { label: 'Chất đầu (Resorcinol)', rf: '0.42' },
        { label: 'Sản phẩm 4-MU', rf: '0.21' }
      ],
      observations: 'Vết chất đầu mờ rõ rệt (<15%), vết sản phẩm 4-MU rất đậm sắc nét.',
      imageUrl: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?auto=format&fit=crop&w=600&q=80'
    },
    {
      id: 'tlc-3',
      minute: 165,
      timeFormatted: '2 giờ 45 phút',
      timestamp: '2025-09-24T12:30:00.000Z',
      eluent: 'Hexan : Ethyl Acetate (3 : 1)',
      visualization: ['UV 254nm', 'UV 365nm', 'H2SO4 cồn'],
      spots: [
        { label: 'Sản phẩm 4-MU', rf: '0.21' }
      ],
      observations: 'Phản ứng hoàn toàn. Đã hết sạch vết chất đầu. Vết sản phẩm chính duy nhất và tinh khiết.',
      imageUrl: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=600&q=80'
    }
  ],
  workup: {
    quenching: 'Đổ từ từ hỗn hợp phản ứng vào 50g nước đá vụn + 20mL nước cất lạnh, khuấy mạnh bằng đũa thủy tinh.',
    extractionSolvent: 'Lọc hút Buchner kết tủa thô, rửa bằng nước lạnh đến khi pH dịch lọc trung tính (pH ~ 6-7).',
    washing: 'Rửa lại cắn trên phễu bằng 15 mL EtOAc lạnh để loại bỏ tạp chất phân cực kém.',
    dryingAgent: 'Sấy khô dưới áp suất giảm ở 60°C trong tủ sấy chân không 3 giờ.',
    rotavaporTemp: '45°C (cho dịch chiết hữu cơ)',
    rotavaporPressure: '220 mbar',
    residueAppearance: 'Bột kết tinh màu trắng ngà, mùi coumarin nhẹ đặc trưng.',
    crudeMass: 1.62,
    workupNotes: 'Sau khi dập vào nước đá, kết tủa trắng tạo thành ngay lập tức và rất xốp.'
  },
  columnAndYield: {
    columnParams: {
      silicaMass: 35,
      columnSize: 'Đường kính 2.5 cm x Chiều cao 35 cm',
      eluentGradient: 'DCM : MeOH (98 : 2) -> (95 : 5)'
    },
    totalFractions: 25,
    fractions: Array.from({ length: 25 }, (_, i) => {
      const num = i + 1;
      let spotPattern = 'empty';
      let group = null;
      let note = '';
      if (num >= 3 && num <= 5) {
        spotPattern = 'impurity';
        group = 'byproduct';
        note = 'Tạp chất phân cực kém đi trước';
      } else if (num >= 8 && num <= 18) {
        spotPattern = 'product';
        group = 'main_product';
        note = 'Sản phẩm chính 4-MU tinh khiết';
      } else if (num >= 19 && num <= 21) {
        spotPattern = 'mixed';
        group = 'tail';
        note = 'Đuôi vết sản phẩm';
      }
      return {
        number: num,
        tlcChecked: num <= 22,
        spotPattern,
        group,
        note
      };
    }),
    fractionGroups: [
      {
        id: 'group-main',
        name: 'Nhóm sản phẩm chính (Pure 4-MU)',
        range: 'F8 - F18',
        fractionNumbers: [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18],
        color: '#10b981'
      },
      {
        id: 'group-byproduct',
        name: 'Nhóm tạp chất trước',
        range: 'F3 - F5',
        fractionNumbers: [3, 4, 5],
        color: '#f59e0b'
      }
    ],
    eppendorfYield: {
      tubeTareMass: 1.0542, // m vỏ (g)
      tubeGrossMass: 2.4984, // m vỏ + cắn (g)
      productMass: 1.4442, // m sản phẩm = 2.4984 - 1.0542 = 1.4442 g
      targetMW: 176.17,
      theoreticalYield: 1.7441, // n_limiting (0.0099) * 176.17 = 1.7441 g
      yieldPercent: 82.80, // (1.4442 / 1.7441) * 100 = 82.80%
      purityHplc: 98.6,
      meltingPoint: '185 - 187°C (Văn hiến: 185 - 188°C)',
      productAppearance: 'Bột kết tinh hình kim màu trắng ngà, phát huỳnh quang mạnh dưới UV 365nm.',
      fractionTlcImages: []
    }
  },
  createdAt: '2025-09-24T08:30:00.000Z',
  updatedAt: new Date().toISOString()
};

export const ExperimentProvider = ({ children }) => {
  const [experiments, setExperiments] = useState([]);
  const [activeExperimentId, setActiveExperimentId] = useState(null);
  const [syncMode, setSyncMode] = useState('local'); // 'firebase' | 'local'
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Initialize and load experiments
  useEffect(() => {
    const isCloud = isFirebaseConfigured();
    setSyncMode(isCloud ? 'firebase' : 'local');

    const unsubscribe = loadExperimentsData((loadedData, mode) => {
      setSyncMode(mode);
      if (!loadedData || loadedData.length === 0) {
        // First run: Seed default demo experiment
        saveExperimentData(initialSampleExperiment).then(() => {
          setExperiments([initialSampleExperiment]);
          setActiveExperimentId(initialSampleExperiment.id);
        });
      } else {
        setExperiments(loadedData);
        if (!activeExperimentId && loadedData.length > 0) {
          setActiveExperimentId(loadedData[0].id);
        }
      }
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const activeExperiment = experiments.find((e) => e.id === activeExperimentId) || experiments[0] || null;

  // Save/Update experiment
  const updateExperiment = async (id, updatedFields) => {
    setIsSyncing(true);
    let target = experiments.find((e) => e.id === id);
    if (!target) return;

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
