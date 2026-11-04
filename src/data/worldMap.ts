import { Item } from '../types/game';

// ====================================================================
// BẢN ĐỒ THẾ GIỚI dạng đồ thị: các điểm (node) nối với nhau bằng đường (edge).
// Nơi trú ẩn của người chơi là node 'home' ở trung tâm. Vùng xa cần đi qua nhiều chặng,
// tốn nhiều thể lực hơn nhưng vật tư giá trị hơn. Điểm mới chỉ hiện ra khi đã khám phá điểm kề nó.
// ====================================================================

export type MapRegion = 'home' | 'near' | 'mid' | 'far';
export type NodeKind = 'home' | 'hardware_store' | 'pharmacy' | 'market' | 'supermarket' | 'hospital' | 'police_station' | 'bridge' | 'industrial' | 'stadium' | 'tower' | 'depot';

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

// Đường đi ngắn nhất (số chặng) từ -> đến, trả về danh sách node.
export function shortestPath(from: string, to: string): string[] {
  if (from === to) return [from];
  const prev: Record<string, string | null> = { [from]: null };
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift() as string;
    for (const nb of NODE_BY_ID[cur]?.connections || []) {
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

// Điểm đã nhìn thấy: nơi trú ẩn, các điểm đã tới và tất cả điểm kề chúng.
export function revealedNodes(visited: string[]): Set<string> {
  const seen = new Set<string>([HOME_NODE_ID]);
  for (const id of [HOME_NODE_ID, ...visited]) {
    seen.add(id);
    (NODE_BY_ID[id]?.connections || []).forEach((c) => seen.add(c));
  }
  return seen;
}

// Mọi điểm đã hiện ra đều chọn được; điểm chưa hiện ra thì ẩn hẳn (sương mù chiến tranh).
export const knownNodes = revealedNodes;

export const REGION_LABEL: Record<MapRegion, string> = { home: 'Căn cứ', near: 'Vùng gần', mid: 'Vùng trung', far: 'Vùng xa' };
export const KIND_ICON: Record<NodeKind, string> = {
  home: '🏠', hardware_store: '🔧', pharmacy: '💊', market: '🛒', supermarket: '📦', hospital: '🏥',
  police_station: '🚓', bridge: '🌉', industrial: '🏭', stadium: '🏟️', tower: '🏙️', depot: '🪖',
};

// Mã hóa/giải mã hành động di chuyển để server xử lý tất định.
export const MAP_ACTION_PREFIX = '[MAP_TRAVEL]';
export function encodeMapAction(nodeId: string, style: 'quick' | 'thorough', hops: number, visits: number, text: string): string {
  return `${MAP_ACTION_PREFIX} node=${nodeId} style=${style} hops=${hops} visits=${visits} :: ${text}`;
}
export function decodeMapAction(action: string): { nodeId: string; style: 'quick' | 'thorough'; hops: number; visits: number; text: string } | null {
  if (!action.startsWith(MAP_ACTION_PREFIX)) return null;
  const m = action.match(/node=(\S+)\s+style=(quick|thorough)\s+hops=(\d+)\s+visits=(\d+)\s+::\s*(.*)$/s);
  if (!m) return null;
  return { nodeId: m[1], style: m[2] as any, hops: +m[3], visits: +m[4], text: m[5] };
}
