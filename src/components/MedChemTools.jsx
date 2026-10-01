import React, { useEffect, useRef, useState } from 'react';
import initRDKit from '@rdkit/rdkit';
import wasmUrl from '@rdkit/rdkit/RDKit_minimal.wasm?url';
import { columnEstimate, convertConcentration, decimal, displayToMol, molToDisplay, solutionMoles } from '../domain/chemistry.js';
import { HAZARDS, lookupHazard } from '../domain/hazards.js';
import { downloadBlob } from '../services/downloads.js';

let rdkitPromise;
const rdkit = () => rdkitPromise ||= initRDKit({ locateFile: () => wasmUrl });
const fieldClass = 'w-full border border-slate-300 rounded-lg p-2 bg-white';
const fmt = (n) => Number.isFinite(n) ? Number(n.toPrecision(7)).toLocaleString('vi-VN', { maximumSignificantDigits: 7 }) : '—';
const TABS = ['Cấu trúc & tỷ lượng', 'Dung dịch', 'Định danh sản phẩm', 'Thiết kế cột', 'GHS / SDS'];

export function MedChemTools({ experiment, onChange }) {
  const [tab, setTab] = useState(0);
  const [smiles, setSmiles] = useState(experiment.targetMolecule?.smiles || '');
  const [structure, setStructure] = useState(null);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const generation = useRef(0);
  useEffect(() => { generation.current += 1; setSmiles(experiment.targetMolecule?.smiles || ''); setStructure(null); setError(''); }, [experiment.id]);
  const [solution, setSolution] = useState({ concUnit: 'CM', concentration: '2', actualVolume: '5', mw: '40', density: '1.05', concentrationBasis: 'w/w', nFactor: '1' });
  const [dilution, setDilution] = useState({ stock: '2', final: '0.1', volume: '100' });
  const [column, setColumn] = useState(experiment.columnDesign || { diameterCm: '2', bedHeightCm: '30', voidFraction: '0.4', rfProduct: '0.3', rfImpurity: '0.5', fractionMl: '10', endCV: '8' });
  useEffect(() => setColumn(experiment.columnDesign || { diameterCm: '2', bedHeightCm: '30', voidFraction: '0.4', rfProduct: '0.3', rfImpurity: '0.5', fractionMl: '10', endCV: '8' }), [experiment.id, experiment.columnDesign]);
  const [hazardInput, setHazardInput] = useState('67-64-1');
  const [analysis, setAnalysis] = useState({ kind: 'NMR', sampleId: '', method: '', expected: '', found: '', solvent: '', instrument: '', notes: '', attachments: [] });
  const reference = experiment.stoichiometry?.find((r) => r.isLimiting);
  const referenceMol = displayToMol(reference?.moles || 0, experiment.units?.mole);
  const result = solutionMoles(solution), estimate = columnEstimate(column);
  const hazard = lookupHazard(hazardInput);
  const patchTarget = (fields) => onChange({ targetMolecule: { ...experiment.targetMolecule, ...fields } });
  const patchRow = (id, fields) => onChange({ stoichiometry: experiment.stoichiometry.map((r) => r.id === id ? { ...r, ...fields } : r) });
  const convertSolution = (unit, basis = solution.concentrationBasis) => {
    const converted = convertConcentration(solution, unit, basis);
    if (converted.error) { setError(converted.error); return; }
    setError(''); setSolution({ ...solution, ...converted });
  };
  async function draw() {
    const session = generation.current;
    setBusy(true); setError('');
    let mol;
    try {
      const module = await rdkit();
      mol = module.get_mol(smiles);
      if (!mol?.is_valid()) throw new Error('SMILES không hợp lệ.');
      const descriptors = JSON.parse(mol.get_descriptors());
      const data = { svg: mol.get_svg(480, 280), molblock: mol.get_molblock(), smiles: mol.get_smiles(), mw: descriptors.amw, exactMass: descriptors.exactmw };
      if (generation.current === session) setStructure(data);
    } catch (err) { if (generation.current === session) setError(err.message); }
    finally { mol?.delete(); if (generation.current === session) setBusy(false); }
  }
  async function attachFiles(event) {
    const files = [...event.target.files]; event.target.value = '';
    if (files.some((file) => file.size > 10 * 1024 * 1024) || files.length + analysis.attachments.length > 5) { setError('Tối đa 5 tệp, mỗi tệp 10 MB.'); return; }
    const session = generation.current;
    const attachments = await Promise.all(files.map((file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ id: crypto.randomUUID(), name: file.name, type: file.type, data: reader.result }); reader.onerror = () => reject(new Error('Không đọc được tệp.')); reader.readAsDataURL(file); })));
    if (generation.current === session) setAnalysis((prev) => ({ ...prev, attachments: [...prev.attachments, ...attachments].slice(0, 5) }));
  }
  const disabled = !!experiment.inTrash;
  return <section className="medchem-tools bg-white rounded-2xl border p-4 sm:p-6 space-y-4 no-print">
    <h2 className="text-xl font-bold">Công cụ chuyên môn Hóa Dược</h2>
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Công cụ chuyên môn">{TABS.map((title, index) => <button key={title} role="tab" aria-selected={tab === index} onClick={() => setTab(index)} className={`px-3 py-2 rounded-lg ${tab === index ? 'bg-teal-700 text-white' : 'bg-slate-100 text-slate-900'}`}>{title}</button>)}</div>
    {error && <p role="alert" className="text-rose-700">{error}</p>}
    <fieldset disabled={disabled} className="space-y-4">
      {tab === 0 && <>
        <p>SMILES được xử lý trên máy bằng RDKit. Chọn rõ cấu trúc muối, hydrate và stereochemistry trước khi áp dụng MW.</p>
        <label>SMILES<textarea className={fieldClass} value={smiles} onChange={(e) => { generation.current += 1; setBusy(false); setSmiles(e.target.value); setStructure(null); }} placeholder="Ví dụ aspirin: CC(=O)Oc1ccccc1C(=O)O" /></label>
        <button onClick={draw} disabled={busy || !smiles.trim()} className="bg-teal-700 text-white px-4 py-2 rounded-lg">{busy ? 'Đang vẽ…' : 'Vẽ cấu trúc 2D'}</button>
        {structure && <div className="space-y-3"><div className="structure-image bg-white rounded-lg"><img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(structure.svg)}`} alt="Cấu trúc 2D" /></div><p>MW: {fmt(structure.mw)} g/mol · Khối lượng đơn đồng vị: {fmt(structure.exactMass)} Da</p><div className="flex flex-wrap gap-2"><button onClick={() => patchTarget({ smiles: structure.smiles, molecularWeight: String(structure.mw), molblock: structure.molblock, structureSvg: structure.svg })} className="bg-teal-700 text-white p-2 rounded">Áp dụng vào sản phẩm</button><button onClick={() => downloadBlob(new Blob([structure.molblock], { type: 'chemical/x-mdl-molfile' }), `${experiment.code}.mol`)}>Tải MOL</button><button onClick={() => downloadBlob(new Blob([structure.svg], { type: 'image/svg+xml' }), `${experiment.code}.svg`)}>Tải SVG</button></div></div>}
        <h3 className="font-bold">Hệ số phản ứng ν</h3><p>Eq vẫn tính theo số mol của chất tham chiếu. Hiệu suất lý thuyết dùng n/ν và hệ số sản phẩm. Xúc tác không dùng để xác định mức tiến triển tối đa.</p>
        <label>ν sản phẩm<input inputMode="decimal" className={fieldClass} value={experiment.targetMolecule?.stoichCoefficient ?? '1'} onChange={(e) => patchTarget({ stoichCoefficient: e.target.value })} /></label>
        {(experiment.stoichiometry || []).filter((r) => !['solvent', 'base_acid', 'catalyst'].includes(r.type)).map((r) => <label className="block" key={r.id}>{r.name}: ν<input className={fieldClass} inputMode="decimal" value={r.stoichCoefficient ?? '1'} onChange={(e) => patchRow(r.id, { stoichCoefficient: e.target.value })} /></label>)}
        <button onClick={() => { const candidates = experiment.stoichiometry.filter((r) => !['solvent', 'catalyst', 'base_acid'].includes(r.type) && decimal(r.stoichCoefficient ?? 1) > 0); if (!candidates.length) return; const limiting = candidates.reduce((a, b) => displayToMol(a.moles, experiment.units.mole) / decimal(a.stoichCoefficient ?? 1) <= displayToMol(b.moles, experiment.units.mole) / decimal(b.stoichCoefficient ?? 1) ? a : b); onChange({ stoichiometry: experiment.stoichiometry.map((r) => ({ ...r, isLimiting: r.id === limiting.id, molarRatioInput: undefined })) }); }}>Xác định chất giới hạn theo n/ν</button>
        <label className="block">Assay theo khối lượng (%)<input inputMode="decimal" className={fieldClass} value={experiment.columnAndYield?.eppendorfYield?.assayMassPercent ?? ''} onChange={(e) => onChange({ columnAndYield: { ...experiment.columnAndYield, eppendorfYield: { ...experiment.columnAndYield?.eppendorfYield, assayMassPercent: e.target.value, assayBasis: 'mass' } } })} /></label>
        <p>Hiệu suất phân lập: {fmt(experiment.columnAndYield?.eppendorfYield?.yieldPercent)}% · Hiệu suất hiệu chỉnh assay: {experiment.columnAndYield?.eppendorfYield?.assayYieldPercent == null ? 'Chưa có assay hợp lệ' : `${fmt(experiment.columnAndYield.eppendorfYield.assayYieldPercent)}%`}. HPLC area% được giữ riêng.</p>
      </>}
      {tab === 1 && <>
        <p>Đổi M / C% / N hoặc cơ sở % sẽ quy đổi giá trị, giữ nguyên số mol. z phải phù hợp phản ứng cụ thể.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3"><label>Đơn vị<select className={fieldClass} value={solution.concUnit} onChange={(e) => convertSolution(e.target.value)}><option value="CM">M (mol/L)</option><option value="C%">C%</option><option value="N">N (eq/L)</option></select></label><label>Cơ sở %<select className={fieldClass} value={solution.concentrationBasis} onChange={(e) => convertSolution(solution.concUnit, e.target.value)}><option>w/w</option><option>w/v</option></select></label>{[['concentration', 'Nồng độ'], ['actualVolume', 'V (mL)'], ['mw', 'MW (g/mol)'], ['density', 'd (g/mL)'], ['nFactor', 'z đương lượng/mol']].map(([key, label]) => <label key={key}>{label}<input className={fieldClass} inputMode="decimal" value={solution[key]} onChange={(e) => setSolution({ ...solution, [key]: e.target.value })} /></label>)}</div>
        <p className="font-mono">{result.error || `${fmt(result.mol * 1000)} mmol · ${referenceMol > 0 ? fmt(result.mol / referenceMol) : '—'} Eq · ${referenceMol > 0 ? fmt(result.mol / referenceMol * 100) : '—'} mol%`}</p>
        <button disabled={!!result.error} onClick={() => onChange({ stoichiometry: [...experiment.stoichiometry, { id: crypto.randomUUID(), type: 'base_acid', name: 'Dung dịch đã tính', ...solution, purity: '100', isLimiting: false, moles: molToDisplay(result.mol, experiment.units.mole) }] })}>Thêm dung dịch vào bảng cân đong</button>
        <h3 className="font-bold">Pha loãng C₁V₁ = C₂V₂</h3><p>C₁ và C₂ cùng đơn vị; kết quả dựa trên thể tích cuối, không giả định thể tích trộn cộng được.</p><div className="grid grid-cols-3 gap-3">{[['stock', 'C₁'], ['final', 'C₂'], ['volume', 'V₂ cuối (mL)']].map(([key, label]) => <label key={key}>{label}<input className={fieldClass} value={dilution[key]} inputMode="decimal" onChange={(e) => setDilution({ ...dilution, [key]: e.target.value })} /></label>)}</div><p>{decimal(dilution.stock) > 0 && decimal(dilution.final) > 0 && decimal(dilution.final) <= decimal(dilution.stock) && decimal(dilution.volume) > 0 ? `Lấy ${fmt(decimal(dilution.final) * decimal(dilution.volume) / decimal(dilution.stock))} mL dung dịch gốc; pha đến ${dilution.volume} mL cuối.` : 'Cần 0<C₂≤C₁ và V₂>0.'}</p>
      </>}
      {tab === 2 && <>
        <div className="grid sm:grid-cols-3 gap-3"><label>Phép đo<select className={fieldClass} value={analysis.kind} onChange={(e) => setAnalysis({ ...analysis, kind: e.target.value })}>{['NMR', 'HRMS', 'LC-MS', 'HPLC', 'Melting point'].map((kind) => <option key={kind}>{kind}</option>)}</select></label>{[['sampleId', 'Mã mẫu'], ['method', 'Phương pháp / bước sóng'], ['expected', 'Expected / lý thuyết'], ['found', 'Found / thực nghiệm'], ['solvent', 'Dung môi phổ'], ['instrument', 'Thiết bị']].map(([key, label]) => <label key={key}>{label}<input className={fieldClass} value={analysis[key]} onChange={(e) => setAnalysis({ ...analysis, [key]: e.target.value })} /></label>)}</div>
        <label>Nhận xét<textarea className={fieldClass} value={analysis.notes} onChange={(e) => setAnalysis({ ...analysis, notes: e.target.value })} /></label><label className="block">Phổ/tệp kết quả cục bộ<input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.csv,.txt,.jdx,.dx" onChange={(e) => attachFiles(e).catch((err) => setError(err.message))} /></label><p>{analysis.attachments.map((a) => a.name).join(', ')}</p>
        <button onClick={async () => { if (!analysis.sampleId.trim() || !analysis.method.trim()) { setError('Cần mã mẫu và phương pháp.'); return; } const saved = await onChange({ analytics: { records: [...(experiment.analytics?.records || []), { ...analysis, id: crypto.randomUUID(), observedAt: new Date().toISOString() }] } }); if (saved?.success) setAnalysis({ kind: 'NMR', sampleId: '', method: '', expected: '', found: '', solvent: '', instrument: '', notes: '', attachments: [] }); }}>Lưu kết quả định danh</button>
        {(experiment.analytics?.records || []).map((record) => <article key={record.id} className="border p-3 rounded-lg"><b>{record.kind} · {record.sampleId}</b><p>{record.method} · Expected: {record.expected || '—'} · Found: {record.found || '—'}</p><p>{record.notes}</p>{(record.attachments || []).map((file) => <button key={file.id} onClick={() => { const [header, data] = file.data.split(','); downloadBlob(new Blob([Uint8Array.from(atob(data), (c) => c.charCodeAt(0))], { type: file.type || 'application/octet-stream' }), file.name); }}>{file.name}</button>)}<button onClick={() => onChange({ analytics: { records: experiment.analytics.records.filter((r) => r.id !== record.id) } })}>Xóa kết quả</button></article>)}
      </>}
      {tab === 3 && <>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{[['diameterCm', 'Đường kính trong D (cm)'], ['bedHeightCm', 'Chiều cao lớp nhồi L (cm)'], ['voidFraction', 'Tỷ phần hold-up ε (ước lượng)'], ['rfProduct', 'Rf sản phẩm'], ['rfImpurity', 'Rf tạp'], ['fractionMl', 'Mỗi phân đoạn (mL)'], ['endCV', 'Số CV dự kiến thu']].map(([key, label]) => <label key={key}>{label}<input className={fieldClass} inputMode="decimal" value={column[key]} onChange={(e) => setColumn({ ...column, [key]: e.target.value })} /></label>)}</div>
        <p>{estimate.error || `V lớp nhồi = ${fmt(estimate.bedMl)} mL; V₀ ước lượng = ${fmt(estimate.holdUpMl)} mL; CV sản phẩm ≈ ${fmt(estimate.cvProduct)}; ΔCV ≈ ${fmt(estimate.deltaCV)}; thu ${fmt(estimate.collectionMl)} mL → ${estimate.fractions} ống.`}</p><p>Trong công cụ này 1 CV = V₀ ước lượng. CV≈1/Rf chỉ là ước lượng cho điều kiện TLC/cột tương ứng. ΔCV không phải Rₛ và không bảo đảm số ống có sản phẩm trong gradient.</p>
        <button disabled={!!estimate.error} onClick={() => onChange({ columnDesign: { ...column, assumptions: '1 CV = estimated hold-up; isocratic approximation' } })}>Lưu thiết kế cột</button>
        <a href="https://www.biotage.com/blog/how-do-i-choose-the-right-column-size-for-purification-by-flash-chromatography" target="_blank" rel="noreferrer">Nguồn mô hình CV: Biotage</a>
      </>}
      {tab === 4 && <>
        <label>CAS hoặc tên chính xác<input className={fieldClass} value={hazardInput} onChange={(e) => setHazardInput(e.target.value)} list="chemical-identifiers" /></label><datalist id="chemical-identifiers">{HAZARDS.map((entry) => <option key={entry.cas} value={entry.cas}>{entry.name}</option>)}</datalist>
        {hazard ? <article className="border p-4 rounded-xl"><h3 className="font-bold">{hazard.name} · CAS {hazard.cas}</h3><div className="flex flex-wrap gap-3">{hazard.pictograms.map((code) => <figure key={code} className="text-center"><img className="w-20 h-20 object-contain" src={`/ghs/${code}.gif`} alt={`Biểu tượng ${code}`} /><figcaption>{code}</figcaption></figure>)}</div><p>{hazard.summary}</p><p className="text-sm">Thư viện tham khảo demo 01/10/2026; không thay SDS của đúng nhà cung cấp/nồng độ.</p><a target="_blank" rel="noreferrer" href={`https://pubchem.ncbi.nlm.nih.gov/compound/${hazard.cid}#section=Safety-and-Hazards`}>Tra nguồn PubChem / liên kết SDS</a><button onClick={() => onChange({ safetyRecords: [...(experiment.safetyRecords || []), { ...hazard, id: crypto.randomUUID(), concentration: '', supplier: '', checkedAt: new Date().toISOString(), source: `https://pubchem.ncbi.nlm.nih.gov/compound/${hazard.cid}` }] })}>Gắn tham chiếu vào thí nghiệm</button></article> : <p>Chưa có định danh chính xác trong thư viện demo. Không suy đoán phân loại từ tên gần giống.</p>}
        {(experiment.safetyRecords || []).map((record) => <article key={record.id} className="border p-3"><b>{record.name}</b><div className="grid sm:grid-cols-3 gap-2">{[['concentration', 'Nồng độ/dạng'], ['supplier', 'Nhà cung cấp'], ['sdsUrl', 'URL SDS đúng lô/dạng']].map(([key, label]) => <label key={key}>{label}<input className={fieldClass} value={record[key] || ''} onChange={(e) => onChange({ safetyRecords: experiment.safetyRecords.map((r) => r.id === record.id ? { ...r, [key]: e.target.value } : r) })} /></label>)}</div>{/^https:\/\//.test(record.sdsUrl || '') && <a target="_blank" rel="noreferrer" href={record.sdsUrl}>Mở SDS</a>}<button onClick={() => onChange({ safetyRecords: experiment.safetyRecords.filter((r) => r.id !== record.id) })}>Xóa tham chiếu</button></article>)}
      </>}
    </fieldset>
  </section>;
}
