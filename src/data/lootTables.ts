import { Item } from '../types/game';
import { slotOf } from './equipment';

// ====================================================================
// BẢNG LOOT THEO NƠI CHỐN. Thực phẩm đa dạng và thực tế:
//  - Đồ tươi (rau, trái cây, trứng, cá, thịt) hỏng dần, cần ăn sớm hoặc chế biến.
//  - Đồ cần nấu (gạo, mì, trứng, cá, thịt, nước chưa đun) ăn sống sẽ hại bụng.
//  - Đồ khô/đồ hộp/gia vị bảo quản được lâu, nhưng no ít.
// ====================================================================

export type LootTableId =
  | 'household' | 'fridge' | 'market' | 'vehicle' | 'forage' | 'pond' | 'garden'
  | 'water_raw' | 'pharmacy' | 'hardware' | 'warehouse' | 'office'
  | 'pantry' | 'autoparts' | 'weapons' | 'clothing' | 'tools' | 'domestic' | 'electronics' | 'camping';

interface Entry {
  w: number;                 // trọng số xuất hiện
  item: Partial<Item>;
  q?: [number, number];      // số lượng ngẫu nhiên
  fresh?: [number, number];  // độ tươi ban đầu (nếu là đồ tươi)
  m?: [number, number];      // chỉ có vào các tháng này (1-12, có thể vòng qua năm: [11, 2])
}

export const inSeason = (m: [number, number] | undefined, month: number) => !m || (m[0] <= m[1] ? month >= m[0] && month <= m[1] : month >= m[0] || month <= m[1]);

export function seasonName(month: number): string {
  return month >= 2 && month <= 4 ? 'xuân' : month >= 5 && month <= 8 ? 'hè' : month >= 9 && month <= 11 ? 'thu' : 'đông';
}

const food = (name: string, hunger: number, o: Partial<Item> = {}): Partial<Item> => ({
  id: 'lt_food', name, category: 'food', quantity: 1, hungerReduce: hunger, rarity: 'common', canSpoil: false, description: '', ...o,
});
const fresh = (name: string, hunger: number, o: Partial<Item> = {}): Partial<Item> =>
  food(name, hunger, { canSpoil: true, freshness: 90, description: 'Đồ tươi, sẽ hỏng dần nếu không ăn hoặc chế biến sớm.', ...o });
const raw = (name: string, hunger: number, o: Partial<Item> = {}): Partial<Item> =>
  food(name, hunger, { needsCooking: true, description: 'Cần nấu chín trước khi ăn; ăn sống sẽ hại bụng.', ...o });
const drink = (name: string, thirst: number, o: Partial<Item> = {}): Partial<Item> => ({
  id: 'lt_water', name, category: 'food', quantity: 1, thirstReduce: thirst, rarity: 'common', canSpoil: false, description: 'Nước uống.', ...o,
});
const med = (name: string, heal: number, inf: number, o: Partial<Item> = {}): Partial<Item> => ({
  id: 'lt_med', name, category: 'medical', quantity: 1, healAmount: heal, infectionReduce: inf, rarity: 'common', description: 'Vật tư y tế.', ...o,
});
const mat = (name: string, o: Partial<Item> = {}): Partial<Item> => ({
  id: 'lt_mat', name, category: 'material', quantity: 1, rarity: 'common', description: 'Vật liệu dã chiến.', ...o,
});

const wpn = (name: string, damage: number, dur: number, o: Partial<Item> = {}): Partial<Item> => ({
  id: 'lt_wpn', name, category: 'weapon', quantity: 1, damage, durability: dur, maxDurability: dur, rarity: 'common', description: 'Vũ khí cận chiến tìm được.', ...o,
});
const armor = (name: string, defense: number, o: Partial<Item> = {}): Partial<Item> => ({
  slot: slotOf({ name }) || undefined,
  id: 'lt_armor', name, category: 'special', quantity: 1, defense, durability: 60, maxDurability: 60, rarity: 'common', description: 'Đồ che chắn, giảm sát thương khi bị cắn hoặc cào.', ...o,
});
const tool = (name: string, o: Partial<Item> = {}): Partial<Item> => ({
  id: 'lt_tool', name, category: 'tool', quantity: 1, rarity: 'common', description: 'Dụng cụ hữu ích.', ...o,
});

const part = (name: string, o: Partial<Item> = {}): Partial<Item> => ({
  id: 'lt_part', name, category: 'material', quantity: 1, rarity: 'common', description: 'Phụ tùng xe cộ, dùng để lắp hoặc sửa xe.', ...o,
});

export const LOOT: Record<LootTableId, Entry[]> = {
  autoparts: [
    { w: 7, item: part('Bánh xe dự phòng') },
    { w: 6, item: part('Lốp xe cũ còn dùng được') },
    { w: 5, item: part('Bình ắc quy', { rarity: 'uncommon', description: 'Còn điện, khởi động được động cơ.' }) },
    { w: 6, item: part('Bugi và dây curoa') },
    { w: 4, item: part('Kim phun cũ') },
    { w: 5, item: part('Dầu nhớt (lon)') },
    { w: 4, item: tool('Bộ cờ lê và kìm', { description: 'Cần để lắp và sửa xe.' }) },
    { w: 5, item: part('Dây xích xe đạp') },
    { w: 5, item: part('Can xăng mini 5 lít', { rarity: 'uncommon', description: 'Nhiên liệu cho xe và máy phát (8 đơn vị).' }) },
  ],
  weapons: [
    { w: 8, item: wpn('Gậy bóng chày nhôm', 30, 85, { description: 'Nhẹ, nhanh, đập khớp gối rất tốt.' }) },
    { w: 7, item: wpn('Dao phay nhà bếp', 28, 70, { description: 'Lưỡi dày, chặt xương gọn.' }) },
    { w: 6, item: wpn('Rựa phát bụi', 34, 80, { rarity: 'uncommon', description: 'Nặng đầu, chém mạnh nhưng mỏi tay.' }) },
    { w: 6, item: wpn('Búa đinh', 29, 90) },
    { w: 5, item: wpn('Xà beng thép', 33, 110, { rarity: 'uncommon', description: 'Vừa là công cụ cạy khóa vừa là vũ khí.' }) },
    { w: 5, item: wpn('Gậy golf sắt', 27, 60) },
    { w: 4, item: wpn('Cuốc chim nhỏ', 36, 95, { rarity: 'uncommon', description: 'Mũi nhọn xuyên sọ rất hiệu quả.' }) },
    { w: 4, item: wpn('Dùi cui cao su', 24, 75) },
    { w: 3, item: wpn('Rìu cứu hỏa', 42, 120, { rarity: 'rare', description: 'Nặng và sắc, phá cửa hoặc đầu zombie đều tốt.' }) },
    { w: 3, item: wpn('Chân ghế sắt vát nhọn', 25, 55, { description: 'Tự chế nhanh, dùng tạm.' }) },
    { w: 2, item: wpn('Dao găm quân dụng', 31, 100, { rarity: 'rare' }) },
    { w: 2, item: { id: 'lt_ammo', name: 'Đạn quân dụng', category: 'ammo', quantity: 5, rarity: 'uncommon', description: 'Đạn nhỏ, cần có súng tương ứng.' } },
  ],
  clothing: [
    { w: 7, item: armor('Quần jean dày', 2, { description: 'Vải bò dày, chống trầy xước và cành gai.' }) },
    { w: 5, item: armor('Quần dã chiến nhiều túi', 3, { description: 'Vải bố bền, nhiều túi đựng đồ.' }) },
    { w: 4, item: armor('Quần bảo hộ lao động', 4, { description: 'Có lớp đệm ở gối và đùi.' }) },
    { w: 6, item: armor('Ủng cao su', 2, { description: 'Lội nước, bước qua vũng bẩn mà không sợ ướt chân.' }) },
    { w: 4, item: armor('Ủng quân đội', 5, { rarity: 'uncommon', description: 'Đế dày, cổ cao, bảo vệ mắt cá khỏi răng cắn.' }) },
    { w: 6, item: armor('Giày thể thao cũ', 1, { description: 'Nhẹ, chạy tốt, nhưng bảo vệ chẳng bao nhiêu.' }) },
    { w: 4, item: armor('Nón lưỡi trai', 1) },
    { w: 4, item: armor('Găng da', 3) },
    { w: 7, item: armor('Áo khoác da dày', 6, { description: 'Da dày, khó bị răng cắn xuyên qua.' }) },
    { w: 6, item: armor('Mũ bảo hiểm xe máy', 5, { description: 'Bảo vệ đầu và gáy.' }) },
    { w: 6, item: armor('Găng tay lao động', 2) },
    { w: 5, item: armor('Giày bảo hộ mũi thép', 3, { description: 'Chạy được, đạp được, và không sợ vật sắc.' }) },
    { w: 5, item: armor('Miếng bảo vệ gối', 3) },
    { w: 4, item: armor('Áo mưa nhựa dày', 1, { description: 'Chống nước mưa, giữ ấm một chút.' }) },
    { w: 4, item: armor('Áo len dày', 2, { sanityRestore: 2, description: 'Giữ ấm và dễ chịu hơn mỗi khi trời lạnh.' } as any) },
    { w: 3, item: armor('Áo vest chống đâm', 12, { rarity: 'rare', description: 'Lớp sợi dày chống dao đâm và răng cắn.' }) },
    { w: 4, item: tool('Khăn che mặt', { description: 'Giảm hít mùi thối và bụi tro.' }) },
  ],
  tools: [
    { w: 7, item: tool('Đèn pin cầm tay', { description: 'Dùng trong bóng tối, tốn pin.' }) },
    { w: 6, item: tool('Pin AA (vỉ)', { description: 'Cấp điện cho đèn pin, radio.' }), q: [2, 4] },
    { w: 6, item: tool('Bật lửa gas') },
    { w: 5, item: tool('Dao xếp đa năng', { description: 'Cắt, khui hộp, gọt, sửa chữa nhỏ.' }) },
    { w: 5, item: tool('Kìm và tua vít') },
    { w: 4, item: tool('Ống nhòm', { rarity: 'uncommon', description: 'Quan sát từ xa, thấy trước bầy zombie.' }) },
    { w: 4, item: tool('La bàn nhỏ', { description: 'Không bao giờ lạc hướng.' }) },
    { w: 4, item: tool('Dây thừng nylon', { description: 'Leo trèo, buộc bẫy, kéo đồ.' }) },
    { w: 3, item: tool('Radio cầm tay', { rarity: 'uncommon', description: 'Bắt sóng radio để nghe tin tức.' }) },
    { w: 3, item: tool('Nồi nhôm nhỏ', { description: 'Dùng nấu nước, nấu cháo.' }) },
    { w: 3, item: tool('Bếp gas du lịch', { rarity: 'uncommon', description: 'Nấu ăn nhanh, ít khói.' }) },
    { w: 3, item: tool('Cần câu và cuộn dây', { description: 'Câu cá ở ao hồ gần đó.' }) },
  ],
  domestic: [
    { w: 6, item: tool('Chăn len dày', { description: 'Ngủ ấm, tinh thần dịu lại.', sanityRestore: 4 } as any) },
    { w: 5, item: tool('Xà phòng cục', { description: 'Rửa vết thương, giảm nguy cơ nhiễm trùng.', infectionReduce: 5 } as any) },
    { w: 5, item: tool('Bộ bài tây', { description: 'Giết thời gian, giảm căng thẳng.', sanityRestore: 5 } as any) },
    { w: 4, item: tool('Cuốn sách cũ', { description: 'Đọc để quên đi tận thế một lúc.', sanityRestore: 6 } as any) },
    { w: 4, item: tool('Chai nước rửa chén') },
    { w: 4, item: tool('Hộp diêm và nến', { description: 'Ánh sáng khi mất điện.' }) },
    { w: 4, item: tool('Kéo may') },
    { w: 3, item: tool('Gương nhỏ', { description: 'Hé nhìn góc khuất mà không lộ người.' }) },
    { w: 3, item: tool('Túi ni lông và băng keo giấy') },
    { w: 3, item: tool('Chổi và gáo nhựa') },
    { w: 3, item: tool('Dây phơi quần áo') },
  ],
  electronics: [
    { w: 6, item: tool('Sạc dự phòng', { description: 'Giữ điện thoại hoặc radio sống thêm vài ngày.' }) },
    { w: 5, item: tool('Điện thoại cũ', { description: 'Có thể còn chút pin để phát nhạc đánh lạc hướng.' }) },
    { w: 4, item: tool('Đèn pin sạc năng lượng mặt trời', { rarity: 'uncommon' }) },
    { w: 3, item: tool('Bộ đàm cầm tay', { rarity: 'rare', description: 'Nghe và gọi trong bán kính vài km.' }) },
    { w: 4, item: tool('Quạt mini chạy pin') },
    { w: 3, item: tool('Dây điện và đầu nối') },
  ],
  camping: [
    { w: 5, item: tool('Túi ngủ', { description: 'Ngủ ngoài trời ấm hơn.', sanityRestore: 3 } as any) },
    { w: 5, item: tool('Bạt che mưa') },
    { w: 4, item: tool('Bình nước du lịch', { description: 'Đựng nước, dùng lại nhiều lần.' }) },
    { w: 4, item: tool('Đèn đội đầu') },
    { w: 3, item: tool('Lưới đánh cá nhỏ') },
    { w: 3, item: wpn('Dao rừng', 32, 90, { rarity: 'uncommon' }) },
  ],
  household: [
    { w: 10, item: raw('Gạo tẻ', 350, { unit: 'kg', description: 'Tính theo kg. Mỗi bữa một người ăn khoảng 100 g; cần lửa và nước sạch để nấu.' }), q: [1, 2] },
    { w: 9, item: raw('Mì tôm gói', 28, { description: 'Có thể bóp sống ăn tạm (hại bụng) hoặc nấu chín.' }), q: [2, 4] },
    { w: 6, item: raw('Trứng gà', 22), q: [2, 5], fresh: [55, 85] },
    { w: 6, item: food('Đường cát (túi nhỏ)', 14, { description: 'Năng lượng nhanh, dùng pha nước hoặc ăn trực tiếp.' }) },
    { w: 5, item: food('Muối hạt (túi)', 2, { description: 'Gia vị quý: ướp thịt cá để bảo quản lâu.' }) },
    { w: 4, item: food('Nước mắm (chai nhỏ)', 3, { description: 'Gia vị, tăng hiệu quả bữa nấu.' }) },
    { w: 4, item: food('Dầu ăn (chai nhỏ)', 10, { description: 'Chiên xào và là nguồn năng lượng cô đặc.' }) },
    { w: 6, item: food('Lon sữa đặc có đường', 26, { isSealed: true, description: 'Nhiều năng lượng, để rất lâu.' }) },
    { w: 5, item: food('Bánh quy khô (gói)', 20, { isSealed: true }), q: [1, 2] },
    { w: 5, item: food('Lạc rang (túi)', 22, { description: 'Giàu đạm và béo, bảo quản được vài tuần.' }) },
    { w: 4, item: food('Mật ong (lọ)', 24, { description: 'Năng lượng nhanh, không hỏng.' }) },
    { w: 4, item: food('Trà túi lọc (hộp)', 3, { description: 'Pha nước nóng giúp bớt căng thẳng.', sanityRestore: 3 }) },
    { w: 4, item: food('Cà phê hòa tan (gói)', 2, { description: 'Tỉnh táo hơn một chút.' }), q: [2, 4] },
    { w: 5, item: raw('Bột yến mạch (hộp)', 40) },
    { w: 4, item: food('Cháo ăn liền (gói)', 30, { description: 'Chỉ cần nước nóng.' }), q: [1, 3] },
    { w: 5, item: fresh('Hành tỏi và gừng (nắm)', 4), fresh: [60, 85] },
    { w: 4, item: fresh('Khoai lang củ', 32, { needsCooking: true }), q: [1, 3], fresh: [75, 95] },
    { w: 5, item: food('Đồ hộp pate gan', 26, { isSealed: true }) },
    { w: 5, item: food('Đồ hộp cá sốt cà', 32, { isSealed: true }) },
  ],
  // Tủ bếp và kho khô: nguyên liệu nấu ăn đủ loại. Khi người chơi "lấy hết" thì mang đi toàn bộ.
  pantry: [
    { w: 6, item: raw('Gạo tẻ', 350, { unit: 'kg', description: 'Tính theo kg. Mỗi bữa một người ăn khoảng 100 g.' }), q: [1, 3] },
    { w: 5, item: raw('Mì tôm gói', 28), q: [3, 8] },
    { w: 4, item: raw('Bột mì', 300, { unit: 'kg', description: 'Tính theo kg. Nấu bánh hoặc cháo loãng.' }), q: [1, 2] },
    { w: 4, item: raw('Đậu xanh khô', 260, { unit: 'kg', description: 'Tính theo kg. Cần ngâm và nấu chín.' }), q: [1, 1] },
    { w: 5, item: food('Dầu ăn (chai)', 10, { description: 'Chiên xào, thắp đèn tạm. Năng lượng cao.' }) },
    { w: 6, item: food('Muối ăn (gói)', 0, { description: 'Gia vị và ướp muối bảo quản thức ăn.' }), q: [1, 2] },
    { w: 5, item: food('Đường cát (túi nhỏ)', 14, { description: 'Năng lượng nhanh.' }) },
    { w: 5, item: food('Nước mắm (chai nhỏ)', 3, { description: 'Gia vị, tăng hiệu quả bữa nấu.' }) },
    { w: 4, item: food('Hạt nêm và gia vị khô', 2, { description: 'Làm bữa ăn đỡ nhạt.' }) },
    { w: 4, item: fresh('Hành tỏi khô', 6, { canSpoil: false, description: 'Gia vị tươi lâu, nấu ăn thơm hơn.' }), q: [1, 2] },
    { w: 4, item: food('Cá khô (bó)', 30, { description: 'Mặn, bảo quản rất lâu.', thirstReduce: -8 }), q: [1, 2] },
    { w: 3, item: food('Đồ hộp tự chọn (nguyên seal)', 33, { isSealed: true }), q: [1, 3] },
    { w: 3, item: food('Trà túi lọc (hộp)', 3, { description: 'Pha nước nóng giúp bớt căng thẳng.', sanityRestore: 3 }) },
    { w: 3, item: mat('Bình gas mini', { description: 'Nhiên liệu cho bếp dã chiến.' }) },
    { w: 2, item: mat('Bật lửa gas') },
  ],
  fridge: [
    { w: 6, item: raw('Thịt gà đông lạnh đã rã', 45), fresh: [18, 40] },
    { w: 5, item: raw('Thịt heo ba chỉ', 45), fresh: [15, 38] },
    { w: 6, item: fresh('Sữa chua hũ', 14), q: [2, 4], fresh: [30, 60] },
    { w: 5, item: fresh('Xúc xích đóng gói', 26), q: [1, 3], fresh: [40, 70] },
    { w: 5, item: fresh('Rau cải đã héo', 10), fresh: [25, 50] },
    { w: 4, item: raw('Trứng gà', 22), q: [3, 6], fresh: [35, 60] },
    { w: 4, item: drink('Hộp sữa tươi tiệt trùng', 18, { hungerReduce: 12, isSealed: true }) },
  ],
  market: [
    { w: 5, m: [5, 8], item: fresh('Dưa hấu', 16, { thirstReduce: 25 }), fresh: [40, 70] },
    { w: 5, m: [4, 7], item: fresh('Xoài cát', 16), q: [2, 4], fresh: [45, 75] },
    { w: 4, m: [5, 7], item: fresh('Vải thiều', 12), q: [3, 6], fresh: [35, 65] },
    { w: 4, m: [10, 2], item: fresh('Quýt đường', 10, { thirstReduce: 10 }), q: [3, 5], fresh: [40, 70] },
    { w: 4, m: [9, 12], item: fresh('Hồng giòn', 14), q: [2, 4], fresh: [50, 80] },
    { w: 4, m: [10, 3], item: fresh('Bắp cải', 12, { needsCooking: true }), fresh: [55, 85] },
    { w: 4, m: [10, 3], item: fresh('Su hào', 12, { needsCooking: true }), q: [1, 2], fresh: [55, 85] },
    { w: 4, item: fresh('Táo', 14), q: [2, 4], fresh: [50, 80] },
    { w: 4, item: fresh('Dưa chuột', 8, { thirstReduce: 14 }), q: [2, 3], fresh: [45, 75] },
    { w: 3, item: fresh('Thanh long', 12, { thirstReduce: 8 }), q: [1, 2], fresh: [45, 75] },
    { w: 8, item: fresh('Rau muống', 8, { needsCooking: true }), q: [1, 2], fresh: [35, 65] },
    { w: 7, item: fresh('Cà chua', 10), q: [2, 4], fresh: [45, 75] },
    { w: 6, item: fresh('Cà rốt', 14), q: [2, 3], fresh: [55, 85] },
    { w: 7, item: fresh('Khoai tây', 30, { needsCooking: true }), q: [2, 4], fresh: [70, 95] },
    { w: 6, item: fresh('Bí đỏ', 38, { needsCooking: true }), fresh: [70, 95] },
    { w: 6, item: fresh('Chuối tiêu', 18), q: [2, 5], fresh: [40, 70] },
    { w: 5, item: fresh('Cam sành', 14, { thirstReduce: 12 }), q: [2, 4], fresh: [55, 85] },
    { w: 4, item: fresh('Dưa leo', 8, { thirstReduce: 14 }), q: [2, 3], fresh: [40, 70] },
    { w: 5, item: food('Cá khô (bó)', 30, { description: 'Mặn, bảo quản rất lâu, cần uống nhiều nước.', thirstReduce: -8 }), q: [1, 2] },
    { w: 4, item: food('Mực khô', 26, { description: 'Dai, giàu đạm, để rất lâu.' }) },
    { w: 4, item: raw('Gạo nếp', 350, { unit: 'kg', description: 'Tính theo kg, nấu xôi hoặc cơm dẻo.' }), q: [1, 2] },
    { w: 4, item: food('Tôm khô', 20) },
    { w: 3, item: food('Nước dừa tươi', 8, { thirstReduce: 35, canSpoil: true, freshness: 70 }) },
  ],
  vehicle: [
    { w: 7, item: drink('Nước khoáng đóng chai', 45), q: [1, 2] },
    { w: 6, item: drink('Lon nước ngọt có ga', 25, { hungerReduce: 6 }) },
    { w: 5, item: food('Gói snack khoai tây', 14) },
    { w: 5, item: food('Thanh sô-cô-la', 18) },
    { w: 4, item: food('Bánh mì ổ nguội', 28, { canSpoil: true, freshness: 45 }) },
    { w: 4, item: food('Lon cà phê sữa', 16, { thirstReduce: 12 }) },
    { w: 3, item: med('Vỉ thuốc cảm cúm', 6, 4, { description: 'Hạ sốt, đỡ cảm lạnh.' }) },
    { w: 3, item: mat('Cuộn băng keo bạc') },
    { w: 3, item: mat('Can xăng nhỏ', { rarity: 'uncommon', description: 'Nhiên liệu chạy máy phát hoặc chế chai cháy.' }) },
  ],
  // Trái cây và rau củ theo mùa ở bảng tìm đồ ăn ngoài vườn, chợ, ao hồ
  forage: [
    { w: 6, m: [5, 7], item: fresh('Vải thiều', 12, { description: 'Trái mùa hè, ngọt mát.' }), q: [3, 8], fresh: [65, 90] },
    { w: 6, m: [6, 8], item: fresh('Nhãn lồng', 12, { description: 'Trái mùa hè, ngọt đậm.' }), q: [3, 8], fresh: [65, 90] },
    { w: 5, m: [4, 7], item: fresh('Mít chín', 26, { description: 'Múi mít thơm lừng, no lâu.' }), fresh: [60, 85] },
    { w: 5, m: [4, 8], item: fresh('Dưa hấu', 16, { thirstReduce: 25, description: 'Nhiều nước, giải khát rất tốt.' }), fresh: [65, 90] },
    { w: 4, m: [6, 8], item: fresh('Chôm chôm', 10), q: [3, 7], fresh: [60, 85] },
    { w: 5, m: [8, 10], item: fresh('Na (mãng cầu)', 14), q: [1, 3], fresh: [60, 85] },
    { w: 5, m: [9, 12], item: fresh('Hồng giòn', 14), q: [2, 4], fresh: [70, 92] },
    { w: 5, m: [9, 11], item: fresh('Bưởi da xanh', 20, { thirstReduce: 14 }), fresh: [75, 95] },
    { w: 5, m: [10, 2], item: fresh('Cam vàng', 14, { thirstReduce: 12 }), q: [2, 5], fresh: [65, 90] },
    { w: 4, m: [11, 2], item: fresh('Quýt', 10, { thirstReduce: 10 }), q: [3, 6], fresh: [65, 90] },
    { w: 4, m: [12, 3], item: fresh('Mía cây', 8, { thirstReduce: 18, description: 'Nhai lấy nước ngọt, đỡ khát.' }), fresh: [75, 95] },
    { w: 4, m: [2, 4], item: fresh('Mận hậu', 10), q: [3, 6], fresh: [60, 85] },
    { w: 4, m: [3, 6], item: fresh('Mơ chua', 8), q: [3, 6], fresh: [60, 85] },
    { w: 5, item: fresh('Khoai lang', 32, { needsCooking: true, description: 'Củ chắc bụng, nướng luộc đều ngon.' }), q: [2, 4], fresh: [75, 95] },
    { w: 4, item: fresh('Sắn (khoai mì)', 34, { needsCooking: true, description: 'Phải luộc kỹ mới ăn được.' }), q: [1, 3], fresh: [75, 95] },
    { w: 4, item: fresh('Mướp hương', 8, { needsCooking: true }), q: [1, 3], fresh: [60, 85] },
    { w: 3, item: fresh('Bầu', 8, { needsCooking: true }), fresh: [60, 85] },
    { w: 3, item: fresh('Cà tím', 10, { needsCooking: true }), q: [1, 3], fresh: [60, 85] },
    { w: 3, item: fresh('Đu đủ chín', 16), fresh: [60, 85] },
    { w: 8, item: fresh('Rau má dại', 6, { needsCooking: true, description: 'Hái ven bờ cỏ; nấu canh giải nhiệt.' }), q: [1, 3], fresh: [70, 95] },
    { w: 7, item: fresh('Ổi chín', 12, { description: 'Hái trong vườn bỏ hoang, ngọt giòn.' }), q: [2, 5], fresh: [60, 85] },
    { w: 6, item: fresh('Chuối xanh', 20, { needsCooking: true }), q: [2, 5], fresh: [75, 95] },
    { w: 5, item: fresh('Xoài xanh', 12), q: [1, 3], fresh: [75, 95] },
    { w: 5, item: fresh('Ngô bắp', 30, { needsCooking: true }), q: [1, 3], fresh: [60, 85] },
    { w: 4, item: fresh('Rau muống mọc ven ao', 8, { needsCooking: true }), q: [1, 3], fresh: [65, 90] },
    { w: 3, item: fresh('Quả bưởi', 18, { thirstReduce: 12 }), fresh: [70, 95] },
  ],
  pond: [
    { w: 8, item: raw('Cá rô đồng', 32, { canSpoil: true }), q: [1, 3], fresh: [85, 100] },
    { w: 6, item: raw('Cá trê', 40, { canSpoil: true }), q: [1, 2], fresh: [85, 100] },
    { w: 5, item: raw('Tôm đồng', 24, { canSpoil: true }), q: [2, 5], fresh: [85, 100] },
    { w: 5, item: raw('Ốc nhồi', 20, { canSpoil: true }), q: [3, 6], fresh: [85, 100] },
    { w: 3, item: raw('Ếch đồng', 26, { canSpoil: true }), q: [1, 3], fresh: [85, 100] },
  ],
  garden: [
    { w: 7, item: fresh('Ớt chỉ thiên', 2), q: [2, 6], fresh: [70, 95] },
    { w: 7, item: fresh('Cà chua bi', 8), q: [4, 8], fresh: [65, 90] },
    { w: 6, item: fresh('Rau thơm các loại', 3), fresh: [60, 90] },
    { w: 6, item: fresh('Mướp hương', 14, { needsCooking: true }), q: [1, 3], fresh: [65, 90] },
    { w: 5, item: fresh('Bầu non', 12, { needsCooking: true }), q: [1, 2], fresh: [65, 90] },
    { w: 4, item: fresh('Hành lá', 3), fresh: [60, 90] },
  ],
  water_raw: [
    { w: 8, item: drink('Nước mưa hứng (chưa đun)', 55, { unit: 'l', needsCooking: true, description: 'Tính theo lít. Cần đun sôi trước khi uống.' }), q: [2, 5] },
    { w: 5, item: drink('Nước bể trên mái (chưa đun)', 55, { unit: 'l', needsCooking: true, description: 'Tính theo lít. Hơi đục, phải đun sôi.' }), q: [3, 8] },
    { w: 3, item: drink('Nước lọc đóng chai', 45) },
  ],
  pharmacy: [
    { w: 9, item: med('Băng gạc tiệt trùng y tế', 20, 15), q: [1, 3] },
    { w: 6, item: med('Chai nước muối sinh lý', 8, 12, { description: 'Rửa vết thương sạch sẽ.' }) },
    { w: 6, item: med('Viên hạ sốt Paracetamol', 6, 4, { description: 'Hạ sốt, giảm đau nhẹ.' }), q: [1, 2] },
    { w: 5, item: med('Chai cồn đỏ Povidone sát trùng', 15, 30, { rarity: 'uncommon' }) },
    { w: 4, item: med('Vỉ vitamin C', 4, 2, { sanityRestore: 2 }) },
    { w: 2, item: med('Hộp kháng sinh Amoxicillin 500mg', 10, 35, { rarity: 'rare' }) },
    { w: 3, item: med('Băng cuộn đàn hồi', 14, 8) },
  ],
  hardware: [
    { w: 8, item: mat('Thanh sắt V và đinh 10 phân'), q: [1, 3] },
    { w: 6, item: mat('Dây kẽm gai') },
    { w: 6, item: mat('Dây thừng nylon') },
    { w: 5, item: mat('Bật lửa gas'), q: [1, 2] },
    { w: 5, item: mat('Nến thơm và diêm') },
    { w: 4, item: mat('Bình gas mini', { rarity: 'uncommon', description: 'Nhiên liệu cho bếp dã chiến.' }) },
    { w: 3, item: mat('Xà beng thép đúc', { rarity: 'uncommon' }) },
    { w: 3, item: { id: 'lt_wpn', name: 'Búa tạ nhỏ', category: 'weapon', quantity: 1, damage: 34, durability: 85, maxDurability: 85, rarity: 'uncommon', description: 'Nặng tay, đập khớp rất hiệu quả.' } },
  ],
  warehouse: [
    { w: 8, item: food('Đồ hộp thịt hầm', 35, { isSealed: true }), q: [1, 3] },
    { w: 6, item: raw('Gạo tẻ', 350, { unit: 'kg', description: 'Nguyên một bao gạo nặng 5 kg: một người ăn được hơn một tháng nếu có lửa.' }), q: [5, 5] },
    { w: 6, item: raw('Mì tôm (thùng)', 28), q: [3, 6] },
    { w: 6, item: drink('Nước khoáng đóng chai', 45), q: [4, 6] },
    { w: 5, item: food('Bột ngũ cốc ăn liền', 34, { isSealed: true }) },
    { w: 4, item: food('Dầu ăn (can 2 lít)', 10) },
    { w: 4, item: food('Muối hạt (bao)', 2) },
  ],
  office: [
    { w: 7, item: food('Thanh năng lượng', 20, { isSealed: true }), q: [2, 4] },
    { w: 6, item: drink('Nước lọc bình 500ml', 20), q: [2, 3] },
    { w: 5, item: food('Gói kẹo cao su và kẹo ngậm', 6) },
    { w: 5, item: food('Bánh quy văn phòng', 18, { isSealed: true }), q: [1, 2] },
    { w: 4, item: mat('Pin AA dự phòng'), q: [2, 4] },
    { w: 4, item: mat('Đèn pin nhỏ', { rarity: 'uncommon' }) },
  ],
};

let seq = 0;

// Bốc ngẫu nhiên n món theo trọng số (không trùng món trong cùng một lần bốc).
export function rollLoot(table: LootTableId, n: number, rng: () => number = Math.random, month: number = new Date().getMonth() + 1): Item[] {
  const pool = LOOT[table].filter((e) => inSeason(e.m, month));
  const out: Item[] = [];
  for (let i = 0; i < n && pool.length; i++) {
    const total = pool.reduce((s, e) => s + e.w, 0);
    let pick = rng() * total;
    let idx = 0;
    for (; idx < pool.length; idx++) {
      pick -= pool[idx].w;
      if (pick <= 0) break;
    }
    const e = pool.splice(Math.min(idx, pool.length - 1), 1)[0];
    const q = e.q ? e.q[0] + Math.floor(rng() * (e.q[1] - e.q[0] + 1)) : 1;
    const item: any = { ...e.item, quantity: q, id: `${e.item.id}_${Date.now().toString(36)}${seq++}` };
    if (e.fresh) item.freshness = Math.round(e.fresh[0] + rng() * (e.fresh[1] - e.fresh[0]));
    out.push(item as Item);
  }
  return out;
}
