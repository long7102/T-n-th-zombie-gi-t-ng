import type { CostLine } from '../utils/baseSystem';

// ====================================================================
// XE CỘ & CHUYẾN ĐI XA
// - Lắp xe từ phụ tùng nhặt được (lốp, ắc quy, bugi, dầu nhớt, cờ lê...). Xe đạp không cần xăng.
// - Đi bằng xe: tốn ít sức hơn nhiều, nhưng tốn xăng, gây tiếng ồn và có thể gặp sự cố trên đường.
// - Một số cứ điểm quá xa, chỉ tới được bằng xe. Có thể chở đồng đội đi cùng.
// ====================================================================

export type VehicleKind = 'bicycle' | 'motorbike' | 'car' | 'pickup' | 'truck';

export interface Vehicle {
  kind: VehicleKind;
  condition: number; // 0-100
  fuel: number;      // đơn vị nhiên liệu
}

export interface VehicleDef {
  kind: VehicleKind;
  name: string;
  icon: string;
  speed: number;       // hệ số thể lực/đói/khát so với đi bộ (nhỏ hơn = nhẹ hơn)
  fuelPerHop: number;  // nhiên liệu mỗi chặng (một chiều)
  maxFuel: number;
  crew: number;        // số đồng đội chở thêm được
  noise: number;       // 0-4, càng ồn càng dễ thu hút bầy
  armor: number;       // giảm thiệt hại khi bị tấn công
  desc: string;
  cost: CostLine[];
}

const L = (re: RegExp, label: string, qty: number): CostLine => ({ re, label, qty });
const TIRE = /bánh xe|lốp/i, BATT = /ắc quy|bình điện/i, SPARK = /bugi|dây curoa|kim phun/i, OIL = /dầu nhớt|nhớt/i, TOOL = /cờ lê|kìm|dụng cụ/i, CHAIN = /dây xích|dây curoa|dây thừng/i;

export const VEHICLES: Record<VehicleKind, VehicleDef> = {
  bicycle: { kind: 'bicycle', name: 'Xe đạp', icon: '🚲', speed: 0.6, fuelPerHop: 0, maxFuel: 0, crew: 0, noise: 0, armor: 0,
    desc: 'Im lặng, không cần xăng, nhẹ sức hơn đi bộ. Không chở được ai, ít đồ.', cost: [L(TIRE, 'Bánh xe / lốp', 2), L(CHAIN, 'Dây xích / dây thừng', 1)] },
  motorbike: { kind: 'motorbike', name: 'Xe máy', icon: '🏍️', speed: 0.4, fuelPerHop: 1, maxFuel: 10, crew: 1, noise: 2, armor: 0,
    desc: 'Nhanh, linh hoạt, chui được qua đống xe kẹt. Chở thêm 1 người.', cost: [L(TIRE, 'Bánh xe / lốp', 2), L(BATT, 'Ắc quy', 1), L(SPARK, 'Bugi / dây curoa', 1), L(TOOL, 'Cờ lê / dụng cụ', 1)] },
  car: { kind: 'car', name: 'Ô tô con', icon: '🚗', speed: 0.3, fuelPerHop: 2, maxFuel: 24, crew: 2, noise: 2, armor: 1,
    desc: 'Có mái che, chở được 2 người và đồ. Kẹt đường là vấn đề lớn.', cost: [L(TIRE, 'Bánh xe / lốp', 4), L(BATT, 'Ắc quy', 1), L(SPARK, 'Bugi / dây curoa / kim phun', 2), L(OIL, 'Dầu nhớt', 1), L(TOOL, 'Cờ lê / dụng cụ', 1)] },
  pickup: { kind: 'pickup', name: 'Xe bán tải', icon: '🛻', speed: 0.3, fuelPerHop: 2.5, maxFuel: 30, crew: 2, noise: 3, armor: 2,
    desc: 'Gầm cao, thùng rộng, húc được qua chướng ngại nhẹ. Ồn và hao xăng.', cost: [L(TIRE, 'Bánh xe / lốp', 4), L(BATT, 'Ắc quy', 1), L(SPARK, 'Bugi / dây curoa / kim phun', 3), L(OIL, 'Dầu nhớt', 2), L(TOOL, 'Cờ lê / dụng cụ', 1)] },
  truck: { kind: 'truck', name: 'Xe tải', icon: '🚚', speed: 0.35, fuelPerHop: 4, maxFuel: 50, crew: 2, noise: 4, armor: 3,
    desc: 'Chở được nhiều nhất và rất chắc, nhưng cực ồn và uống xăng như nước.', cost: [L(TIRE, 'Bánh xe / lốp', 6), L(BATT, 'Ắc quy', 2), L(SPARK, 'Bugi / dây curoa / kim phun', 4), L(OIL, 'Dầu nhớt', 2), L(TOOL, 'Cờ lê / dụng cụ', 1)] },
};

export const REPAIR_COST: CostLine[] = [L(SPARK, 'Phụ tùng thay thế (bugi/dây curoa...)', 1), L(TOOL, 'Cờ lê / dụng cụ', 1)];
export const FUEL_RE = /xăng/i;
export const FUEL_PER_CAN = 8; // 1 can xăng mini 5 lít = 8 đơn vị

export const fuelNeededRoundTrip = (kind: VehicleKind, hops: number) => Math.ceil(2 * hops * VEHICLES[kind].fuelPerHop);

// Sự cố trên đường: mỗi chặng đi xe có thể gặp một trong các sự kiện sau.
export interface RoadEvent {
  id: string;
  text: string;
  hp?: number;
  sanity?: number;
  stamina?: number;
  condition?: number;
  fuel?: number;
  loseFood?: number;
}

export const ROAD_EVENTS: RoadEvent[] = [
  { id: 'wreck_block', text: 'Một chuỗi xe kẹt chắn ngang đường. Bạn phải vòng qua ngõ nhỏ, tốn thêm nhiên liệu và thể lực.', stamina: -5, fuel: -1 },
  { id: 'breakdown', text: 'Động cơ ho sặc sụa rồi tắt. Bạn mở nắp capo, mò mẫm sửa trong lúc tai nghe ngóng xung quanh.', stamina: -6, condition: -20, sanity: -2 },
  { id: 'checkpoint', text: 'Một nhóm người cầm gậy sắt chặn đường đòi nộp đồ. Bạn đành bỏ lại chút thực phẩm để được đi tiếp.', sanity: -4, loseFood: 1 },
  { id: 'horde_noise', text: 'Tiếng động cơ kéo một bầy zombie lảo đảo lao theo. Bạn tăng ga, thân xe bị móng vuốt cào xước.', hp: -6, sanity: -4, condition: -12 },
  { id: 'flat_tire', text: 'Một mảnh kính vỡ xé toạc lốp xe. Bạn thay lốp dưới ánh mắt cảnh giác của cả con đường.', stamina: -8, condition: -10 },
  { id: 'fuel_leak', text: 'Mùi xăng nồng lên: bình bị nứt nhẹ, rò mất một ít nhiên liệu trước khi bạn kịp bịt lại.', fuel: -2, condition: -6 },
];

export const SAFE_ROAD_LINES = [
  'Con đường vắng lặng đến rợn người, chỉ có tiếng động cơ vang trên những dãy nhà tan hoang.',
  'Bạn lái qua cầu vượt bỏ hoang, bầu trời đỏ rực khói xa phía chân trời.',
  'Gió lùa qua cửa kính vỡ, mang theo mùi tro cháy và tiếng quạ xa xa.',
];
