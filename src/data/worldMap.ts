import { Item } from '../types/game';
import { LootTableId } from './lootTables';

// ====================================================================
// BẢN ĐỒ THẾ GIỚI dạng đồ thị: các điểm (node) nối với nhau bằng đường (edge).
// Nơi trú ẩn của người chơi là node 'home' ở trung tâm. Vùng xa cần đi qua nhiều chặng,
// tốn nhiều thể lực hơn nhưng vật tư giá trị hơn. Điểm mới chỉ hiện ra khi đã khám phá điểm kề nó.
// ====================================================================

export type MapRegion = 'home' | 'near' | 'mid' | 'far';
export type NodeKind = 'farm' | 'church' | 'coldstorage' | 'school' | 'fuel_station' | 'home' | 'hardware_store' | 'pharmacy' | 'market' | 'supermarket' | 'hospital' | 'police_station' | 'bridge' | 'industrial' | 'stadium' | 'tower' | 'depot';

export interface WorldNode {
  id: string;
  name: string;
  kind: NodeKind;
  region: MapRegion;
  x: number; // viewBox 0..100
  y: number; // viewBox 0..70
  danger: number; // 1-5
  description: string;
  resources: string[];
  connections: string[];
  loot: { common: Partial<Item>[]; rare?: Partial<Item>[] };
  table?: LootTableId;          // bảng loot ngẫu nhiên (ưu tiên hơn loot cố định)
  needsVehicle?: boolean;       // quá xa để đi bộ, chỉ tới được bằng xe
  outpost?: OutpostInfo;        // nếu là cứ điểm có thể dùng làm căn cứ
}

export interface OutpostInfo {
  baseScore: number;            // độ phù hợp làm căn cứ 0-100
  baseKind: 'Apartment' | 'Military Base' | 'Civilian Shelter' | 'Nomad';
  pros: string[];
  cons: string[];
  bonus: Record<string, number>; // công trình có sẵn khi chiếm (cấp)
  baseName: string;
}

export const HOME_NODE_ID = 'home';

// Bán kính ngang của 3 vòng vùng quanh căn cứ (bán kính dọc = 0.75 lần). Các điểm được đặt đúng trên vòng của vùng nó.
export const RING_RX = { near: 16, mid: 29, far: 43 } as const;
export const RING_Y_RATIO = 0.75;

const food = (name: string, h: number, qty = 1): Partial<Item> => ({ id: 'wm_food', name, category: 'food', quantity: qty, hungerReduce: h, isSealed: true, canSpoil: false, rarity: 'common', description: 'Đồ hộp nguyên niêm phong.' });
const drink = (name: string, t: number, qty = 1): Partial<Item> => ({ id: 'wm_water', name, category: 'food', quantity: qty, thirstReduce: t, canSpoil: false, rarity: 'common', description: 'Nước uống an toàn.' });
const med = (name: string, heal: number, inf: number, qty = 1, rarity: any = 'common'): Partial<Item> => ({ id: 'wm_med', name, category: 'medical', quantity: qty, healAmount: heal, infectionReduce: inf, rarity, description: 'Vật tư y tế.' });
const mat = (name: string, qty = 1, rarity: any = 'common'): Partial<Item> => ({ id: 'wm_mat', name, category: 'material', quantity: qty, rarity, description: 'Vật liệu dã chiến.' });
const wpn = (name: string, dmg: number, rarity: any = 'rare'): Partial<Item> => ({ id: 'wm_wpn', name, category: 'weapon', quantity: 1, damage: dmg, durability: 90, maxDurability: 90, rarity, description: 'Vũ khí tìm được từ vùng xa.' });

export const WORLD_NODES: WorldNode[] = [
  {
    id: HOME_NODE_ID, name: 'Nơi Trú Ẩn', kind: 'home', region: 'home', x: 50, y: 36, danger: 1,
    description: 'Căn cứ tạm của bạn. Ở đây tương đối an toàn.', resources: [],
    connections: ['hardware', 'pharmacy', 'market', 'grocer'], loot: { common: [] },
  },
  // ---- Vùng gần ----
  {
    id: 'hardware', name: 'Tiệm Kim Khí Số 8', kind: 'hardware_store', region: 'near', x: 38.7, y: 27.5, danger: 2,
    description: 'Vật liệu hoàn hảo để gia cố cửa và chế tạo bẫy.', resources: ['Thanh sắt V & đinh', 'Dây kẽm gai', 'Băng keo bạc'],
    connections: [HOME_NODE_ID, 'bridge', 'hospital'],
    loot: { common: [mat('Thanh sắt V & Đinh 10 phân', 2), mat('Dây kẽm gai', 1)], rare: [mat('Xà beng thép đúc', 1, 'uncommon')] },
  },
  {
    id: 'pharmacy', name: 'Quầy Thuốc Ngã Tư', kind: 'pharmacy', region: 'near', x: 61.3, y: 27.5, danger: 2,
    description: 'Quầy thuốc nhỏ, thường bị bỏ sót vài hộc tủ cuối quầy.', resources: ['Băng gạc', 'Cồn sát trùng', 'Thuốc hạ sốt'],
    connections: [HOME_NODE_ID, 'police', 'tower'],
    loot: { common: [med('Băng gạc tiệt trùng y tế', 20, 15, 2)], rare: [med('Chai cồn đỏ Povidone sát trùng', 15, 30, 1, 'uncommon')] },
  },
  {
    id: 'market', name: 'Chợ Cóc Bỏ Hoang', kind: 'market', region: 'near', x: 65, y: 40, danger: 3,
    description: 'Các sạp hàng đổ nát, đồ khô còn sót lại nhưng zombie hay tụ họp vì mùi thối.', resources: ['Đồ hộp', 'Nước đóng chai', 'Gạo'],
    connections: [HOME_NODE_ID, 'police', 'depot'],
    loot: { common: [food('Đồ hộp đậu hầm sốt cà (Nguyên seal)', 35, 2), drink('Nước khoáng đóng chai', 45, 1)], rare: [food('Thịt bò sấy khô hút chân không', 30, 2)] },
  },
  {
    id: 'grocer', name: 'Kho Bách Hóa Giáp Bát', kind: 'supermarket', region: 'near', x: 47.2, y: 47.8, danger: 3,
    description: 'Kho chứa đồ hộp dồi dào, cần phá khóa cửa cuốn bằng xà beng hoặc búa.', resources: ['Thùng đồ hộp', 'Nước 5L', 'Muối hạt'],
    connections: [HOME_NODE_ID, 'hospital', 'industrial'],
    loot: { common: [food('Đồ hộp thịt lợn hầm (Nguyên seal)', 35, 2), drink('Nước khoáng đóng chai', 45, 2)], rare: [mat('Muối hạt ướp thực phẩm', 2)] },
  },
  // ---- Vùng trung ----
  {
    id: 'hospital', name: 'Bệnh Viện Bạch Mai - Kho Thuốc', kind: 'hospital', region: 'mid', x: 22, y: 41.6, danger: 4,
    description: 'Nhiều xác chết nhưng có kho dược liệu vô giá cho vết thương hoại tử.', resources: ['Kháng sinh', 'Băng gạc Celox', 'Kim chỉ khâu'],
    connections: ['hardware', 'grocer', 'industrial', 'bridge'],
    loot: { common: [med('Băng gạc tiệt trùng y tế', 20, 15, 3)], rare: [med('Hộp thuốc kháng sinh Amoxicillin 500mg', 10, 35, 2, 'rare'), med('Hộp cứu thương chấn thương dã chiến nguyên seal', 50, 40, 1, 'rare')] },
  },
  {
    id: 'police', name: 'Đồn Công An Phường Cũ', kind: 'police_station', region: 'mid', x: 75.1, y: 25.1, danger: 4,
    description: 'Có thể còn súng và đạn quân dụng, nhưng cũng còn xác cảnh sát mang súng.', resources: ['Súng lục', 'Đạn 9mm', 'Áo giáp chống đâm'],
    connections: ['pharmacy', 'market', 'stadium'],
    loot: { common: [mat('Đạn quân dụng', 3)], rare: [wpn('Súng lục Colt 1911 (7 viên đạn)', 60), mat('Áo giáp chống đâm', 1, 'rare')] },
  },
  {
    id: 'bridge', name: 'Cầu Vượt Tây (Lãnh Địa Huyết Lang)', kind: 'bridge', region: 'mid', x: 24.9, y: 25.1, danger: 4,
    description: 'Nơi băng cướp Huyết Lang thường chặn đường, nhưng những chiếc xe kẹt cứng bên dưới vẫn còn đồ.', resources: ['Xăng', 'Phụ tùng xe', 'Đồ hộp trong xe'],
    connections: ['hardware', 'tower', 'hospital'],
    loot: { common: [mat('Can xăng mini 5 lít', 1, 'uncommon'), food('Đồ hộp cá ngâm dầu (Nguyên seal)', 30, 1)], rare: [wpn('Cần tuýp mở ốc bánh xe', 36, 'uncommon')] },
  },
  // ---- Vùng xa ----
  {
    id: 'industrial', name: 'Khu Công Nghiệp Tây Nam', kind: 'industrial', region: 'far', x: 17.1, y: 56.7, danger: 4,
    description: 'Xưởng cơ khí rộng lớn, nhiều thiết bị, nhiên liệu và cả máy phát điện.', resources: ['Xăng dầu', 'Máy phát điện nhỏ', 'Dụng cụ cơ khí'],
    connections: ['grocer', 'hospital'],
    loot: { common: [mat('Can xăng mini 5 lít', 2, 'uncommon'), mat('Thanh sắt V & Đinh 10 phân', 3)], rare: [mat('Máy phát điện mini', 1, 'epic')] },
  },
  {
    id: 'tower', name: 'Tòa Tháp Trung Tâm', kind: 'tower', region: 'far', x: 50, y: 4.5, danger: 5,
    description: 'Tòa nhà chọc trời ở trung tâm, đầy tài liệu và đồ dự trữ của giới văn phòng, nhưng cực kỳ nguy hiểm.', resources: ['Đồ dự trữ văn phòng', 'Pin', 'Radio'],
    connections: ['pharmacy', 'bridge', 'stadium'],
    loot: { common: [food('Thanh kẹo năng lượng Chocolate', 20, 3), drink('Nước khoáng đóng chai', 45, 2)], rare: [mat('Pin dự phòng', 3, 'uncommon'), med('Hộp cứu thương chấn thương dã chiến nguyên seal', 50, 40, 1, 'rare')] },
  },
  {
    id: 'stadium', name: 'Sân Vận Động (Bunker 13)', kind: 'stadium', region: 'far', x: 82.9, y: 15.3, danger: 4,
    description: 'Hầm trú ẩn ngầm bên dưới sân vận động. Tín hiệu cầu cứu từng phát ra từ đây.', resources: ['Đồ hộp quân đội', 'Nước', 'Thiết bị liên lạc'],
    connections: ['police', 'tower'],
    loot: { common: [food('Lương khô quân đội', 40, 3), drink('Nước khoáng đóng chai', 45, 2)], rare: [med('Hộp cứu thương chấn thương dã chiến nguyên seal', 50, 40, 1, 'rare')] },
  },
  {
    id: 'depot', name: 'Kho Quân Sự Ngoại Ô', kind: 'depot', region: 'far', x: 89, y: 49.6, danger: 5,
    description: 'Kho vũ khí bỏ hoang, tiềm năng súng ống hạng nặng nhưng bị bầy đàn canh gác dày đặc.', resources: ['Súng trường', 'Đạn dược', 'Áo giáp'],
    connections: ['market'],
    loot: { common: [mat('Đạn quân dụng', 6, 'uncommon')], rare: [wpn('Súng trường tấn công cũ', 75, 'epic'), mat('Mìn định hướng Claymore', 1, 'epic')] },
  },
];

export const NODE_BY_ID: Record<string, WorldNode> = Object.fromEntries(WORLD_NODES.map((n) => [n.id, n]));

// ---------- Cứ điểm ngẫu nhiên quanh căn cứ ----------
// Mỗi ván sinh vài cứ điểm khác nhau ở vùng trung/xa. Đi loot ở đó, nếu chỗ đẹp có thể chiếm làm căn cứ mới.
interface OutpostTemplate {
  id: string; name: string; kind: NodeKind; region: MapRegion; danger: number; table: LootTableId; description: string; resources: string[];
  info: OutpostInfo;
  needsVehicle?: boolean;
}

export const OUTPOST_TEMPLATES: OutpostTemplate[] = [
  { id: 'hospital_basement', name: 'Tầng Hầm Bệnh Viện Cũ', kind: 'hospital', region: 'mid', danger: 4, table: 'pharmacy', description: 'Tầng hầm bê tông dày, kho thuốc còn nguyên và phòng mổ có thể thành góc y tế.', resources: ['Thuốc men', 'Giường bệnh', 'Dụng cụ y tế'],
    info: { baseScore: 78, baseKind: 'Civilian Shelter', baseName: 'Căn cứ Hầm Bệnh Viện', bonus: { medbay: 1, walls: 1 }, pros: ['Tường bê tông dày, khó phá', 'Có sẵn góc y tế', 'Kín gió, ít thời tiết xấu'], cons: ['Tối và ẩm', 'Không có chỗ trồng trọt'] } },
  { id: 'workshop', name: 'Xưởng Cơ Khí Bỏ Hoang', kind: 'industrial', region: 'far', danger: 4, table: 'tools', description: 'Xưởng rộng với cửa cuốn sắt, máy móc và kho phụ tùng. Thợ giỏi biến nơi này thành pháo đài.', resources: ['Dụng cụ', 'Phụ tùng', 'Nhiên liệu'],
    info: { baseScore: 70, baseKind: 'Civilian Shelter', baseName: 'Căn cứ Xưởng Cơ Khí', bonus: { walls: 2 }, pros: ['Cửa cuốn sắt chắc chắn', 'Nhiều dụng cụ chế tạo', 'Chỗ rộng để xây nhiều công trình'], cons: ['Nhiều tiếng vang, dễ thu hút bầy'] } },
  { needsVehicle: true, id: 'farmhouse', name: 'Nhà Vườn Có Giếng Ngoại Ô', kind: 'farm', region: 'far', danger: 3, table: 'garden', description: 'Mảnh vườn rộng, giếng nước sạch và chuồng gia súc bỏ trống. Gần như được sinh ra để làm nơi tự cung tự cấp.', resources: ['Rau quả', 'Giếng nước', 'Đất trồng'],
    info: { baseScore: 84, baseKind: 'Civilian Shelter', baseName: 'Căn cứ Nhà Vườn', bonus: { well: 1, garden: 1 }, pros: ['Có giếng nước sạch', 'Vườn trồng sẵn', 'Xa thành phố, ít bầy lớn'], cons: ['Tường rào mỏng, cần gia cố', 'Xa các điểm loot lớn'] } },
  { id: 'fuel_station', name: 'Trạm Xăng Đóng Cửa', kind: 'fuel_station', region: 'mid', danger: 3, table: 'autoparts', description: 'Trạm nhỏ còn vài bể xăng dưới đất. Quá trống trải để ở lâu, nhưng nhiên liệu thì quý.', resources: ['Xăng dầu', 'Đồ ăn nhanh', 'Dụng cụ'],
    info: { baseScore: 38, baseKind: 'Nomad', baseName: 'Điểm dừng Trạm Xăng', bonus: {}, pros: ['Nhiên liệu dồi dào'], cons: ['Trống trải, dễ bị phát hiện', 'Nguy cơ cháy nổ'] } },
  { id: 'old_church', name: 'Nhà Thờ Đá Kiên Cố', kind: 'church', region: 'mid', danger: 3, table: 'domestic', description: 'Tường đá dày, cổng gỗ lim và tháp chuông cao: nơi trú ẩn của người xưa, đáng tin hơn cả nhà hiện đại.', resources: ['Đồ gia dụng', 'Nến', 'Chăn'],
    info: { baseScore: 76, baseKind: 'Civilian Shelter', baseName: 'Căn cứ Nhà Thờ Đá', bonus: { walls: 2, watchtower: 1 }, pros: ['Tường đá, cổng gỗ lim rất chắc', 'Tháp chuông làm tháp canh', 'Yên tĩnh, tinh thần dễ chịu'], cons: ['Lạnh về đêm', 'Không có nguồn nước gần'] } },
  { needsVehicle: true, id: 'cold_storage', name: 'Kho Lạnh Công Nghiệp', kind: 'coldstorage', region: 'far', danger: 4, table: 'warehouse', description: 'Kho lạnh lớn với tường cách nhiệt dày. Hàng trong kho đã ôi nhưng đồ khô vẫn còn.', resources: ['Đồ dự trữ', 'Gạo', 'Nước đóng chai'],
    info: { baseScore: 66, baseKind: 'Civilian Shelter', baseName: 'Căn cứ Kho Lạnh', bonus: { walls: 1 }, pros: ['Tường cách nhiệt, rất chắc', 'Kho chứa khổng lồ'], cons: ['Mùi thối thu hút zombie', 'Cần điện để vận hành tủ lạnh'] } },
  { id: 'school', name: 'Trường Học Có Sân & Bể Nước', kind: 'school', region: 'mid', danger: 3, table: 'office', description: 'Sân rộng, bể nước lớn trên mái và nhiều phòng học trống. Dễ chứa cả một nhóm lớn.', resources: ['Văn phòng phẩm', 'Nước', 'Đồ cá nhân'],
    info: { baseScore: 68, baseKind: 'Civilian Shelter', baseName: 'Căn cứ Trường Học', bonus: { rain_collector: 1 }, pros: ['Bể nước lớn trên mái', 'Nhiều phòng, chứa được đông người', 'Sân trồng rau'], cons: ['Cửa kính nhiều, khó giữ', 'Hành lang dài dễ bị tập kích'] } },
  { needsVehicle: true, id: 'hill_station', name: 'Trạm Phát Sóng Trên Đồi', kind: 'tower', region: 'far', danger: 4, table: 'electronics', description: 'Tháp phát sóng cũ trên đồi cao, thấy rõ mọi hướng và còn nguồn điện dự phòng.', resources: ['Pin', 'Radio', 'Dây điện'],
    info: { baseScore: 60, baseKind: 'Military Base', baseName: 'Căn cứ Trạm Phát Sóng', bonus: { watchtower: 2 }, pros: ['Tầm nhìn bao quát mọi hướng', 'Gần như không ai tới', 'Bắt radio rất tốt'], cons: ['Khó tìm nước', 'Gió lớn, lạnh'] } },
];

const OUTPOST_BY_TEMPLATE: Record<string, OutpostTemplate> = Object.fromEntries(OUTPOST_TEMPLATES.map((o) => [o.id, o]));
const RING_X: Record<string, number> = { mid: 29, far: 43 };

function outpostToNode(tpl: OutpostTemplate, x: number, y: number, connections: string[]): WorldNode {
  return {
    id: 'op_' + tpl.id, name: tpl.name, kind: tpl.kind, region: tpl.region, x, y, danger: tpl.danger,
    description: tpl.description, resources: tpl.resources, connections, loot: { common: [] }, table: tpl.table, outpost: tpl.info, needsVehicle: tpl.needsVehicle,
  };
}

export interface OutpostInstance { id: string; x: number; y: number; connections: string[] }

// Sinh ngẫu nhiên cứ điểm cho một ván chơi (lưu trong state/save).
export function generateOutposts(count = 4, rng: () => number = Math.random): OutpostInstance[] {
  const pool = [...OUTPOST_TEMPLATES].sort(() => rng() - 0.5).slice(0, count);
  const placed: { x: number; y: number }[] = WORLD_NODES.map((n) => ({ x: n.x, y: n.y }));
  const out: OutpostInstance[] = [];
  const home = NODE_BY_ID[HOME_NODE_ID];
  for (const tpl of pool) {
    let best: { x: number; y: number } | null = null;
    for (let i = 0; i < 40; i++) {
      const ang = rng() * Math.PI * 2;
      const rx = RING_X[tpl.region] + (rng() - 0.5) * 4;
      const x = home.x + Math.cos(ang) * rx;
      const y = home.y + Math.sin(ang) * rx * RING_Y_RATIO;
      if (x < 5 || x > 95 || y < 5 || y > 66) continue;
      if (placed.every((p) => Math.hypot(p.x - x, (p.y - y) / RING_Y_RATIO) > 10)) { best = { x, y }; break; }
    }
    if (!best) continue;
    placed.push(best);
    const near = WORLD_NODES.filter((n) => n.id !== HOME_NODE_ID)
      .map((n) => ({ id: n.id, d: Math.hypot(n.x - best!.x, n.y - best!.y) }))
      .sort((a, b) => a.d - b.d).slice(0, 2).map((n) => n.id);
    out.push({ id: 'op_' + tpl.id, x: +best.x.toFixed(1), y: +best.y.toFixed(1), connections: near });
  }
  return out;
}

export function buildOutpostNodes(instances: OutpostInstance[]): WorldNode[] {
  return instances
    .map((i) => {
      const tpl = OUTPOST_BY_TEMPLATE[i.id.replace(/^op_/, '')];
      return tpl ? outpostToNode(tpl, i.x, i.y, i.connections) : null;
    })
    .filter(Boolean) as WorldNode[];
}

// Tìm node theo id, kể cả cứ điểm (server không biết vị trí nên toạ độ là 0).
export function getNodeAny(id: string): WorldNode | undefined {
  if (NODE_BY_ID[id]) return NODE_BY_ID[id];
  const tpl = OUTPOST_BY_TEMPLATE[id.replace(/^op_/, '')];
  return tpl ? outpostToNode(tpl, 0, 0, []) : undefined;
}

// ---------- Đồ thị (đối xứng) gồm điểm cố định + cứ điểm ngẫu nhiên ----------
function adjacency(extra: WorldNode[]): Record<string, Set<string>> {
  const adj: Record<string, Set<string>> = {};
  const add = (a: string, b: string) => { (adj[a] ||= new Set()).add(b); (adj[b] ||= new Set()).add(a); };
  for (const n of [...WORLD_NODES, ...extra]) for (const c of n.connections) add(n.id, c);
  return adj;
}

// Đường đi ngắn nhất (số chặng) từ -> đến, trả về danh sách node.
export function shortestPath(from: string, to: string, extra: WorldNode[] = []): string[] {
  if (from === to) return [from];
  const adj = adjacency(extra);
  const prev: Record<string, string | null> = { [from]: null };
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift() as string;
    for (const nb of adj[cur] || []) {
      if (nb in prev) continue;
      prev[nb] = cur;
      if (nb === to) {
        const path = [to];
        let p: string | null = cur;
        while (p) { path.unshift(p); p = prev[p]; }
        return path;
      }
      queue.push(nb);
    }
  }
  return [from];
}

// Điểm đã nhìn thấy: nơi trú ẩn, các điểm đã tới và tất cả điểm kề chúng (sương mù chiến tranh).
export function revealedNodes(visited: string[], extra: WorldNode[] = []): Set<string> {
  const adj = adjacency(extra);
  const seen = new Set<string>([HOME_NODE_ID]);
  for (const id of [HOME_NODE_ID, ...visited]) {
    seen.add(id);
    (adj[id] || new Set()).forEach((c) => seen.add(c));
  }
  return seen;
}

// Mọi điểm đã hiện ra đều chọn được; điểm chưa hiện ra thì ẩn hẳn.
export const knownNodes = revealedNodes;

export const REGION_LABEL: Record<MapRegion, string> = { home: 'Căn cứ', near: 'Vùng gần', mid: 'Vùng trung', far: 'Vùng xa' };
export const KIND_ICON: Record<NodeKind, string> = {
  home: '🏠', hardware_store: '🔧', pharmacy: '💊', market: '🛒', supermarket: '📦', hospital: '🏥',
  police_station: '🚓', bridge: '🌉', industrial: '🏭', stadium: '🏟️', tower: '🏙️', depot: '🪖',
  farm: '🏡', church: '⛪', coldstorage: '🧊', school: '🏫', fuel_station: '⛽',
};

// Mã hóa/giải mã hành động di chuyển để server xử lý tất định.
export const MAP_ACTION_PREFIX = '[MAP_TRAVEL]';
export interface TravelExtra { vehicle?: string; vcond?: number; vfuel?: number; crew?: number }

export function encodeMapAction(nodeId: string, style: 'quick' | 'thorough', hops: number, visits: number, text: string, extra: TravelExtra = {}): string {
  const ex = extra.vehicle ? ` vehicle=${extra.vehicle} vcond=${Math.round(extra.vcond ?? 100)} vfuel=${extra.vfuel ?? 0} crew=${extra.crew ?? 0}` : extra.crew ? ` vehicle=none vcond=0 vfuel=0 crew=${extra.crew}` : '';
  return `${MAP_ACTION_PREFIX} node=${nodeId} style=${style} hops=${hops} visits=${visits}${ex} :: ${text}`;
}
export function decodeMapAction(action: string): { nodeId: string; style: 'quick' | 'thorough'; hops: number; visits: number; text: string; vehicle?: string; vcond: number; vfuel: number; crew: number } | null {
  if (!action.startsWith(MAP_ACTION_PREFIX)) return null;
  const m = action.match(/node=(\S+)\s+style=(quick|thorough)\s+hops=(\d+)\s+visits=(\d+)(?:\s+vehicle=(\w+)\s+vcond=(\d+)\s+vfuel=([\d.]+)\s+crew=(\d+))?\s+::\s*(.*)$/s);
  if (!m) return null;
  return { nodeId: m[1], style: m[2] as any, hops: +m[3], visits: +m[4], vehicle: m[5] && m[5] !== 'none' ? m[5] : undefined, vcond: +(m[6] || 0), vfuel: +(m[7] || 0), crew: +(m[8] || 0), text: m[9] };
}
