import React from 'react';
import { createPortal } from 'react-dom';
import { deriveExperiment } from '../domain/experiment.js';
const n = (value) => Number(value || 0).toLocaleString('vi-VN', { maximumSignificantDigits: 7 });
const stamp = (iso) => iso ? new Date(iso).toLocaleString('vi-VN', { timeZoneName: 'short' }) : 'Không có mốc gốc';

export function ExperimentReport({ experiment, full }) {
  const exp = deriveExperiment(experiment);
  const yieldData = exp.columnAndYield.eppendorfYield;
  const plates = full ? exp.tlcTimeline : exp.tlcTimeline.slice(-1);
  return createPortal(<article className={`experiment-report print-only ${full ? 'report-full' : 'report-summary'}`}>
    <header><h1>NHẬT KÝ TỔNG HỢP HÓA DƯỢC</h1><p>{full ? 'Hồ sơ đầy đủ' : 'Tóm tắt thí nghiệm'} · DEMO · {exp.code}</p></header>
    <h2>{exp.title}</h2><p>{exp.date} · {exp.researcher} · {exp.labRoom}</p>
    <p>Sản phẩm: {exp.targetMolecule?.name} · MW {exp.targetMolecule?.molecularWeight || '—'} g/mol · ν {exp.targetMolecule?.stoichCoefficient || 1}</p>
    {exp.targetMolecule?.structureSvg && <div className="report-structure"><img src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(exp.targetMolecule.structureSvg)}`} alt="Cấu trúc sản phẩm" /></div>}
    <h3>Cân đong</h3><table><thead><tr><th>Hóa chất</th><th>MW</th><th>Lượng nạp</th><th>Mol</th><th>Eq</th></tr></thead><tbody>{exp.stoichiometry.map((r) => <tr key={r.id}><td>{r.name}{r.isLimiting ? ' (*)' : ''}</td><td>{r.mw}</td><td>{r.actualMass || 0} {exp.units.mass} / {r.actualVolume || 0} mL</td><td>{n(r.moles)} {exp.units.mole}</td><td>{r.calculationError || n(r.eq)}</td></tr>)}</tbody></table>
    <h3>Điều kiện và thời gian</h3><p>{exp.reactionTimer.temperature} · {exp.reactionTimer.stirringSpeed} · Tổng phiên đã kết thúc {n(exp.reactionTimer.totalSeconds / 3600)} giờ{exp.reactionTimer.status === 'running' ? ' (đang có phiên chạy, chưa cộng vào tổng đóng)' : ''}</p>
    <h3>TLC</h3>{plates.map((plate) => <figure key={plate.id}><figcaption>{plate.minute} phút · {stamp(plate.timestamp)} · {plate.eluent} · {plate.observations}</figcaption><div className="report-images">{Object.entries(plate.images || {}).filter(([, url]) => url).map(([key, url]) => <div key={key}><img src={url} alt={key} /><small>{key}</small></div>)}</div><p>{(plate.spots || []).map((s) => `${s.label}: Rf ${s.rf}`).join('; ')}</p></figure>)}
    <h3>Xử lý và sản phẩm</h3><p>Quench: {exp.workup.quenching || '—'} · Chiết: {exp.workup.extractionSolvent || '—'} · Rửa: {exp.workup.washing || '—'} · Làm khan: {exp.workup.dryingAgent || '—'}</p><p>Cô quay: {exp.workup.rotavaporTemp} / {exp.workup.rotavaporPressure} · Cắn thô {n(exp.workup.crudeMass)} {exp.units.mass}</p>
    <p>Sản phẩm SPC {n(yieldData.productMass)} {exp.units.mass} · Lý thuyết {n(yieldData.theoreticalYield)} {exp.units.mass} · Hiệu suất {n(yieldData.yieldPercent)}% · HPLC area% {yieldData.purityHplc || '—'} · Assay hiệu chỉnh {yieldData.assayYieldPercent == null ? '—' : `${n(yieldData.assayYieldPercent)}%`}</p>
    {yieldData.yieldPercent > 100 && <p>Cảnh báo: hiệu suất vượt 100%; kiểm tra độ khô, cân và tỷ lượng.</p>}
    {full && <>
      <h3>Phiên phản ứng</h3><table><thead><tr><th>Bắt đầu</th><th>Kết thúc</th><th>Giây</th><th>Ghi chú</th></tr></thead><tbody>{exp.reactionTimer.intervals.map((it) => <tr key={it.id}><td>{stamp(it.startTime)}</td><td>{stamp(it.endTime)}</td><td>{n(it.durationSeconds)}</td><td>{it.note}{it.durationEdited ? ' · đã hiệu chỉnh' : ''}{it.manual ? ' · thủ công, giờ mốc quy ước' : ''}</td></tr>)}</tbody></table>
      <h3>Cột và phân đoạn</h3><p>{exp.columnAndYield.columnParams?.eluentGradient}</p>{exp.columnAndYield.fractionGroups.map((g) => <figure key={g.id}><figcaption>{g.name} · {g.fractionNumbers.map((number) => `F${number}`).join(', ')} · {g.tag} · {stamp(g.tlc?.timestamp)}</figcaption><div className="report-images">{Object.entries(g.tlc?.images || {}).filter(([, url]) => url).map(([key, url]) => <img key={key} src={url} alt={key} />)}</div></figure>)}
      {exp.columnAndYield.fractionTlcPlates.map((plate) => <figure key={plate.id}><figcaption>TLC phân đoạn {plate.spottedFractions} · {stamp(plate.timestamp)} · {plate.eluent}</figcaption><div className="report-images">{Object.entries(plate.images || {}).filter(([, url]) => url).map(([key, url]) => <img key={key} src={url} alt={key} />)}</div></figure>)}
      <h3>Cân trừ bì</h3><table><thead><tr><th>Ống</th><th>Nhãn</th><th>Bì</th><th>Cả bì</th><th>Sản phẩm</th></tr></thead><tbody>{yieldData.tubes.map((tube) => <tr key={tube.id}><td>{tube.label}</td><td>{tube.tag || 'spc'}</td><td>{tube.tareMass}</td><td>{tube.grossMass}</td><td>{tube.weighingError || n(tube.productMass)} {exp.units.mass}</td></tr>)}</tbody></table>
      <h3>Định danh sản phẩm</h3>{(exp.analytics?.records || []).map((r) => <p key={r.id}>{r.kind} · {r.sampleId} · {r.method} · Expected {r.expected} / Found {r.found} · {r.notes} · Tệp {(r.attachments || []).map((a) => a.name).join(', ')}</p>)}
      <h3>Tham chiếu an toàn</h3>{(exp.safetyRecords || []).map((r) => <p key={r.id}>{r.name} · CAS {r.cas} · {r.concentration} · {r.supplier} · {r.sdsUrl || r.source}</p>)}
      <h3>Lịch sử thay đổi</h3>{(exp.auditTrail || []).map((r) => <p key={r.id}>{stamp(r.at)} · {r.actorId} · {r.action} · {r.fields.join(', ')}</p>)}
    </>}
    <footer>Người thực hiện: ____________________ Người kiểm tra: ____________________<br />Tạo từ bản demo; bản tóm tắt dài sẽ phân trang để giữ khả năng đọc.</footer>
  </article>, document.body);
}
