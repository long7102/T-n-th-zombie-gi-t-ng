import { Item } from '../types/game';
import { LootTableId, rollLoot } from './lootTables';

// ====================================================================
// ĐIỂM LOOT CÓ TRẠNG THÁI: mỗi nơi có các hòm đồ cụ thể (tủ bếp, ngăn kéo, thùng xe...) sinh MỘT LẦN rồi lưu lại.
// Lấy món nào là mất món đó, không tự mọc lại; hiển thị % đã lục như This War of Mine.
// Muốn có tài nguyên mới phải nhờ sự kiện động (máy bay rơi, xe tải cướp, thùng trôi dạt).
// Mỗi nơi còn có thể kể một câu chuyện qua dấu vết để lại (thư tuyệt mệnh, vết máu, gia đình trong tủ...).
// ====================================================================

export type SiteKind =
  | 'house' | 'crash' | 'truck' | 'flood'
  | 'farm' | 'church' | 'coldstorage' | 'school' | 'fuel_station' | 'home' | 'hardware_store' | 'pharmacy' | 'market'
  | 'supermarket' | 'hospital' | 'police_station' | 'bridge' | 'industrial' | 'stadium' | 'tower' | 'depot';

export interface SiteContainer {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  noise: number;                        // 0-3: càng lớn càng dễ gây tiếng động kéo xác sống
  needs?: { source: string; label: string }; // khóa: cần dụng cụ (source là regex dạng chuỗi)
  items: Item[];
}

export interface SiteStory {
  id: string;
  title: string;
  scene: string;                        // điều bạn thấy ngay khi bước vào
  evidenceLabel: string;                // nút xem kỹ (đọc thư, nhìn tấm ảnh...)
  evidence: string;                     // nội dung khi xem kỹ
  sanity: number;                       // ảnh hưởng tinh thần khi xem kỹ
  gain?: Partial<Item>;                 // kỷ vật tìm được khi xem kỹ
  flag?: string;
}

export interface Site {
  id: string;
  name: string;
  kind: SiteKind;
  danger: number;
  containers: SiteContainer[];
  story?: SiteStory;
}

export interface SiteState {
  site: Site;
  taken: Record<string, number[]>;      // containerId -> chỉ số món đã lấy
  searched: string[];                   // hòm đã mở
  evidenceSeen?: boolean;
  hiddenAdded?: boolean;
  visits: number;
}

type Tpl = { name: string; icon: string; blurb: string; table: LootTableId; n: [number, number]; noise: number; needs?: { re: RegExp; label: string } };

const T = (name: string, icon: string, blurb: string, table: LootTableId, n: [number, number], noise = 1, needs?: Tpl['needs']): Tpl => ({ name, icon, blurb, table, n, noise, needs });
const CROWBAR = { re: /xà beng|kìm|búa|cờ lê|tuốc nơ vít/i, label: 'Xà beng, kìm hoặc búa' };

const TEMPLATES: Record<SiteKind, Tpl[]> = {
  house: [
    T('Tủ bếp', '🍳', 'Ngăn tủ, hũ gia vị, thùng gạo dưới gầm bếp.', 'pantry', [4, 7], 1),
    T('Tủ lạnh và tủ đông', '🧊', 'Mùi xộc lên, nhưng đôi khi vẫn còn thứ cứu được.', 'fridge', [2, 3], 0),
    T('Tủ quần áo', '👕', 'Quần áo cũ, giày dép, có khi giấu cả đồ phòng hộ.', 'clothing', [1, 3], 1),
    T('Ngăn kéo bàn làm việc', '🗄️', 'Giấy tờ, pin, chìa khóa, vài món lặt vặt.', 'household', [2, 3], 0),
    T('Phòng ngủ chính', '🛏️', 'Đầu giường, gầm giường, dưới nệm.', 'domestic', [2, 3], 1),
    T('Hộc thuốc gia đình', '💊', 'Hộp sơ cứu để trong tủ nhà tắm.', 'pharmacy', [1, 2], 0),
  ],
  pharmacy: [T('Quầy thuốc', '💊', 'Kệ thuốc không kê đơn.', 'pharmacy', [2, 3], 1), T('Tủ kính thuốc kê đơn', '🔒', 'Cửa kính khóa chặt.', 'pharmacy', [2, 3], 2, CROWBAR), T('Kho sau', '📦', 'Thùng hàng chưa mở.', 'pharmacy', [2, 3], 0), T('Ngăn kéo thu ngân', '🧾', 'Chút tiền lẻ và đồ lặt vặt.', 'household', [1, 2], 0)],
  hospital: [T('Tủ thuốc y tá', '💉', 'Tủ thuốc trực.', 'pharmacy', [3, 4], 1), T('Xe đẩy cấp cứu', '🛒', 'Vật tư cầm máu bỏ lại vội.', 'pharmacy', [2, 3], 1), T('Phòng bệnh nhân', '🛏️', 'Đồ cá nhân của người nằm viện.', 'household', [2, 3], 1), T('Kho dụng cụ', '🧰', 'Khóa sắt chắc chắn.', 'tools', [2, 3], 2, CROWBAR)],
  market: [T('Sạp rau củ', '🥬', 'Hàng đã héo nhưng còn ăn được.', 'market', [3, 4], 0), T('Sạp đồ khô', '🥫', 'Cá khô, mực khô, gạo nếp.', 'market', [2, 3], 0), T('Thùng hàng chất đống', '📦', 'Chưa ai kịp mở.', 'warehouse', [2, 3], 1), T('Quầy thịt cá', '🥩', 'Chủ yếu đã hỏng.', 'fridge', [2, 2], 0)],
  supermarket: [T('Kệ đồ hộp', '🥫', 'Dãy kệ gần cửa đã bị vơ, nhưng trong sâu còn.', 'warehouse', [3, 4], 1), T('Kho phía sau', '📦', 'Cửa sắt kẹt, đẩy mạnh sẽ ồn.', 'warehouse', [3, 4], 2), T('Tủ đông lớn', '🧊', 'Mất điện đã lâu.', 'fridge', [2, 3], 0), T('Kệ gia vị và đồ khô', '🧂', 'Muối, đường, nước mắm, mì gói.', 'pantry', [4, 6], 1), T('Quầy thu ngân', '🧾', 'Vài món lặt vặt.', 'household', [1, 2], 0)],
  hardware_store: [T('Kệ dụng cụ', '🔧', 'Dụng cụ cầm tay.', 'hardware', [3, 4], 1), T('Kho kim khí', '🔩', 'Ống, dây, đinh, thanh sắt.', 'hardware', [3, 4], 1), T('Tủ khóa', '🔒', 'Đồ giá trị.', 'tools', [2, 3], 2, CROWBAR), T('Quầy thu ngân', '🧾', 'Ngăn kéo cuối.', 'household', [1, 1], 0)],
  police_station: [T('Tủ vũ khí', '🔫', 'Cửa thép, khóa số.', 'weapons', [2, 3], 3, CROWBAR), T('Phòng giam', '⛓️', 'Đồ cá nhân tịch thu.', 'household', [2, 3], 1), T('Tủ hồ sơ', '🗂️', 'Giấy tờ, ít đồ dùng.', 'office', [2, 3], 0), T('Xe tuần tra', '🚓', 'Hộp đồ sau cốp.', 'vehicle', [2, 3], 1)],
  bridge: [T('Xe bỏ lại thứ nhất', '🚗', 'Cốp xe đã mở.', 'vehicle', [2, 3], 1), T('Xe bỏ lại thứ hai', '🚙', 'Ghế sau.', 'vehicle', [2, 3], 1), T('Xe tải nhỏ', '🚚', 'Thùng hàng khóa.', 'warehouse', [2, 3], 2, CROWBAR)],
  industrial: [T('Kệ phụ tùng', '⚙️', 'Phụ tùng máy.', 'autoparts', [3, 4], 1), T('Tủ dụng cụ thợ', '🧰', 'Dụng cụ nặng.', 'tools', [3, 4], 1), T('Văn phòng xưởng', '🗂️', 'Bàn làm việc.', 'office', [2, 3], 0)],
  stadium: [T('Phòng thay đồ', '👟', 'Tủ đồ cầu thủ.', 'clothing', [2, 3], 1), T('Quầy bán nước', '🥤', 'Nước đóng chai.', 'market', [2, 3], 0), T('Kho thiết bị', '⛺', 'Đồ cắm trại, dụng cụ.', 'camping', [2, 3], 1)],
  tower: [T('Văn phòng tầng cao', '🖥️', 'Bàn làm việc bỏ lại.', 'office', [3, 4], 0), T('Phòng pantry', '☕', 'Bếp nhỏ của văn phòng.', 'pantry', [3, 5], 0), T('Phòng bảo vệ', '📡', 'Màn hình tắt, radio cũ.', 'electronics', [2, 3], 1)],
  depot: [T('Kho quân dụng', '🎖️', 'Thùng quân nhu.', 'camping', [3, 4], 2, CROWBAR), T('Xe quân sự', '🪖', 'Hộp đồ trên xe.', 'vehicle', [2, 3], 1), T('Phòng chỉ huy', '📻', 'Thiết bị liên lạc.', 'electronics', [2, 3], 1), T('Tủ đạn', '🔫', 'Khóa thép.', 'weapons', [1, 2], 3, CROWBAR)],
  farm: [T('Vườn rau sau nhà', '🥕', 'Rau củ mọc dại.', 'garden', [3, 4], 0), T('Nhà kho nông cụ', '🛠️', 'Cuốc, xẻng, dây thừng.', 'tools', [2, 3], 1), T('Tủ bếp nhà vườn', '🍳', 'Gạo, muối, gia vị.', 'pantry', [4, 6], 1), T('Ao và mương nước', '🐟', 'Cá, tôm, ốc.', 'pond', [2, 3], 0)],
  church: [T('Phòng lễ', '🕯️', 'Nến, chăn, đồ cúng.', 'domestic', [2, 3], 0), T('Tủ kính phòng ăn', '🍷', 'Đồ khô được giữ cho ngày lễ.', 'pantry', [3, 4], 0), T('Phòng mục sư', '📖', 'Ngăn kéo và tủ sách.', 'household', [2, 3], 0)],
  coldstorage: [T('Buồng lạnh một', '❄️', 'Mất điện từ lâu.', 'fridge', [3, 4], 1), T('Buồng lạnh hai', '❄️', 'Cửa nặng.', 'fridge', [3, 4], 2), T('Kho khô', '📦', 'Pallet hàng đóng gói.', 'warehouse', [3, 4], 1)],
  school: [T('Phòng giáo viên', '📚', 'Bàn làm việc.', 'office', [3, 4], 0), T('Căng tin', '🍚', 'Gạo, gia vị, đồ hộp.', 'pantry', [4, 6], 1), T('Phòng y tế', '🩺', 'Tủ thuốc nhỏ.', 'pharmacy', [2, 3], 0), T('Phòng thể chất', '🏀', 'Dụng cụ, đồ cắm trại.', 'camping', [2, 3], 1)],
  fuel_station: [T('Cửa hàng tiện lợi', '🛒', 'Kệ hàng nhỏ.', 'market', [2, 3], 0), T('Kho phụ tùng', '🛢️', 'Dầu nhớt, phụ tùng.', 'autoparts', [2, 3], 1), T('Xe đang đổ xăng', '🚗', 'Cốp xe.', 'vehicle', [2, 3], 1)],
  home: [T('Tủ bếp', '🍳', 'Quen thuộc.', 'pantry', [2, 3], 0)],
  crash: [T('Thùng hàng cứu trợ', '📦', 'Dù còn mắc trên thân máy bay.', 'warehouse', [4, 5], 1), T('Hộp y tế khẩn cấp', '🧰', 'Hộp đỏ dán chữ thập.', 'pharmacy', [3, 4], 0), T('Khoang hành lý', '🧳', 'Va li của những người trên máy bay.', 'clothing', [3, 4], 1), T('Buồng lái', '🛩️', 'Còn nguyên thiết bị liên lạc.', 'electronics', [2, 3], 1, CROWBAR)],
  truck: [T('Thùng xe tải', '🚚', 'Hàng cướp được, chất cao.', 'warehouse', [4, 5], 2), T('Cabin', '🪟', 'Ghế lái, hộc đồ.', 'weapons', [2, 3], 1), T('Hòm của bọn cướp', '🧰', 'Khóa tạm bợ.', 'market', [3, 4], 1), T('Xác bọn cướp', '☠️', 'Túi áo, thắt lưng.', 'household', [2, 3], 2)],
  flood: [T('Thùng gỗ kẹt giữa bờ', '📦', 'Nước đã thấm nhưng nắp còn kín.', 'warehouse', [3, 4], 1), T('Kiện hàng nổi', '🧺', 'Vải bạt bọc quanh.', 'pantry', [3, 4], 0), T('Đồ cắm trại trôi dạt', '⛺', 'Mắc trong bụi lau.', 'camping', [2, 3], 0)],
};

export const SITE_KIND_NAME: Partial<Record<SiteKind, string>> = { crash: 'Máy bay cứu trợ rơi', truck: 'Xe tải của nhóm cướp', flood: 'Thùng hàng trôi dạt vào bờ sông' };

// ---- Câu chuyện qua dấu vết ----
export const STORIES: SiteStory[] = [
  { id: 'suicide_letter', title: 'Bức thư trên bàn ăn', scene: 'Trên bàn ăn đặt ngay ngắn một bức thư, bên cạnh là hai ly nước đã khô cặn. Người đàn ông ngồi gục trên ghế, tay vẫn ôm một khung ảnh. Cửa phòng ngủ phía sau bị dán kín băng keo.', evidenceLabel: 'Đọc bức thư', evidence: '"Em và con ngủ rồi. Anh đã dán kín cửa phòng. Anh bị cắn từ sáng nay, và anh không thể để mình thành thứ đó khi con tỉnh dậy. Ai tìm thấy nhà này: tủ bếp còn gạo, xin hãy ăn. Nhưng đừng mở cửa phòng ngủ."', sanity: -6, gain: { id: 'keepsake_photo', name: 'Khung ảnh gia đình', category: 'gift', quantity: 1, affectionBonus: 8, rarity: 'uncommon', description: 'Ba người cười trước một cái bánh sinh nhật. Có lẽ ai đó trong nhóm bạn sẽ muốn giữ nó.' } },
  { id: 'drag_marks', title: 'Vệt máu lê lết', scene: 'Vệt máu khô kéo dài từ cửa chính vào tận phòng tắm, rộng bằng thân người, có những dấu tay bám xuống sàn. Cửa phòng tắm khóa từ bên trong. Bạn nghe một tiếng cào rất khẽ.', evidenceLabel: 'Áp tai vào cánh cửa', evidence: 'Tiếng cào đều đều, dừng lại khi bạn nín thở, rồi lại tiếp tục. Dưới khe cửa dán băng keo, ngoài có tờ giấy: "ĐỪNG MỞ. Tôi xin lỗi. Tôi đã cố nhờ em ấy đi trước."', sanity: -4, flag: 'story_bathroom' },
  { id: 'family_closet', title: 'Gia đình trong góc tủ', scene: 'Cánh tủ quần áo khép hờ. Bên trong, ba người ôm chặt nhau trong một cái chăn: hai người lớn và một bé gái. Không có vết thương, không có dấu vết giằng co. Nhìn họ giống như đang ngủ.', evidenceLabel: 'Nhìn kỹ hơn', evidence: 'Một lọ thuốc ngủ rỗng lăn dưới chân. Tờ giấy nhàu trong tay đứa bé: "Con không sợ nữa. Ba mẹ ở đây." Họ đã chọn đi cùng nhau thay vì chờ thứ ngoài kia phá cửa.', sanity: -8, gain: { id: 'keepsake_plush', name: 'Thú bông cũ', category: 'gift', quantity: 1, affectionBonus: 6, rarity: 'common', description: 'Con gấu bông sờn mặt, vẫn còn mùi xà phòng.' } },
  { id: 'bathtub', title: 'Dòng chữ trên gương', scene: 'Trong bồn tắm đầy nước đã ngả màu, một thanh niên ngồi dựa vào thành, cánh tay băng vội. Con dao cạo rơi ở cạnh. Trên mặt gương có dòng chữ viết bằng son môi.', evidenceLabel: 'Đọc dòng chữ trên gương', evidence: '"Mình thà chết khi còn là người còn hơn sống thành thứ đó." Dưới cùng là địa chỉ một nhà thờ: "Nếu mẹ tìm mình, mình ở đó rồi."', sanity: -6 },
  { id: 'dinner', title: 'Bữa cơm dang dở', scene: 'Bàn ăn bày bốn bộ chén đũa. Cơm đã mốc xanh, một chiếc ghế đổ. Tờ lịch treo tường bị gạch đến ngày thứ chín rồi dừng.', evidenceLabel: 'Xem tờ lịch', evidence: 'Cạnh ô ngày 9 có người viết nguệch ngoạc: "Mẹ bảo mai bố về." Ô ngày 10 để trống.', sanity: -3 },
  { id: 'kid_room', title: 'Phòng của đứa trẻ', scene: 'Cửa sổ phòng trẻ con bị bịt kín bằng nệm. Trên tường toàn vết cào thấp và nhỏ, từ phía trong. Một chiếc hộp nhạc vẫn còn nằm trên nôi.', evidenceLabel: 'Mở hộp nhạc', evidence: 'Giai điệu ru ngủ ngân lên, lạc tông, chậm dần. Bạn đứng yên cho tới khi nó tắt hẳn, và không muốn nghĩ về những vết cào kia.', sanity: -5, gain: { id: 'keepsake_musicbox', name: 'Hộp nhạc cũ', category: 'gift', quantity: 1, affectionBonus: 7, rarity: 'uncommon', description: 'Vẫn còn chạy được. Giai điệu hơi lạc tông.' } },
  { id: 'radio_guard', title: 'Người gác cuối cùng', scene: 'Một người bảo vệ ngồi tựa tường, cạnh chiếc radio vẫn bật. Tay ông nắm khẩu súng ngắn, hộp đạn mở sẵn trên đùi. Chỉ còn đúng một viên.', evidenceLabel: 'Nghe chiếc radio', evidence: 'Tiếng rè rè, rồi một giọng thì thầm lặp đi lặp lại: "Ai nghe thấy... hãy tới... đừng đi một mình... ". Rồi im bặt.', sanity: -2, flag: 'story_radio', gain: { id: 'keepsake_battery', name: 'Pin AA dự phòng', category: 'material', quantity: 2, rarity: 'common', description: 'Lấy từ chiếc radio của người gác.' } },
  { id: 'couple', title: 'Hai người nắm tay', scene: 'Hai người nằm trên giường, tay trong tay, quay mặt vào nhau. Một chai thuốc rỗng đặt trên tủ đầu giường. Hai chiếc nhẫn cưới còn sáng.', evidenceLabel: 'Nhìn tấm ảnh cưới', evidence: 'Ngày cưới của họ, nụ cười rạng rỡ giữa nắng. Mặt sau ghi: "Bên nhau tới cuối cùng. Xin lỗi mẹ."', sanity: -6, gain: { id: 'keepsake_ring', name: 'Nhẫn cưới', category: 'gift', quantity: 1, affectionBonus: 10, rarity: 'rare', description: 'Vành nhẫn bạc mỏng, khắc hai chữ cái.' } },
  { id: 'doctor_log', title: 'Cuốn sổ của bác sĩ', scene: 'Phòng làm việc nhỏ của một bác sĩ tư: hồ sơ bệnh nhân chất thành đống, ống nghe vắt trên ghế. Cuốn sổ cuối cùng mở ở trang chưa viết xong.', evidenceLabel: 'Đọc trang cuối', evidence: '"Ca thứ 31 hôm nay. Tất cả cùng triệu chứng: sốt, khát khô, gân tối màu. Kháng sinh liều cao không hiệu quả. Tôi nhận ra mình cũng bị. Ai đọc được: đừng để vết cắn quá hai giờ, và đừng ở lại phòng khám."', sanity: -2 },
  { id: 'shrine', title: 'Bàn thờ còn hương', scene: 'Bàn thờ trong nhà vẫn còn hương cháy dở, vài tấm ảnh đen trắng được lau sạch. Trước ảnh có một bát cơm cúng, ai đó mới dâng cách đây một hai ngày.', evidenceLabel: 'Chạm vào bát cơm', evidence: 'Cơm vẫn còn ấm hơi dưới đáy bát. Có người còn sống quanh đây, và họ vừa rời đi rất vội.', sanity: 0, flag: 'someone_nearby' },
  { id: 'dog', title: 'Con chó giữ cửa', scene: 'Một con chó lớn nằm chết chắn ngay trước cửa phòng ngủ, dây xích vẫn đeo ở cổ. Phía sau cánh cửa đóng chặt có dán một tờ giấy.', evidenceLabel: 'Đọc tờ giấy', evidence: '"Ngoan nhé Bông, canh cửa cho nhà." Cạnh bát nước còn mẩu bánh quy đã khô, và sau cánh cửa không có tiếng động nào.', sanity: -3 },
  { id: 'cellar', title: 'Hầm chứa đồ', scene: 'Hầm sau bếp chất đầy thùng rỗng. Trên cánh cửa hầm ai đó khắc bằng dao: "Chúng tôi hết đồ ăn. Xin lỗi những ai đến sau."', evidenceLabel: 'Xem những vết khắc', evidence: 'Dưới dòng chữ là mười một vạch, mỗi vạch một ngày. Vạch cuối cùng bị gạch chéo bằng thứ gì đó đen sạm.', sanity: -4 },
  { id: 'daughter', title: 'Lá thư gửi mẹ', scene: 'Một cô gái nằm nghiêng trên giường, quay mặt vào tường như đang ngủ. Có một tờ giấy ép dưới gối, góc giấy ướt.', evidenceLabel: 'Đọc tờ giấy', evidence: '"Mẹ ơi, con đã định chạy sang nhà mẹ nhưng ngoài đường đông quá. Con không dám. Nếu mẹ còn sống, mẹ tha lỗi cho con."', sanity: -5 },
  { id: 'soldier', title: 'Người lính trẻ', scene: 'Một người lính trẻ chết ngồi dưới bậc cầu thang, áo giáp dính đầy bụi. Trên tay áo là huy hiệu quen thuộc: Bunker 13.', evidenceLabel: 'Lục túi áo', evidence: 'Một tấm bản đồ gấp, khoanh đỏ một điểm ở phía đông. Mặt sau ghi vội: "Nếu tôi không về, đừng tin tín hiệu thứ ba."', sanity: -2, flag: 'story_soldier' },
];

const STORY_KINDS: Partial<Record<string, SiteKind[]>> = {
  doctor_log: ['hospital', 'pharmacy', 'house'], soldier: ['police_station', 'depot', 'house', 'bridge'], shrine: ['house', 'church'], couple: ['house', 'church', 'hospital'],
  family_closet: ['house', 'church', 'school'], kid_room: ['house', 'school'], radio_guard: ['house', 'tower', 'police_station', 'depot'],
};

function pickStory(kind: SiteKind, usedIds: string[], rng: () => number): SiteStory | undefined {
  const pool = STORIES.filter((s) => !usedIds.includes(s.id) && (!STORY_KINDS[s.id] || STORY_KINDS[s.id]!.includes(kind)) && (kind === 'house' || STORY_KINDS[s.id]));
  if (!pool.length) return undefined;
  return pool[Math.floor(rng() * pool.length)];
}

const uid = (s: string, rng: () => number) => `${s}_${Math.floor(rng() * 1e9).toString(36)}`;

// Sinh một điểm loot mới: các hòm đồ và (tùy nơi) một câu chuyện qua dấu vết.
export function buildSite(spec: { id: string; name: string; kind: SiteKind; danger: number; usedStories?: string[] }, rng: () => number = Math.random, month?: number): Site {
  const tpls = TEMPLATES[spec.kind] || TEMPLATES.house;
  const containers: SiteContainer[] = tpls.map((t, i) => {
    const n = t.n[0] + Math.floor(rng() * (t.n[1] - t.n[0] + 1));
    return {
      id: `c${i}`, name: t.name, icon: t.icon, blurb: t.blurb, noise: t.noise,
      needs: t.needs ? { source: t.needs.re.source, label: t.needs.label } : undefined,
      items: rollLoot(t.table, n, rng, month ?? new Date().getMonth() + 1).map((it) => ({ ...it, id: uid(it.id || 'it', rng) })),
    };
  });
  // Nhà hoang: không phải nhà nào cũng có đủ mọi hòm
  if (spec.kind === 'house' && containers.length > 4) containers.splice(Math.floor(rng() * containers.length), 1);
  const wantStory = spec.kind === 'house' ? rng() < 0.75 : rng() < 0.4;
  const story = wantStory ? pickStory(spec.kind, spec.usedStories || [], rng) : undefined;
  return { id: spec.id, name: spec.name, kind: spec.kind, danger: spec.danger, containers, story };
}

export const newSiteState = (site: Site): SiteState => ({ site, taken: {}, searched: [], visits: 0 });

// Tỉ lệ đã lục soát (như This War of Mine): số món đã lấy / tổng số món ban đầu.
export function siteProgress(st: SiteState | undefined): { pct: number; total: number; taken: number; empty: boolean } {
  if (!st) return { pct: 0, total: 0, taken: 0, empty: false };
  const total = st.site.containers.reduce((s, c) => s + c.items.length, 0);
  const taken = st.site.containers.reduce((s, c) => s + (st.taken[c.id]?.length || 0), 0);
  return { pct: total ? Math.round((taken / total) * 100) : 100, total, taken, empty: total === taken };
}

// Thêm một hòm bí mật khi bạn lục kỹ lần đầu (không tự hồi lại nếu đã có).
export function addHiddenContainer(st: SiteState, rng: () => number = Math.random): SiteState {
  if (st.hiddenAdded) return st;
  const tables: LootTableId[] = ['household', 'weapons', 'pharmacy', 'tools', 'camping'];
  const table = tables[Math.floor(rng() * tables.length)];
  const items = rollLoot(table, 2, rng).map((it) => ({ ...it, id: uid(it.id || 'it', rng) }));
  const c: SiteContainer = { id: `hidden`, name: 'Ngăn bí mật', icon: '🗝️', blurb: 'Bạn lục kỹ và phát hiện một chỗ giấu sau lớp ván.', noise: 1, items };
  return { ...st, hiddenAdded: true, site: { ...st.site, containers: [...st.site.containers, c] } };
}

// ---- Điểm động: sự kiện tài nguyên tạm thời ----
export interface DynamicSiteSpec { id: string; kind: 'crash' | 'truck' | 'flood'; name: string; hint: string; expiresDay: number; region: 'near' | 'mid' }

export function dynamicSiteFor(kind: DynamicSiteSpec['kind'], day: number, n: number): DynamicSiteSpec {
  if (kind === 'crash') return { id: `dyn_crash_${n}`, kind, name: 'Máy bay cứu trợ rơi', hint: 'Một chiếc máy bay cứu trợ vừa lao xuống phía ngoài thành phố. Khói đen bốc lên, và những chiếc dù trắng còn mắc trên cây.', expiresDay: day + 2, region: 'mid' };
  if (kind === 'truck') return { id: `dyn_truck_${n}`, kind, name: 'Xe tải của nhóm cướp', hint: 'Bạn nghe tiếng súng rồi tiếng gào thét giữa đường: một chiếc xe tải của nhóm cướp bị bầy xác sống bao vây. Khi tiếng ồn lắng xuống, chiếc xe còn nằm đó.', expiresDay: day + 2, region: 'near' };
  return { id: `dyn_flood_${n}`, kind, name: 'Thùng hàng trôi dạt', hint: 'Cơn bão làm vỡ một kho hàng ở thượng nguồn. Sáng ra, nhiều thùng hàng dạt vào bãi sông.', expiresDay: day + 1, region: 'near' };
}

// ---- Sai đệ đi loot hộ ----
export interface Errand { siteId: string; startClock: number; returnClock: number; siteName: string }

// Sức khuân: nhiều món hơn nếu khỏe, trẻ, có kỹ năng trinh sát/kiếm đồ.
export function errandCapacity(c: { hp?: number; age?: number; gender?: string; skills?: string[]; role?: string }): number {
  const text = `${c.role || ''} ${(c.skills || []).join(' ')}`;
  let cap = 3;
  if (/trinh sát|lục|kiếm|nông|thợ|lính|khuân|nhặt|đường/i.test(text)) cap += 2;
  if ((c.hp ?? 100) >= 80) cap += 1;
  if (c.gender === 'male' && (c.age ?? 30) < 50) cap += 1;
  if ((c.age ?? 30) >= 55 || (c.hp ?? 100) < 50) cap -= 1;
  return Math.max(2, cap);
}

const RARITY_W: Record<string, number> = { common: 1, uncommon: 2, rare: 3, epic: 4 };

// Đệ lục và mang về một phần đồ còn lại của điểm loot. Trả về điểm đã cập nhật, đồ mang về, thương tích và có mất tích không.
export function resolveErrand(
  st: SiteState,
  c: { name: string; hp?: number; age?: number; gender?: string; skills?: string[]; role?: string; traits?: string[] },
  rng: () => number = Math.random,
): { st: SiteState; items: Item[]; hurt: number; lost: boolean; log: string } {
  const cap = errandCapacity(c);
  const taken: Record<string, number[]> = { ...st.taken };
  const pool: { cid: string; idx: number; item: Item }[] = [];
  for (const ct of st.site.containers) {
    if (ct.needs) continue; // hòm khóa: đệ không phá được
    ct.items.forEach((item, idx) => { if (!(taken[ct.id] || []).includes(idx)) pool.push({ cid: ct.id, idx, item }); });
  }
  const picked: Item[] = [];
  for (let i = 0; i < cap && pool.length; i++) {
    // đệ khôn thì nhặt món giá trị trước, vẫn có chút ngẫu nhiên
    const total = pool.reduce((s, p) => s + (RARITY_W[p.item.rarity] || 1), 0);
    let r = rng() * total, k = 0;
    for (; k < pool.length - 1; k++) { r -= RARITY_W[pool[k].item.rarity] || 1; if (r <= 0) break; }
    const p = pool.splice(k, 1)[0];
    taken[p.cid] = [...(taken[p.cid] || []), p.idx];
    picked.push({ ...p.item });
  }
  const brave = (c.traits || []).includes('brave') ? 0.6 : (c.traits || []).includes('coward') ? 1.4 : 1;
  const hurtChance = Math.min(0.7, 0.07 * st.site.danger * brave);
  const hurt = rng() < hurtChance ? 10 + Math.floor(rng() * 16) : 0;
  const lost = st.site.danger >= 4 && rng() < 0.05 * brave;
  const next: SiteState = { ...st, taken, visits: st.visits + 1 };
  if (lost) return { st: next, items: [], hurt: 0, lost: true, log: `${c.name} đi loot ở ${st.site.name} và không bao giờ trở về. Chỉ có chiếc ba lô bỏ lại ở đầu ngõ.` };
  const log = picked.length
    ? `${c.name} khuân về ${picked.length} món từ ${st.site.name}${hurt ? `, nhưng bị thương (-${hurt} máu) trên đường` : ''}.`
    : `${c.name} quay về tay không: ${st.site.name} gần như đã bị vét sạch.`;
  return { st: next, items: picked, hurt, lost: false, log };
}
