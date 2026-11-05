import { Item } from '../types/game';

// Chọn món ăn/nước uống tự động khi đói/khát tới ngưỡng cảnh báo.
// Thứ tự ưu tiên đồ ăn: đồ đã nấu chín -> đồ bảo quản lâu (sấy, ướp muối, khô) -> đồ vĩnh cửu (đồ hộp, lương khô)
// -> trái cây/đồ tươi ăn liền -> đồ sống (cuối cùng, ăn sống hại bụng, nên chỉ nhắc nấu).
export const NEED_ALERT_AT = 75;

const edible = (i: Item) => i.category === 'food' && (i.hungerReduce ?? 0) > 0 && i.quantity > 0 && !i.curingTurns;
const spoiled = (i: Item) => i.freshness !== undefined && i.freshness < 30;
const isPreserved = (i: Item) => !!i.isDried || /ướp muối|sấy khô|\bkhô\b|đông lạnh/i.test(i.name);
const isPermanent = (i: Item) => !!i.isSealed || (i.canSpoil === false && !i.needsCooking);

export interface FoodPick {
  item: Item | null;
  tier: 'cooked' | 'preserved' | 'permanent' | 'fresh' | 'raw' | 'none';
  label: string;
}

export function pickFood(inv: Item[]): FoodPick {
  const foods = inv.filter(edible);
  const ok = foods.filter((f) => !spoiled(f));
  // đồ nào sắp hỏng thì ăn trước trong cùng một nhóm
  const byFreshness = (a: Item, b: Item) => (a.freshness ?? 999) - (b.freshness ?? 999);
  const cooked = ok.filter((f) => f.isCooked && !f.needsCooking).sort(byFreshness);
  if (cooked[0]) return { item: cooked[0], tier: 'cooked', label: 'đồ đã nấu chín' };
  const preserved = ok.filter((f) => !f.needsCooking && isPreserved(f)).sort(byFreshness);
  if (preserved[0]) return { item: preserved[0], tier: 'preserved', label: 'đồ bảo quản lâu' };
  const permanent = ok.filter((f) => !f.needsCooking && !isPreserved(f) && isPermanent(f)).sort((a, b) => (b.hungerReduce ?? 0) - (a.hungerReduce ?? 0));
  if (permanent[0]) return { item: permanent[0], tier: 'permanent', label: 'đồ ăn vĩnh cửu' };
  const fresh = ok.filter((f) => !f.needsCooking && f.canSpoil).sort(byFreshness);
  if (fresh[0]) return { item: fresh[0], tier: 'fresh', label: 'đồ tươi ăn liền' };
  const raw = ok.filter((f) => f.needsCooking && !f.isCooked);
  if (raw[0]) return { item: null, tier: 'raw', label: raw[0].name };
  return { item: null, tier: 'none', label: '' };
}

export interface WaterPick { item: Item | null; tier: 'clean' | 'raw' | 'none'; label: string }

export function pickWater(inv: Item[]): WaterPick {
  const waters = inv.filter((i) => (i.thirstReduce ?? 0) > 0 && i.quantity > 0 && i.category === 'food');
  const clean = waters.filter((w) => !w.needsCooking || w.isCooked);
  // chai kín trước, rồi nước đun sôi, rồi nước chứa trong xô
  const rank = (w: Item) => (w.isSealed ? 0 : w.unit === 'l' ? 2 : 1) + (/đun sôi/i.test(w.name) ? -0.2 : 0);
  clean.sort((a, b) => rank(a) - rank(b));
  if (clean[0]) return { item: clean[0], tier: 'clean', label: clean[0].name };
  const raw = waters.find((w) => w.needsCooking && !w.isCooked);
  if (raw) return { item: null, tier: 'raw', label: raw.name };
  return { item: null, tier: 'none', label: '' };
}
