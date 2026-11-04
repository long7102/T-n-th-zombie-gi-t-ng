import { Item, WeatherType } from '../types/game';
import { Setting, Zone } from './settings';
import { LootTableId } from './lootTables';

// ====================================================================
// KHO CẢNH SINH TỒN THƯỜNG NGÀY, GẮN VỚI "VÙNG" (zone).
// - Mỗi cảnh chỉ xuất hiện khi người chơi đang đứng đúng vùng của nó.
// - Muốn sang vùng khác phải chọn lựa chọn có `go` (director sẽ chèn đoạn di chuyển rõ ràng).
// - Văn bản dùng {shelter} {near} {outside} {roof} {neighbor} để hợp mọi bối cảnh khởi đầu.
// - Loot dùng bảng ngẫu nhiên (roll) nên mỗi lần chơi nhặt được đồ khác nhau.
// ====================================================================

export interface SceneCtx {
  day: number;
  weather: WeatherType;
  zone: Zone;
  setting: Setting;
  waterCut: boolean;
  blackout: boolean;
  hasCompanion: boolean;
  companionName: string;
  baseType: string;
  thirst: number;
  hunger: number;
  stamina: number;
  hasWound: boolean;
  hasRawFood: boolean;
  night: boolean;
  flags: string[];
}

export interface SceneStats {
  hp?: number;
  hunger?: number;
  thirst?: number;
  infection?: number;
  sanity?: number;
  stamina?: number;
}

export interface Roll { table: LootTableId; n: number; chance?: number }

export interface RoutineChoice {
  text: string;
  outcome: string;
  stats?: SceneStats;
  gain?: Partial<Item>[];
  roll?: Roll | Roll[];         // bốc loot ngẫu nhiên từ một hoặc nhiều bảng
  flags?: string[];             // hậu quả lâu dài của quyết định (ghi nhớ trong thế giới)
  flagsRemove?: string[];       // xóa các hậu quả đã được giải quyết
  lose?: { name: string; quantity: number }[];
  go?: Zone;                    // đổi vùng (director chèn câu di chuyển)
  inflictWound?: string;
  healWound?: boolean;
  requires?: { re: RegExp; label: string }[];
  consumeFood?: 'ready' | 'cook' | 'any'; // ăn thật: ready = đồ ăn liền, cook = món cần nấu, any
  foodMult?: number;
  drink?: boolean;              // uống thật: tiêu thụ 1 món nước
}

export interface RoutineScene {
  id: string;
  zones: Zone[];
  primary: Zone;
  only?: string[];              // chỉ dùng cho một số bối cảnh khởi đầu
  when?: (c: SceneCtx) => boolean;
  need?: (c: SceneCtx) => boolean;
  weight?: number;
  situation: (c: SceneCtx) => string;
  choices: [RoutineChoice, RoutineChoice, RoutineChoice];
}

export const WEATHER_FLAVOR: Record<WeatherType, string[]> = {
  clear: [
    'Bầu trời xám nhạt, không gió. Cái im lặng nặng nề khiến mỗi tiếng bước chân đều vang xa.',
    'Ánh sáng nhợt nhạt luồn qua mọi khe hở, bụi bay lơ lửng trong những vệt sáng mỏng.',
  ],
  heatwave: [
    'Nắng gắt thiêu đốt. Không khí đặc quánh mùi nhựa đường nóng chảy và thịt thối.',
    'Hơi nóng hầm hập hắt vào từ mọi hướng, mồ hôi chảy ròng ròng ngay cả khi bạn đứng yên.',
  ],
  heavy_rain: [
    'Mưa trút xối xả, tiếng ồn che lấp mọi âm thanh khác. Hơi lạnh ẩm ướt luồn qua từng kẽ áo.',
    'Nước mưa đục ngầu chảy thành dòng, cuốn theo rác và mùi hôi tanh.',
  ],
  freezing_cold: [
    'Gió lạnh buốt lùa qua mọi khe hở, hơi thở của bạn tụ thành khói trắng. Đầu ngón tay tê dại.',
    'Cái rét cắt da thịt. Sắt thép lạnh đến mức dính tay, mỗi bước đi đều làm khớp xương nhức nhối.',
  ],
  dense_fog: [
    'Sương mù đặc quánh nuốt chửng mọi thứ, tầm nhìn chỉ còn vài sải tay. Tiếng động lạ vọng lại từ mọi hướng.',
    'Sương trắng đục bám lên mọi bề mặt, những cái bóng mờ lê bước khó đoán.',
  ],
  night_dark: [
    'Bóng tối đặc quánh phủ xuống, chỉ còn ánh trăng yếu ớt lọt qua những đám mây.',
    'Đêm đen không một ánh đèn. Bạn chỉ có thể dựa vào thính giác và những ngón tay mò mẫm trong bóng tối.',
  ],
};

// ---------- Mở đầu: 4 bộ lựa chọn khác nhau (chọn ngẫu nhiên, không còn lần nào cũng như nhau) ----------
export const OPENING_SETS: [RoutineChoice, RoutineChoice, RoutineChoice][] = [
  [
    { text: 'Kiểm kê ba lô, đếm lại thức ăn và nước uống còn lại', outcome: 'Bạn đổ hết đồ ra sàn và phân loại từng món. Biết mình còn gì khiến đầu óc bớt hoảng loạn, dù con số không nhiều.', stats: { sanity: 3 } },
    { text: 'Áp tai vào lối ra của {shelter} nghe ngóng động tĩnh bên ngoài', outcome: 'Bạn nín thở nghe rất lâu. Có tiếng kéo lê xa xa và tiếng gió, nhưng không có gì ở rất gần. Bạn biết thêm nhịp di chuyển của lũ quái.', stats: { sanity: 1, stamina: -2 } },
    { text: 'Lục lọi kỹ {shelter} xem còn thứ gì sót lại', outcome: 'Bạn mò từng ngăn tủ, từng gầm giường và tìm được vài thứ dùng được.', stats: { stamina: -4 }, roll: { table: 'household', n: 2 } },
  ],
  [
    { text: 'Uống từng ngụm nhỏ và nghỉ lấy lại sức trước khi quyết định', outcome: 'Bạn ngồi dựa tường, hơi thở dần đều lại. Cơ thể cần nghỉ hơn là một quyết định vội vàng.', stats: { stamina: 8, sanity: 2, thirst: -6 } },
    { text: 'Kiểm tra các lối ra vào của {shelter} và gia cố chốt cửa', outcome: 'Bạn thử từng chốt, từng bản lề và dùng đồ đạc nặng chèn bớt các điểm yếu. Căn cứ tạm vẫn mỏng manh nhưng ít nhất đã có một lớp bảo vệ.', stats: { stamina: -7, sanity: 3 } },
    { text: 'Ghi nhớ mọi âm thanh quanh {shelter} để biết đâu là an toàn', outcome: 'Bạn ngồi yên hơn một giờ, phân biệt tiếng gió, tiếng ống nước gỉ và tiếng lê bước thật sự. Những âm thanh bớt đáng sợ khi bạn đã đặt tên cho chúng.', stats: { sanity: 4, stamina: -2 } },
  ],
  [
    { text: 'Nhìn kỹ vết thương và thể trạng của bản thân, xử lý những gì có thể', outcome: 'Bạn kiểm tra từng vết xước, từng chỗ đau. Không có gì nghiêm trọng, nhưng bạn rửa và băng lại những chỗ trầy để tránh nhiễm trùng.', stats: { sanity: 2, stamina: -2 } },
    { text: 'Chuẩn bị chỗ ẩn nấp thứ hai phòng khi chỗ này bị phát hiện', outcome: 'Bạn chuẩn bị một góc kín với ít nước và đồ ăn, đủ để chạy đến khi cần. Có lối thoát thứ hai khiến bạn ngủ ngon hơn đêm nay.', stats: { stamina: -8, sanity: 3 } },
    { text: 'Tìm thứ gì đó ăn được trong {shelter} trước khi đói quá', outcome: 'Bạn lục từng góc bếp và ba lô, và tìm được vài thứ quý giá.', stats: { stamina: -3 }, roll: { table: 'household', n: 2 } },
  ],
  [
    { text: 'Ngồi yên, thử bình tĩnh lại và tự đánh giá tình hình', outcome: 'Bạn nhắm mắt, đếm thở. Mọi chuyện chưa sáng sủa hơn, nhưng đầu óc đã thôi nhảy loạn. Bạn bắt đầu thấy được những việc cần làm trước.', stats: { sanity: 5 } },
    { text: 'Tìm thứ có thể làm vũ khí hoặc chướng ngại quanh {shelter}', outcome: 'Bạn gom vài thanh sắt, dây thừng và cuộn băng keo, lắp thành vài chướng ngại thô sơ phía sau lối ra vào.', stats: { stamina: -6 }, roll: { table: 'hardware', n: 1 } },
    { text: 'Hé nhìn ra {near} để xem còn ai sống sót gần đây không', outcome: 'Bạn hé khe cửa nhìn rất nhanh rồi đóng lại. Không có ai, chỉ có dấu vết hỗn loạn và vài vết máu khô. Ít nhất bạn biết nơi này đang vắng.', stats: { sanity: -1, stamina: -2 } },
  ],
];

export const ROUTINE_SCENES: RoutineScene[] = [
  // ============ CHỖ TRÚ ============
  {
    id: 'r_inventory_check', zones: ['shelter'], primary: 'shelter',
    situation: () => 'Trong {shelter}, bạn nhận ra mình cần biết chắc mình đang có gì. Một cái đếm kỹ sẽ giúp bạn phân chia khẩu phần cho những ngày sắp tới.',
    choices: [
      { text: 'Phân loại thức ăn: món tươi ăn trước, đồ khô để dành', outcome: 'Bạn xếp đồ tươi ra phía trước để ăn sớm, đồ khô và đồ hộp xếp vào sâu trong ba lô. Bớt lãng phí là cách sống lâu nhất.', stats: { sanity: 3, stamina: -2 } },
      { text: 'Mài lại vũ khí và quấn lại cán bằng băng keo', outcome: 'Lưỡi vũ khí sắc hơn và cán cầm chắc tay hơn. Một việc nhỏ nhưng bạn thấy tự tin hơn khi nghĩ đến lần đối đầu tới.', stats: { stamina: -4, sanity: 3 } },
      { text: 'Lập kế hoạch khẩu phần cho cả tuần', outcome: 'Bạn tính từng bữa, từng ngụm nước. Con số không đẹp, nhưng có kế hoạch vẫn tốt hơn cứ ăn đến khi hết.', stats: { sanity: 2 } },
    ],
  },
  {
    id: 'r_food_cook', zones: ['shelter'], primary: 'shelter',
    need: (c) => c.hunger >= 68,
    situation: (c) => `Bụng bạn cồn cào, cơn đói khiến tay chân run rẩy. ${c.blackout ? 'Không còn điện, thực phẩm tươi đang thối rữa dần.' : 'Số thức ăn còn lại không nhiều, phải tính toán thật kỹ.'} Mùi thức ăn có thể thu hút bất cứ thứ gì ở gần.`,
    choices: [
      { text: 'Ăn ngay thứ ăn liền, không nhóm lửa để tránh phát mùi', outcome: 'Bạn xé gói, ăn nhanh trong bóng tối. Vị nhạt nhẽo nhưng dạ dày cuối cùng cũng yên. Không ai biết bạn ở đây.', stats: { stamina: 2 }, consumeFood: 'ready', foodMult: 1 },
      { text: 'Nhóm bếp dã chiến nấu một bữa nóng, che kín cửa bằng chăn dày', outcome: 'Hơi ấm và mùi thức ăn chín khiến bạn gần như bật khóc. Bạn ăn chậm để tận hưởng từng thìa. Cái giá là mùi khói bay nhẹ ra ngoài.', stats: { stamina: 8, sanity: 6 }, consumeFood: 'cook', foodMult: 1.3 },
      { text: 'Chia bớt khẩu phần, ăn một nửa để dành cho ngày mai', outcome: 'Bạn nén cơn đói, đóng gói phần còn lại thật kỹ. Bụng vẫn quặn đau nhưng ít nhất bạn còn dự trữ.', stats: { sanity: -2 }, consumeFood: 'any', foodMult: 0.5 },
    ],
  },
  {
    id: 'r_cook_big', zones: ['shelter'], primary: 'shelter',
    when: (c) => c.hasRawFood,
    need: (c) => c.hasRawFood && c.hunger >= 45,
    situation: () => 'Trong ba lô còn vài thứ cần nấu chín mới ăn được. Đốt bếp tốn nhiên liệu và có mùi, nhưng một nồi nóng đáng giá hơn nhiều bữa ăn sống.',
    choices: [
      { text: 'Nấu một nồi cháo hoặc cơm đặc, ăn thật no', outcome: 'Nồi nước sôi lục bục, hơi nóng tràn ra khiến bạn nhắm mắt thở dài. Bữa ăn nóng đầu tiên sau nhiều ngày làm cả người thấy khác.', stats: { stamina: 6, sanity: 5 }, consumeFood: 'cook', foodMult: 1.4 },
      { text: 'Luộc nhanh cho kịp, ăn xong dọn bếp ngay', outcome: 'Bạn luộc vội, ăn gần như đứng. Không ngon nhưng đủ chắc bụng, và bếp đã tắt trước khi mùi kịp bay xa.', stats: { stamina: -1 }, consumeFood: 'cook', foodMult: 1.1 },
      { text: 'Nấu canh loãng để tiết kiệm đồ ăn, chia ra uống nhiều lần', outcome: 'Một nồi canh loãng đủ giữ nhiệt trong người và đỡ khát. Ít no nhưng kéo dài đồ ăn thêm được một ngày.', stats: { sanity: 2, thirst: -4 }, consumeFood: 'cook', foodMult: 0.8 },
    ],
  },
  {
    id: 'r_rest_recover', zones: ['shelter'], primary: 'shelter',
    need: (c) => c.stamina < 28,
    situation: () => 'Đôi chân bạn nặng như chì, mắt mờ đi từng đợt và các khớp ngón tay run bần bật. Cơ thể đang đòi nghỉ, và nếu cố gượng thêm, một sai lầm nhỏ cũng có thể là cuối cùng.',
    choices: [
      { text: 'Ngủ vài tiếng trong góc kín được chèn cẩn thận', outcome: 'Bạn chìm vào giấc ngủ nặng nề, thỉnh thoảng giật mình vì những tiếng động quen thuộc. Khi tỉnh dậy, đầu óc sáng hơn nhiều.', stats: { stamina: 28, hunger: 4, sanity: 3 } },
      { text: 'Ngồi thiền, hít thở sâu và giữ tỉnh táo trong khi nghỉ ngơi', outcome: 'Bạn nhắm mắt, chầm chậm điều hòa nhịp thở. Không phải ngủ thật nhưng đầu óc dịu hẳn.', stats: { stamina: 16, sanity: 6 } },
      { text: 'Uống chút nước, ăn nhẹ và chợp mắt ngắn', outcome: 'Một bữa nhỏ cùng giấc ngủ ngắn giúp bạn gượng dậy. Chưa phục hồi hoàn toàn nhưng đủ để làm việc tiếp.', stats: { stamina: 18, thirst: -6 } },
    ],
  },
  {
    id: 'r_wound_care', zones: ['shelter'], primary: 'shelter',
    when: (c) => c.hasWound, need: (c) => c.hasWound,
    situation: () => 'Vết thương trên người bạn bắt đầu nóng rát, rìa da sưng đỏ và hơi rỉ dịch vàng. Nếu không xử lý kịp, nhiễm trùng sẽ lan nhanh hơn bất kỳ con zombie nào.',
    choices: [
      { text: 'Rửa sạch bằng nước đun sôi và băng bó bằng gạc vô trùng', outcome: 'Nước ấm chạm vào vết thương làm bạn nghiến răng. Bạn lau sạch mủ, băng gạc chặt tay. Cơn nóng rát dần dịu đi.', stats: { stamina: -4, sanity: 2 }, healWound: true, requires: [{ re: /băng|gạc|muối sinh lý|cồn/i, label: 'Băng gạc hoặc cồn sát trùng' }] },
      { text: 'Đổ cồn đỏ Povidone lên miệng vết thương rồi cắn răng chịu đựng', outcome: 'Cơn đau xé toạc như lửa đốt khiến bạn gập người. Nhưng mùi cồn nồng và vệt nâu i-ốt trên da khiến bạn yên tâm rằng vi khuẩn đã bị tiêu diệt.', stats: { stamina: -6, sanity: -2, infection: -8 }, healWound: true, requires: [{ re: /cồn|povidone/i, label: 'Cồn sát trùng' }] },
      { text: 'Tạm quấn vải sạch, chờ thêm chút nữa xem có đỡ không', outcome: 'Bạn quấn vải qua loa rồi tiếp tục công việc. Cơn nóng rát tăng dần theo từng giờ, nhưng bạn tự nhủ vẫn còn thời gian.', stats: { sanity: -3 } },
    ],
  },
  {
    id: 'r_fortify_door', zones: ['shelter'], primary: 'shelter',
    situation: (c) => `Lối ra vào của {shelter} đã lung lay, bản lề gỉ rên lên mỗi lần có gió. ${c.hasCompanion ? `${c.companionName} lo lắng nhìn vào khe cửa.` : 'Bạn tự hỏi nó sẽ chịu nổi được bao lâu nếu có bầy xô đến.'} Một chút gia cố bây giờ có thể cứu mạng sau này.`,
    choices: [
      { text: 'Tháo thanh sắt hoặc ván cứng quanh đó, đóng chéo nẹp ngang cửa', outcome: 'Bạn mất cả buổi bẻ cong thanh sắt, đóng nẹp ngang. Tay sưng đỏ nhưng khi đẩy thử, cánh cửa đã chắc hơn hẳn.', stats: { stamina: -14 }, roll: { table: 'hardware', n: 1 } },
      { text: 'Kéo đồ nặng ra chắn sau cửa và chèn vật nặng vào chân', outcome: 'Đồ đạc rít lên trên sàn, cả hai đứng im đợi phản ứng bên ngoài. Không có gì xảy ra. Rào chắn tạm bợ nhưng đủ để ngủ yên hơn tối nay.', stats: { stamina: -9, sanity: 2 } },
      { text: 'Buộc dây với vài vỏ lon rỗng làm chuông báo động trước cửa', outcome: 'Bạn căng sợi dây thấp ngang mắt cá, treo lon rỗng lủng lẳng. Không chắc ngăn được ai, nhưng ít nhất bạn sẽ nghe thấy trước khi chúng vào được.', stats: { stamina: -5, sanity: 3 } },
    ],
  },
  {
    id: 'r_companion_talk', zones: ['shelter'], primary: 'shelter',
    when: (c) => c.hasCompanion,
    situation: (c) => `${c.companionName} ngồi co ro ở góc phòng, mắt nhìn đăm đăm vào khoảng không. Lần đầu tiên sau nhiều giờ, người đó lên tiếng: "Anh nghĩ còn bao nhiêu người sống ngoài kia?" Một khoảnh khắc yên lặng hiếm hoi giữa tận thế.`,
    choices: [
      { text: 'Ngồi xuống bên cạnh, lắng nghe và chia sẻ chút đồ ăn', outcome: 'Hai người chia nhau chút đồ ăn, nói về những điều bình thường trước ngày tận thế. Không giải quyết được gì, nhưng cả hai đều thấy nhẹ lòng.', stats: { sanity: 8, stamina: 3, hunger: 3 } },
      { text: 'Phân công việc canh gác và kiểm kê đồ đạc để giữ cho đầu óc bận rộn', outcome: 'Công việc khiến cả hai không còn nghĩ ngợi, nhưng bầu không khí vẫn nặng trĩu.', stats: { stamina: -4, sanity: 1 } },
      { text: 'Nói thẳng rằng đừng hy vọng quá, hãy tập trung sống sót từng ngày', outcome: 'Câu nói thẳng khiến đối phương im lặng một lúc lâu, ánh mắt tối lại. Nhưng sau cùng họ gật đầu, nhận ra đó là sự thật.', stats: { sanity: -4 } },
    ],
  },
  {
    id: 'r_noise_wall', zones: ['shelter'], primary: 'shelter',
    situation: () => 'Giữa lúc im lặng, một tiếng đổ vỡ khô khốc vọng qua vách từ phía bên kia, rồi im bặt. Sau đó là một chuỗi tiếng gõ nhịp nhàng, như thể có thứ gì đang thử từng cánh cửa. Bạn nín thở, cả cơ thể căng cứng.',
    choices: [
      { text: 'Cầm vũ khí, hé cửa nhìn thử bằng mảnh gương nhỏ', outcome: 'Qua mặt gương, bạn thấy một con zombie đang loay hoay trước một chiếc tủ lạnh trống rỗng. Nó chưa phát hiện ra bạn. Bạn đóng cửa lại thật khẽ, mồ hôi lạnh nhỏ giọt xuống cằm.', stats: { sanity: -4, stamina: -3 } },
      { text: 'Giữ nguyên vị trí, tắt đèn và chờ tiếng động tự dứt', outcome: 'Bạn ngồi bất động suốt cả tiếng đồng hồ. Cuối cùng tiếng gõ nhỏ dần rồi tắt hẳn. Một đêm dài đến mức bạn không còn chắc mình đã tỉnh hay mơ.', stats: { sanity: -5, stamina: -2 } },
      { text: 'Gõ nhẹ vào vách phía bên kia để thử xem có người sống hay không', outcome: 'Tiếng gõ đáp lại không phải của người: một chuỗi cào cấu điên cuồng vào vách. Bạn lùi lại sâu vào góc và biết chắc bên kia không còn ai sống.', stats: { sanity: -5 } },
    ],
  },
  {
    id: 'r_night_watch', zones: ['shelter', 'roof'], primary: 'shelter',
    when: (c) => c.night || c.blackout,
    situation: (c) => `Bóng tối đặc quánh nuốt chửng mọi thứ, ${c.blackout ? 'không còn một ánh đèn nào trong toàn thành phố' : 'trăng bị mây che kín'}. Đêm là lúc lũ zombie hoạt động mạnh nhất, và bạn hoàn toàn mù nếu không có nguồn sáng.`,
    choices: [
      { text: 'Thay phiên canh gác, chỉ bật đèn vài giây khi thật cần thiết', outcome: 'Cả đêm bạn chập chờn giữa tỉnh và mơ, tai căng ra nghe mọi tiếng động. Pin đèn yếu dần nhưng bạn sống sót qua đêm mà không bị đột nhập.', stats: { stamina: -8, sanity: -3 } },
      { text: 'Ngủ sâu trong góc kín sau lớp chướng ngại để lấy lại sức', outcome: 'Bạn thiếp đi vì kiệt sức. Sáng ra bạn thấy vết cào mới trên cửa, may mà nó không vào được.', stats: { stamina: 15, sanity: -2 } },
      { text: 'Thắp ngọn nến nhỏ trong thùng kín để làm việc dưới ánh sáng yếu ớt', outcome: 'Ngọn nến trong thùng kim loại dày soi đủ cho bạn sắp xếp lại ba lô và mài lại vũ khí. Nhưng mùi sáp nến bay thoang thoảng khiến bạn thấp thỏm.', stats: { stamina: -4, sanity: 2 } },
    ],
  },
  {
    id: 'r_water_need', zones: ['shelter'], primary: 'shelter',
    when: (c) => c.setting.hasRoof, need: (c) => c.thirst >= 68 || (c.waterCut && c.thirst >= 58),
    situation: (c) => `${c.waterCut ? 'Vòi nước đã khô cạn từ lâu, chỉ còn tiếng rít của không khí.' : 'Bình nước trong ba lô gần như cạn sạch.'} Cổ họng bạn khô rát, môi nứt nẻ. Bạn cần quyết định đi đâu tìm nước, và mỗi lựa chọn đều có quãng đường riêng.`,
    choices: [
      { text: 'Lên {roof} tìm bồn chứa hoặc thùng hứng nước mưa', outcome: 'Bạn chuẩn bị xô chậu và vải lọc rồi bắt đầu đi lên.', stats: { stamina: -2 }, go: 'roof' },
      { text: 'Ra {near} lục các chỗ lân cận tìm chai nước còn sót', outcome: 'Bạn mang theo túi vải và ra ngoài tìm kiếm trong những chỗ gần nhất.', stats: { stamina: -2 }, go: 'near' },
      { text: 'Nhịn thêm, chỉ nhấp từng ngụm nhỏ cho đến khi tìm được nước', outcome: 'Bạn nhấp chút nước cuối cùng và tự nhủ phải kiên nhẫn. Cơn khát vẫn cào xé nhưng bạn giữ được sức.', stats: { sanity: -3 }, drink: true },
    ],
  },
  {
    id: 'r_water_need_nr', zones: ['shelter'], primary: 'shelter',
    when: (c) => !c.setting.hasRoof, need: (c) => c.thirst >= 68 || (c.waterCut && c.thirst >= 58),
    situation: (c) => `${c.waterCut ? 'Vòi nước đã khô cạn từ lâu.' : 'Bình nước trong ba lô gần như cạn sạch.'} Cổ họng bạn khô rát. Nước sạch giờ quý hơn bất kỳ viên đạn nào, và bạn phải rời {shelter} để tìm.`,
    choices: [
      { text: 'Ra {near} lục các chỗ lân cận tìm chai nước còn sót', outcome: 'Bạn mang theo túi vải và ra ngoài tìm kiếm trong những chỗ gần nhất.', stats: { stamina: -2 }, go: 'near' },
      { text: 'Đi thẳng ra {outside} tìm nguồn nước, chấp nhận quãng đường xa', outcome: 'Bạn thở sâu rồi mở đường ra ngoài, nhìn ngó từng góc.', stats: { stamina: -3 }, go: 'outside' },
      { text: 'Nhịn thêm, chỉ nhấp từng ngụm nhỏ cho đến khi tìm được nước', outcome: 'Bạn nhấp chút nước cuối cùng và tự nhủ phải kiên nhẫn.', stats: { sanity: -3 }, drink: true },
    ],
  },
  {
    id: 'r_decide_outing', zones: ['shelter'], primary: 'shelter', weight: 3,
    when: (c) => c.setting.hasRoof,
    situation: () => 'Trong {shelter}, đồ đạc chỉ đủ cầm cự một lúc. Bạn cân nhắc xem nên ra ngoài tìm vật tư hay ở lại giữ sức; mỗi hướng đi đều có cái giá riêng.',
    choices: [
      { text: 'Ra {near} thăm dò xung quanh gần chỗ trú', outcome: 'Bạn rút chốt rất khẽ và hé người nhìn ra.', stats: { stamina: -1 }, go: 'near' },
      { text: 'Lên {roof} quan sát toàn cảnh và tìm nguồn nước', outcome: 'Bạn mang theo ống nhòm tự chế và đi lên.', stats: { stamina: -2 }, go: 'roof' },
      { text: 'Xuống {outside} tìm vật tư dù phải đi một quãng dài', outcome: 'Bạn đóng gói gọn gàng và quyết định đi xa.', stats: { stamina: -3 }, go: 'outside' },
    ],
  },
  {
    id: 'r_decide_outing_nr', zones: ['shelter'], primary: 'shelter', weight: 3,
    when: (c) => !c.setting.hasRoof,
    situation: () => 'Trong {shelter}, đồ đạc chỉ đủ cầm cự một lúc. Bạn cân nhắc xem nên ra ngoài tìm vật tư hay ở lại giữ sức; mỗi hướng đi đều có cái giá riêng.',
    choices: [
      { text: 'Ra {near} thăm dò xung quanh gần chỗ trú', outcome: 'Bạn mở lối ra thật khẽ và hé người nhìn ra.', stats: { stamina: -1 }, go: 'near' },
      { text: 'Đi thẳng ra {outside} tìm vật tư dù phải đi một quãng xa', outcome: 'Bạn đóng gói gọn gàng và quyết định đi xa.', stats: { stamina: -3 }, go: 'outside' },
      { text: 'Ở lại, tận dụng thời gian dọn dẹp và tiết kiệm sức', outcome: 'Bạn dọn gọn chỗ nằm, xếp lại đồ đạc và nghỉ ngơi. Một ngày yên tĩnh là món quà hiếm hoi.', stats: { stamina: 6, sanity: 3 } },
    ],
  },

  // ============ XUNG QUANH ============
  {
    id: 'r_scavenge_neighbor', zones: ['near'], primary: 'near',
    situation: () => 'Ở {near}, {neighbor} vẫn còn khép hờ. Bên trong thoang thoảng mùi ẩm mốc và vài vệt máu khô. Có thể trước đây từng có người sống ở đây, và biết đâu họ để lại chút đồ ăn.',
    choices: [
      { text: 'Lục nhanh các ngăn kéo bếp rồi rút lui trong im lặng', outcome: 'Bạn lách vào, kéo từng ngăn tủ không một tiếng động và vơ vài thứ còn dùng được, rồi lùi ra mà không khuấy động ai.', stats: { stamina: -3 }, roll: [{ table: 'household', n: 2 }, { table: 'domestic', n: 1, chance: 0.6 }] },
      { text: 'Dùng xà beng hoặc vật cứng cạy tủ khóa dù tạo tiếng động lớn', outcome: 'Tiếng kim loại ken két vang lên chói tai khiến tim bạn thót lại. Cánh tủ bật tung, bạn lôi ra được khá nhiều thứ, nhưng tiếng ồn chắc chắn đã vọng khắp nơi.', stats: { stamina: -8, sanity: -4 }, roll: [{ table: 'household', n: 3 }, { table: 'tools', n: 1, chance: 0.7 }, { table: 'clothing', n: 1, chance: 0.35 }] },
      { text: 'Áp tai vào cánh cửa nghe ngóng, không bước vào', outcome: 'Bạn nín thở nghe một lúc lâu. Có tiếng kéo lê rất khẽ ở phòng trong, lúc có lúc không. Bạn không đánh cược, rút về và đánh dấu nơi này là nguy hiểm.', stats: { sanity: -1, stamina: -1 } },
    ],
  },
  {
    id: 'r_check_exits', zones: ['near'], primary: 'near',
    situation: () => 'Ở {near}, bạn thử nhìn kỹ các lối đi: chỗ nào chắn được, chỗ nào là điểm yếu của bạn nếu bầy zombie kéo tới. Hiểu rõ địa hình là cách sống sót rẻ nhất.',
    choices: [
      { text: 'Chặn bớt những lối đi phụ bằng đồ đạc và dây', outcome: 'Bạn mất cả buổi dựng rào chắn tạm. Mỗi lối chặn được là một hướng ít phải lo hơn.', stats: { stamina: -9, sanity: 2 } },
      { text: 'Vẽ sơ đồ các lối đi và chỗ nấp ra mặt sau tờ giấy cũ', outcome: 'Bạn vẽ nguệch ngoạc nhưng đủ rõ: đâu là chỗ nấp, đâu là đường chạy. Bản đồ nhỏ này sẽ có ích khi hoảng loạn.', stats: { sanity: 3, stamina: -2 } },
      { text: 'Đặt vài vật gây tiếng động dọc lối đi làm báo động sớm', outcome: 'Vỏ lon, mảnh kính vỡ và dây mảnh được căng dọc lối đi. Không giết được ai nhưng đủ để bạn kịp phản ứng.', stats: { stamina: -5, sanity: 3 } },
    ],
  },
  {
    id: 'r_first_aid_box', zones: ['near'], primary: 'near',
    situation: () => 'Trên tường ở {near} còn treo một hộp cứu thương trắng, nắp bật hé và nhãn đỏ đã bạc màu. Có thể đã bị lục, nhưng những thứ nhỏ thường bị bỏ sót.',
    choices: [
      { text: 'Mở hộp, lấy những thứ còn nguyên vẹn rồi đóng lại', outcome: 'Bạn lấy những gói còn kín và để lại phần đã hỏng. Gọn gàng và nhanh chóng.', stats: { stamina: -2 }, roll: { table: 'pharmacy', n: 2 } },
      { text: 'Gỡ cả hộp xuống mang về, lục kỹ từng ngăn', outcome: 'Bạn gỡ cả chiếc hộp khỏi tường, tiếng vít rơi lách cách. Bạn lục kỹ từng ngăn và tìm được khá nhiều thứ.', stats: { stamina: -5, sanity: -2 }, roll: { table: 'pharmacy', n: 3 } },
      { text: 'Để nguyên đó, quá nhiều khả năng đã bị tẩm máu nhiễm bệnh', outcome: 'Bạn bỏ qua, nhìn kỹ vệt máu quanh hộp. Thận trọng đôi khi cứu mạng hơn mạo hiểm.', stats: { sanity: 1 } },
    ],
  },
  {
    id: 'r_scout_vantage', zones: ['near', 'outside'], primary: 'near',
    situation: (c) => `Từ chỗ nấp, bạn quan sát cảnh vật quanh ${c.zone === 'near' ? '{near}' : '{outside}'}. Có vài bóng người lảo đảo đi lại không mục đích. ${c.weather === 'dense_fog' ? 'Sương dày khiến bạn khó đếm số lượng chính xác.' : 'Bạn đủ tầm nhìn để quan sát từng góc.'}`,
    choices: [
      { text: 'Ghi chép vị trí từng nhóm zombie để vạch lộ trình tránh né', outcome: 'Bạn mất hơn một giờ ngồi sau chỗ nấp, vẽ sơ đồ nguệch ngoạc. Giờ bạn biết con đường nào còn tương đối yên tĩnh vào những giờ nhất định.', stats: { sanity: 2, stamina: -3 } },
      { text: 'Lẻn đến chiếc xe hoặc kệ đổ gần nhất, lục tìm đồ dùng', outcome: 'Bạn bò sát mặt đất, mở cốp xe và vơ lấy vài thứ rồi chuồn nhanh trước khi tiếng động thu hút ai.', stats: { stamina: -10, sanity: -3 }, roll: { table: 'vehicle', n: 2 } },
      { text: 'Ném viên đá sang chỗ xa để thử phản ứng của lũ zombie', outcome: 'Viên đá vỡ choang xuống nền gạch. Cả bầy nhỏ lập tức quay đầu rồi lục tục kéo đến. Bạn học được chúng phản ứng với âm thanh nhanh đến mức nào.', stats: { sanity: 1, stamina: -2 } },
    ],
  },
  {
    id: 'r_return_shelter', zones: ['near'], primary: 'near', weight: 2,
    situation: () => 'Bạn đã ở ngoài {shelter} khá lâu. Tiếng động ở {near} nhiều hơn một chút, và bạn bắt đầu nhận ra mình đã đi quá xa khỏi chỗ an toàn.',
    choices: [
      { text: 'Quay về ngay, khóa cửa và nghỉ ngơi', outcome: 'Bạn rút lui không chần chừ.', stats: { stamina: -1 }, go: 'shelter' },
      { text: 'Tranh thủ kiểm tra thêm một chỗ gần đây rồi mới về', outcome: 'Bạn nán lại thêm một chút, tìm thêm được một thứ nhỏ trước khi quyết định về.', stats: { stamina: -4 }, roll: { table: 'household', n: 1 }, go: 'shelter' },
      { text: 'Ở lại thêm, thử nghe ngóng xem có ai tiếp cận không', outcome: 'Bạn nấp sau cửa, quan sát thêm vài phút. Không có gì xảy ra, nhưng bạn thấy mình căng thẳng hơn.', stats: { sanity: -2, stamina: -2 } },
    ],
  },

  // ============ NGOÀI ĐƯỜNG ============
  {
    id: 'r_vehicle_wreck', zones: ['outside'], primary: 'outside',
    when: (c) => c.weather !== 'heavy_rain',
    situation: () => 'Một chiếc xe nằm chổng ngược ở {outside}, kính vỡ nát, mùi xăng nồng nặc. Thi thể nằm gục sau tay lái đã khô quắt. Trong cốp có thể còn chút gì hữu ích, nhưng mùi xăng sẽ thu hút những kẻ nhạy mùi.',
    choices: [
      { text: 'Rút xăng từ bình nhiên liệu bằng ống nhựa vào can', outcome: 'Bạn ngậm ống nhựa hút mồi, cố không nuốt phải. Xăng chảy chậm vào can, nhưng cuối cùng bạn có được thứ nhiên liệu quý.', stats: { stamina: -9, sanity: -2 }, gain: [{ id: 'sc_gasoline', name: 'Can xăng mini 5 lít', category: 'material', quantity: 1, description: 'Xăng đặc chế tạo chai cháy hoặc chạy máy phát.', rarity: 'rare' }] },
      { text: 'Cạy cốp xe, lục tìm đồ dùng cá nhân của chủ xe', outcome: 'Cốp xe bật tung với tiếng rít. Bạn lục tìm kỹ và vơ hết những thứ còn dùng được, rồi rời đi.', stats: { stamina: -7, sanity: -3 }, roll: { table: 'vehicle', n: 3 } },
      { text: 'Đi vòng qua, không đụng vào xe vì mùi xăng quá nồng', outcome: 'Bạn đi vòng hẳn sang bên kia, giữ khoảng cách. Thận trọng, nhưng bỏ lỡ cơ hội.', stats: { sanity: 1 } },
    ],
  },
  {
    id: 'r_pharmacy_trip', zones: ['outside'], primary: 'outside',
    situation: () => 'Ở góc đường gần {outside}, một quầy thuốc nhỏ với biển hiệu đổ nghiêng vẫn còn nguyên cửa cuốn bị kéo xuống một nửa. Có thể ai đó đã vơ vét sạch, nhưng những hộc tủ cuối quầy thường bị bỏ sót.',
    choices: [
      { text: 'Chui qua khe cửa cuốn, lục tủ dưới quầy rất khẽ', outcome: 'Bạn chui qua khe hẹp, bò sát nền gạch đầy bụi, nhét hết vào ba lô rồi thoát ra không kinh động ai.', stats: { stamina: -9, sanity: -2 }, roll: { table: 'pharmacy', n: 2 } },
      { text: 'Đẩy cửa cuốn lên hẳn để quan sát rõ, lục kỹ cả quầy', outcome: 'Cánh cửa rít lên lớn đến nỗi bạn rùng mình. Bạn tìm được nhiều thứ, nhưng một bóng đen ở cuối đường đã ngẩng đầu nhìn về phía này.', stats: { stamina: -12, sanity: -5 }, roll: { table: 'pharmacy', n: 4 } },
      { text: 'Không vào, canh chừng từ xa xem có ai ra vào không', outcome: 'Bạn ngồi sau chiếc xe bỏ hoang quan sát hơn nửa tiếng. Không có động tĩnh, và cũng không có manh mối. Bạn quay về tay không.', stats: { sanity: 1, stamina: -2 } },
    ],
  },
  {
    id: 'r_market_stalls', zones: ['outside'], primary: 'outside',
    when: (c) => c.weather !== 'heavy_rain',
    situation: () => 'Một dãy sạp chợ bỏ hoang trải dài ở {outside}, mùi cá ươn và rau úng bốc lên nồng nặc. Phần lớn đã bị lục, nhưng ở góc khuất vẫn còn những thùng xốp và gùi tre chưa ai chạm tới.',
    choices: [
      { text: 'Chọn lấy rau củ và trái cây còn dùng được, bỏ phần đã thối', outcome: 'Bạn phải lọc từng món, ngửi và bóp thử. Mất công nhưng bạn có được những thứ tươi để ăn sớm.', stats: { stamina: -6 }, roll: { table: 'market', n: 3 } },
      { text: 'Lục kỹ những thùng xốp bị phủ bạt ở góc chợ', outcome: 'Dưới lớp bạt nặng mùi ẩm là những thứ khô ráo hơn. Bạn kéo từng thùng ra ngoài, tay trầy xước.', stats: { stamina: -9, sanity: -2 }, roll: { table: 'market', n: 4 } },
      { text: 'Quan sát một lúc xem có thứ gì đang lang thang trong chợ không', outcome: 'Có tiếng kéo lê dưới gầm sạp. Bạn lùi lại, không dám vào, rút ra bài học quan trọng về cái mùi đang thu hút lũ quái ở đây.', stats: { sanity: -1, stamina: -2 } },
    ],
  },
  {
    id: 'r_forage_greens', zones: ['outside'], primary: 'outside',
    when: (c) => c.weather !== 'heavy_rain',
    situation: () => 'Ở {outside}, một mảnh vườn bị bỏ hoang vẫn còn xanh: cây cối mọc um tùm, rau dại bò lan trên các bờ rào. Thiên nhiên không chờ ai, và có thể là bữa ăn tươi duy nhất bạn gặp trong nhiều ngày.',
    choices: [
      { text: 'Hái rau dại và trái cây chín bằng tay, nhìn thật kỹ từng loại', outcome: 'Bạn chỉ hái những gì chắc chắn nhận ra và loại bỏ mọi thứ lạ. Không nhiều, nhưng sạch và tươi.', stats: { stamina: -6, sanity: 2 }, roll: { table: 'forage', n: 3 } },
      { text: 'Đào bới cả luống, tìm củ và quả giấu dưới đất', outcome: 'Bạn đào đến mỏi tay, nhặt được vài củ chắc. Cực nhưng đáng, và bùn đất bám đầy quần áo.', stats: { stamina: -11 }, roll: { table: 'forage', n: 4 } },
      { text: 'Chỉ nhìn từ xa, không đụng vào vì sợ nấm độc hoặc cây có mùi lạ', outcome: 'Bạn lắc đầu bỏ đi. Một món ăn lạ trong cơn đói có thể làm bạn gục bất cứ lúc nào.', stats: { sanity: 1 } },
    ],
  },
  {
    id: 'r_fishing_pond', zones: ['outside'], primary: 'outside', only: ['apartment_survivors', 'clinic_containment'],
    when: (c) => c.weather !== 'heavy_rain' && c.weather !== 'freezing_cold',
    situation: () => 'Qua một dãy nhà đổ sụp ở {outside}, có một cái ao bỏ hoang phủ lục bình, mặt nước loang loáng. Đã lâu không ai đụng tới, biết đâu vẫn còn cá, tôm, ốc.',
    choices: [
      { text: 'Câu cá bằng dây và lưỡi tự chế, ngồi kiên nhẫn từ từ', outcome: 'Bạn ngồi yên hàng giờ, mắt dán vào phao. Cuối cùng vài con cá cũng cắn câu. Tĩnh lặng, nhưng phải nấu chín mới ăn được.', stats: { stamina: -4, sanity: 4 }, roll: { table: 'pond', n: 2 } },
      { text: 'Lội xuống mép ao dùng vợt cầm tay bắt tôm ốc', outcome: 'Nước lạnh đến tận gối, bùn nhão níu chân. Bạn bắt được khá nhiều, nhưng ướt sũng và lạnh run.', stats: { stamina: -10, sanity: -1 }, roll: { table: 'pond', n: 3 } },
      { text: 'Chỉ lấy nước ao đã lắng ở rìa để đun sôi dùng', outcome: 'Bạn múc nước ở chỗ trong nhất, lọc qua vải. Nước vẫn phải đun sôi mới uống được.', stats: { stamina: -4 }, roll: { table: 'water_raw', n: 2 } },
    ],
  },
  {
    id: 'r_hardware_shop', zones: ['outside'], primary: 'outside',
    situation: () => 'Một tiệm kim khí nhỏ ở {outside} với cánh cửa sắt kéo hé. Bên trong ngổn ngang ốc vít, dây thừng, đồ nghề rỉ sét. Những thứ này không ăn được nhưng có thể cứu mạng khi gia cố chỗ trú.',
    choices: [
      { text: 'Gom nhanh những thứ nhỏ gọn, dễ mang rồi đi', outcome: 'Bạn nhét vào ba lô những món dễ mang và rời đi trong vài phút.', stats: { stamina: -5 }, roll: { table: 'hardware', n: 2 } },
      { text: 'Lục kỹ cả kho, tìm dụng cụ nặng và nhiên liệu', outcome: 'Bạn lục từng kệ, kéo những thùng nặng ra. Tốn sức và ồn, nhưng cái bạn mang về xứng đáng.', stats: { stamina: -12, sanity: -2 }, roll: [{ table: 'hardware', n: 3 }, { table: 'weapons', n: 1, chance: 0.6 }, { table: 'tools', n: 1, chance: 0.5 }] },
      { text: 'Thử mở két sắt nhỏ ở góc quầy', outcome: 'Bạn mò mẫm với một thanh sắt, két mở ra sau nhiều lần cạy. Bên trong chỉ có giấy tờ và vài đồng xu, nhưng bạn cũng tìm thấy một thứ hữu ích bị cất kỹ.', stats: { stamina: -8, sanity: -1 }, roll: { table: 'hardware', n: 1 } },
    ],
  },
  {
    id: 'r_warehouse_raid', zones: ['outside'], primary: 'outside', weight: 1,
    when: (c) => c.day >= 3,
    situation: () => 'Phía sau một dãy nhà ở {outside}, có một kho hàng cửa cuốn bị móp một góc. Bên trong tối đen, nhưng nếu còn đồ thì đây là thứ đáng giá nhất bạn tìm thấy hôm nay. Có điều mùi lạ từ trong kho khiến bạn chùng chân.',
    choices: [
      { text: 'Luồn vào qua góc cửa bị móp, mò mẫm từng kệ hàng', outcome: 'Bạn bò vào trong bóng tối, tay mò lên các kệ hàng. Kho còn khá nhiều, bạn xếp được cả đầy ba lô trước khi rút ra.', stats: { stamina: -12, sanity: -4 }, roll: [{ table: 'warehouse', n: 3 }, { table: 'camping', n: 1, chance: 0.5 }, { table: 'weapons', n: 1, chance: 0.25 }] },
      { text: 'Ném một vật vào kho xem có gì phản ứng không rồi mới vào', outcome: 'Tiếng vật rơi vang khô khốc. Không có gì đáp lại, nên bạn vào nhanh gọn, lấy vừa đủ và thoát ra.', stats: { stamina: -9, sanity: -1 }, roll: { table: 'warehouse', n: 3 } },
      { text: 'Bỏ qua, nơi tối đen có mùi lạ như vậy không đáng mạo hiểm', outcome: 'Bạn quay đi. Quyết định thận trọng, và bạn vẫn không biết bên trong có gì.', stats: { sanity: 1 } },
    ],
  },
  {
    id: 'r_return_home', zones: ['outside'], primary: 'outside', weight: 2,
    situation: () => 'Bạn đã đi khá lâu ở {outside}, thể lực hao dần và trời không còn sáng như lúc ra đi. Quãng đường quay về cũng dài, và càng chậm trễ thì càng nguy hiểm.',
    choices: [
      { text: 'Quay về thẳng đường cũ, không ghé đâu nữa', outcome: 'Bạn bước đều, mắt dán xuống đất, không dừng lại cho đến khi về tới nơi.', stats: { stamina: -2 }, go: 'shelter' },
      { text: 'Đi vòng đường khác để tránh những chỗ đã thấy zombie', outcome: 'Quãng đường dài hơn nhưng vắng hơn. Trên đường về, bạn tìm được một thứ nhỏ.', stats: { stamina: -6 }, roll: { table: 'household', n: 1 }, go: 'shelter' },
      { text: 'Nán lại nghỉ chân sau một chiếc xe, uống chút nước rồi hãy đi', outcome: 'Bạn nấp sau chiếc xe bỏ hoang, thở dốc và nhấp từng ngụm nước. Không có chuyện gì xảy ra, nhưng thời gian trôi nhanh hơn bạn nghĩ.', stats: { stamina: 6, sanity: -1 }, drink: true },
    ],
  },

  // ============ SÂN THƯỢNG / MÁI ============
  {
    id: 'r_rooftop_view', zones: ['roof'], primary: 'roof',
    when: (c) => c.weather !== 'heavy_rain',
    situation: (c) => `Ở {roof}, gió thổi phần phật qua những chiếc ăng-ten gãy. Từ đây có thể thấy gần như toàn bộ khu vực. ${c.baseType === 'Military Base' ? 'Mấy chiếc hộp nhựa vứt vương vãi chứng tỏ binh lính từng đóng ở đây.' : ''}`,
    choices: [
      { text: 'Dùng ống nhòm hoặc đôi mắt quét khắp khu vực tìm dấu hiệu sự sống', outcome: 'Sau nhiều phút, bạn thấy một tia sáng chớp qua tấm gương phản chiếu ở nơi xa tít. Có người khác còn sống ở đó, nhưng quá xa để biết là bạn hay thù.', stats: { sanity: 3, stamina: -3 } },
      { text: 'Lục soát những góc kỹ thuật và kho nhỏ quanh đây', outcome: 'Phòng kỹ thuật chứa vài cuộn dây, bình ắc quy cũ và hộp dụng cụ rỉ sét. Bạn chọn những thứ còn dùng được rồi quay xuống.', stats: { stamina: -7 }, roll: { table: 'hardware', n: 2 } },
      { text: 'Ngồi nghỉ một lúc ở chỗ khuất gió, tận hưởng chút yên lặng', outcome: 'Bạn dựa lưng vào bức tường thấp, ngắm bầu trời xám và quên đi trong vài phút rằng thế giới đã thay đổi.', stats: { stamina: 6, sanity: 4 } },
    ],
  },
  {
    id: 'r_roof_water', zones: ['roof'], primary: 'roof',
    need: (c) => c.thirst >= 50,
    situation: () => 'Ở {roof}, mấy chiếc thùng nhựa và bồn chứa đặt ngổn ngang. Một phần trong đó đọng nước mưa, đục và có xác lá khô nổi lềnh bềnh. Không uống được ngay, nhưng đun sôi hoặc lọc thì cứu được cơn khát.',
    choices: [
      { text: 'Lọc nước qua nhiều lớp vải và hứng vào bình sạch', outcome: 'Bạn lọc đi lọc lại cho đến khi nước bớt đục. Vẫn cần đun sôi trước khi uống, nhưng chí ít đã có thứ để uống.', stats: { stamina: -6 }, roll: { table: 'water_raw', n: 2 } },
      { text: 'Căng tấm bạt hứng thêm nước sương và nước mưa', outcome: 'Bạn chờ đợi nhiều giờ, từng giọt nước nhỏ vào xô. Chậm chạp, nhưng an toàn và không tốn mồ hôi.', stats: { stamina: -3, sanity: 2 }, roll: { table: 'water_raw', n: 1 } },
      { text: 'Nhìn kỹ từng bồn xem có chỗ nào sạch hơn, chỉ lấy ở đó', outcome: 'Bạn mất thời gian soi từng bồn và chỉ lấy ở những chỗ trong nhất. Ít hơn nhưng sạch hơn.', stats: { stamina: -5 }, roll: { table: 'water_raw', n: 2 } },
    ],
  },
  {
    id: 'r_roof_garden', zones: ['roof'], primary: 'roof', only: ['apartment_survivors'],
    when: (c) => c.weather !== 'heavy_rain' && c.weather !== 'freezing_cold',
    situation: () => 'Một góc {roof} có những chậu và thùng xốp trồng rau của ai đó: ớt, cà chua, vài giàn mướp leo lên lưới thép. Chủ nhân đã không còn, nhưng cây vẫn sống, và bạn có thể là người cuối cùng còn nhớ tới chúng.',
    choices: [
      { text: 'Hái những quả đã chín và để lại phần non cho lần sau', outcome: 'Bạn chỉ hái những quả đã chín, tưới chút nước cho phần còn lại. Một khu vườn nhỏ đáng được chăm sóc.', stats: { stamina: -4, sanity: 3 }, roll: { table: 'garden', n: 3 } },
      { text: 'Hái tất cả những gì ăn được, mang hết về', outcome: 'Bạn vơ sạch những gì có thể. Bữa ăn thịnh soạn hôm nay, nhưng những chậu rau trơ trụi sẽ không cho gì nữa.', stats: { stamina: -6 }, roll: { table: 'garden', n: 5 } },
      { text: 'Tưới nước và dọn cỏ cho cây, để vườn tiếp tục sống', outcome: 'Bạn dành thời gian dọn cỏ, tưới chút nước. Không thu được gì ngay, nhưng bạn thấy nhẹ lòng khi chăm sóc một thứ đang sống.', stats: { stamina: -5, sanity: 6, thirst: 3 } },
    ],
  },
  {
    id: 'r_roof_return', zones: ['roof'], primary: 'roof', weight: 2,
    situation: () => 'Gió ở {roof} mỗi lúc một mạnh, và bạn đã ở đây khá lâu. Đã đến lúc quyết định xuống lại hay ở thêm.',
    choices: [
      { text: 'Xuống lại {shelter} ngay, khóa cửa và nghỉ ngơi', outcome: 'Bạn thu dọn đồ rồi đi xuống.', stats: { stamina: -2 }, go: 'shelter' },
      { text: 'Xuống {near} tìm thêm vật dụng trước khi về', outcome: 'Bạn xuống nửa chừng để lục thêm.', stats: { stamina: -3 }, go: 'near' },
      { text: 'Ở thêm một lúc, quan sát thêm khu vực', outcome: 'Bạn ngồi thêm một lúc, đếm số lượng zombie đi qua và ghi nhớ nhịp di chuyển của chúng.', stats: { sanity: 1, stamina: -2 } },
    ],
  },
  {
    id: 'r_sports_shop', zones: ['outside'], primary: 'outside',
    when: (c) => c.day >= 2,
    situation: () => 'Một cửa hàng đồ thể thao ở {outside} bị phá cửa kính, hàng hóa vương vãi. Quần vợt, gậy bóng chày, găng tay đấm bốc: những món người ta bỏ lại vì chẳng ăn được. Nhưng với bạn, thứ gì đập được và chịu được va chạm đều là vàng.',
    choices: [
      { text: 'Chọn vài món vũ khí chắc tay ở quầy bóng chày và võ thuật', outcome: 'Bạn thử từng món, cân nhắc độ nặng và độ bền, chọn những cái vừa tay.', stats: { stamina: -7 }, roll: [{ table: 'weapons', n: 2 }] },
      { text: 'Lục kho phía sau tìm đồ bảo hộ và dụng cụ cắm trại', outcome: 'Kho sau tối và bụi nhưng chất đầy hàng chưa mở thùng. Bạn xé từng thùng carton, tìm được nhiều thứ.', stats: { stamina: -9, sanity: -2 }, roll: [{ table: 'clothing', n: 2 }, { table: 'camping', n: 2 }] },
      { text: 'Đứng ngoài canh chừng, chỉ vào lấy món nhỏ nhất rồi đi', outcome: 'Bạn thận trọng, vào nhanh ra nhanh với một món gọn trong tay.', stats: { stamina: -3 }, roll: [{ table: 'weapons', n: 1, chance: 0.6 }] },
    ],
  },
  {
    id: 'r_clothing_shop', zones: ['outside'], primary: 'outside',
    situation: () => 'Một cửa hàng quần áo ở {outside} còn nguyên mấy giá treo áo dày, mũ, giày. Giữa tận thế, quần áo không chỉ là thời trang: lớp vải dày có thể là khác biệt giữa vết cào và vết cắn xuyên da.',
    choices: [
      { text: 'Chọn áo khoác, mũ và găng dày để tăng khả năng chống cắn', outcome: 'Bạn thử từng món, kéo khóa, bẻ vai, nhấc tay xem có cử động tự do không. Chọn những thứ vừa vặn nhất.', stats: { stamina: -6 }, roll: [{ table: 'clothing', n: 3 }] },
      { text: 'Lục quầy tạp hóa nhỏ bên trong tìm đồ dùng hàng ngày', outcome: 'Bạn vơ những thứ nhỏ nhưng thiết thực: khăn, xà phòng, đồ vệ sinh.', stats: { stamina: -5 }, roll: [{ table: 'domestic', n: 2 }, { table: 'tools', n: 1 }] },
      { text: 'Xem xét cẩn thận từng món để tránh đồ dính máu nhiễm bệnh', outcome: 'Bạn lật từng chiếc áo, ngửi mùi, nhìn vết ố. Mất công nhưng bạn tránh được đồ bẩn.', stats: { stamina: -7, sanity: 2 }, roll: [{ table: 'clothing', n: 2 }] },
    ],
  },
  {
    id: 'r_appliance_corner', zones: ['outside', 'near'], primary: 'outside',
    when: (c) => !c.blackout || c.day < 12,
    situation: () => 'Ở gần {outside}, một cửa hàng điện máy nhỏ vẫn còn vài tủ kính nguyên vẹn. Không còn điện, nhưng pin, đèn pin, radio và dụng cụ cầm tay vẫn có giá trị lớn khi trời tối.',
    choices: [
      { text: 'Tìm đồ chạy bằng pin: đèn, radio, sạc dự phòng', outcome: 'Bạn mở từng ngăn kéo, thử từng món. Một vài thứ còn chạy tốt.', stats: { stamina: -6 }, roll: [{ table: 'electronics', n: 2 }, { table: 'tools', n: 1, chance: 0.6 }] },
      { text: 'Lục khu bảo hành tìm dụng cụ sửa chữa và dây điện', outcome: 'Hộc tủ chứa đầy kìm, tua vít, dây điện. Không hào nhoáng nhưng cực kỳ hữu dụng.', stats: { stamina: -7 }, roll: [{ table: 'tools', n: 2 }, { table: 'hardware', n: 1, chance: 0.6 }] },
      { text: 'Tháo vài món nhỏ giá trị cao rồi đi, tránh gây tiếng động', outcome: 'Bạn chọn đúng những thứ cần, mang gọn trong ba lô rồi rút lui trong im lặng.', stats: { stamina: -3 }, roll: [{ table: 'electronics', n: 1 }] },
    ],
  },
  {
    id: 'r_kitchen_drawers', zones: ['shelter', 'near'], primary: 'near', weight: 1,
    situation: () => 'Bạn chợt nhớ ở {near} còn khu bếp chung bị bỏ ngỏ. Ngăn tủ, hộc bếp, tủ bát: không ai nghĩ sẽ có gì quý ở đó, nhưng những thứ thiết thực thường nằm ở những nơi ít ai để mắt.',
    choices: [
      { text: 'Lục tủ bát và ngăn kéo bếp, tìm dụng cụ nấu và gia vị', outcome: 'Bạn nhấc từng chiếc nồi, mở từng hũ gia vị. Có những thứ làm bữa ăn đỡ nhạt hơn rất nhiều.', stats: { stamina: -4 }, roll: [{ table: 'household', n: 2 }, { table: 'tools', n: 1, chance: 0.5 }] },
      { text: 'Kiểm tra tủ lạnh và tủ đông xem còn gì ăn được không', outcome: 'Mùi xộc lên khiến bạn nhăn mặt. Vài thứ còn có thể cứu được nếu nấu thật kỹ.', stats: { stamina: -3, sanity: -3 }, roll: [{ table: 'fridge', n: 2 }] },
      { text: 'Tìm thứ không phải đồ ăn: đồ vệ sinh, đồ dùng gia đình', outcome: 'Những thứ bình thường như xà phòng, chăn, sách bỗng trở nên quý giá.', stats: { stamina: -4, sanity: 2 }, roll: [{ table: 'domestic', n: 3 }] },
    ],
  },
  // ============ HẬU QUẢ LÂU DÀI CỦA QUYẾT ĐỊNH ============
  {
    id: 'r_haunted', zones: ['shelter'], primary: 'shelter', weight: 4,
    when: (c) => c.flags.includes('abandoned_stranger') || c.flags.includes('abandoned_survivor') || c.flags.includes('bunker13_abandoned_looter') || c.flags.includes('abandoned_nhauyen_rich_loot'),
    situation: () => 'Trong bóng tối của {shelter}, bạn lại nghe thấy tiếng cầu cứu ngày hôm ấy. Có thể chỉ là tưởng tượng, nhưng nó đến đều đặn mỗi khi bạn nhắm mắt. Sự im lặng của bạn năm ấy giờ trở thành một thứ nặng nề không ngủ được.',
    choices: [
      { text: 'Cố gắng gạt đi và ép bản thân ngủ', outcome: 'Bạn trùm chăn kín đầu, đếm nhịp thở. Giấc ngủ đến chập chờn và đầy ác mộng, bạn tỉnh dậy mệt hơn lúc đi ngủ.', stats: { sanity: -5, stamina: 4 } },
      { text: 'Viết lại mọi chuyện ra giấy, kể cả những điều bạn không dám nói', outcome: 'Bạn viết đến khi tay mỏi. Không ai đọc, nhưng khi đặt bút xuống bạn thấy nhẹ đi đôi chút.', stats: { sanity: 3, stamina: -3 } },
      { text: 'Tự hứa sẽ không bao giờ quay lưng với người cần giúp nữa', outcome: 'Lời hứa thốt ra giữa căn phòng tối, nghe lạ lùng nhưng thật. Bạn biết mình vừa chọn một con đường khó hơn, và cũng nhẹ lòng hơn.', stats: { sanity: 6 }, flagsRemove: ['abandoned_stranger', 'abandoned_survivor', 'bunker13_abandoned_looter', 'abandoned_nhauyen_rich_loot'] },
    ],
  },
  {
    id: 'r_wolf_revenge', zones: ['shelter'], primary: 'shelter', weight: 4,
    when: (c) => c.flags.includes('bloodwolf_nemesis') && c.day >= 6,
    situation: () => 'Ở {near}, bạn thấy vết giày lạ và một chiếc dây xích bị cắt đứt bỏ lại trước cửa. Huyết Lang không quên chuyện cũ: chúng đang dò xét nơi bạn trú, và có vẻ sắp quay lại trả thù.',
    choices: [
      { text: 'Giăng bẫy và chặn kỹ mọi lối ra vào, sẵn sàng đối đầu', outcome: 'Bạn thức trắng đêm dựng bẫy dây và chướng ngại. Khi bọn chúng đến, bẫy làm chúng rối loạn đủ lâu để bạn giáng trả. Một cuộc đối đầu đẫm máu nhưng bạn thắng.', stats: { stamina: -14, hp: -8, sanity: 2 }, flagsRemove: ['bloodwolf_nemesis'] },
      { text: 'Rút gọn đồ quan trọng, chuyển sang chỗ ẩn thứ hai trong đêm', outcome: 'Bạn bỏ lại phần lớn đồ cồng kềnh và chuyển đi lặng lẽ. Chúng tìm thấy căn phòng trống và rời đi, nhưng bạn đã mất nhiều thứ.', stats: { stamina: -10, sanity: -4 }, lose: [{ name: 'Gạo', quantity: 1 }], flagsRemove: ['bloodwolf_nemesis'] },
      { text: 'Chủ động ra mặt, đề nghị nhượng bộ để chúng để yên', outcome: 'Bạn mang theo đồ cống nạp đứng giữa hành lang. Chúng cười khẩy, nhận đồ và biến mất, nhưng bạn biết mình vừa chịu nhục.', stats: { sanity: -8 }, lose: [{ name: 'Đồ hộp', quantity: 1 }], flagsRemove: ['bloodwolf_nemesis'] },
    ],
  },
  {
    id: 'r_bunker_gift', zones: ['shelter'], primary: 'shelter', weight: 4,
    when: (c) => c.flags.includes('bunker13_heroes') || c.flags.includes('bunker13_diverted_horde'),
    situation: () => 'Có tiếng gõ nhẹ vào {shelter}. Qua mắt thần bạn thấy một người lạ mặt gầy gò, trên tay áo là phù hiệu Bunker 13. Họ đến để cảm ơn vì bạn đã cứu hầm trú ẩn hôm trước, mang theo một thùng nhỏ chứa những thứ quý.',
    choices: [
      { text: 'Mở cửa, mời vào uống nước và nghe họ kể tin tức', outcome: 'Người đó kể về tình hình trong hầm và vài tin hiếm hoi từ nơi khác. Khi ra về, họ để lại món quà.', stats: { sanity: 6, stamina: -2 }, roll: [{ table: 'household', n: 2 }, { table: 'pharmacy', n: 1 }], flagsRemove: ['bunker13_heroes', 'bunker13_diverted_horde'] },
      { text: 'Nhận quà qua khe cửa, nói lời cảm ơn rồi đóng lại', outcome: 'Bạn vẫn cảnh giác. Người đó gật đầu hiểu, đặt thùng xuống và rời đi.', stats: { sanity: 1 }, roll: [{ table: 'household', n: 2 }], flagsRemove: ['bunker13_heroes', 'bunker13_diverted_horde'] },
      { text: 'Từ chối, bảo họ giữ lại cho người cần hơn', outcome: 'Họ ngạc nhiên rồi mỉm cười, để lại một ít đồ y tế nhỏ như một lời cảm ơn không thể từ chối.', stats: { sanity: 8 }, roll: [{ table: 'pharmacy', n: 1 }], flagsRemove: ['bunker13_heroes', 'bunker13_diverted_horde'] },
    ],
  },
];
