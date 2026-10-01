// A small, explicitly versioned reference library. Confirm the supplier SDS and concentration.
export const HAZARDS = [
  { cas: '67-64-1', name: 'Acetone', aliases: ['acetone', 'aceton'], pictograms: ['GHS02', 'GHS07'], summary: 'Dễ cháy; kích ứng mắt; có thể gây buồn ngủ/chóng mặt.', cid: 180 },
  { cas: '64-17-5', name: 'Ethanol', aliases: ['ethanol', 'etanol'], pictograms: ['GHS02', 'GHS07'], summary: 'Dễ cháy; kiểm tra phân loại theo nồng độ và SDS nhà cung cấp.', cid: 702 },
  { cas: '141-78-6', name: 'Ethyl acetate', aliases: ['ethyl acetate', 'etoac', 'ethyl acetat'], pictograms: ['GHS02', 'GHS07'], summary: 'Dễ cháy; kích ứng mắt; hơi có thể gây buồn ngủ/chóng mặt.', cid: 8857 },
  { cas: '110-54-3', name: 'n-Hexane', aliases: ['n-hexane', 'n-hexan'], pictograms: ['GHS02', 'GHS07', 'GHS08', 'GHS09'], summary: 'Dễ cháy; nguy cơ hít sặc và ảnh hưởng sức khỏe khi phơi nhiễm; kiểm tra SDS.', cid: 8058 },
  { cas: '75-09-2', name: 'Dichloromethane', aliases: ['dcm', 'dichloromethane'], pictograms: ['GHS07', 'GHS08'], summary: 'Nguy cơ sức khỏe, kích ứng; kiểm tra SDS và quy trình tủ hút.', cid: 6344 },
  { cas: '67-56-1', name: 'Methanol', aliases: ['methanol', 'metanol'], pictograms: ['GHS02', 'GHS06', 'GHS08'], summary: 'Dễ cháy; độc; có thể gây tổn thương cơ quan.', cid: 887 },
  { cas: '7647-01-0', name: 'Hydrogen chloride / HCl', aliases: ['hcl', 'hydrogen chloride'], pictograms: ['GHS05'], summary: 'Phân loại phụ thuộc dung dịch/khí và nồng độ. Tra đúng SDS, không dùng biểu tượng này như phân loại đầy đủ.', cid: 313 },
  { cas: '1310-73-2', name: 'Sodium hydroxide / NaOH', aliases: ['naoh', 'sodium hydroxide'], pictograms: ['GHS05'], summary: 'Ăn mòn; phân loại dung dịch phụ thuộc nồng độ.', cid: 14798 }
];
export function lookupHazard(identifier) {
  const key = String(identifier || '').trim().toLowerCase();
  return HAZARDS.find((entry) => entry.cas === key || entry.name.toLowerCase() === key || entry.aliases.includes(key)) || null;
}
