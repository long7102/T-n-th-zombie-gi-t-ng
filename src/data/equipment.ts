import { Item } from '../types/game';

// Trang bị phòng hộ nhiều ô: mũ, áo, quần, giày/ủng, găng. Mỗi ô một món; tổng phòng thủ giảm sát thương nhận vào.
export type Slot = 'head' | 'body' | 'legs' | 'feet' | 'hands';
export const SLOTS: Slot[] = ['head', 'body', 'legs', 'feet', 'hands'];
export const SLOT_LABEL: Record<Slot, string> = { head: 'Mũ', body: 'Áo', legs: 'Quần', feet: 'Giày / ủng', hands: 'Găng' };
export const SLOT_ICON: Record<Slot, string> = { head: '⛑️', body: '🧥', legs: '👖', feet: '🥾', hands: '🧤' };
export type Equipment = Partial<Record<Slot, Item>>;

// Suy ra ô trang bị từ tên món đồ
export function slotOf(item: Pick<Item, 'name' | 'slot'>): Slot | null {
  if (item.slot) return item.slot as Slot;
  const n = item.name.toLowerCase();
  if (/mũ|nón|mũ bảo hiểm|kính bảo hộ/.test(n)) return 'head';
  if (/găng/.test(n)) return 'hands';
  if (/giày|ủng|dép|boot|sandal/.test(n)) return 'feet';
  if (/quần|bảo vệ gối|miếng bảo vệ|xà cạp/.test(n)) return 'legs';
  if (/áo|vest|giáp|khoác|len|hoodie/.test(n)) return 'body';
  return null;
}

export const totalDefense = (eq?: Equipment) => SLOTS.reduce((s, k) => s + (eq?.[k]?.defense ?? 0), 0);

// Mỗi điểm phòng thủ giảm 2% sát thương, tối đa 50%.
export const damageReduction = (eq?: Equipment) => Math.min(0.5, totalDefense(eq) * 0.02);
