import React, { useState, useRef, useEffect } from 'react';
import { DecimalInput } from './DecimalInput.jsx';
import { blankReportProduct, validateReportProducts } from '../domain/report.js';
import { uploadImage } from '../services/firebase';

const inputClass = 'w-full border rounded-lg p-2 bg-white';
export function ProductPuritySection({ experiment, onChange }) {
  const [products, setProducts] = useState(() => structuredClone(experiment.reportProducts || []));
  const [notes, setNotes] = useState(experiment.reportProcedure || '');
  const [scheme, setScheme] = useState(experiment.reportSchemeImageUrl || '');
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const pending = useRef(0), mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const patch = (id, fields) => setProducts((prev) => prev.map((p) => p.id === id ? { ...p, ...fields } : p));
  const patchPlate = (id, index, fields) => setProducts((prev) => prev.map((p) => p.id === id ? { ...p, plates: p.plates.map((t, i) => i === index ? { ...t, ...fields } : t) } : p));
  async function image(event, apply) {
    const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
    pending.current++; setBusy(true); setError('');
    try { const url = await uploadImage(file); if (mounted.current) apply(url); }
    catch (e) { if (mounted.current) setError(e.message); }
    finally { pending.current--; if (mounted.current) setBusy(pending.current > 0); }
  }
  return <details className="border bg-white rounded-2xl no-print my-4">
    <summary className="p-4 cursor-pointer font-bold">Chất thu được và 3 bản TLC kiểm tra độ sạch sau cột</summary>
    <fieldset disabled={busy || experiment.inTrash} className="p-4 space-y-4">
      <p className="text-sm text-slate-500">Mỗi chất: 3 bản TLC trên các hệ dung môi bạn chọn; mỗi bản có ảnh UV254, UV365 và hiện màu. Nhập liệu rồi bấm lưu để đưa vào báo cáo.</p>
      <label className="block">Tóm tắt tiến hành phản ứng / số lọ / cơ sở tính hiệu suất<textarea className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
      <label className="block">Ảnh phương trình tổng quát<input type="file" accept="image/*" onChange={(e) => image(e, setScheme)} /></label>{scheme && <><img className="max-h-40" src={scheme} alt="Phương trình tổng quát" /><button onClick={() => setScheme('')}>Gỡ ảnh phương trình</button></>}
      {products.map((p) => <article key={p.id} className="border rounded-xl p-4 space-y-3">
        <div className="grid sm:grid-cols-3 gap-3">{[['name', 'Mã / tên chất'], ['formula', 'Công thức phân tử']].map(([key, label]) => <label key={key}>{label}<input className={inputClass} value={p[key]} onChange={(e) => patch(p.id, { [key]: e.target.value })} /></label>)}{[['mw', 'MW (g/mol)'], ['mass', `Khối lượng sau tinh chế (${p.massUnit || experiment.units.mass})`], ['stoichCoefficient', 'Hệ số ν sản phẩm (để trống: 1)']].map(([key, label]) => <label key={key}>{label}<DecimalInput className={inputClass} value={p[key]} onChange={(e) => patch(p.id, { [key]: e.target.value })} /></label>)}</div>
        <label className="block">Tính chất / độ tan<textarea className={inputClass} value={p.properties} onChange={(e) => patch(p.id, { properties: e.target.value })} /></label>
        <label>Ảnh cấu trúc / phương trình của chất<input type="file" accept="image/*" onChange={(e) => image(e, (url) => patch(p.id, { imageUrl: url }))} /></label>{p.imageUrl && <><img className="max-h-40" src={p.imageUrl} alt={p.name} /><button onClick={() => patch(p.id, { imageUrl: '' })}>Gỡ ảnh cấu trúc</button></>}
        <div className="grid lg:grid-cols-3 gap-3">{p.plates.map((plate, i) => <div key={i} className="border rounded-lg p-3 space-y-2"><h4 className="font-bold">Bản TLC {i + 1}</h4>
          <label className="block">Hệ dung môi<input className={inputClass} value={plate.eluent} onChange={(e) => patchPlate(p.id, i, { eluent: e.target.value })} /></label>
          <label className="block">Rf<DecimalInput className={inputClass} value={plate.rf} onChange={(e) => patchPlate(p.id, i, { rf: e.target.value })} /></label>
          <label className="block">Thuốc thử hiện màu<input className={inputClass} value={plate.stainName} onChange={(e) => patchPlate(p.id, i, { stainName: e.target.value })} /></label>
          {['uv254', 'uv365', 'reagent'].map((slot) => <label className="block" key={slot}>{slot === 'reagent' ? 'Ảnh hiện màu' : slot.toUpperCase()}<input type="file" accept="image/*" onChange={(e) => image(e, (url) => setProducts((prev) => prev.map((item) => item.id === p.id ? { ...item, plates: item.plates.map((t, j) => j === i ? { ...t, timestamp: t.timestamp || new Date().toISOString(), images: { ...t.images, [slot]: url } } : t) } : item)))} />{plate.images[slot] && <><img className="max-h-24" src={plate.images[slot]} alt={`Bản ${i + 1} ${slot}`} /><button onClick={() => patchPlate(p.id, i, { images: { ...plate.images, [slot]: '' } })}>Gỡ ảnh {slot}</button></>}</label>)}
          <label className="block">Nhận xét<textarea className={inputClass} value={plate.notes} onChange={(e) => patchPlate(p.id, i, { notes: e.target.value })} /></label>
        </div>)}</div><button onClick={() => setProducts((prev) => prev.filter((item) => item.id !== p.id))}>Bỏ chất này khỏi bản nháp báo cáo</button>
      </article>)}
      <button className="border rounded-lg p-3" onClick={() => setProducts((prev) => [...prev, blankReportProduct(experiment.units.mass)])}>Thêm chất thu được</button>
      <button className="bg-teal-700 text-white rounded-lg p-3 ml-3" onClick={async () => { try { validateReportProducts(products); const result = await onChange({ reportProducts: products, reportProcedure: notes, reportSchemeImageUrl: scheme }); setError(result?.success ? 'Đã lưu vào báo cáo.' : result?.error?.message || 'Chưa lưu được.'); } catch (e) { setError(e.message); } }}>Lưu dữ liệu báo cáo sau cột</button>
      {error && <p role="status">{error}</p>}
    </fieldset>
  </details>;
}
