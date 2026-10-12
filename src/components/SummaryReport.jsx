import React from 'react';
import { formatDecimal as n } from '../domain/display.js';
import { productReportYield } from '../domain/report.js';

export function ProductReportCards({ experiment }) {
  const exp = experiment, column = exp.columnAndYield;
  const fallback = { id: 'current-product', name: exp.targetMolecule?.name, formula: exp.targetMolecule?.molecularFormula, mw: exp.targetMolecule?.molecularWeight, mass: column.eppendorfYield.productMass, structureSvg: exp.targetMolecule?.structureSvg, yieldPercent: column.eppendorfYield.yieldPercent, plates: [] };
  const products = exp.reportProducts?.length ? exp.reportProducts : [fallback];
  return <>{products.map((p, index) => {
    const plates = Array.from({ length: 3 }, (_, i) => p.plates?.[i] || {});
    const percent = p.id === 'current-product' ? p.yieldPercent : productReportYield(p, exp);
    return <section className="report-product" key={p.id}>
      <h3>{index + 1}. {p.name || 'Sản phẩm chưa đặt tên'}</h3>
      {(p.imageUrl || p.structureSvg) && <div className="report-structure"><img src={p.imageUrl || `data:image/svg+xml;charset=utf-8,${encodeURIComponent(p.structureSvg)}`} alt={`Cấu trúc ${p.name || ''}`} /></div>}
      <p><strong>CTPT:</strong> {p.formula || '—'} · <strong>Phân tử lượng:</strong> {n(p.mw)} g/mol</p>
      <p><strong>Sắc ký cột:</strong> Silica gel {n(column.columnParams?.silicaMass)} g · Hệ dung môi {column.columnParams?.eluentGradient || '—'}</p>
      <p><strong>Hiệu suất sau tinh chế:</strong> {percent == null ? 'Chưa đủ dữ liệu để tính' : `${n(percent)}%`} · <strong>Khối lượng:</strong> {n(p.mass)} {p.massUnit || exp.units.mass}</p>
      {percent > 100 && <p>Hiệu suất vượt 100%; cần kiểm tra số cân, độ khô và tỷ lượng.</p>}
      {p.properties && <p><strong>Tính chất:</strong> {p.properties}</p>}
      <table className="report-purity-table"><thead><tr><th>SKLM sau cột</th>{plates.map((_, i) => <th key={i}>Bản {i + 1}</th>)}</tr></thead><tbody>
        <tr><th>Hệ dung môi</th>{plates.map((plate, i) => <td key={i}>{plate.eluent || 'Chưa ghi nhận'}</td>)}</tr>
        <tr><th>Rf</th>{plates.map((plate, i) => <td key={i}>{n(plate.rf)}</td>)}</tr>
        <tr><th>UV254<br />UV365<br />Hiện màu</th>{plates.map((plate, i) => <td key={i}><div className="report-purity-images">{['uv254', 'uv365', 'reagent'].map((slot) => <div key={slot}>{plate.images?.[slot] ? <img src={plate.images[slot]} alt={`Bản ${i + 1} ${slot}`} /> : <span className="report-image-empty">Chưa có ảnh</span>}<small>{slot === 'reagent' ? plate.stainName || 'Hiện màu' : slot.toUpperCase()}</small></div>)}</div></td>)}</tr>
        <tr><th>Nhận xét</th>{plates.map((plate, i) => <td key={i}>{plate.notes || '—'}</td>)}</tr>
      </tbody></table>
    </section>;
  })}</>;
}
export function SummaryReport({ experiment: exp, preview, onClose }) {
  const limiting = exp.stoichiometry.find((r) => r.isLimiting);
  const reagents = exp.stoichiometry.filter((r) => !['solvent', 'base_acid'].includes(r.type));
  const batches = Array.from({ length: Math.ceil(reagents.length / 4) }, (_, i) => reagents.slice(i * 4, i * 4 + 4));
  return <article aria-label="Báo cáo thí nghiệm" className={`experiment-report report-summary report-template ${preview ? 'report-preview' : 'print-only'}`}>
    {preview && <div className="report-preview-controls no-print"><span>Báo cáo tóm tắt</span><button onClick={() => window.print()}>In / Lưu PDF</button><button onClick={onClose} aria-label="Đóng xem trước báo cáo">Đóng</button></div>}
    <h1>{exp.title || 'BÁO CÁO TỔNG HỢP HÓA DƯỢC'}</h1>
    <p>{exp.code} · {exp.date} · {exp.researcher}</p>
    <h2>1. TIẾN HÀNH PHẢN ỨNG</h2>
    {batches.map((rows, index) => <table key={index}><thead><tr><th>Hóa chất</th>{rows.map((r) => <th key={r.id}>{r.name}</th>)}</tr></thead><tbody><tr><th>M (g/mol)</th>{rows.map((r) => <td key={r.id}>{n(r.mw)}</td>)}</tr><tr><th>m ({exp.units.mass})</th>{rows.map((r) => <td key={r.id}>{n(r.actualMass)}</td>)}</tr><tr><th>n ({exp.units.mole})</th>{rows.map((r) => <td key={r.id}>{r.calculationError || n(r.moles)}</td>)}</tr></tbody></table>)}
    <p>Hiệu suất tính theo: {limiting?.name || 'Chưa chọn chất giới hạn'} · Lượng nạp {n(limiting?.actualMass)} {exp.units.mass} · {n(limiting?.moles)} {exp.units.mole}</p>
    {exp.reportProcedure && <p className="report-prose">{exp.reportProcedure}</p>}
    {exp.reportSchemeImageUrl && <div className="report-scheme"><img src={exp.reportSchemeImageUrl} alt="Phương trình tổng quát" /></div>}
    <h2>2. CÁC CHẤT THU ĐƯỢC</h2><ProductReportCards experiment={exp} />
  </article>;
}
