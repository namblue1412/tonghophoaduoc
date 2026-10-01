import { zipSync, strToU8 } from 'fflate';

export function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = name;
  document.body.append(anchor); anchor.click(); anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function makeTlcZip(images, prefix, metadata = {}) {
  const files = {};
  const safeName = (value) => String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
  for (const [channel, url] of Object.entries(images || {})) {
    if (!url) continue;
    if (!url.startsWith('data:image/')) throw new Error('Bản demo chỉ tải ảnh cục bộ.');
    const comma = url.indexOf(',');
    const header = url.slice(0, comma), encoded = url.slice(comma + 1);
    const bytes = header.includes(';base64') ? Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0)) : strToU8(decodeURIComponent(encoded));
    const mime = header.slice(5).split(';')[0];
    const extension = ({ 'image/png': 'png', 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/heic': 'heic', 'image/avif': 'avif', 'image/svg+xml': 'svg' })[mime] || 'image';
    files[`${safeName(prefix)}_${safeName(channel)}.${extension}`] = bytes;
  }
  if (!Object.keys(files).length) throw new Error('Chưa có ảnh để tải.');
  files['metadata.json'] = strToU8(JSON.stringify(metadata, null, 2));
  return zipSync(files, { level: 0 });
}
export function downloadTlcZip(images, prefix, metadata = {}) {
  downloadBlob(new Blob([makeTlcZip(images, prefix, metadata)], { type: 'application/zip' }), `${String(prefix).replace(/[^a-zA-Z0-9_-]/g, '_')}.zip`);
}
