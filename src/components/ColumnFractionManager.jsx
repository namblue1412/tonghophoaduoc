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
  Clock,
  ArrowRight,
  Download
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

export const FRACTION_COLOR_PALETTE = [
  { name: 'Xanh lục bảo', hex: '#10b981' },
  { name: 'Xanh ngọc', hex: '#06b6d4' },
  { name: 'Xanh dương', hex: '#3b82f6' },
  { name: 'Tím violet', hex: '#8b5cf6' },
  { name: 'Cam hổ phách', hex: '#f59e0b' },
  { name: 'Cam đậm', hex: '#f97316' },
  { name: 'Hồng sen', hex: '#ec4899' },
  { name: 'Đỏ san hô', hex: '#ef4444' }
];

export const ColumnFractionManager = ({
  columnData,
  onChange,
  limitingMoles = 0,
  targetMW = 0,
  crudeMass = 0,
  massUnit = 'g',
  moleUnit = 'mol'
}) => {
  const { uploadImage } = useExperiment();

  const {
    columnParams = {
      silicaMass: '30',
      columnSize: '2.0 cm x 30 cm',
      eluentMode: 'gradient',
      isocraticSystem: 'Hexan : EtOAc',
      isocraticRatio: '4 : 1',
      gradientStart: 'Hexan : EtOAc (9 : 1)',
      gradientEnd: 'Hexan : EtOAc (4 : 1)',
      eluentGradient: 'Hexan : EtOAc (9 : 1) -> (4 : 1)'
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
  const [groupName, setGroupName] = useState('');
  const [groupTag, setGroupTag] = useState('spc'); // 'spc' (sản phẩm chính) | 'spp' (sản phẩm phụ)
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

    const tag = groupTag || 'spc';
    const color = groupColor || (tag === 'spc' ? '#10b981' : '#f59e0b');
    const defaultName = tag === 'spc' ? `Sản phẩm chính F${start}-F${end}` : `Sản phẩm phụ F${start}-F${end}`;

    const newGroupId = `group-${Date.now()}`;
    const newGroup = {
      id: newGroupId,
      name: groupName.trim() || defaultName,
      tag: tag, // 'spc' | 'spp'
      range: `F${start} - F${end}`,
      fractionNumbers: numbers,
      color: color,
      tlc: null
    };

    // Mark fractions as belonging to group
    const updatedFractions = fractions.map((f) => {
      if (numbers.includes(f.number)) {
        return {
          ...f,
          group: newGroupId,
          groupTag: tag,
          groupColor: color,
          spotPattern: tag === 'spc' ? 'product' : 'impurity',
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

    setGroupName('');
  };

  // Remove a group
  const handleRemoveGroup = (groupId) => {
    const updatedGroups = fractionGroups.filter((g) => g.id !== groupId);
    const updatedFractions = fractions.map((f) => {
      if (f.group === groupId) {
        return {
          ...f,
          group: null,
          groupTag: null,
          groupColor: null,
          spotPattern: 'empty'
        };
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

  // Change tag of an existing group
  const handleUpdateGroupTag = (groupId, newTag) => {
    const defaultColor = newTag === 'spc' ? '#10b981' : '#f59e0b';
    const updatedGroups = fractionGroups.map((g) =>
      g.id === groupId ? { ...g, tag: newTag, color: g.color || defaultColor } : g
    );
    const updatedFractions = fractions.map((f) => {
      if (f.group === groupId) {
        return {
          ...f,
          groupTag: newTag,
          spotPattern: newTag === 'spc' ? 'product' : 'impurity'
        };
      }
      return f;
    });

    onChange({
      ...columnData,
      fractionGroups: updatedGroups,
      fractions: updatedFractions
    });
  };

  // Change color of an existing group
  const handleUpdateGroupColor = (groupId, newColor) => {
    const updatedGroups = fractionGroups.map((g) =>
      g.id === groupId ? { ...g, color: newColor } : g
    );
    const updatedFractions = fractions.map((f) => {
      if (f.group === groupId) {
        return {
          ...f,
          groupColor: newColor
        };
      }
      return f;
    });

    onChange({
      ...columnData,
      fractionGroups: updatedGroups,
      fractions: updatedFractions
    });
  };

  // Eluent Mode: 'isocratic' (cố định 1 hệ) | 'gradient' (từ hệ này sang hệ kia)
  const currentEluentMode = columnParams.eluentMode || (
    columnParams.eluentGradient && columnParams.eluentGradient.includes('->')
      ? 'gradient'
      : 'isocratic'
  );

  const currentIsocraticSystem = columnParams.isocraticSystem ?? (
    currentEluentMode === 'isocratic' && columnParams.eluentGradient
      ? (columnParams.eluentGradient.includes('(') ? columnParams.eluentGradient.split('(')[0].trim() : columnParams.eluentGradient.trim())
      : 'Hexan : EtOAc'
  );

  const currentIsocraticRatio = columnParams.isocraticRatio ?? (
    currentEluentMode === 'isocratic' && columnParams.eluentGradient
      ? (columnParams.eluentGradient.match(/\((.*?)\)/)?.[1]?.trim() || '4 : 1')
      : '4 : 1'
  );

  const currentGradientStart = columnParams.gradientStart ?? (
    columnParams.eluentGradient && columnParams.eluentGradient.includes('->')
      ? columnParams.eluentGradient.split('->')[0].trim()
      : 'Hexan : EtOAc (9 : 1)'
  );

  const currentGradientEnd = columnParams.gradientEnd ?? (
    columnParams.eluentGradient && columnParams.eluentGradient.includes('->')
      ? columnParams.eluentGradient.split('->')[1].trim()
      : 'Hexan : EtOAc (4 : 1)'
  );

  const handleUpdateEluentMode = (mode) => {
    const isIso = mode === 'isocratic';
    const computedGradientStr = isIso
      ? `${currentIsocraticSystem} (${currentIsocraticRatio})`
      : `${currentGradientStart} -> ${currentGradientEnd}`;

    onChange({
      ...columnData,
      columnParams: {
        ...columnParams,
        eluentMode: mode,
        isocraticSystem: currentIsocraticSystem,
        isocraticRatio: currentIsocraticRatio,
        gradientStart: currentGradientStart,
        gradientEnd: currentGradientEnd,
        eluentGradient: computedGradientStr
      }
    });
  };

  const handleUpdateIsocratic = (system, ratio) => {
    const sys = system.trim();
    const rat = ratio.trim();
    const computedStr = rat ? `${sys} (${rat})` : sys;

    onChange({
      ...columnData,
      columnParams: {
        ...columnParams,
        eluentMode: 'isocratic',
        isocraticSystem: system,
        isocraticRatio: ratio,
        eluentGradient: computedStr
      }
    });
  };

  const handleUpdateGradient = (start, end) => {
    const computedStr = `${start.trim()} -> ${end.trim()}`;
    onChange({
      ...columnData,
      columnParams: {
        ...columnParams,
        eluentMode: 'gradient',
        gradientStart: start,
        gradientEnd: end,
        eluentGradient: computedStr
      }
    });
  };

  const handleApplyEluentPreset = (preset) => {
    if (currentEluentMode === 'isocratic') {
      handleUpdateIsocratic(preset.system, preset.ratio);
    } else {
      handleUpdateGradient(preset.label, currentGradientEnd);
    }
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
  // Download all uploaded TLC photos helper
  const handleDownloadTlcImages = async (images, prefix = 'TLC', stainName = 'ThuocThu') => {
    const imagesToDownload = [];
    if (images?.uv254) {
      imagesToDownload.push({ url: images.uv254, name: `${prefix}_UV254.jpg` });
    }
    if (images?.uv365) {
      imagesToDownload.push({ url: images.uv365, name: `${prefix}_UV365.jpg` });
    }
    if (images?.reagent) {
      const stainSafe = (stainName || 'Reagent').replace(/[^a-zA-Z0-9]/g, '_');
      imagesToDownload.push({ url: images.reagent, name: `${prefix}_${stainSafe}.jpg` });
    }

    if (imagesToDownload.length === 0) {
      alert('Chưa có ảnh sắc ký nào được tải lên!');
      return;
    }

    for (let i = 0; i < imagesToDownload.length; i++) {
      const item = imagesToDownload[i];
      try {
        if (item.url.startsWith('data:')) {
          const link = document.createElement('a');
          link.href = item.url;
          link.download = item.name;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          try {
            const resp = await fetch(item.url, { mode: 'cors' });
            const blob = await resp.blob();
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = item.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
          } catch {
            const link = document.createElement('a');
            link.href = item.url;
            link.download = item.name;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        }
        if (i < imagesToDownload.length - 1) {
          await new Promise((r) => setTimeout(r, 350));
        }
      } catch (err) {
        console.error('Lỗi khi tải ảnh:', err);
      }
    }
  };

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
        return 'bg-amber-400 text-amber-950 border-amber-500 font-bold';
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
      <div className="bg-slate-900 border-b border-slate-800 text-white p-3.5 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start sm:items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div className="p-2 sm:p-2.5 bg-amber-600 rounded-2xl shadow-md text-white flex-shrink-0 mt-0.5 sm:mt-0">
            <Filter className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm sm:text-lg font-bold text-white leading-snug">
              5. Sắc Ký Cột & Cân Cắn Eppendorf
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 line-clamp-1 sm:line-clamp-none">
              Hứng phân đoạn (F1, F2...), chấm TLC kiểm tra, gộp mẫu và cân khối lượng sản phẩm
            </p>
          </div>
        </div>

        {/* Dynamic Tube Action Bar in Header */}
        <div className="flex items-center justify-between sm:justify-end gap-2 no-print bg-slate-800/90 px-3 py-1.5 rounded-2xl border border-slate-700 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddNextTube}
              className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm transition-all min-h-[38px] cursor-pointer whitespace-nowrap"
              title="Thêm ống tiếp theo vào giá hứng"
            >
              <Plus className="w-4 h-4" />
              <span>+ Hứng F{currentNextTubeNumber}</span>
            </button>

            <button
              type="button"
              onClick={handleRemoveLastTube}
              disabled={fractions.length <= 1}
              className="bg-slate-700 hover:bg-slate-600 disabled:opacity-40 text-slate-200 text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition-all min-h-[38px] cursor-pointer disabled:cursor-not-allowed whitespace-nowrap"
              title="Bớt 1 ống cuối"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>Bớt</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="w-px h-5 bg-slate-600 mx-0.5 hidden sm:block"></div>
            <span className="text-xs text-slate-300 font-medium whitespace-nowrap">Tổng:</span>
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
      </div>

      <div className="p-4 sm:p-6 space-y-6">
        {/* Column Setup Parameters & Eluent Mode Selector */}
        <div className="bg-slate-50 p-4 sm:p-5 rounded-3xl border border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-teal-600 flex-shrink-0" />
                <span>Thông số cột & Hệ dung môi giải hấp:</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Chọn chạy cố định 1 hệ hoặc chạy gradient tăng dần độ phân cực
              </p>
            </div>

            {/* Elution Mode Toggle: Isocratic vs Gradient */}
            <div className="inline-flex rounded-xl bg-slate-200/90 p-1 text-xs font-bold shadow-xs self-start sm:self-auto">
              <button
                type="button"
                onClick={() => handleUpdateEluentMode('isocratic')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentEluentMode === 'isocratic'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Hệ cố định</span>
              </button>
              <button
                type="button"
                onClick={() => handleUpdateEluentMode('gradient')}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  currentEluentMode === 'gradient'
                    ? 'bg-white text-teal-800 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>Hệ Gradient</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
            {/* Silica Mass */}
            <div className="sm:col-span-3">
              <div className="flex items-center justify-between gap-1 mb-1">
                <span className="font-semibold text-slate-700">Khối lượng Silicagel (g):</span>
                {crudeMass > 0 && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                    Cắn: {crudeMass}{massUnit}
                  </span>
                )}
              </div>
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
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono font-bold tabular-nums focus:outline-none focus:border-teal-600 min-h-[42px]"
              />
              <div className="flex flex-wrap items-center gap-1 mt-1.5 no-print">
                <span className="text-[10px] font-semibold text-slate-500">Tính từ cắn:</span>
                {[
                  { mult: 25, label: '×25 (Dễ tách)' },
                  { mult: 30, label: '×30 (Chuẩn)' },
                  { mult: 40, label: '×40 (Khó tách)' }
                ].map((opt) => (
                  <button
                    key={opt.mult}
                    type="button"
                    onClick={() => {
                      const baseG = crudeMass > 0 ? (massUnit === 'mg' ? crudeMass / 1000 : crudeMass) : 1.0;
                      const calcSilica = parseFloat((baseG * opt.mult).toFixed(1));
                      let recCol = '2.0 cm x 30 cm';
                      if (calcSilica <= 15) recCol = '1.5 cm x 25 cm';
                      else if (calcSilica <= 35) recCol = '2.0 cm x 30 cm';
                      else if (calcSilica <= 70) recCol = '3.0 cm x 35 cm';
                      else recCol = '4.0 cm x 40 cm';
                      onChange({
                        ...columnData,
                        columnParams: {
                          ...columnParams,
                          silicaMass: String(calcSilica),
                          columnSize: recCol
                        }
                      });
                    }}
                    className="text-[10px] font-bold bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 px-1.5 py-0.5 rounded-md cursor-pointer transition-colors"
                    title="Tự động tính khối lượng Silicagel theo khối lượng cắn thô và gợi ý đường kính cột"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Column Size */}
            <div className="sm:col-span-3">
              <span className="font-semibold text-slate-700 block mb-1">Kích thước cột (ĐK x Cao):</span>
              <input
                type="text"
                value={columnParams.columnSize || ''}
                onChange={(e) =>
                  onChange({
                    ...columnData,
                    columnParams: { ...columnParams, columnSize: e.target.value }
                  })
                }
                placeholder="VD: 2.0 cm x 30 cm"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:border-teal-600 min-h-[42px]"
              />
              <div className="flex flex-wrap items-center gap-1 mt-1.5 no-print">
                {['1.5 cm x 25 cm', '2.0 cm x 30 cm', '3.0 cm x 35 cm'].map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() =>
                      onChange({
                        ...columnData,
                        columnParams: { ...columnParams, columnSize: sz }
                      })
                    }
                    className="text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded-md cursor-pointer transition-colors"
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>

            {/* Eluent Fields depending on Mode */}
            {currentEluentMode === 'isocratic' ? (
              <>
                {/* Isocratic: Solvent System + Ratio */}
                <div className="sm:col-span-4">
                  <span className="font-semibold text-slate-700 block mb-1">Hệ dung môi cố định:</span>
                  <input
                    type="text"
                    value={currentIsocraticSystem}
                    onChange={(e) => handleUpdateIsocratic(e.target.value, currentIsocraticRatio)}
                    placeholder="VD: Hexan : EtOAc"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-semibold text-slate-900 focus:outline-none focus:border-teal-600 min-h-[42px]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <span className="font-semibold text-slate-700 block mb-1">Tỉ lệ (V : V):</span>
                  <input
                    type="text"
                    value={currentIsocraticRatio}
                    onChange={(e) => handleUpdateIsocratic(currentIsocraticSystem, e.target.value)}
                    placeholder="VD: 4 : 1"
                    className="w-full bg-white border border-slate-300 rounded-xl px-2.5 py-2 font-mono font-bold text-center text-teal-800 focus:outline-none focus:border-teal-600 min-h-[42px]"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Gradient: From System A -> To System B */}
                <div className="sm:col-span-3">
                  <span className="font-semibold text-slate-700 block mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                    Từ hệ (Bắt đầu):
                  </span>
                  <input
                    type="text"
                    value={currentGradientStart}
                    onChange={(e) => handleUpdateGradient(e.target.value, currentGradientEnd)}
                    placeholder="VD: Hexan : EtOAc (9 : 1)"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-teal-600 min-h-[42px]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <span className="font-semibold text-slate-700 block mb-1 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    Đến hệ (Tăng phân cực):
                  </span>
                  <input
                    type="text"
                    value={currentGradientEnd}
                    onChange={(e) => handleUpdateGradient(currentGradientStart, e.target.value)}
                    placeholder="VD: Hexan : EtOAc (4 : 1)"
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 font-mono text-slate-900 focus:outline-none focus:border-teal-600 min-h-[42px]"
                  />
                </div>
              </>
            )}
          </div>

          {/* Quick Solvent System Presets & Output String Display */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-200/80">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">Gợi ý nhanh:</span>
              {[
                { label: 'Hexan : EtOAc (9:1)', system: 'Hexan : EtOAc', ratio: '9 : 1' },
                { label: 'Hexan : EtOAc (4:1)', system: 'Hexan : EtOAc', ratio: '4 : 1' },
                { label: 'Hexan : EtOAc (3:1)', system: 'Hexan : EtOAc', ratio: '3 : 1' },
                { label: 'Hexan : EtOAc (1:1)', system: 'Hexan : EtOAc', ratio: '1 : 1' },
                { label: 'DCM : MeOH (95:5)', system: 'DCM : MeOH', ratio: '95 : 5' },
                { label: 'Pet. Ether : Acetone (5:1)', system: 'Petroleum Ether : Acetone', ratio: '5 : 1' }
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleApplyEluentPreset(preset)}
                  className="text-[11px] bg-white hover:bg-teal-50 hover:text-teal-800 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Current Eluent Summary Pill */}
            <div className="text-[11px] bg-white border border-slate-200 px-2.5 py-1 rounded-lg font-mono flex items-center gap-1.5 text-slate-700">
              <span className="text-slate-400">Hệ hiện tại:</span>
              <strong className="text-teal-800">{columnParams.eluentGradient || 'Chưa thiết lập'}</strong>
            </div>
          </div>
        </div>

        {/* 1. DYNAMIC TEST TUBE RACK & GRID */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              <Grid className="w-4 h-4 text-indigo-600" />
              Giá Ống Nghiệm Hứng Phân Đoạn:
            </h3>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-3 h-3 rounded-full bg-white border border-slate-300"></span> Chưa gộp
              </span>
              <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span> spc (Sản phẩm chính)
              </span>
              <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span> spp (Sản phẩm phụ)
              </span>
            </div>
          </div>

          {/* Test Tube Grid with Synchronized Group Color & Tag */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            {fractions.map((f) => {
              const matchingGroup = fractionGroups.find(
                (g) => (g.fractionNumbers && g.fractionNumbers.includes(f.number)) || g.id === f.group
              );
              const tag = matchingGroup?.tag || f.groupTag;
              const color = matchingGroup?.color || f.groupColor;
              const isGrouped = Boolean(matchingGroup || f.group);

              return (
                <div key={f.number} className="relative group">
                  <div
                    className={`w-full flex flex-col items-center justify-center p-2 rounded-xl border text-xs shadow-xs min-h-[56px] select-none transition-all ${
                      isGrouped
                        ? 'border-2 font-bold'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                    style={
                      isGrouped && color
                        ? {
                            backgroundColor: `${color}18`,
                            borderColor: color,
                            color: '#1e293b'
                          }
                        : {}
                    }
                    title={
                      isGrouped
                        ? `Ống F${f.number}: Thuộc nhóm "${matchingGroup?.name || 'Đã gộp'}" (${tag === 'spc' ? 'Sản phẩm chính' : 'Sản phẩm phụ'})`
                        : `Ống F${f.number}: Chưa gộp`
                    }
                  >
                    <span
                      className="font-mono font-bold text-xs"
                      style={isGrouped && color ? { color: color } : {}}
                    >
                      F{f.number}
                    </span>

                    {isGrouped ? (
                      <span
                        className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full text-white mt-1 shadow-xs"
                        style={{ backgroundColor: color || '#10b981' }}
                      >
                        {tag === 'spc' ? 'SPC' : tag === 'spp' ? 'SPP' : (tag || 'GỘP')}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400 leading-none mt-1">-</span>
                    )}
                  </div>

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
              );
            })}

            {/* Append Next Tube Slot Button */}
            <button
              type="button"
              onClick={handleAddNextTube}
              className="flex flex-col items-center justify-center p-2 rounded-xl border-2 border-dashed border-indigo-300 hover:border-indigo-500 hover:bg-indigo-50 text-indigo-700 transition-all min-h-[56px] cursor-pointer group no-print"
              title="Bấm để hứng ống tiếp theo"
            >
              <Plus className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold mt-0.5">+ F{currentNextTubeNumber}</span>
            </button>
          </div>
        </div>

        {/* 2. FRACTION TLC PLATES MANAGER */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                <span>Bản Mỏng Kiểm Tra Phân Đoạn</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Chụp 3 ảnh (UV 254, UV 365, Thuốc thử) kèm danh sách các số ống đã chấm
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenAddFracTlc}
              className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs sm:text-sm px-4 py-2.5 rounded-2xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all min-h-[44px] w-full sm:w-auto no-print"
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
                          onClick={() =>
                            handleDownloadTlcImages(
                              plate.images,
                              `TLC_PhanDoan_${plate.spottedFractions?.replace(/[^a-zA-Z0-9]/g, '_') || 'frac'}`,
                              plate.stainName
                            )
                          }
                          className="text-slate-400 hover:text-indigo-400 p-1.5 rounded-lg min-h-[36px] min-w-[36px] flex items-center justify-center cursor-pointer transition-colors"
                          title="Tải tất cả ảnh của bản mỏng này"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
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
                        <div className="bg-amber-50 p-2 rounded-xl border border-amber-200 text-amber-950 font-medium">
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
              <Camera className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">Chưa có bản mỏng kiểm tra phân đoạn nào</p>
              <p className="text-[11px] text-slate-500 mt-0.5 mb-3">
                Chấm các phân đoạn (ví dụ: F1, F3, F5, F8...) và chụp 3 ảnh để kiểm tra chất
              </p>
              <button
                type="button"
                onClick={handleOpenAddFracTlc}
                className="bg-teal-700 hover:bg-teal-800 text-white text-xs font-bold px-4 py-2 rounded-xl inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Chấm bản mỏng phân đoạn
              </button>
            </div>
          )}
        </div>

        {/* 3. FRACTION POOLING & POOLED SAMPLE TLC */}
        <div className="bg-slate-50 border border-slate-200 p-4 sm:p-5 rounded-3xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-teal-600" />
                Gộp Phân Đoạn & TLC Mẫu Gộp
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Gộp các ống chứa cùng một chất và chấm TLC kiểm tra lại trước khi cô quay
              </p>
            </div>
          </div>

          {/* Group Builder Inputs */}
          <div className="space-y-3 no-print bg-white p-4 rounded-2xl border border-indigo-100 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-5">
                <label className="text-xs font-bold text-slate-700 block mb-1">Tên mẫu gộp:</label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder={groupTag === 'spc' ? 'VD: Sản phẩm chính F8-F15...' : 'VD: Sản phẩm phụ F1-F4...'}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none min-h-[42px]"
                />
              </div>

              {/* Tag Selection: spc vs spp */}
              <div className="sm:col-span-4">
                <label className="text-xs font-bold text-slate-700 block mb-1">Phân loại mẫu gộp:</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setGroupTag('spc');
                      if (groupColor === '#f59e0b') setGroupColor('#10b981');
                    }}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[42px] cursor-pointer border ${
                      groupTag === 'spc'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-500 ring-2 ring-emerald-200 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                    <span>spc (Chính)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setGroupTag('spp');
                      if (groupColor === '#10b981') setGroupColor('#f59e0b');
                    }}
                    className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[42px] cursor-pointer border ${
                      groupTag === 'spp'
                        ? 'bg-amber-50 text-amber-700 border-amber-500 ring-2 ring-amber-200 shadow-xs'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                    <span>spp (Phụ)</span>
                  </button>
                </div>
              </div>

              {/* Range: From / To */}
              <div className="sm:col-span-3 flex items-center gap-2">
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
            </div>

            {/* Color Palette Picker & Action Button */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Màu nhóm trên giá ống:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {FRACTION_COLOR_PALETTE.map((c) => (
                    <button
                      key={c.hex}
                      type="button"
                      onClick={() => setGroupColor(c.hex)}
                      className={`w-6 h-6 rounded-full transition-transform cursor-pointer border border-white shadow-xs ${
                        groupColor === c.hex ? 'scale-125 ring-2 ring-indigo-500 ring-offset-1' : 'hover:scale-110 opacity-80'
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddGroup}
                className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs py-2 px-4 rounded-xl shadow-sm flex items-center justify-center gap-1.5 min-h-[40px] cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Gộp nhóm phân đoạn</span>
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
                          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                            {/* Color Dot & Tag Pill */}
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white shadow-xs flex-shrink-0"
                              style={{ backgroundColor: g.color || '#10b981' }}
                            ></span>
                            <span
                              className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full text-white shadow-xs"
                              style={{ backgroundColor: g.color || '#10b981' }}
                            >
                              {g.tag === 'spc' ? 'spc (Sản phẩm chính)' : g.tag === 'spp' ? 'spp (Sản phẩm phụ)' : (g.tag || 'spc')}
                            </span>
                            <span className="font-mono bg-indigo-50 text-indigo-800 text-xs px-2 py-0.5 rounded-lg font-bold border border-indigo-200">
                              {g.range}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              ({g.fractionNumbers?.length || 0} ống)
                            </span>
                          </div>

                          {/* Quick Tag & Color Adjuster for existing group */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-[10px] font-bold">
                              <button
                                type="button"
                                onClick={() => handleUpdateGroupTag(g.id, 'spc')}
                                className={`px-2 py-0.5 rounded-md transition-colors ${
                                  (g.tag || 'spc') === 'spc'
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                spc
                              </button>
                              <button
                                type="button"
                                onClick={() => handleUpdateGroupTag(g.id, 'spp')}
                                className={`px-2 py-0.5 rounded-md transition-colors ${
                                  g.tag === 'spp'
                                    ? 'bg-amber-600 text-white shadow-xs'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                spp
                              </button>
                            </div>

                            {/* Color Swatches for existing group */}
                            <div className="flex items-center gap-1">
                              {FRACTION_COLOR_PALETTE.map((c) => (
                                <button
                                  key={c.hex}
                                  type="button"
                                  onClick={() => handleUpdateGroupColor(g.id, c.hex)}
                                  className={`w-4 h-4 rounded-full cursor-pointer transition-transform border border-white ${
                                    (g.color || '#10b981') === c.hex ? 'scale-125 ring-1 ring-slate-800' : 'opacity-70 hover:opacity-100'
                                  }`}
                                  style={{ backgroundColor: c.hex }}
                                  title={c.name}
                                />
                              ))}
                            </div>
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

                          <div className="flex items-center gap-1.5 no-print">
                            {g.tlc && (
                              <button
                                type="button"
                                onClick={() =>
                                  handleDownloadTlcImages(
                                    g.tlc.images,
                                    `TLC_MauGop_${g.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'pool'}`,
                                    g.tlc.stainName
                                  )
                                }
                                className="bg-slate-200 hover:bg-indigo-100 text-indigo-700 p-1.5 rounded-xl flex items-center justify-center min-h-[36px] min-w-[36px] cursor-pointer transition-colors"
                                title="Tải tất cả ảnh TLC mẫu gộp này"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleOpenPoolTlc(g)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1 shadow-sm min-h-[36px]"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              <span>{g.tlc ? 'Cập nhật TLC' : 'Chấm TLC mẫu gộp'}</span>
                            </button>
                          </div>
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
                                <div className="absolute bottom-1 right-1 flex items-center gap-1 no-print">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDownloadTlcImages(
                                        g.tlc.images,
                                        `TLC_MauGop_${g.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'pool'}`,
                                        g.tlc.stainName
                                      )
                                    }
                                    className="p-1.5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-lg cursor-pointer transition-colors"
                                    title="Tải tất cả ảnh TLC mẫu gộp này"
                                  >
                                    <Download className="w-3 h-3" />
                                  </button>
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
                                    className="p-1.5 bg-slate-900/80 text-white rounded-lg no-print cursor-pointer"
                                    title="Phóng to ảnh"
                                  >
                                    <Maximize2 className="w-3 h-3" />
                                  </button>
                                </div>
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
                <div className="grid grid-cols-3 gap-2 flex-1 items-end">
                  <div className="min-w-0">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5 whitespace-nowrap truncate">
                      m(vỏ) ({massUnit}):
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={tube.tareMass ?? ''}
                      onChange={(e) => handleTubeChange(tube.id, 'tareMass', e.target.value)}
                      placeholder="1.0520"
                      className="w-full text-right font-mono font-bold text-xs sm:text-sm bg-slate-50 focus:bg-white border border-slate-300 focus:border-emerald-500 rounded-xl px-2 py-1.5 focus:outline-none min-h-[40px]"
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-0.5 whitespace-nowrap truncate">
                      m(vỏ+cắn) ({massUnit}):
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={tube.grossMass ?? ''}
                      onChange={(e) => handleTubeChange(tube.id, 'grossMass', e.target.value)}
                      placeholder="2.4962"
                      className="w-full text-right font-mono font-bold text-xs sm:text-sm bg-slate-50 focus:bg-white border border-slate-300 focus:border-emerald-500 rounded-xl px-2 py-1.5 focus:outline-none min-h-[40px]"
                    />
                  </div>

                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-2 py-1.5 flex flex-col justify-center min-h-[40px] min-w-0">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase leading-none whitespace-nowrap truncate">
                      m(sản phẩm):
                    </span>
                    <span className="font-mono font-extrabold text-emerald-950 text-xs sm:text-sm text-right mt-1 truncate">
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
                <span>% Hiệu suất:</span>
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
                    {editingFracTlcId ? 'Chỉnh Sửa TLC Phân Đoạn' : 'Bản Mỏng Phân Đoạn'}
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
                    Hệ dung môi:
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
                  Ghi chú độ sạch & đối chiếu chất tham gia:
                </label>
                <textarea
                  rows="2"
                  value={poolNotes}
                  onChange={(e) => setPoolNotes(e.target.value)}
                  placeholder="VD: Chấm đối chứng với chất tham gia 1: đã chuyển hóa hết, 1 vết sản phẩm duy nhất Rf = 0.42..."
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
                {poolUploading ? 'Đang lưu...' : 'Lưu Sắc Ký Mẫu Gộp (Enter)'}
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
