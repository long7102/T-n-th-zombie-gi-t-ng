import { Item } from '../types/game';

// Biểu tượng cho từng món đồ theo tên/loại, để kho đồ hiển thị dạng ô vuông dễ nhìn.
const RULES: [RegExp, string][] = [
  // thức ăn
  [/gạo|cơm|xôi|cháo|yến mạch|bột/i, '🍚'], [/mì tôm|mì gói|mì /i, '🍜'], [/trứng/i, '🥚'], [/bánh mì|sandwich/i, '🍞'],
  [/bánh quy|bánh gạo|bánh/i, '🍪'], [/cà chua/i, '🍅'], [/cà rốt/i, '🥕'], [/khoai tây/i, '🥔'], [/khoai lang|khoai/i, '🍠'],
  [/bí đỏ|bí /i, '🎃'], [/rau|cải|hành|tỏi|gừng|mướp|bầu|rau thơm/i, '🥬'], [/ớt/i, '🌶️'], [/chuối/i, '🍌'], [/cam|bưởi/i, '🍊'],
  [/ổi/i, '🍐'], [/xoài/i, '🥭'], [/dưa/i, '🥒'], [/ngô|bắp/i, '🌽'], [/cá|mực/i, '🐟'], [/tôm/i, '🦐'], [/ốc/i, '🐚'], [/ếch/i, '🐸'],
  [/thịt gà|gà/i, '🍗'], [/thịt|ba chỉ|xúc xích|pate/i, '🥩'], [/sữa chua/i, '🥣'], [/sữa/i, '🥛'], [/mật ong/i, '🍯'], [/đường/i, '🍬'],
  [/muối/i, '🧂'], [/dầu ăn|nước mắm/i, '🫙'], [/trà/i, '🍵'], [/cà phê/i, '☕'], [/nước dừa/i, '🥥'], [/lạc|hạt/i, '🥜'],
  [/sô-cô-la|kẹo|chocolate/i, '🍫'], [/snack|khoai tây chiên/i, '🍿'], [/đồ hộp|lon /i, '🥫'], [/nước|chai|bình/i, '💧'],
  // y tế
  [/băng|gạc/i, '🩹'], [/cồn|povidone|nước muối/i, '🧴'], [/thuốc|kháng sinh|vitamin|paracetamol|viên/i, '💊'], [/cứu thương|y tế/i, '🧰'],
  // vũ khí
  [/súng|colt|shotgun/i, '🔫'], [/dao|kiếm|rựa|dùi cui/i, '🔪'], [/búa|tạ/i, '🔨'], [/gậy|cần tuýp|xà beng|thanh sắt dài/i, '🏏'],
  [/cung|ná/i, '🏹'], [/giáo|cây treo/i, '🔱'], [/đạn/i, '🔸'], [/molotov/i, '🍾'],
  // giáp / quần áo
  [/giáp|áo giáp/i, '🛡️'], [/mũ|nón/i, '⛑️'], [/găng|bao tay/i, '🧤'], [/áo khoác|áo|quần|ủng|giày|chăn/i, '🧥'],
  // dụng cụ & vật liệu
  [/đèn pin|đèn|nến/i, '🔦'], [/pin /i, '🔋'], [/bật lửa|diêm|bình gas|bếp/i, '🔥'], [/xăng|dầu/i, '⛽'], [/dây|thừng/i, '🪢'],
  [/đinh|ốc vít|sắt|bu lông|kìm|cờ lê|mỏ lết/i, '🔩'], [/băng keo/i, '🩶'], [/nồi|chảo|xoong/i, '🍳'], [/radio|bộ đàm|điện thoại/i, '📻'],
  [/ba lô|túi/i, '🎒'], [/ống nhòm/i, '🔭'], [/la bàn|bản đồ/i, '🧭'], [/lưới|cần câu/i, '🎣'], [/dao gọt|kéo/i, '✂️'],
];

const WEAPON_ICONS = new Set(['🔫', '🔪', '🔨', '🏏', '🏹', '🔱', '🔸', '🍾']);
const ARMOR_ICONS = new Set(['🛡️', '⛑️', '🧤', '🧥']);

export function itemIcon(item: Item): string {
  // Ưu tiên luật đúng loại đồ để "Dao chặt thịt" ra hình dao chứ không phải miếng thịt
  const only = item.category === 'weapon' || item.category === 'ammo' ? WEAPON_ICONS : item.category === 'special' ? ARMOR_ICONS : null;
  if (only) for (const [re, icon] of RULES) if (only.has(icon) && re.test(item.name)) return icon;
  for (const [re, icon] of RULES) if (re.test(item.name)) return icon;
  switch (item.category) {
    case 'food': return item.thirstReduce && !item.hungerReduce ? '💧' : '🍽️';
    case 'medical': return '💊';
    case 'weapon': return '🗡️';
    case 'ammo': return '🔸';
    case 'tool': return '🛠️';
    case 'special': return '🛡️';
    case 'gift': return '🎁';
    default: return '📦';
  }
}

export const CATEGORY_LABEL: Record<string, string> = {
  all: 'Tất cả', food: 'Ăn / Uống', medical: 'Y tế', weapon: 'Vũ khí', special: 'Giáp & Áo',
  tool: 'Dụng cụ', material: 'Vật liệu', ammo: 'Đạn', gift: 'Quà',
};

// Mô tả nhanh một dòng khi bấm vào ô vật phẩm.
export function quickFacts(item: Item): string[] {
  const out: string[] = [];
  if (item.hungerReduce) out.push(`Giảm đói ${item.hungerReduce}`);
  if (item.thirstReduce) out.push(item.thirstReduce > 0 ? `Giảm khát ${item.thirstReduce}` : `Làm khát thêm ${-item.thirstReduce}`);
  if (item.healAmount) out.push(`Hồi máu +${item.healAmount}`);
  if (item.infectionReduce) out.push(`Giảm nhiễm độc ${item.infectionReduce}%`);
  if (item.sanityRestore) out.push(`Tinh thần +${item.sanityRestore}`);
  if (item.damage) out.push(`Sát thương ${item.damage}`);
  if (item.defense) out.push(`Phòng thủ +${item.defense}`);
  if (item.durability !== undefined && item.maxDurability) out.push(`Độ bền ${item.durability}/${item.maxDurability}`);
  if (item.needsCooking && !item.isCooked) out.push('Phải nấu chín trước khi dùng');
  if (item.isSealed) out.push('Nguyên seal, không hỏng');
  if (item.isDried) out.push('Đã sấy khô, để lâu được');
  if (item.canSpoil && item.freshness !== undefined && !item.isSealed && !item.isDried) out.push(`Độ tươi ${item.freshness}%`);
  return out;
}
