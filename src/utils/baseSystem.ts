import { BaseCamp, Item, WeatherType } from '../types/game';

// ====================================================================
// CĂN CỨ KHÉP KÍN: các công trình nối với nhau thành vòng tuần hoàn tự cung tự cấp
//   Mưa/giếng -> Nước -> (Lọc & đun) -> Nước sạch -> Vườn rau -> Rau -> Chuồng gà -> Trứng -> Bếp
//   Rác vườn/chuồng -> Hầm biogas -> Nhiên liệu -> Bếp, Máy phát, Lọc nước
// Thiếu một mắt xích thì cả vòng yếu đi, nên người chơi phải cân đối thay vì chỉ xây một thứ.
// ====================================================================

export interface CostLine { re: RegExp; label: string; qty: number }
export interface ModuleDef {
  id: string;
  name: string;
  icon: string;
  maxLevel: number;
  desc: string;
  needs?: string;               // mô tả đầu vào
  gives?: string;               // mô tả đầu ra
  requires?: string[];          // cần công trình khác đã xây
  cost: (nextLevel: number) => CostLine[];
}

const L = (re: RegExp, label: string, qty: number): CostLine => ({ re, label, qty });

export const MODULES: ModuleDef[] = [
  { id: 'walls', name: 'Tường & cửa gia cố', icon: '🧱', maxLevel: 5, desc: 'Chống bầy zombie xô đẩy và kẻ cướp đột nhập.', gives: '+15% kiên cố mỗi cấp',
    cost: (n) => [L(/thanh sắt|ván|gỗ/i, 'Thanh sắt / ván gỗ', 1 + n), L(/đinh|ốc vít|dây kẽm|dây thừng/i, 'Đinh / dây kẽm', 1)] },
  { id: 'rain_collector', name: 'Hệ thống hứng nước mưa', icon: '🪣', maxLevel: 3, desc: 'Bạt, máng và thùng hứng nước từ mái. Mưa càng nhiều nước càng đầy.', gives: 'Nước mưa chưa đun mỗi lượt (x3 khi mưa)',
    cost: (n) => [L(/bạt|áo mưa|nhựa/i, 'Bạt / tấm nhựa', 1), L(/thùng|bình nước|nồi|bình/i, 'Thùng / bình chứa', n)] },
  { id: 'stove', name: 'Bếp dã chiến', icon: '🔥', maxLevel: 3, desc: 'Nấu chín đồ sống và đun sôi nước. Tốn nhiên liệu.', needs: 'Nhiên liệu', gives: 'Tự nấu chín thức ăn sống trong kho',
    cost: (n) => [L(/nồi|chảo|bếp gas|bình gas/i, 'Nồi / bếp', 1), L(/thanh sắt|gạch|đinh|dây/i, 'Vật liệu dựng bếp', n)] },
  { id: 'purifier', name: 'Bộ lọc & đun nước', icon: '🚰', maxLevel: 3, desc: 'Lọc than và đun sôi nước chưa sạch thành nước uống an toàn.', needs: 'Bếp + nhiên liệu + nước chưa đun', gives: 'Nước đun sôi uống được', requires: ['stove'],
    cost: (n) => [L(/vải|khăn|than|bình lọc|chai/i, 'Vải lọc / than / chai', 1 + n), L(/nồi|bình/i, 'Nồi / bình', 1)] },
  { id: 'garden', name: 'Vườn rau trên mái', icon: '🥬', maxLevel: 3, desc: 'Trồng rau, cà chua, ớt trong chậu và thùng xốp. Cần nước tưới.', needs: 'Nước', gives: 'Rau tươi theo chu kỳ', requires: ['rain_collector'],
    cost: (n) => [L(/thùng|chậu|bạt|nhựa/i, 'Thùng / chậu trồng', 1 + n), L(/rau|cà chua|ớt|hạt|khoai|ngô/i, 'Hạt giống / củ giống (rau củ)', 1)] },
  { id: 'coop', name: 'Chuồng gà', icon: '🐔', maxLevel: 2, desc: 'Nuôi vài con gà lấy trứng. Ăn rau thừa của vườn.', needs: 'Rau từ vườn', gives: 'Trứng gà', requires: ['garden'],
    cost: (n) => [L(/lưới|dây kẽm|dây thừng|thanh sắt|ván/i, 'Lưới / dây / ván', 2), L(/trứng|gà|thịt gà/i, 'Trứng hoặc gà giống', 1)] },
  { id: 'biogas', name: 'Hầm biogas', icon: '♻️', maxLevel: 2, desc: 'Ủ rác vườn và phân gà thành khí đốt. Biến chất thải thành nhiên liệu.', needs: 'Vườn hoặc chuồng gà', gives: 'Nhiên liệu liên tục', requires: ['garden'],
    cost: (n) => [L(/thùng|bình|bồn|nhựa/i, 'Thùng / bồn kín', 1 + n), L(/ống|dây|băng keo|nhựa/i, 'Ống / băng keo', 1)] },
  { id: 'generator', name: 'Máy phát điện & tủ lạnh', icon: '⚡', maxLevel: 2, desc: 'Điện cho tủ lạnh (thực phẩm không hỏng), đèn và radio.', needs: 'Nhiên liệu', gives: 'Điện: giữ đồ tươi, tăng tầm radio',
    cost: (n) => [L(/máy phát|sạc dự phòng|ắc quy|điện/i, 'Máy phát / ắc quy', 1), L(/dây điện|kìm|dụng cụ/i, 'Dây điện / dụng cụ', 1)] },
  { id: 'smokehouse', name: 'Kho sấy & ướp muối', icon: '🐟', maxLevel: 2, desc: 'Sấy khô và ướp muối đồ tươi để để được hàng tháng.', needs: 'Muối + nhiên liệu', gives: 'Đồ tươi thành đồ khô không hỏng', requires: ['stove'],
    cost: (n) => [L(/muối/i, 'Muối', n), L(/thanh sắt|ván|dây|lưới/i, 'Giá treo / lưới', 1)] },
  { id: 'medbay', name: 'Góc y tế', icon: '🩺', maxLevel: 2, desc: 'Giường, tủ thuốc, nước muối: nhiễm độc giảm dần, vết thương mau lành.', gives: 'Giảm nhiễm độc mỗi lượt',
    cost: (n) => [L(/băng|gạc|cồn|thuốc|nước muối/i, 'Vật tư y tế', 1 + n), L(/chăn|gối|vải|bạt/i, 'Chăn / vải', 1)] },
  { id: 'watchtower', name: 'Tháp canh & chuông báo động', icon: '🔔', maxLevel: 3, desc: 'Nhìn thấy trước bầy zombie và kẻ cướp, giảm thiệt hại khi bị tấn công.', gives: 'Giảm nguy hiểm & tăng yên tâm',
    cost: (n) => [L(/dây|lon|chuông|kẽm/i, 'Dây / chuông / lon', 1 + n), L(/thanh sắt|ván|thang|ống nhòm/i, 'Khung tháp', 1)] },
];

export const MODULE_BY_ID: Record<string, ModuleDef> = Object.fromEntries(MODULES.map((m) => [m.id, m]));

export const lvl = (b: BaseCamp, id: string) => b.modules?.[id] || 0;

const FUEL_RE = /bình gas|can xăng|xăng|củi|than|cồn đốt|nến/i;
const nm = (i: Item) => i.name || '';

export function countItems(items: Item[], re: RegExp): number {
  return items.filter((i) => re.test(nm(i))).reduce((s, i) => s + i.quantity, 0);
}

// Trừ vật tư theo chi phí, lấy từ ba lô trước rồi tới kho căn cứ. Trả về null nếu thiếu.
export function payCost(cost: CostLine[], backpack: Item[], warehouse: Item[]): { backpack: Item[]; warehouse: Item[] } | null {
  let bp = backpack.map((i) => ({ ...i }));
  let wh = warehouse.map((i) => ({ ...i }));
  for (const c of cost) {
    let need = c.qty;
    for (const list of [bp, wh]) {
      for (const it of list) {
        if (need <= 0) break;
        if (c.re.test(nm(it)) && it.quantity > 0 && it.category !== 'food' && it.category !== 'weapon') {
          const take = Math.min(it.quantity, need);
          it.quantity -= take;
          need -= take;
        }
      }
    }
    if (need > 0) return null;
  }
  return { backpack: bp.filter((i) => i.quantity > 0), warehouse: wh.filter((i) => i.quantity > 0) };
}

export function costStatus(cost: CostLine[], backpack: Item[], warehouse: Item[]) {
  return cost.map((c) => {
    const have = [...backpack, ...warehouse].filter((i) => c.re.test(nm(i)) && i.category !== 'food' && i.category !== 'weapon').reduce((s, i) => s + i.quantity, 0);
    return { label: c.label, need: c.qty, have, ok: have >= c.qty };
  });
}

function addItem(wh: Item[], item: Partial<Item> & { name: string }, qty: number, cap = 24) {
  const ex = wh.find((i) => i.name === item.name && i.freshness === item.freshness);
  if (ex) ex.quantity = Math.min(cap, ex.quantity + qty);
  else wh.push({ id: `base_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e4)}`, category: 'food', quantity: Math.min(cap, qty), rarity: 'common', description: '', ...item } as Item);
}

// Rút `n` đơn vị của món khớp, trả về số thực tế lấy được.
function take(wh: Item[], re: RegExp, n: number, filter?: (i: Item) => boolean): number {
  let got = 0;
  for (const it of wh) {
    if (got >= n) break;
    if (re.test(nm(it)) && it.quantity > 0 && (!filter || filter(it))) {
      const t = Math.min(it.quantity, n - got);
      it.quantity -= t;
      got += t;
    }
  }
  return got;
}

export interface TickResult {
  base: BaseCamp;
  log: string[];
  sanity: number;
  infection: number;
  danger: number;
  loopStatus: Record<string, 'ok' | 'starved' | 'off'>;
}

// Một lượt vận hành của căn cứ.
export function tickBase(base: BaseCamp, weather: WeatherType, turn: number): TickResult {
  const out: TickResult = { base, log: [], sanity: 0, infection: 0, danger: 0, loopStatus: {} };
  if (!base.hasBase || !base.modules) return out;
  const wh: Item[] = base.warehouse.map((i) => ({ ...i }));
  let fuel = base.fuel || 0;
  const status = out.loopStatus;
  const getFuel = (need: number): boolean => {
    while (fuel < need) {
      const got = take(wh, FUEL_RE, 1);
      if (!got) return false;
      fuel += 6;
    }
    fuel -= need;
    return true;
  };

  // 1) Nước: mưa + giếng
  const rc = lvl(base, 'rain_collector');
  if (rc) {
    const amount = rc * (weather === 'heavy_rain' ? 3 : 1);
    addItem(wh, { name: 'Nước mưa hứng (chưa đun)', thirstReduce: 30, needsCooking: true, canSpoil: false, description: 'Nước hứng từ mái, cần đun sôi.' }, amount, 30);
    status.rain_collector = 'ok';
  }
  const well = lvl(base, 'well');
  if (well) addItem(wh, { name: 'Nước giếng đun sôi', thirstReduce: 40, canSpoil: false, description: 'Nước giếng trong chỗ trú, đã lọc sạch.' }, well, 30);

  // 2) Bếp: nấu chín đồ sống, tốn nhiên liệu
  const stove = lvl(base, 'stove') || (base.facilities.hasStove ? 1 : 0);
  let cooked = 0;
  if (stove) {
    for (const it of wh) {
      if (cooked >= stove * 2) break;
      if (it.category === 'food' && it.needsCooking && !it.isCooked && !it.thirstReduce) {
        if (!getFuel(1)) { status.stove = 'starved'; out.log.push('Bếp hết nhiên liệu, đồ sống chưa thể nấu.'); break; }
        const n = Math.min(it.quantity, stove * 2 - cooked);
        const donePart: Item = { ...it, id: `${it.id}_c`, quantity: n, name: `${it.name} (nấu chín)`, needsCooking: false, isCooked: true, hungerReduce: (it.hungerReduce || 20) + 10, canSpoil: true, freshness: 100 };
        it.quantity -= n;
        const ex = wh.find((i) => i.name === donePart.name);
        if (ex) ex.quantity += n; else wh.push(donePart);
        cooked += n;
        status.stove = 'ok';
      }
    }
    if (cooked) out.log.push(`Bếp nấu chín ${cooked} phần thức ăn trong kho.`);
  }

  // 3) Lọc & đun nước: nước chưa đun -> nước đun sôi
  const pur = lvl(base, 'purifier');
  if (pur && stove) {
    const raw = wh.find((i) => i.thirstReduce && i.needsCooking && i.quantity > 0);
    if (raw) {
      if (getFuel(1)) {
        const n = Math.min(raw.quantity, pur * 2);
        raw.quantity -= n;
        addItem(wh, { name: 'Nước đun sôi', thirstReduce: 40, canSpoil: false, description: 'Nước đã lọc và đun sôi, uống an toàn.' }, n, 30);
        out.log.push(`Đun sôi và lọc ${n} bình nước sạch.`);
        status.purifier = 'ok';
      } else status.purifier = 'starved';
    }
  }

  // 4) Vườn rau: cần nước, cho rau theo chu kỳ
  const garden = lvl(base, 'garden');
  let scraps = 0;
  if (garden) {
    if (turn % 3 === 0) {
      const w = take(wh, /nước/i, 1, (i) => !!i.thirstReduce);
      if (!w) { status.garden = 'starved'; out.log.push('Vườn rau khô héo vì không có nước tưới.'); }
      else status.garden = 'ok';
    }
    if (status.garden !== 'starved' && turn % 2 === 0) {
      const names = ['Rau xanh từ vườn', 'Cà chua từ vườn', 'Ớt và rau thơm'];
      const pickN = names[Math.floor(Math.random() * names.length)];
      addItem(wh, { name: pickN, hungerReduce: 10, canSpoil: true, freshness: 95, description: 'Hái từ vườn trên mái, tươi ngon.' }, garden, 20);
      scraps += garden;
      out.log.push(`Vườn rau cho ${garden} phần ${pickN.toLowerCase()}.`);
      status.garden = 'ok';
    }
  }

  // 5) Chuồng gà: ăn rau thừa -> trứng
  const coop = lvl(base, 'coop');
  if (coop && turn % 3 === 0) {
    const feed = take(wh, /rau|cà chua|ớt|thơm/i, 1, (i) => i.category === 'food' && !i.thirstReduce);
    if (feed) {
      addItem(wh, { name: 'Trứng gà nhà nuôi', hungerReduce: 22, needsCooking: true, canSpoil: true, freshness: 90, description: 'Trứng từ chuồng gà của căn cứ.' }, coop * 2, 20);
      out.log.push(`Chuồng gà đẻ ${coop * 2} quả trứng.`);
      status.coop = 'ok';
      scraps += 1;
    } else status.coop = 'starved';
  }

  // 6) Biogas: rác vườn/chuồng -> nhiên liệu
  const bio = lvl(base, 'biogas');
  if (bio && (garden || coop)) {
    if (scraps > 0 || turn % 2 === 0) {
      fuel += 2 * bio;
      status.biogas = 'ok';
      if (turn % 4 === 0) out.log.push('Hầm biogas tạo thêm nhiên liệu từ rác vườn và chuồng.');
    }
  }

  // 7) Kho sấy: đồ tươi -> đồ khô
  const smoke = lvl(base, 'smokehouse');
  if (smoke && stove) {
    let dried = 0;
    for (const it of wh) {
      if (dried >= smoke) break;
      if (it.category === 'food' && it.canSpoil && !it.isDried && !it.isCooked && (it.freshness ?? 100) < 85 && !it.thirstReduce) {
        const salt = take(wh, /muối/i, 1);
        if (!salt) { status.smokehouse = 'starved'; break; }
        it.name = `${it.name} (sấy khô)`; it.isDried = true; it.canSpoil = false; it.freshness = 100;
        dried++; status.smokehouse = 'ok';
      }
    }
    if (dried) out.log.push(`Kho sấy bảo quản ${dried} loại đồ tươi, giờ để được rất lâu.`);
  }

  // 8) Máy phát: tốn nhiên liệu, giữ lạnh
  const gen = lvl(base, 'generator');
  let powerOn = false;
  if (gen) {
    if (turn % 3 === 0 ? getFuel(1) : fuel > 0 || base.facilities.hasGeneratorAndFridge) { powerOn = true; status.generator = 'ok'; }
    else { status.generator = 'starved'; out.log.push('Máy phát hết nhiên liệu, tủ lạnh ngừng chạy.'); }
  }

  // 9) Hiệu ứng thụ động
  const med = lvl(base, 'medbay');
  if (med) { out.infection -= med * 1.5; status.medbay = 'ok'; }
  const tower = lvl(base, 'watchtower');
  if (tower) { out.danger -= tower >= 3 ? 2 : 1; out.sanity += 1; status.watchtower = 'ok'; }
  out.infection = Math.round(out.infection);

  out.base = {
    ...base,
    warehouse: wh.filter((i) => i.quantity > 0),
    fuel,
    facilities: { ...base.facilities, hasStove: stove > 0, hasGeneratorAndFridge: gen > 0 ? powerOn : base.facilities.hasGeneratorAndFridge },
  };
  return out;
}

// Độ phù hợp của chỗ trú hiện tại làm căn cứ (theo bối cảnh khởi đầu).
export const SHELTER_SUITABILITY: Record<string, { score: number; pros: string[]; cons: string[]; kind: 'Apartment' | 'Military Base' | 'Civilian Shelter' | 'Nomad' }> = {
  apartment_survivors: { score: 72, kind: 'Apartment', pros: ['Tầng cao khó bị bầy xô vào', 'Có sân thượng để hứng nước, trồng rau', 'Cửa thoát hiểm dễ chặn'], cons: ['Phải leo nhiều tầng để mang đồ', 'Ít đồ ăn sẵn'] },
  supermarket_lockdown: { score: 64, kind: 'Civilian Shelter', pros: ['Kho hàng lớn, nhiều đồ dự trữ', 'Cửa cuốn sắt chắc chắn'], cons: ['Kính vỡ nhiều, khó giữ nhiệt', 'Mùi thức ăn thu hút zombie'] },
  highway_traffic_breakdown: { score: 22, kind: 'Nomad', pros: ['Dễ di chuyển'], cons: ['Trống trải, không có tường', 'Không có nước, không có chỗ trồng trọt'] },
  metro_train_derailment: { score: 40, kind: 'Civilian Shelter', pros: ['Dưới lòng đất, thời tiết không ảnh hưởng'], cons: ['Tối, ẩm', 'Không có đường hứng nước mưa'] },
  clinic_containment: { score: 58, kind: 'Civilian Shelter', pros: ['Có sẵn thuốc và giường', 'Mái tôn hứng nước tốt'], cons: ['Nhiều xác nhiễm bệnh cần dọn'] },
};
