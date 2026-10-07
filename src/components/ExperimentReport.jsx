import { formatDecimal } from '../domain/display.js';
import React from 'react';
import { createPortal } from 'react-dom';
import { deriveExperiment } from '../domain/experiment.js';
const n = formatDecimal;
const stamp = (iso) => iso ? new Date(iso).toLocaleString('vi-VN', { timeZoneName: 'short' }) : 'Không có mốc gốc';
const text = (value) => value === '' || value == null ? '—' : value;
const imageLabel = (key) => ({ uv254: 'UV 254 nm', uv365: 'UV 365 nm', stain: 'Thuốc thử hiện màu', staining: 'Thuốc thử hiện màu' }[key] || key);
const ReportHeading = ({ number, children }) => <h3><span className="report-section-number">{number}</span>{children}</h3>;

export function ExperimentReport({ experiment, full, preview = false, onClose }) {
  const exp = deriveExperiment(experiment);
  const yieldData = exp.columnAndYield.eppendorfYield;
  const plates = full ? exp.tlcTimeline : exp.tlcTimeline.slice(-1);
  return createPortal(<article aria-label="Báo cáo thí nghiệm" className={`experiment-report ${preview ? 'report-preview' : 'print-only'} ${full ? 'report-full' : 'report-summary'}`}>
    {preview && <div className="report-preview-controls no-print"><span>Xem trước báo cáo</span><button onClick={() => window.print()}>In / Lưu PDF</button><button onClick={onClose} aria-label="Đóng xem trước báo cáo">Đóng</button></div>}
    <header><p className="report-eyebrow">SỔ TAY NGHIÊN CỨU · TỔNG HỢP HÓA DƯỢC</p><h1>BÁO CÁO THÍ NGHIỆM</h1><p>{full ? 'Hồ sơ thực nghiệm đầy đủ' : 'Bản tóm tắt thực nghiệm'}</p></header>
    <h2>{text(exp.title)}</h2>
    <dl className="report-metadata"><div><dt>Mã thí nghiệm</dt><dd>{text(exp.code)}</dd></div><div><dt>Ngày thực hiện</dt><dd>{text(exp.date)}</dd></div><div><dt>Người thực hiện</dt><dd>{text(exp.researcher)}</dd></div><div><dt>Phòng thí nghiệm</dt><dd>{text(exp.labRoom)}</dd></div></dl>
    <ReportHeading number="01">Mục tiêu và hóa chất</ReportHeading>
    <p><strong>Sản phẩm mục tiêu:</strong> {text(exp.targetMolecule?.name)} · <strong>MW:</strong> {n(exp.targetMolecule?.molecularWeight) || '—'} g/mol</p>
    {exp.targetMolecule?.structureSvg && <div className="report-structure"><img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(exp.targetMolecule.structureSvg)}`} alt="Cấu trúc sản phẩm" /></div>}
    <table><thead><tr><th>Hóa chất</th><th>MW (g/mol)</th><th>m ({exp.units.mass})</th><th>V (mL)</th><th>n ({exp.units.mole})</th><th>Eq</th></tr></thead><tbody>{exp.stoichiometry.map((r) => <tr key={r.id}><td>{text(r.name)}{r.isLimiting ? ' (*)' : ''}</td><td>{n(r.mw) || '—'}</td><td>{n(r.actualMass) || '—'}</td><td>{n(r.actualVolume) || '—'}</td><td>{n(r.moles) || '—'}</td><td>{r.calculationError || n(r.eq) || '—'}</td></tr>)}</tbody></table><p className="report-note">(*) Chất tham chiếu / chất giới hạn được chọn trong thí nghiệm.</p>
    <ReportHeading number="02">Điều kiện phản ứng</ReportHeading><dl className="report-metadata"><div><dt>Nhiệt độ</dt><dd>{text(exp.reactionTimer.temperature)}</dd></div><div><dt>Tốc độ khuấy</dt><dd>{text(exp.reactionTimer.stirringSpeed)}</dd></div><div><dt>Thời gian các phiên đã kết thúc</dt><dd>{n(exp.reactionTimer.totalSeconds / 3600)} giờ</dd></div></dl>{exp.reactionTimer.status === 'running' && <p className="report-note">Đang có phiên chạy; thời gian phiên này chưa tính vào tổng các phiên đã kết thúc.</p>}
    <ReportHeading number="03">Theo dõi sắc ký lớp mỏng</ReportHeading>{!plates.length && <p className="report-note">Chưa ghi nhận bản TLC.</p>}{plates.map((plate) => <figure key={plate.id}><figcaption><strong>{n(plate.minute)} phút</strong> · {stamp(plate.timestamp)}<br />Hệ dung môi: {text(plate.eluent)}</figcaption><div className="report-images">{Object.entries(plate.images || {}).filter(([, url]) => url).map(([key, url]) => <div key={key}><img src={url} alt={imageLabel(key)} /><small>{imageLabel(key)}</small></div>)}</div><p>{(plate.spots || []).map((s) => `${s.label}: Rf ${n(s.rf)}`).join('; ')}</p>{plate.observations && <p>Nhận xét: {plate.observations}</p>}</figure>)}
    <ReportHeading number="04">Xử lý sau phản ứng</ReportHeading><dl className="report-metadata"><div><dt>Dập phản ứng</dt><dd>{text(exp.workup.quenching)}</dd></div><div><dt>Dung môi chiết</dt><dd>{text(exp.workup.extractionSolvent)}</dd></div><div><dt>Rửa</dt><dd>{text(exp.workup.washing)}</dd></div><div><dt>Làm khan</dt><dd>{text(exp.workup.dryingAgent)}</dd></div></dl><p>Cô quay: {text(exp.workup.rotavaporTemp)} / {text(exp.workup.rotavaporPressure)} · Cắn thô: {n(exp.workup.crudeMass)} {exp.units.mass}</p>
    <ReportHeading number="05">Kết quả phân lập</ReportHeading><table className="report-results"><thead><tr><th>Sản phẩm SPC ({exp.units.mass})</th><th>Lý thuyết ({exp.units.mass})</th><th>Hiệu suất (%)</th><th>HPLC (area%)</th><th>Hiệu suất hiệu chỉnh assay (%)</th></tr></thead><tbody><tr><td>{n(yieldData.productMass)}</td><td>{n(yieldData.theoreticalYield)}</td><td>{n(yieldData.yieldPercent)}</td><td>{n(yieldData.purityHplc) || '—'}</td><td>{yieldData.assayYieldPercent == null ? '—' : n(yieldData.assayYieldPercent)}</td></tr></tbody></table>
    {yieldData.yieldPercent > 100 && <p>Cảnh báo: hiệu suất vượt 100%; kiểm tra độ khô, cân và tỷ lượng.</p>}
    {full && <>
      <ReportHeading number="06">Chi tiết thực nghiệm</ReportHeading><h4>Phiên phản ứng</h4><table><thead><tr><th>Bắt đầu</th><th>Kết thúc</th><th>Giây</th><th>Ghi chú</th></tr></thead><tbody>{exp.reactionTimer.intervals.map((it) => <tr key={it.id}><td>{stamp(it.startTime)}</td><td>{stamp(it.endTime)}</td><td>{n(it.durationSeconds)}</td><td>{it.note}{it.durationEdited ? ' · đã hiệu chỉnh' : ''}{it.manual ? ' · thủ công, giờ mốc quy ước' : ''}</td></tr>)}</tbody></table>
      <h4>Cột và phân đoạn</h4><p>{exp.columnAndYield.columnParams?.eluentGradient}</p>{exp.columnAndYield.fractionGroups.map((g) => <figure key={g.id}><figcaption>{g.name} · {g.fractionNumbers.map((number) => `F${number}`).join(', ')} · {g.tag} · {stamp(g.tlc?.timestamp)}</figcaption><div className="report-images">{Object.entries(g.tlc?.images || {}).filter(([, url]) => url).map(([key, url]) => <img key={key} src={url} alt={key} />)}</div></figure>)}
      {exp.columnAndYield.fractionTlcPlates.map((plate) => <figure key={plate.id}><figcaption>TLC phân đoạn {plate.spottedFractions} · {stamp(plate.timestamp)} · {plate.eluent}</figcaption><div className="report-images">{Object.entries(plate.images || {}).filter(([, url]) => url).map(([key, url]) => <img key={key} src={url} alt={key} />)}</div></figure>)}
      <h4>Cân trừ bì</h4><table><thead><tr><th>Ống</th><th>Nhãn</th><th>Bì</th><th>Cả bì</th><th>Sản phẩm</th></tr></thead><tbody>{yieldData.tubes.map((tube) => <tr key={tube.id}><td>{tube.label}</td><td>{tube.tag || 'spc'}</td><td>{n(tube.tareMass)}</td><td>{n(tube.grossMass)}</td><td>{tube.weighingError || n(tube.productMass)} {exp.units.mass}</td></tr>)}</tbody></table>
      {(exp.analytics?.records || []).length > 0 && <h4>Định danh sản phẩm</h4>}{(exp.analytics?.records || []).map((r) => <p key={r.id}>{r.kind} · {r.sampleId} · {r.method} · Expected {r.expected} / Found {r.found} · {r.notes} · Tệp {(r.attachments || []).map((a) => a.name).join(', ')}</p>)}
      {(exp.safetyRecords || []).length > 0 && <h4>Tham chiếu an toàn</h4>}{(exp.safetyRecords || []).map((r) => <p key={r.id}>{r.name} · CAS {r.cas} · {r.concentration} · {r.supplier} · {r.sdsUrl || r.source}</p>)}
    </>}
    <footer><div><strong>Người thực hiện</strong><p>{text(exp.researcher)}</p><small>Ký, ghi rõ họ tên</small></div><div><strong>Người kiểm tra</strong><p>________________________</p><small>Ký, ghi rõ họ tên</small></div></footer>
  </article>, document.body);
}
