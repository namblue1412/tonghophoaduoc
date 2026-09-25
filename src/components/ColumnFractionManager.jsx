import React, { useState, useRef, useEffect } from 'react';
import {
  Grid,
  Filter,
  Layers,
  Camera,
  Upload,
  Plus,
  Minus,
  Trash2,
  Scale,
  Award,
  Sparkles,
  ChevronRight,
  CheckCircle,
  CheckCircle2,
  HelpCircle,
  Info,
  Maximize2,
  X,
  Pencil,
  Sun,
  Moon,
  Droplet,
  Tag,
  FlaskConical,
  Eye,
  Clock
} from 'lucide-react';
import { useExperiment } from '../context/ExperimentContext';
import { parseDecimal } from './StoichiometryTable';

const COMMON_STAINS = [
  'Vanillin / H2SO4',
  'H2SO4 cồn 10%',
  'KMnO4',
  'Ninhydrin',
  'Dragendorff',
  'Iodine (I2)',
  'PMA (Phosphomolybdic)',
  'FeCl3 5%',
  'Anisaldehyde',
  'Khác (Tự nhập)'
];

const COMMON_ELUENTS = [
  'Hexan : EtOAc (9 : 1)',
  'Hexan : EtOAc (4 : 1)',
  'Hexan : EtOAc (3 : 1)',
  'Hexan : EtOAc (2 : 1)',
  'Hexan : EtOAc (1 : 1)',
  'DCM : MeOH (95 : 5)',
  'DCM : MeOH (9 : 1)',
  'Petroleum Ether : Acetone (5 : 1)'
];

export const ColumnFractionManager = ({
  columnData,
  onChange,
  limitingMoles = 0,
  targetMW = 0,
  massUnit = 'g',
  moleUnit = 'mol'
}) => {
  const { uploadImage } = useExperiment();

  const {
    columnParams = {
      silicaMass: '30',
      columnSize: '2.0 cm x 30 cm',
      eluentGradient: 'Hexan : EtOAc (9:1) -> (4:1)'
    },
    totalFractions = 10,
    fractions = Array.from({ length: 10 }, (_, i) => ({
      number: i + 1,
      tlcChecked: false,
      spotPattern: 'empty',
      group: null,
      note: ''
    })),
    fractionGroups = [],
    fractionTlcPlates = [],
    eppendorfYield = {
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
  } = columnData || {};

  // Local state for grouping builder
  const [groupName, setGroupName] = useState('Nhóm sản phẩm chính (Pure Product)');
  const [fromFraction, setFromFraction] = useState(1);
  const [toFraction, setToFraction] = useState(1);
  const [groupColor, setGroupColor] = useState('#10b981');

  // Fraction TLC Modal State
  const [fracTlcModalOpen, setFracTlcModalOpen] = useState(false);
  const [editingFracTlcId, setEditingFracTlcId] = useState(null);
  const [fracSpottedInput, setFracSpottedInput] = useState('');
  const [fracEluent, setFracEluent] = useState('Hexan : EtOAc (4 : 1)');
  const [fracStain, setFracStain] = useState('Vanillin / H2SO4');
  const [customFracStain, setCustomFracStain] = useState('');
  const [fracNotes, setFracNotes] = useState('');
  const [fracSlot, setFracSlot] = useState('uv254'); // 'uv254' | 'uv365' | 'reagent'
  const [fracPhoto254, setFracPhoto254] = useState({ preview: null, file: null });
  const [fracPhoto365, setFracPhoto365] = useState({ preview: null, file: null });
  const [fracPhotoReagent, setFracPhotoReagent] = useState({ preview: null, file: null });
  const [fracUploading, setFracUploading] = useState(false);
  const [activeTabPerFracTlc, setActiveTabPerFracTlc] = useState({});

  // Pooled Sample TLC Modal State
  const [poolTlcModalOpen, setPoolTlcModalOpen] = useState(false);
  const [activeGroupId, setActiveGroupId] = useState(null);
  const [poolTlcSlot, setPoolTlcSlot] = useState('uv254');
  const [poolPhoto254, setPoolPhoto254] = useState({ preview: null, file: null });
  const [poolPhoto365, setPoolPhoto365] = useState({ preview: null, file: null });
  const [poolPhotoReagent, setPoolPhotoReagent] = useState({ preview: null, file: null });
  const [poolEluent, setPoolEluent] = useState('Hexan : EtOAc (3 : 1)');
  const [poolStain, setPoolStain] = useState('Vanillin / H2SO4');
  const [customPoolStain, setCustomPoolStain] = useState('');
  const [poolPurity, setPoolPurity] = useState('pure'); // 'pure' | 'trace_impurity' | 'mixed'
  const [poolNotes, setPoolNotes] = useState('');
  const [poolUploading, setPoolUploading] = useState(false);
  const [activeTabPerPoolGroup, setActiveTabPerPoolGroup] = useState({});

  // Lightbox Modal State
  const [lightboxData, setLightboxData] = useState(null);

  // Resize fraction grid if user changes total count N
  const handleFractionCountChange = (newCount) => {
    const count = Math.max(1, Math.min(200, parseInt(newCount, 10) || 1));
    const currentFractions = [...(fractions || [])];
    let newFractionsList = [];

    for (let i = 1; i <= count; i++) {
      const existing = currentFractions.find((f) => f.number === i);
      if (existing) {
        newFractionsList.push(existing);
      } else {
        newFractionsList.push({
          number: i,
          tlcChecked: false,
          spotPattern: 'empty',
          group: null,
          note: ''
        });
      }
    }

    onChange({
      ...columnData,
      totalFractions: count,
      fractions: newFractionsList
    });
  };

  // Add single next fraction tube (F_N+1)
  const handleAddNextTube = () => {
    const currentList = fractions && fractions.length > 0 ? fractions : [];
    const nextNumber = currentList.length > 0 ? Math.max(...currentList.map((f) => f.number)) + 1 : 1;
    const newTube = {
      number: nextNumber,
      tlcChecked: false,
      spotPattern: 'empty',
      group: null,
      note: ''
    };
    const updated = [...currentList, newTube];
    onChange({
      ...columnData,
      totalFractions: updated.length,
      fractions: updated
    });
  };

  // Remove last fraction tube (minimum 1 tube)
  const handleRemoveLastTube = () => {
    const currentList = fractions || [];
    if (currentList.length <= 1) return;
    const updated = currentList.slice(0, currentList.length - 1);
    onChange({
      ...columnData,
      totalFractions: updated.length,
      fractions: updated
    });
  };

  // Toggle fraction status when user clicks an individual tube
  const toggleFractionState = (fractionNumber) => {
    const patterns = ['empty', 'product', 'impurity', 'mixed'];
    const updated = fractions.map((f) => {
      if (f.number === fractionNumber) {
        const nextIndex = (patterns.indexOf(f.spotPattern || 'empty') + 1) % patterns.length;
        const nextPattern = patterns[nextIndex];
        return {
          ...f,
          spotPattern: nextPattern,
          tlcChecked: nextPattern !== 'empty'
        };
      }
      return f;
    });

    onChange({
      ...columnData,
      fractions: updated
    });
  };

  // Quick toggle tube in spottedFractions string for Fraction TLC
  const toggleSpottedTube = (tubeNum) => {
    const label = `F${tubeNum}`;
    const currentParts = fracSpottedInput
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    let nextParts;
    if (currentParts.includes(label)) {
      nextParts = currentParts.filter((p) => p !== label);
    } else {
      nextParts = [...currentParts, label];
    }
    setFracSpottedInput(nextParts.join(', '));
  };

  // Add pooled fraction group (e.g. F8 -> F15)
  const handleAddGroup = () => {
    const start = Math.min(fromFraction, toFraction);
    const end = Math.max(fromFraction, toFraction);
    const numbers = [];
    for (let i = start; i <= end; i++) numbers.push(i);

    const newGroupId = `group-${Date.now()}`;
    const newGroup = {
      id: newGroupId,
      name: groupName || `Phân đoạn F${start}-F${end}`,
      range: `F${start} - F${end}`,
      fractionNumbers: numbers,
      color: groupColor,
      tlc: null
    };

    // Mark fractions as product or belonging to group
    const updatedFractions = fractions.map((f) => {
      if (numbers.includes(f.number)) {
        return {
          ...f,
          group: newGroupId,
          spotPattern: groupColor === '#10b981' ? 'product' : 'impurity',
          tlcChecked: true
        };
      }
      return f;
    });

    onChange({
      ...columnData,
      fractions: updatedFractions,
      fractionGroups: [...fractionGroups, newGroup]
    });
  };

  // Remove a group
  const handleRemoveGroup = (groupId) => {
    const updatedGroups = fractionGroups.filter((g) => g.id !== groupId);
    const updatedFractions = fractions.map((f) => {
      if (f.group === groupId) {
        return { ...f, group: null };
      }
      return f;
    });

    onChange({
      ...columnData,
      fractionGroups: updatedGroups,
      fractions: updatedFractions
    });
  };

  // Rename a pooled group
  const handleUpdateGroupName = (groupId, newName) => {
    const updatedGroups = fractionGroups.map((g) =>
      g.id === groupId ? { ...g, name: newName } : g
    );
    onChange({
      ...columnData,
      fractionGroups: updatedGroups
    });
  };

  // Tubes normalization (backward-compatible)
  const tubes = (Array.isArray(eppendorfYield?.tubes) && eppendorfYield.tubes.length > 0)
    ? eppendorfYield.tubes
    : [
        {
          id: 'tube-1',
          label: 'Ống 1',
          tareMass: eppendorfYield?.tubeTareMass || '0',
          grossMass: eppendorfYield?.tubeGrossMass || '0',
          productMass: eppendorfYield?.productMass || 0
        }
      ];

  const recalculateYield = (updatedTubes, currentYieldObj = eppendorfYield) => {
    const totalProdMass = updatedTubes.reduce((sum, t) => sum + (t.productMass || 0), 0);
    const roundedProd = parseFloat(totalProdMass.toFixed(4));

    const mw = targetMW > 0 ? targetMW : parseDecimal(currentYieldObj?.targetMW);

    let scale = 1;
    if (moleUnit === 'mmol' && massUnit === 'g') scale = 0.001;
    if (moleUnit === 'mol' && massUnit === 'mg') scale = 1000;

    let theoYield = 0;
    let yieldPct = 0;
    if (limitingMoles > 0 && mw > 0) {
      theoYield = limitingMoles * mw * scale;
      if (theoYield > 0 && roundedProd > 0) {
        yieldPct = (roundedProd / theoYield) * 100;
      }
    }

    const firstTare = updatedTubes[0]?.tareMass || '0';
    const firstGross = updatedTubes[0]?.grossMass || '0';

    onChange({
      ...columnData,
      eppendorfYield: {
        ...currentYieldObj,
        tubes: updatedTubes,
        tubeTareMass: firstTare,
        tubeGrossMass: firstGross,
        productMass: roundedProd,
        theoreticalYield: parseFloat(theoYield.toFixed(4)),
        yieldPercent: parseFloat(yieldPct.toFixed(2))
      }
    });
  };

  const handleTubeChange = (tubeId, field, val) => {
    const cleanVal = typeof val === 'string' ? val.replace(/[^0-9.,]/g, '') : val;
    const updatedTubes = tubes.map((t) => {
      if (t.id !== tubeId) return t;
      const nextTube = { ...t, [field]: cleanVal };
      const tare = parseDecimal(field === 'tareMass' ? cleanVal : t.tareMass);
      const gross = parseDecimal(field === 'grossMass' ? cleanVal : t.grossMass);
      nextTube.productMass = parseFloat(Math.max(0, gross - tare).toFixed(4));
      return nextTube;
    });

    recalculateYield(updatedTubes, eppendorfYield);
  };

  const handleTubeLabelChange = (tubeId, newLabel) => {
    const updatedTubes = tubes.map((t) => (t.id === tubeId ? { ...t, label: newLabel } : t));
    onChange({
      ...columnData,
      eppendorfYield: {
        ...eppendorfYield,
        tubes: updatedTubes
      }
    });
  };

  const handleAddTube = () => {
    const nextNum = tubes.length + 1;
    const newTube = {
      id: `tube-${Date.now()}`,
      label: `Ống ${nextNum}`,
      tareMass: '0',
      grossMass: '0',
      productMass: 0
    };
    const updatedTubes = [...tubes, newTube];
    recalculateYield(updatedTubes, eppendorfYield);
  };

  const handleRemoveTube = (tubeId) => {
    if (tubes.length <= 1) return;
    const updatedTubes = tubes.filter((t) => t.id !== tubeId);
    recalculateYield(updatedTubes, eppendorfYield);
  };

  const handleEppendorfParamChange = (field, val) => {
    onChange({
      ...columnData,
      eppendorfYield: {
        ...eppendorfYield,
        [field]: val
      }
    });
  };

  // Delete a specific fraction tube by number
  const handleDeleteSpecificTube = (tubeNumber) => {
    if ((fractions || []).length <= 1) return;
    const updated = (fractions || []).filter((f) => f.number !== tubeNumber);
    onChange({
      ...columnData,
      totalFractions: updated.length,
      fractions: updated
    });
  };

  // Sync theoretical yield when stoichiometry units, target MW, or limiting moles change
  useEffect(() => {
    const totalProdMass = tubes.reduce((sum, t) => sum + (t.productMass || 0), 0);
    const mw = targetMW > 0 ? targetMW : parseDecimal(eppendorfYield?.targetMW);

    let scale = 1;
    if (moleUnit === 'mmol' && massUnit === 'g') scale = 0.001;
    if (moleUnit === 'mol' && massUnit === 'mg') scale = 1000;

    let theoYield = 0;
    let yieldPct = 0;
    if (limitingMoles > 0 && mw > 0) {
      theoYield = limitingMoles * mw * scale;
      if (theoYield > 0 && totalProdMass > 0) {
        yieldPct = (totalProdMass / theoYield) * 100;
      }
    }

    const currentTheo = eppendorfYield?.theoreticalYield || 0;
    const currentPct = eppendorfYield?.yieldPercent || 0;
    const currentProd = eppendorfYield?.productMass || 0;

    const newTheo = parseFloat(theoYield.toFixed(4));
    const newPct = parseFloat(yieldPct.toFixed(2));
    const newProd = parseFloat(totalProdMass.toFixed(4));

    if (newTheo !== currentTheo || newPct !== currentPct || newProd !== currentProd) {
      onChange({
        ...columnData,
        eppendorfYield: {
          ...eppendorfYield,
          tubes,
          productMass: newProd,
          theoreticalYield: newTheo,
          yieldPercent: newPct
        }
      });
    }
  }, [limitingMoles, targetMW, massUnit, moleUnit]);

  // Helper to handle local photo selection via native label input
  const handlePhotoSelect = (e, setPhotoState) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoState({ preview: reader.result, file });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  // Open Add Fraction TLC Modal
  const handleOpenAddFracTlc = () => {
    setEditingFracTlcId(null);
    setFracSpottedInput('');
    setFracEluent(columnParams.eluentGradient || 'Hexan : EtOAc (4 : 1)');
    setFracStain('Vanillin / H2SO4');
    setCustomFracStain('');
    setFracNotes('');
    setFracSlot('uv254');
    setFracPhoto254({ preview: null, file: null });
    setFracPhoto365({ preview: null, file: null });
    setFracPhotoReagent({ preview: null, file: null });
    setFracTlcModalOpen(true);
  };

  // Open Edit Fraction TLC Modal
  const handleOpenEditFracTlc = (plate) => {
    setEditingFracTlcId(plate.id);
    setFracSpottedInput(plate.spottedFractions || '');
    setFracEluent(plate.eluent || 'Hexan : EtOAc (4 : 1)');
    const isStandard = COMMON_STAINS.includes(plate.stainName);
    if (isStandard) {
      setFracStain(plate.stainName);
      setCustomFracStain('');
    } else {
      setFracStain('Khác (Tự nhập)');
      setCustomFracStain(plate.stainName || '');
    }
    setFracNotes(plate.notes || '');
    setFracSlot('uv254');
    setFracPhoto254({ preview: plate.images?.uv254 || null, file: null });
    setFracPhoto365({ preview: plate.images?.uv365 || null, file: null });
    setFracPhotoReagent({ preview: plate.images?.reagent || null, file: null });
    setFracTlcModalOpen(true);
  };

  // Save Fraction TLC Plate
  const handleSaveFracTlc = async () => {
    setFracUploading(true);

    let url254 = fracPhoto254.preview || '';
    if (fracPhoto254.file) {
      try {
        url254 = await uploadImage(fracPhoto254.file, 'fraction_tlc_254');
      } catch (err) {
        console.warn('Upload fraction 254 error:', err);
      }
    }

    let url365 = fracPhoto365.preview || '';
    if (fracPhoto365.file) {
      try {
        url365 = await uploadImage(fracPhoto365.file, 'fraction_tlc_365');
      } catch (err) {
        console.warn('Upload fraction 365 error:', err);
      }
    }

    let urlReagent = fracPhotoReagent.preview || '';
    if (fracPhotoReagent.file) {
      try {
        urlReagent = await uploadImage(fracPhotoReagent.file, 'fraction_tlc_reagent');
      } catch (err) {
        console.warn('Upload fraction reagent error:', err);
      }
    }

    const finalStain =
      fracStain === 'Khác (Tự nhập)'
        ? customFracStain.trim() || 'Thuốc thử hiện màu'
        : fracStain;

    const payload = {
      spottedFractions: fracSpottedInput.trim() || 'Chưa ghi số phân đoạn',
      eluent: fracEluent,
      stainName: finalStain,
      notes: fracNotes,
      images: {
        uv254: url254 || null,
        uv365: url365 || null,
        reagent: urlReagent || null
      },
      timestamp: new Date().toISOString()
    };

    const currentPlates = fractionTlcPlates || [];
    let updatedPlates;
    if (editingFracTlcId) {
      updatedPlates = currentPlates.map((p) =>
        p.id === editingFracTlcId ? { ...p, ...payload } : p
      );
    } else {
      updatedPlates = [...currentPlates, { id: `frac-tlc-${Date.now()}`, ...payload }];
    }

    onChange({
      ...columnData,
      fractionTlcPlates: updatedPlates
    });

    setFracUploading(false);
    setFracTlcModalOpen(false);
    setEditingFracTlcId(null);
  };

  const handleDeleteFracTlc = (id) => {
    if (window.confirm('Xóa bản mỏng kiểm tra phân đoạn này?')) {
      const updatedPlates = (fractionTlcPlates || []).filter((p) => p.id !== id);
      onChange({
        ...columnData,
        fractionTlcPlates: updatedPlates
      });
    }
  };

  // Open Pooled Sample TLC Modal
  const handleOpenPoolTlc = (group) => {
    setActiveGroupId(group.id);
    const existingTlc = group.tlc || {};
    setPoolEluent(existingTlc.eluent || columnParams.eluentGradient || 'Hexan : EtOAc (3 : 1)');
    const isStandard = COMMON_STAINS.includes(existingTlc.stainName);
    if (isStandard) {
      setPoolStain(existingTlc.stainName);
      setCustomPoolStain('');
    } else if (existingTlc.stainName) {
      setPoolStain('Khác (Tự nhập)');
      setCustomPoolStain(existingTlc.stainName);
    } else {
      setPoolStain('Vanillin / H2SO4');
      setCustomPoolStain('');
    }
    setPoolPurity(existingTlc.purityVerdict || 'pure');
    setPoolNotes(existingTlc.notes || '');
    setPoolTlcSlot('uv254');
    setPoolPhoto254({ preview: existingTlc.images?.uv254 || null, file: null });
    setPoolPhoto365({ preview: existingTlc.images?.uv365 || null, file: null });
    setPoolPhotoReagent({ preview: existingTlc.images?.reagent || null, file: null });
    setPoolTlcModalOpen(true);
  };

  // Save Pooled Sample TLC
  const handleSavePoolTlc = async () => {
    if (!activeGroupId) return;
    setPoolUploading(true);

    let url254 = poolPhoto254.preview || '';
    if (poolPhoto254.file) {
      try {
        url254 = await uploadImage(poolPhoto254.file, 'pool_tlc_254');
      } catch (err) {
        console.warn('Upload pool 254 error:', err);
      }
    }

    let url365 = poolPhoto365.preview || '';
    if (poolPhoto365.file) {
      try {
        url365 = await uploadImage(poolPhoto365.file, 'pool_tlc_365');
      } catch (err) {
        console.warn('Upload pool 365 error:', err);
      }
    }

    let urlReagent = poolPhotoReagent.preview || '';
    if (poolPhotoReagent.file) {
      try {
        urlReagent = await uploadImage(poolPhotoReagent.file, 'pool_tlc_reagent');
      } catch (err) {
        console.warn('Upload pool reagent error:', err);
      }
    }

    const finalStain =
      poolStain === 'Khác (Tự nhập)'
        ? customPoolStain.trim() || 'Thuốc thử hiện màu'
        : poolStain;

    const tlcData = {
      eluent: poolEluent,
      stainName: finalStain,
      purityVerdict: poolPurity,
      notes: poolNotes,
      images: {
        uv254: url254 || null,
        uv365: url365 || null,
        reagent: urlReagent || null
      },
      updatedAt: new Date().toISOString()
    };

    const updatedGroups = fractionGroups.map((g) => {
      if (g.id === activeGroupId) {
        return { ...g, tlc: tlcData };
      }
      return g;
    });

    onChange({
      ...columnData,
      fractionGroups: updatedGroups
    });

    setPoolUploading(false);
    setPoolTlcModalOpen(false);
    setActiveGroupId(null);
  };

  // Keyboard shortcut handlers: Esc to close, Enter to save
  const handleSaveFracTlcRef = useRef();
  handleSaveFracTlcRef.current = handleSaveFracTlc;

  const handleSavePoolTlcRef = useRef();
  handleSavePoolTlcRef.current = handleSavePoolTlc;

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (lightboxData) {
          setLightboxData(null);
          return;
        }
        if (fracTlcModalOpen) {
          setFracTlcModalOpen(false);
          return;
        }
        if (poolTlcModalOpen) {
          setPoolTlcModalOpen(false);
          return;
        }
      }

      if (e.key === 'Enter') {
        if (e.target && e.target.tagName === 'TEXTAREA') return;
        if (fracTlcModalOpen && !fracUploading) {
          e.preventDefault();
          handleSaveFracTlcRef.current?.();
          return;
        }
        if (poolTlcModalOpen && !poolUploading) {
          e.preventDefault();
          handleSavePoolTlcRef.current?.();
          return;
        }
      }
    };

    if (fracTlcModalOpen || poolTlcModalOpen || lightboxData) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [fracTlcModalOpen, poolTlcModalOpen, lightboxData, fracUploading, poolUploading]);

  // Lightbox Zoom Handler
  const openLightbox = (images, title, subtitle, stainName) => {
    setLightboxData({
      images: {
        uv254: images?.uv254 || null,
        uv365: images?.uv365 || null,
        reagent: images?.reagent || null
      },
      activeType: images?.uv254 ? 'uv254' : images?.uv365 ? 'uv365' : 'reagent',
      title: title || 'Ảnh bản mỏng TLC',
      subtitle: subtitle || '',
      stainName: stainName || 'Thuốc thử'
    });
  };

  const getTubeColorClass = (pattern) => {
    switch (pattern) {
      case 'product':
        return 'bg-emerald-500 text-white border-emerald-600 ring-2 ring-emerald-300 font-bold';
      case 'impurity':
        return 'bg-amber-400 text-slate-900 border-amber-500 font-bold';
      case 'mixed':
        return 'bg-purple-500 text-white border-purple-600 font-bold';
      default:
        return 'bg-white hover:bg-slate-100 text-slate-600 border-slate-300';
    }
  };

  const currentNextTubeNumber =
    fractions && fractions.length > 0 ? Math.max(...fractions.map((f) => f.number)) + 1 : 1;

  const activeGroup = fractionGroups.find((g) => g.id === activeGroupId);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden card-print space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-2xl shadow-md text-white flex-shrink-0">
            <Filter className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
              5. Sắc Ký Cột & Cân Cắn Eppendorf
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Hứng phân đoạn (F1, F2...), chấm TLC kiểm tra, gộp mẫu và cân khối lượng sản phẩm
            </p>
          </div>
        </div>

        {/* Dynamic Tube Action Bar in Header */}
        <div className="flex items-center gap-2 no-print bg-slate-800/90 px-3 py-1.5 rounded-2xl border border-slate-700">
          <button
            type="button"
            onClick={handleAddNextTube}
            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition-all min-h-[38px] cursor-pointer"
            title="Thêm ống tiếp theo vào giá hứng"
          >
            <Plus className="w-4 h-4" />
            <span>+ Hứng F{currentNextTubeNumber}</span>
          </button>

          <button
            type="button"
            onClick={handleRemoveLastTube}
            disabled={fractions.length <= 1}
            className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all min-h-[38px] cursor-pointer disabled:cursor-not-allowed"
            title="Bớt 1 ống cuối"
          >
            <Minus className="w-3.5 h-3.5" />
            <span>Bớt</span>
          </button>

          <div className="w-px h-5 bg-slate-600 mx-1"></div>

          <span className="text-xs text-slate-300 font-medium">Tổng:</span>
          <input
            type="number"
            min="1"
            max="200"
            value={totalFractions}
            onChange={(e) => handleFractionCountChange(e.target.value)}
            className="w-14 bg-slate-900 text-indigo-300 font-mono font-bold text-center border border-slate-600 rounded-lg py-1 px-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
            title="Nhập trực tiếp tổng số ống"
          />
          <span className="text-xs text-slate-400 font-mono">ống</span>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Column Setup Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
          <div>
            <span className="font-semibold text-slate-700 block mb-1">Khối lượng Silicagel (g):</span>
            <input
              type="text"
              inputMode="decimal"
              value={columnParams.silicaMass ?? ''}
              onChange={(e) =>
                onChange({
                  ...columnData,
                  columnParams: { ...columnParams, silicaMass: e.target.value.replace(/[^0-9.,]/g, '') }
                })
              }
              placeholder="VD: 30"
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-mono focus:outline-none min-h-[40px]"
            />
          </div>
          <div>
            <span className="font-semibold text-slate-700 block mb-1">Kích thước cột (Đường kính x Cao):</span>
            <input
              type="text"
              value={columnParams.columnSize || ''}
              onChange={(e) =>
                onChange({
                  ...columnData,
                  columnParams: { ...columnParams, columnSize: e.target.value }
                })
              }
              placeholder="VD: 2.5 cm x 35 cm"
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 focus:outline-none min-h-[40px]"
            />
          </div>
          <div>
            <span className="font-semibold text-slate-700 block mb-1">Hệ Gradient dung môi nạp & rửa:</span>
            <input
              type="text"
              value={columnParams.eluentGradient || ''}
              onChange={(e) =>
                onChange({
                  ...columnData,
                  columnParams: { ...columnParams, eluentGradient: e.target.value }
                })
              }
              placeholder="Hexan : EtOAc (9:1) -> (4:1)"
              className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-1.5 font-mono focus:outline-none min-h-[40px]"
            />
          </div>
        </div>

        {/* 1. DYNAMIC TEST TUBE RACK & GRID */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              <Grid className="w-4 h-4 text-indigo-600" />
              Giá Ống Nghiệm Hứng Phân Đoạn (Bấm 1 chạm vào ống để đổi trạng thái):
            </h3>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded-full bg-white border border-slate-300"></span> Trống
              </span>
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Sản phẩm (P)
              </span>
              <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                <span className="w-3 h-3 rounded-full bg-amber-400"></span> Tạp chất
              </span>
              <span className="flex items-center gap-1.5 text-purple-700 font-semibold">
                <span className="w-3 h-3 rounded-full bg-purple-500"></span> Hỗn hợp / Đuôi
              </span>
            </div>
          </div>

          {/* Test Tube Grid with Append Tile */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            {fractions.map((f) => (
              <div key={f.number} className="relative group">
                <button
                  type="button"
                  onClick={() => toggleFractionState(f.number)}
                  className={`w-full flex flex-col items-center justify-center p-2 rounded-xl border text-xs transition-all transform active:scale-95 shadow-sm min-h-[52px] cursor-pointer ${getTubeColorClass(
                    f.spotPattern
                  )}`}
                  title={`Ống F${f.number}: ${f.spotPattern || 'Trống'} (Bấm để đổi trạng thái)`}
                >
                  <span className="font-mono font-bold text-xs">F{f.number}</span>
                  <span className="text-[10px] opacity-80 uppercase leading-none mt-1">
                    {f.spotPattern === 'product'
                      ? 'Pure'
                      : f.spotPattern === 'impurity'
                      ? 'Imp'
                      : f.spotPattern === 'mixed'
                      ? 'Mix'
                      : '-'}
                  </span>
                </button>
                {fractions.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSpecificTube(f.number);
                    }}
                    className="absolute -top-1.5 -right-1.5 bg-slate-800 hover:bg-rose-600 text-white rounded-full p-0.5 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity no-print cursor-pointer shadow"
                    title={`Xóa ống F${f.number}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}

            {/* Append Next Tube Slot Button */}
            <button
              type="button"
              onClick={handleAddNextTube}
              className="flex flex-col items-center justify-center p-2 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-700 transition-all min-h-[52px] cursor-pointer group no-print"
              title="Bấm để hứng ống tiếp theo"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold mt-0.5">+ F{currentNextTubeNumber}</span>
            </button>
          </div>
        </div>

        {/* 2. FRACTION TLC PLATES MANAGER */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-600" />
                Bản Mỏng Kiểm Tra Phân Đoạn (TLC)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chụp 3 ảnh (UV 254, UV 365, Thuốc thử) kèm danh sách các số ống đã chấm
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddFracTlc}
              className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-2xl flex items-center gap-2 shadow-md cursor-pointer transition-all min-h-[44px] no-print"
            >
              <Plus className="w-4 h-4" />
              <span>Chấm bản TLC phân đoạn</span>
            </button>
          </div>

          {/* List of Fraction TLC Cards */}
          {fractionTlcPlates && fractionTlcPlates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fractionTlcPlates.map((plate) => {
                const currentTab = activeTabPerFracTlc[plate.id] || 'uv254';
                const img254 = plate.images?.uv254;
                const img365 = plate.images?.uv365;
                const imgReagent = plate.images?.reagent;

                let activeImg = null;
                if (currentTab === 'uv254') activeImg = img254;
                else if (currentTab === 'uv365') activeImg = img365;
                else if (currentTab === 'reagent') activeImg = imgReagent;

                if (!activeImg) activeImg = img254 || img365 || imgReagent;

                return (
                  <div
                    key={plate.id}
                    className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
                  >
                    {/* Header */}
                    <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Tag className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                        <span className="font-mono font-bold text-xs text-amber-300 truncate">
                          {plate.spottedFractions}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 no-print">
                        <button
                          type="button"
                          onClick={() => handleOpenEditFracTlc(plate)}
                          className="text-slate-400 hover:text-indigo-400 p-1.5 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                          title="Sửa bản mỏng này"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteFracTlc(plate.id)}
                          className="text-slate-400 hover:text-rose-400 p-1.5 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer"
                          title="Xóa bản mỏng này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* 3 Photos Selector Tabs */}
                    <div className="bg-slate-950 p-1 flex items-center gap-1 border-b border-slate-800">
                      <button
                        type="button"
                        onClick={() => setActiveTabPerFracTlc({ ...activeTabPerFracTlc, [plate.id]: 'uv254' })}
                        className={`flex-1 py-1.5 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 min-h-[38px] ${
                          currentTab === 'uv254' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <Sun className="w-3 h-3" />
                        <span>UV 254</span>
                        {img254 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTabPerFracTlc({ ...activeTabPerFracTlc, [plate.id]: 'uv365' })}
                        className={`flex-1 py-1.5 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 min-h-[38px] ${
                          currentTab === 'uv365' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <Moon className="w-3 h-3" />
                        <span>UV 365</span>
                        {img365 && <span className="w-1.5 h-1.5 rounded-full bg-violet-300"></span>}
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveTabPerFracTlc({ ...activeTabPerFracTlc, [plate.id]: 'reagent' })}
                        className={`flex-1 py-1.5 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 min-h-[38px] truncate ${
                          currentTab === 'reagent' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-300 hover:bg-slate-800'
                        }`}
                      >
                        <Droplet className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">Thuốc thử</span>
                        {imgReagent && <span className="w-1.5 h-1.5 rounded-full bg-amber-300 flex-shrink-0"></span>}
                      </button>
                    </div>

                    {/* Active Photo Box */}
                    <div className="relative bg-slate-950 aspect-[4/3] flex items-center justify-center overflow-hidden">
                      {activeImg ? (
                        <img
                          src={activeImg}
                          alt="Fraction TLC"
                          className="w-full h-full object-contain cursor-pointer active:scale-95 transition-transform"
                          onClick={() =>
                            openLightbox(
                              plate.images,
                              `TLC Phân Đoạn: ${plate.spottedFractions}`,
                              `Hệ: ${plate.eluent || ''}`,
                              plate.stainName
                            )
                          }
                        />
                      ) : (
                        <div className="text-center p-4 text-slate-500">
                          <Camera className="w-8 h-8 mx-auto mb-1 opacity-30 text-indigo-400" />
                          <span className="text-xs text-slate-400">Chưa có ảnh cho vị trí này</span>
                        </div>
                      )}

                      {/* Zoom button */}
                      {activeImg && (
                        <button
                          type="button"
                          onClick={() =>
                            openLightbox(
                              plate.images,
                              `TLC Phân Đoạn: ${plate.spottedFractions}`,
                              `Hệ: ${plate.eluent || ''}`,
                              plate.stainName
                            )
                          }
                          className="absolute bottom-2 right-2 p-2 bg-slate-900/80 hover:bg-slate-900 text-white rounded-xl backdrop-blur-sm no-print min-h-[38px] min-w-[38px] flex items-center justify-center"
                          title="Phóng to ảnh"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {/* Details */}
                    <div className="p-3 space-y-2 text-xs text-slate-700 bg-white">
                      <div className="flex items-center justify-between font-mono text-[11px] text-slate-500">
                        <span>Hệ: <strong className="text-slate-800">{plate.eluent}</strong></span>
                        <span>Hiện: <strong className="text-amber-800">{plate.stainName}</strong></span>
                      </div>
                      {plate.notes && (
                        <div className="bg-amber-50 p-2 rounded-xl border border-amber-200 text-slate-700">
                          <strong className="text-amber-900 block mb-0.5">Nhận xét:</strong>
                          {plate.notes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 border-2 border-dashed border-slate-300 rounded-2xl bg-white">
              <Camera className="w-10 h-10 mx-auto text-indigo-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">Chưa có bản mỏng kiểm tra phân đoạn nào</p>
              <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                Chấm các phân đoạn (ví dụ: F1, F3, F5, F8...) và chụp 3 ảnh để kiểm tra chất
              </p>
              <button
                type="button"
                onClick={handleOpenAddFracTlc}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2 rounded-xl inline-flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Chấm bản mỏng phân đoạn
              </button>
            </div>
          )}
        </div>

        {/* 3. FRACTION POOLING & POOLED SAMPLE TLC */}
        <div className="bg-indigo-50/50 border border-indigo-200/80 p-4 sm:p-5 rounded-3xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-indigo-200/60 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-indigo-950 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                Gộp Phân Đoạn & TLC Mẫu Gộp
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Gộp các ống chứa cùng một chất và chấm TLC kiểm tra lại trước khi cô quay
              </p>
            </div>
          </div>

          {/* Group Builder Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 no-print bg-white p-3.5 rounded-2xl border border-indigo-100 shadow-sm">
            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-slate-700 block mb-1">Tên mẫu gộp:</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="VD: Nhóm sản phẩm chính F8-F15 (Pure Product)..."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none min-h-[42px]"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-700 block mb-1">Từ ống:</label>
                <input
                  type="number"
                  min="1"
                  max={totalFractions}
                  value={fromFraction}
                  onChange={(e) => setFromFraction(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-xs font-mono font-bold text-center focus:outline-none min-h-[42px]"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-700 block mb-1">Đến ống:</label>
                <input
                  type="number"
                  min="1"
                  max={totalFractions}
                  value={toFraction}
                  onChange={(e) => setToFraction(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2 py-2 text-xs font-mono font-bold text-center focus:outline-none min-h-[42px]"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAddGroup}
                className="w-full bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs py-2 px-3 rounded-xl shadow-sm flex items-center justify-center gap-1.5 min-h-[42px] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Gộp nhóm (Pool)</span>
              </button>
            </div>
          </div>

          {/* List of Active Pooled Groups with Dedicated Pooled TLC Tracker */}
          {fractionGroups && fractionGroups.length > 0 ? (
            <div className="space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Các Bộ Gộp Mẫu Đang Có:
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {fractionGroups.map((g) => {
                  const currentGroupTab = activeTabPerPoolGroup[g.id] || 'uv254';
                  const tlc = g.tlc || {};
                  const img254 = tlc.images?.uv254;
                  const img365 = tlc.images?.uv365;
                  const imgReagent = tlc.images?.reagent;
                  let activePoolImg = currentGroupTab === 'uv254' ? img254 : currentGroupTab === 'uv365' ? img365 : imgReagent;
                  if (!activePoolImg) activePoolImg = img254 || img365 || imgReagent;

                  return (
                    <div
                      key={g.id}
                      className="bg-white border border-slate-200 p-4 rounded-3xl shadow-sm space-y-3 flex flex-col justify-between"
                    >
                      {/* Group Header & Editable Name */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex-1">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                            <span className="font-mono bg-indigo-100 text-indigo-800 text-xs px-2 py-0.5 rounded-lg font-bold">
                              {g.range}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              ({g.fractionNumbers?.length || 0} ống)
                            </span>
                          </div>
                          {/* Editable Group Name */}
                          <input
                            type="text"
                            value={g.name}
                            onChange={(e) => handleUpdateGroupName(g.id, e.target.value)}
                            placeholder="Tên nhóm gộp..."
                            className="w-full font-bold text-slate-900 text-sm bg-transparent border-0 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 rounded px-1 py-0.5 focus:outline-none"
                            title="Bấm vào để đổi tên mẫu gộp này"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveGroup(g.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg no-print"
                          title="Xóa nhóm này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Pooled TLC Sub-section */}
                      <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            <FlaskConical className="w-3.5 h-3.5 text-indigo-600" />
                            TLC Mẫu Gộp (3 Ảnh):
                          </span>

                          <button
                            type="button"
                            onClick={() => handleOpenPoolTlc(g)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm no-print min-h-[36px]"
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>{g.tlc ? 'Cập nhật TLC' : 'Chấm TLC mẫu gộp'}</span>
                          </button>
                        </div>

                        {g.tlc ? (
                          <div className="space-y-2">
                            {/* 3 tabs switcher for pooled tlc */}
                            <div className="bg-slate-900 p-1 rounded-xl flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setActiveTabPerPoolGroup({ ...activeTabPerPoolGroup, [g.id]: 'uv254' })}
                                className={`flex-1 py-1 px-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 min-h-[32px] ${
                                  currentGroupTab === 'uv254' ? 'bg-emerald-600 text-white' : 'text-slate-300'
                                }`}
                              >
                                <Sun className="w-3 h-3" />
                                <span>254</span>
                                {img254 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>}
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveTabPerPoolGroup({ ...activeTabPerPoolGroup, [g.id]: 'uv365' })}
                                className={`flex-1 py-1 px-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 min-h-[32px] ${
                                  currentGroupTab === 'uv365' ? 'bg-violet-600 text-white' : 'text-slate-300'
                                }`}
                              >
                                <Moon className="w-3 h-3" />
                                <span>365</span>
                                {img365 && <span className="w-1.5 h-1.5 rounded-full bg-violet-300"></span>}
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveTabPerPoolGroup({ ...activeTabPerPoolGroup, [g.id]: 'reagent' })}
                                className={`flex-1 py-1 px-1 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 min-h-[32px] truncate ${
                                  currentGroupTab === 'reagent' ? 'bg-amber-600 text-white' : 'text-slate-300'
                                }`}
                              >
                                <Droplet className="w-3 h-3" />
                                <span className="truncate">Thuốc</span>
                                {imgReagent && <span className="w-1.5 h-1.5 rounded-full bg-amber-300"></span>}
                              </button>
                            </div>

                            {/* Pooled TLC Photo preview */}
                            <div className="relative bg-slate-900 aspect-[16/9] rounded-xl overflow-hidden flex items-center justify-center">
                              {activePoolImg ? (
                                <img
                                  src={activePoolImg}
                                  alt="Pool TLC"
                                  className="w-full h-full object-contain cursor-pointer"
                                  onClick={() =>
                                    openLightbox(
                                      g.tlc.images,
                                      `TLC Mẫu Gộp: ${g.name}`,
                                      `Hệ: ${g.tlc.eluent || ''} • ${g.tlc.purityVerdict === 'pure' ? 'Tinh khiết' : g.tlc.purityVerdict}`,
                                      g.tlc.stainName
                                    )
                                  }
                                />
                              ) : (
                                <span className="text-[11px] text-slate-500">Chưa có ảnh cho vị trí này</span>
                              )}
                              {activePoolImg && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openLightbox(
                                      g.tlc.images,
                                      `TLC Mẫu Gộp: ${g.name}`,
                                      `Hệ: ${g.tlc.eluent || ''}`,
                                      g.tlc.stainName
                                    )
                                  }
                                  className="absolute bottom-1 right-1 p-1.5 bg-slate-900/80 text-white rounded-lg no-print"
                                >
                                  <Maximize2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>

                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                {g.tlc.purityVerdict === 'pure'
                                  ? '✓ Tinh khiết (1 vết đơn)'
                                  : g.tlc.purityVerdict === 'trace_impurity'
                                  ? '⚠ Vết chính (có tạp vết mờ)'
                                  : '✗ Hỗn hợp chưa sạch'}
                              </span>
                              <span className="text-slate-500 font-mono">{g.tlc.eluent}</span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">
                            Chưa có dữ liệu sắc ký TLC kiểm tra mẫu gộp này.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic bg-white p-3 rounded-2xl border border-slate-200">
              Chưa có nhóm phân đoạn nào được gộp. Chọn khoảng ống nghiệm (ví dụ F8 - F15) ở trên và bấm "Gộp nhóm".
            </p>
          )}
        </div>

        {/* 4. EPPENDORF MULTI-TUBE ANALYTICAL BALANCE YIELD CALCULATOR */}
        <div className="bg-gradient-to-br from-emerald-50/60 to-slate-50 border border-emerald-200/80 p-4 sm:p-5 rounded-3xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-emerald-950 flex items-center gap-2">
                <Scale className="w-5 h-5 text-emerald-600" />
                Cân Cắn Eppendorf Sau Cô Quay & Tính Hiệu Suất ({tubes.length} ống)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cân khối lượng sản phẩm thu được từ các phân đoạn đã gộp
              </p>
            </div>

            <button
              type="button"
              onClick={handleAddTube}
              className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-sm min-h-[38px] cursor-pointer no-print"
            >
              <Plus className="w-4 h-4" />
              <span>+ Thêm ống Eppendorf</span>
            </button>
          </div>

          {/* List of Eppendorf Tubes */}
          <div className="space-y-2.5">
            {tubes.map((tube, index) => (
              <div
                key={tube.id || index}
                className="bg-white p-3 sm:p-3.5 rounded-2xl border border-emerald-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                {/* Tube Label */}
                <div className="flex items-center gap-2 md:w-36 flex-shrink-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0"></span>
                  <input
                    type="text"
                    value={tube.label}
                    onChange={(e) => handleTubeLabelChange(tube.id, e.target.value)}
                    placeholder={`Ống ${index + 1}`}
                    className="font-bold text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 focus:bg-white focus:outline-none w-full"
                    title="Nhấn để đổi tên ống"
                  />
                </div>

                {/* 3 Mass inputs */}
                <div className="grid grid-cols-3 gap-2 flex-1">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                      m(vỏ) ({massUnit}):
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={tube.tareMass ?? ''}
                      onChange={(e) => handleTubeChange(tube.id, 'tareMass', e.target.value)}
                      placeholder="1.0520"
                      className="w-full text-right font-mono font-bold text-xs sm:text-sm bg-slate-50 focus:bg-white border border-slate-300 focus:border-emerald-500 rounded-xl px-2.5 py-1.5 focus:outline-none min-h-[40px]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                      m(vỏ+cắn) ({massUnit}):
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={tube.grossMass ?? ''}
                      onChange={(e) => handleTubeChange(tube.id, 'grossMass', e.target.value)}
                      placeholder="2.4962"
                      className="w-full text-right font-mono font-bold text-xs sm:text-sm bg-slate-50 focus:bg-white border border-slate-300 focus:border-emerald-500 rounded-xl px-2.5 py-1.5 focus:outline-none min-h-[40px]"
                    />
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-2.5 py-1.5 flex flex-col justify-center">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase leading-none">
                      m(sản phẩm):
                    </span>
                    <span className="font-mono font-extrabold text-emerald-950 text-xs sm:text-sm text-right mt-1">
                      {(tube.productMass || 0).toFixed(4)} <span className="font-normal text-[10px]">{massUnit}</span>
                    </span>
                  </div>
                </div>

                {/* Delete Tube button if > 1 tube */}
                {tubes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTube(tube.id)}
                    className="text-slate-400 hover:text-rose-500 p-2 rounded-lg no-print self-end md:self-center cursor-pointer"
                    title="Xóa ống này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Aggregate Yield & Summary Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {/* Tổng sản phẩm thu được */}
            <div className="bg-emerald-100/70 p-3.5 rounded-2xl border border-emerald-300 shadow-sm flex flex-col justify-between">
              <div className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                Tổng m(sản phẩm) thu được:
              </div>
              <div className="font-mono text-2xl font-extrabold text-emerald-900 text-right my-1">
                {(eppendorfYield.productMass || 0).toFixed(4)}{' '}
                <span className="text-sm font-normal text-emerald-700">{massUnit}</span>
              </div>
              <div className="text-[11px] text-emerald-800 font-medium">
                = Tổng khối lượng các ống
              </div>
            </div>

            {/* % Hiệu suất phản ứng */}
            <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-3.5 rounded-2xl shadow-md flex flex-col justify-between">
              <div className="text-xs font-semibold text-indigo-200 flex items-center justify-between">
                <span>% Hiệu suất (Yield):</span>
                <Award className="w-4 h-4 text-amber-400" />
              </div>
              <div className="font-mono text-3xl font-extrabold text-amber-400 text-right my-1">
                {eppendorfYield.yieldPercent ? `${eppendorfYield.yieldPercent.toFixed(1)}%` : '0.0%'}
              </div>
              <div className="text-[11px] text-slate-300 font-mono">
                Lý thuyết: {eppendorfYield.theoreticalYield?.toFixed(4) || '0.0000'} {massUnit}
              </div>
            </div>

            {/* Purity & Constants */}
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                  Độ tinh khiết HPLC / NMR (%):
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={eppendorfYield.purityHplc ?? ''}
                  onChange={(e) => handleEppendorfParamChange('purityHplc', e.target.value.replace(/[^0-9.,]/g, ''))}
                  placeholder="98.5%"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-mono font-bold text-indigo-700 focus:outline-none min-h-[36px]"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-0.5">
                  Điểm nóng chảy (Tnc °C):
                </label>
                <input
                  type="text"
                  value={eppendorfYield.meltingPoint || ''}
                  onChange={(e) => handleEppendorfParamChange('meltingPoint', e.target.value)}
                  placeholder="VD: 185 - 187°C"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1 text-xs font-mono focus:outline-none min-h-[36px]"
                />
              </div>
            </div>
          </div>

          {/* Cảm quan */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200">
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Cảm quan sản phẩm tinh khiết:
            </label>
            <input
              type="text"
              value={eppendorfYield.productAppearance || ''}
              onChange={(e) => handleEppendorfParamChange('productAppearance', e.target.value)}
              placeholder="VD: Tinh thể hình kim màu trắng ngà..."
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs sm:text-sm focus:outline-none min-h-[40px]"
            />
          </div>
        </div>
      </div>

      {/* MODAL 1: ADD / EDIT FRACTION TLC PLATE */}
      {fracTlcModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[92vh] sm:max-w-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-3.5 px-4 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {editingFracTlcId ? 'Chỉnh Sửa TLC Phân Đoạn' : 'Bản Mỏng Phân Đoạn (TLC)'}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setFracTlcModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                title="Đóng (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-3.5 sm:p-4 space-y-3 touch-pan-y">
              {/* Compact 3-Column Top Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                {/* Col 1: Spotted Tubes */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Ống đã chấm:
                  </label>
                  <input
                    type="text"
                    value={fracSpottedInput}
                    onChange={(e) => setFracSpottedInput(e.target.value)}
                    placeholder="VD: F1, F3, F5..."
                    className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-slate-900 focus:outline-none min-h-[38px]"
                  />
                  {/* Single-row horizontal scrollable quick chips */}
                  <div className="flex items-center gap-1 overflow-x-auto pt-1.5 pb-0.5 no-scrollbar">
                    {fractions.map((f) => {
                      const isSelected = fracSpottedInput.includes(`F${f.number}`);
                      return (
                        <button
                          key={f.number}
                          type="button"
                          onClick={() => toggleSpottedTube(f.number)}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold flex-shrink-0 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-300'
                          }`}
                        >
                          F{f.number}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Col 2: Eluent */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Hệ dung môi:
                  </label>
                  <input
                    type="text"
                    value={fracEluent}
                    onChange={(e) => setFracEluent(e.target.value)}
                    placeholder="Hexan:EtOAc (4:1)"
                    className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:outline-none min-h-[38px]"
                  />
                  {/* Quick eluent pills */}
                  <div className="flex items-center gap-1 overflow-x-auto pt-1.5 pb-0.5 no-scrollbar">
                    {['Hexan:EtOAc (4:1)', 'Hexan:EtOAc (3:1)', 'Hexan:EtOAc (2:1)', 'DCM:MeOH (95:5)'].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setFracEluent(p)}
                        className="text-[10px] bg-white hover:bg-slate-200 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded flex-shrink-0 cursor-pointer"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Col 3: Stain */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Thuốc thử hiện màu:
                  </label>
                  <select
                    value={fracStain}
                    onChange={(e) => setFracStain(e.target.value)}
                    className="w-full bg-white border border-slate-300 focus:border-indigo-500 rounded-xl px-2 py-1.5 text-xs text-slate-900 focus:outline-none min-h-[38px]"
                  >
                    {COMMON_STAINS.map((stain) => (
                      <option key={stain} value={stain}>
                        {stain}
                      </option>
                    ))}
                  </select>
                  {fracStain === 'Khác (Tự nhập)' && (
                    <input
                      type="text"
                      value={customFracStain}
                      onChange={(e) => setCustomFracStain(e.target.value)}
                      placeholder="Tên thuốc thử..."
                      className="w-full mt-1 bg-white border border-slate-300 rounded-xl px-2 py-1 text-xs focus:outline-none min-h-[32px]"
                    />
                  )}
                </div>
              </div>

              {/* 3 Photo Slots Switcher */}
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setFracSlot('uv254')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 min-h-[38px] cursor-pointer ${
                    fracSlot === 'uv254' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>1. UV 254</span>
                  {fracPhoto254.preview && <span className="w-2 h-2 rounded-full bg-emerald-300"></span>}
                </button>

                <button
                  type="button"
                  onClick={() => setFracSlot('uv365')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 min-h-[38px] cursor-pointer ${
                    fracSlot === 'uv365' ? 'bg-violet-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>2. UV 365</span>
                  {fracPhoto365.preview && <span className="w-2 h-2 rounded-full bg-violet-300"></span>}
                </button>

                <button
                  type="button"
                  onClick={() => setFracSlot('reagent')}
                  className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 min-h-[38px] truncate cursor-pointer ${
                    fracSlot === 'reagent' ? 'bg-amber-600 text-white shadow-sm' : 'text-slate-700 hover:bg-white'
                  }`}
                >
                  <Droplet className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">3. Thuốc Thử</span>
                  {fracPhotoReagent.preview && <span className="w-2 h-2 rounded-full bg-amber-300 flex-shrink-0"></span>}
                </button>
              </div>

              {/* Photo Viewer & Immediate Camera/Upload Controls */}
              <div className="bg-slate-900 rounded-2xl p-3 text-white border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold flex items-center gap-1.5">
                    {fracSlot === 'uv254' && <Sun className="w-3.5 h-3.5 text-emerald-400" />}
                    {fracSlot === 'uv365' && <Moon className="w-3.5 h-3.5 text-violet-400" />}
                    {fracSlot === 'reagent' && <Droplet className="w-3.5 h-3.5 text-amber-400" />}
                    <span>
                      {fracSlot === 'uv254' ? 'Đèn UV 254 nm' : fracSlot === 'uv365' ? 'Đèn UV 365 nm' : 'Thuốc thử hiện màu'}
                    </span>
                  </span>

                  {/* Clear Button */}
                  {((fracSlot === 'uv254' && fracPhoto254.preview) ||
                    (fracSlot === 'uv365' && fracPhoto365.preview) ||
                    (fracSlot === 'reagent' && fracPhotoReagent.preview)) && (
                    <button
                      type="button"
                      onClick={() => {
                        if (fracSlot === 'uv254') setFracPhoto254({ preview: null, file: null });
                        if (fracSlot === 'uv365') setFracPhoto365({ preview: null, file: null });
                        if (fracSlot === 'reagent') setFracPhotoReagent({ preview: null, file: null });
                      }}
                      className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" /> Xóa ảnh
                    </button>
                  )}
                </div>

                <div className="relative aspect-[16/9] sm:aspect-[2/1] max-h-[200px] bg-black/80 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center">
                  {fracSlot === 'uv254' && fracPhoto254.preview && (
                    <img src={fracPhoto254.preview} alt="UV 254" className="w-full h-full object-contain" />
                  )}
                  {fracSlot === 'uv365' && fracPhoto365.preview && (
                    <img src={fracPhoto365.preview} alt="UV 365" className="w-full h-full object-contain" />
                  )}
                  {fracSlot === 'reagent' && fracPhotoReagent.preview && (
                    <img src={fracPhotoReagent.preview} alt="Thuốc thử" className="w-full h-full object-contain" />
                  )}

                  {!((fracSlot === 'uv254' && fracPhoto254.preview) ||
                    (fracSlot === 'uv365' && fracPhoto365.preview) ||
                    (fracSlot === 'reagent' && fracPhotoReagent.preview)) && (
                    <div className="text-center p-3 text-slate-400">
                      <Camera className="w-8 h-8 mx-auto mb-1 opacity-50 text-indigo-400" />
                      <p className="text-xs font-medium">Chưa có ảnh ở vị trí này</p>
                    </div>
                  )}
                </div>

                {/* Camera and Upload Buttons - VISIBLE WITHOUT SCROLL */}
                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <label className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold py-2.5 px-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md select-none touch-manipulation min-h-[44px]">
                    <Camera className="w-4 h-4 flex-shrink-0" />
                    <span>Mở Camera</span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => {
                        if (fracSlot === 'uv254') handlePhotoSelect(e, setFracPhoto254);
                        else if (fracSlot === 'uv365') handlePhotoSelect(e, setFracPhoto365);
                        else handlePhotoSelect(e, setFracPhotoReagent);
                      }}
                      className="sr-only"
                    />
                  </label>

                  <label className="bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-200 font-bold py-2.5 px-3 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm select-none touch-manipulation min-h-[44px] border border-slate-700">
                    <Upload className="w-4 h-4 flex-shrink-0" />
                    <span>Chọn Từ Máy</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (fracSlot === 'uv254') handlePhotoSelect(e, setFracPhoto254);
                        else if (fracSlot === 'uv365') handlePhotoSelect(e, setFracPhoto365);
                        else handlePhotoSelect(e, setFracPhotoReagent);
                      }}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              {/* Compact Observation Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ghi chú:
                </label>
                <input
                  type="text"
                  value={fracNotes}
                  onChange={(e) => setFracNotes(e.target.value)}
                  placeholder="VD: F8-F12 vết sạch, F14 xuất hiện tạp..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none min-h-[38px]"
                />
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 px-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-white flex-shrink-0">
              <button
                type="button"
                onClick={() => setFracTlcModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm text-slate-600 hover:bg-slate-100 font-semibold min-h-[40px] cursor-pointer"
              >
                Hủy (Esc)
              </button>
              <button
                type="button"
                onClick={handleSaveFracTlc}
                disabled={fracUploading}
                className="px-5 py-2 rounded-xl text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md min-h-[40px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {fracUploading ? 'Đang lưu...' : editingFracTlcId ? 'Cập Nhật (Enter)' : 'Lưu Bản Mỏng (Enter)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: POOLED SAMPLE TLC MODAL (3 PHOTOS + VERDICT) */}
      {poolTlcModalOpen && activeGroup && (
        <div className="fixed inset-0 z-50 flex flex-col sm:items-center sm:justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    Sắc Ký TLC Mẫu Gộp: {activeGroup.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPoolTlcModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-2 rounded-xl min-h-[44px] min-w-[44px] flex items-center justify-center cursor-pointer"
                title="Đóng (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-4 touch-pan-y">
              {/* Purity Verdict Selector */}
              <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-2xl space-y-2">
                <label className="text-xs font-bold text-emerald-950 block">
                  Đánh giá độ sạch mẫu gộp:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'pure', label: 'Tinh khiết (1 vết)' },
                    { id: 'trace_impurity', label: 'Tạp vết mờ' },
                    { id: 'mixed', label: 'Chưa sạch (Cần cột lại)' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setPoolPurity(item.id)}
                      className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center min-h-[40px] ${
                        poolPurity === item.id
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Eluent and Stain */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Hệ dung môi (Eluent):
                  </label>
                  <input
                    type="text"
                    value={poolEluent}
                    onChange={(e) => setPoolEluent(e.target.value)}
                    placeholder="Hexan : EtOAc (3 : 1)"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono focus:outline-none min-h-[44px]"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Thuốc thử hiện màu:
                  </label>
                  <select
                    value={poolStain}
                    onChange={(e) => setPoolStain(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:outline-none min-h-[44px]"
                  >
                    {COMMON_STAINS.map((stain) => (
                      <option key={stain} value={stain}>
                        {stain}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3 Photos Slot Switcher */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  3 Ảnh TLC Mẫu Gộp:
                </span>

                <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1.5 rounded-2xl">
                  <button
                    type="button"
                    onClick={() => setPoolTlcSlot('uv254')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 min-h-[42px] ${
                      poolTlcSlot === 'uv254' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" />
                    <span>UV 254</span>
                    {poolPhoto254.preview && <span className="w-2 h-2 rounded-full bg-emerald-300"></span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPoolTlcSlot('uv365')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 min-h-[42px] ${
                      poolTlcSlot === 'uv365' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" />
                    <span>UV 365</span>
                    {poolPhoto365.preview && <span className="w-2 h-2 rounded-full bg-violet-300"></span>}
                  </button>

                  <button
                    type="button"
                    onClick={() => setPoolTlcSlot('reagent')}
                    className={`py-2 px-1 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 min-h-[42px] truncate ${
                      poolTlcSlot === 'reagent' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-700 hover:bg-white'
                    }`}
                  >
                    <Droplet className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">Thuốc thử</span>
                    {poolPhotoReagent.preview && <span className="w-2 h-2 rounded-full bg-amber-300 flex-shrink-0"></span>}
                  </button>
                </div>

                {/* Active Photo Slot interactive preview */}
                <div className="bg-slate-900 rounded-3xl p-4 text-white border border-slate-800 space-y-3">
                  <div className="relative aspect-[4/3] bg-black/80 rounded-2xl overflow-hidden border border-slate-800 flex items-center justify-center">
                    {poolTlcSlot === 'uv254' && poolPhoto254.preview && (
                      <img src={poolPhoto254.preview} alt="UV 254" className="w-full h-full object-contain" />
                    )}
                    {poolTlcSlot === 'uv365' && poolPhoto365.preview && (
                      <img src={poolPhoto365.preview} alt="UV 365" className="w-full h-full object-contain" />
                    )}
                    {poolTlcSlot === 'reagent' && poolPhotoReagent.preview && (
                      <img src={poolPhotoReagent.preview} alt="Thuốc thử" className="w-full h-full object-contain" />
                    )}

                    {!((poolTlcSlot === 'uv254' && poolPhoto254.preview) ||
                      (poolTlcSlot === 'uv365' && poolPhoto365.preview) ||
                      (poolTlcSlot === 'reagent' && poolPhotoReagent.preview)) && (
                      <div className="text-center p-6 text-slate-400">
                        <Camera className="w-10 h-10 mx-auto mb-2 opacity-50 text-emerald-400" />
                        <p className="text-xs font-medium">Chưa có ảnh ở vị trí này</p>
                      </div>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <label className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-3 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md select-none touch-manipulation min-h-[48px]">
                      <Camera className="w-4 h-4 flex-shrink-0" />
                      <span>Mở Camera Chụp</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => {
                          if (poolTlcSlot === 'uv254') handlePhotoSelect(e, setPoolPhoto254);
                          else if (poolTlcSlot === 'uv365') handlePhotoSelect(e, setPoolPhoto365);
                          else handlePhotoSelect(e, setPoolPhotoReagent);
                        }}
                        className="sr-only"
                      />
                    </label>

                    <label className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold py-3 px-3 rounded-2xl text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-sm select-none touch-manipulation min-h-[48px] border border-slate-700">
                      <Upload className="w-4 h-4 flex-shrink-0" />
                      <span>Chọn Từ Thư Viện</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          if (poolTlcSlot === 'uv254') handlePhotoSelect(e, setPoolPhoto254);
                          else if (poolTlcSlot === 'uv365') handlePhotoSelect(e, setPoolPhoto365);
                          else handlePhotoSelect(e, setPoolPhotoReagent);
                        }}
                        className="sr-only"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Ghi chú độ sạch & đối chiếu chất đầu:
                </label>
                <textarea
                  rows="2"
                  value={poolNotes}
                  onChange={(e) => setPoolNotes(e.target.value)}
                  placeholder="VD: Chấm đối chứng với chất đầu A: đã chuyển hóa hết, 1 vết sản phẩm duy nhất Rf = 0.42..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs sm:text-sm focus:outline-none min-h-[44px]"
                ></textarea>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-white flex-shrink-0">
              <button
                type="button"
                onClick={() => setPoolTlcModalOpen(false)}
                className="px-4 py-2.5 rounded-2xl text-xs sm:text-sm text-slate-600 hover:bg-slate-100 font-semibold min-h-[44px] cursor-pointer"
              >
                Hủy (Esc)
              </button>
              <button
                type="button"
                onClick={handleSavePoolTlc}
                disabled={poolUploading}
                className="px-6 py-2.5 rounded-2xl text-xs sm:text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md min-h-[44px] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {poolUploading ? 'Đang lưu...' : 'Lưu TLC Mẫu Gộp (Enter)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3-WAVELENGTH LIGHTBOX MODAL */}
      {lightboxData && (
        <div className="fixed inset-0 bg-slate-950/95 backdrop-blur-md z-50 flex flex-col items-center justify-between p-3 sm:p-5 animate-in fade-in">
          {/* Lightbox Header Bar */}
          <div className="w-full max-w-4xl flex items-center justify-between text-white pb-3 border-b border-slate-800">
            <div>
              <h4 className="font-bold text-sm sm:text-base flex items-center gap-2">
                <span>{lightboxData.title}</span>
                {lightboxData.subtitle && (
                  <span className="text-xs text-slate-400 font-mono">({lightboxData.subtitle})</span>
                )}
              </h4>
            </div>

            <button
              type="button"
              onClick={() => setLightboxData(null)}
              className="bg-slate-800 hover:bg-rose-600 text-white p-2.5 rounded-full cursor-pointer"
              title="Đóng (Esc)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Lightbox Image Container */}
          <div className="relative flex-1 w-full max-w-4xl flex items-center justify-center p-2 overflow-hidden">
            {lightboxData.images[lightboxData.activeType] ? (
              <img
                src={lightboxData.images[lightboxData.activeType]}
                alt={`Zoom ${lightboxData.activeType}`}
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl"
              />
            ) : (
              <div className="text-center text-slate-500">
                <Camera className="w-16 h-16 mx-auto mb-2 opacity-30 text-indigo-400" />
                <p className="text-sm">Chưa có ảnh ở chế độ {lightboxData.activeType}</p>
              </div>
            )}
          </div>

          {/* Lightbox 3-Tab Bottom Selector */}
          <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700 flex items-center gap-1.5 shadow-2xl">
            <button
              type="button"
              onClick={() => setLightboxData({ ...lightboxData, activeType: 'uv254' })}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                lightboxData.activeType === 'uv254' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Sun className="w-3.5 h-3.5" />
              <span>UV 254 nm</span>
            </button>

            <button
              type="button"
              onClick={() => setLightboxData({ ...lightboxData, activeType: 'uv365' })}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                lightboxData.activeType === 'uv365' ? 'bg-violet-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              <span>UV 365 nm</span>
            </button>

            <button
              type="button"
              onClick={() => setLightboxData({ ...lightboxData, activeType: 'reagent' })}
              className={`flex-1 py-2 px-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 truncate ${
                lightboxData.activeType === 'reagent' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Droplet className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{lightboxData.stainName || 'Thuốc thử'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
