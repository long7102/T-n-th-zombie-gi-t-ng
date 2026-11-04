import { Item } from '../types/game';

// ====================================================================
// ĐƠN VỊ ĐO: gạo tính theo KG, nước tính theo LÍT (hoặc theo CHAI).
//  - unit 'kg': quantity là số kg; hungerReduce là độ no cho MỖI KG.
//  - unit 'l' : quantity là số lít; thirstReduce là độ giải khát cho MỖI LÍT.
//  - không có unit: quantity là số cái/gói/chai; hungerReduce/thirstReduce là cho MỖI CÁI.
// ====================================================================

export const PERSON_MEAL_KG = 0.1;   // 100 g gạo cho một người một bữa
export const SIP_LITRES = 0.5;       // một lần uống từ can/xô nước
export const GROUP_MEAL_FACTOR = 1;  // mỗi người trong nhóm ăn cùng khẩu phần với bạn

export const rq = (n: number) => Math.round(n * 100) / 100;

const fmtNum = (n: number) => rq(n).toString().replace('.', ',');

export function isBulk(it: { unit?: string }): boolean {
  return it.unit === 'kg' || it.unit === 'l';
}

// "2,4 kg", "12,5 L", "x3 chai", "x2"
export function fmtQty(it: Pick<Item, 'quantity' | 'unit' | 'thirstReduce'>): string {
  if (it.unit === 'kg') return it.quantity < 1 ? `${Math.round(it.quantity * 1000)} g` : `${fmtNum(it.quantity)} kg`;
  if (it.unit === 'l') return `${fmtNum(it.quantity)} L`;
  if (it.thirstReduce) return `x${it.quantity} chai`;
  return `x${it.quantity}`;
}

// Tên có kèm số lượng, dùng cho thông báo nhặt/mất đồ.
export function fmtNamed(it: Pick<Item, 'name' | 'quantity' | 'unit' | 'thirstReduce'>): string {
  return `${it.name} ${fmtQty(it)}`;
}

// Một lần ăn/uống từ vật phẩm: bao nhiêu đơn vị bị trừ và độ no/khát nhận được cho người chơi.
export function servingOf(it: Item, people = 1, mult = 1): { used: number; hunger: number; thirst: number; label: string } {
  const m = Math.max(0.4, Math.min(1.5, mult));
  if (it.unit === 'kg') {
    const perPerson = PERSON_MEAL_KG * m;
    const used = Math.min(it.quantity, rq(perPerson * Math.max(1, people)));
    const mine = Math.min(perPerson, used / Math.max(1, people));
    return { used, hunger: Math.round((it.hungerReduce || 0) * mine), thirst: 0, label: `${Math.round(used * 1000)} g ${it.name.toLowerCase()} cho ${people} người` };
  }
  if (it.unit === 'l') {
    const used = Math.min(it.quantity, SIP_LITRES);
    return { used, hunger: 0, thirst: Math.round((it.thirstReduce || 0) * used), label: `${Math.round(used * 1000)} ml ${it.name.toLowerCase()}` };
  }
  return { used: 1, hunger: it.hungerReduce || 0, thirst: it.thirstReduce || 0, label: it.name };
}

// Trừ/cộng số lượng, làm tròn để tránh sai số thập phân.
export function addQty(it: { quantity: number }, delta: number) {
  it.quantity = rq(it.quantity + delta);
}
