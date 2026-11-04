import { Item, WeatherType } from '../types/game';

// Kho cảnh sinh tồn thường ngày. Mỗi cảnh có 3 lựa chọn RIÊNG với kết quả RIÊNG,
// nên 3 ngày liên tiếp sẽ không còn lặp lại cùng một bộ lựa chọn như trước.

export interface SceneCtx {
  day: number;
  weather: WeatherType;
  location: string;
  waterCut: boolean;
  blackout: boolean;
  hasCompanion: boolean;
  companionName: string;
  baseType: string;
  thirst: number;
  hunger: number;
  stamina: number;
  hasWound: boolean;
}

export interface SceneStats {
  hp?: number;
  hunger?: number;
  thirst?: number;
  infection?: number;
  sanity?: number;
  stamina?: number;
}

export interface RoutineChoice {
  text: string;
  outcome: string;
  stats?: SceneStats;       // cộng thêm vào mức hao hụt cơ bản mỗi lượt
  gain?: Partial<Item>[];
  lose?: { name: string; quantity: number }[];
  inflictWound?: string;    // vị trí vết thương nếu bị thương hở
  healWound?: boolean;
  requires?: { re: RegExp; label: string }[]; // thiếu thì thất bại
}

export interface RoutineScene {
  id: string;
  when?: (c: SceneCtx) => boolean;
  need?: (c: SceneCtx) => boolean; // cảnh được ưu tiên khi nhu cầu cấp bách
  situation: (c: SceneCtx) => string;
  choices: [RoutineChoice, RoutineChoice, RoutineChoice];
}

const canFood = (name: string, hunger: number, qty = 1): Partial<Item> => ({
  id: 'sc_food', name, category: 'food', quantity: qty, hungerReduce: hunger, isSealed: true, canSpoil: false,
  description: 'Đồ hộp nguyên niêm phong, không lo ôi thiu.', rarity: 'common',
});
const water = (name: string, thirst: number, qty = 1): Partial<Item> => ({
  id: 'sc_water', name, category: 'food', quantity: qty, thirstReduce: thirst, canSpoil: false,
  description: 'Nước uống an toàn.', rarity: 'common',
});
const gauze = (qty = 1): Partial<Item> => ({
  id: 'sc_gauze', name: 'Băng gạc tiệt trùng y tế', category: 'medical', quantity: qty, healAmount: 20, infectionReduce: 15,
  description: 'Băng bó cầm máu và bảo vệ mô da.', rarity: 'common',
});
const scrap = (name: string, qty = 1): Partial<Item> => ({
  id: 'sc_scrap', name, category: 'material', quantity: qty, description: 'Vật liệu dã chiến dùng để gia cố hoặc chế tạo.', rarity: 'common',
});

export const WEATHER_FLAVOR: Record<WeatherType, string[]> = {
  clear: [
    'Bầu trời xám nhạt, không gió. Cái im lặng nặng nề khiến mỗi tiếng bước chân đều vang xa.',
    'Ánh sáng nhợt nhạt luồn qua khe rèm, bụi bay lơ lửng trong những vệt sáng mỏng.',
  ],
  heatwave: [
    'Nắng gắt thiêu đốt. Không khí đặc quánh mùi nhựa đường nóng chảy và thịt thối.',
    'Hơi nóng hầm hập hắt vào từ ô cửa vỡ, mồ hôi chảy ròng ròng xuống cổ áo ngay cả khi bạn đứng yên.',
  ],
  heavy_rain: [
    'Mưa trút xối xả lên mái tôn, tiếng ồn che lấp mọi âm thanh khác. Hơi lạnh ẩm ướt luồn qua từng kẽ áo.',
    'Nước mưa đục ngầu chảy thành dòng dọc hành lang, cuốn theo rác và mùi hôi tanh.',
  ],
  freezing_cold: [
    'Gió lạnh buốt lùa qua cửa sổ vỡ, hơi thở của bạn tụ thành khói trắng. Đầu ngón tay tê dại.',
    'Cái rét cắt da thịt. Sắt thép lạnh đến mức dính tay, mỗi bước đi đều làm khớp xương nhức nhối.',
  ],
  dense_fog: [
    'Sương mù đặc quánh nuốt chửng cả con phố, tầm nhìn chỉ còn vài sải tay. Tiếng động lạ vọng lại từ mọi hướng.',
    'Sương trắng đục bám lên kính, bên ngoài chỉ còn những cái bóng mờ lê bước khó đoán.',
  ],
  night_dark: [
    'Bóng tối đặc quánh phủ xuống, chỉ còn ánh trăng yếu ớt lọt qua những đám mây.',
    'Đêm đen không một ánh đèn. Bạn chỉ có thể dựa vào thính giác và những ngón tay mò mẫm trong bóng tối.',
  ],
};

export const ROUTINE_SCENES: RoutineScene[] = [
  {
    id: 'r_scavenge_neighbor',
    situation: (c) =>
      `Căn hộ trống ở cuối hành lang vẫn còn khép hờ. Bên trong thoang thoảng mùi ẩm mốc và vài vệt máu khô trên sàn gạch. Có thể trước đây từng có người sống ở đây, và biết đâu họ để lại chút đồ ăn.`,
    choices: [
      {
        text: 'Lục soát nhanh các ngăn kéo bếp rồi rút lui trong im lặng',
        outcome: 'Bạn lách vào, kéo từng ngăn tủ không một tiếng động. Giữa đống bát đĩa vỡ, bạn tìm được một hộp thịt hầm còn nguyên nắp. Bạn lùi ra ngoài mà không khuấy động ai.',
        stats: { stamina: -2 },
        gain: [canFood('Đồ hộp thịt lợn hầm (Nguyên seal)', 35)],
      },
      {
        text: 'Dùng xà beng cạy tủ sắt khóa chặt dù tạo tiếng động lớn',
        outcome: 'Tiếng kim loại ken két vang lên chói tai khiến tim bạn thót lại. Cánh tủ bật tung, bạn lôi ra được ít vật tư, nhưng tiếng ồn vừa rồi chắc chắn đã vọng khắp tòa nhà.',
        stats: { stamina: -8, sanity: -4 },
        gain: [canFood('Đồ hộp cá ngâm dầu (Nguyên seal)', 30, 2), scrap('Băng keo bạc dã chiến')],
      },
      {
        text: 'Áp tai vào cánh cửa nghe ngóng, không bước vào',
        outcome: 'Bạn nín thở nghe một lúc lâu. Có tiếng kéo lê rất khẽ ở phòng trong, lúc có lúc không. Bạn quyết định không đánh cược, rút về và đánh dấu căn hộ này là nguy hiểm.',
        stats: { sanity: -1, stamina: -1 },
      },
    ],
  },
  {
    id: 'r_fortify_door',
    situation: (c) =>
      `Cánh cửa chính của nơi ẩn náu đã lung lay, bản lề gỉ sét rên lên mỗi lần có gió. ${c.hasCompanion ? `${c.companionName} lo lắng nhìn vào khe cửa.` : 'Bạn tự hỏi nó sẽ chịu nổi được bao lâu nếu có bầy xô đến.'} Một chút gia cố bây giờ có thể cứu mạng sau này.`,
    choices: [
      {
        text: 'Gỡ thanh sắt từ lan can ban công, đóng chéo nẹp ngang cánh cửa',
        outcome: 'Bạn mất cả buổi bẻ cong thanh sắt, đóng đinh nẹp ngang qua cửa. Tay bạn sưng đỏ nhưng khi đẩy thử, cánh cửa đã chắc hơn hẳn.',
        stats: { stamina: -14 },
        gain: [scrap('Thanh sắt V & Đinh 10 phân', 1)],
      },
      {
        text: 'Kéo tủ quần áo nặng ra chắn sau cửa và chèn sách vào chân tủ',
        outcome: 'Chiếc tủ rít lên trên sàn gạch, cả hai bạn đứng im đợi phản ứng bên ngoài. Không có gì xảy ra. Rào chắn tạm bợ nhưng đủ để bạn ngủ yên hơn tối nay.',
        stats: { stamina: -9, sanity: 2 },
      },
      {
        text: 'Buộc dây kẽm với vài vỏ lon rỗng làm chuông báo động trước cửa',
        outcome: 'Bạn căng sợi dây kẽm thấp ngang mắt cá, treo lon rỗng lủng lẳng. Không chắc ngăn được ai, nhưng ít nhất bạn sẽ nghe thấy trước khi chúng vào được bên trong.',
        stats: { stamina: -5, sanity: 3 },
        gain: [scrap('Dây kẽm gai', 1)],
      },
    ],
  },
  {
    id: 'r_scout_street',
    situation: (c) =>
      `Từ ô cửa sổ tầng cao, con đường bên dưới chỉ còn xe cháy và rác chất đống. Có vài bóng người lảo đảo đi lại không mục đích. ${c.weather === 'dense_fog' ? 'Sương dày khiến bạn khó đếm số lượng chính xác.' : 'Bạn đủ tầm nhìn để quan sát từng góc phố.'} Quyết định ra ngoài hay ở yên vẫn nằm trong tay bạn.`,
    choices: [
      {
        text: 'Ghi chép vị trí từng nhóm zombie để vạch ra lộ trình tránh né',
        outcome: 'Bạn mất hơn một giờ ngồi sau rèm, vẽ sơ đồ nguệch ngoạc ra mặt sau tờ lịch cũ. Giờ bạn biết con hẻm nào còn tương đối yên tĩnh vào những giờ nhất định.',
        stats: { sanity: 2, stamina: -3 },
      },
      {
        text: 'Lẻn xuống con hẻm sau tòa nhà, lục lạo xe hơi bỏ hoang',
        outcome: 'Bạn bò sát chân tường tiếp cận chiếc xe tải nhỏ. Cửa cốp vẫn đóng kín, bên trong có vài chai nước và một thùng đồ hộp ướt nhẹp. Bạn vơ lấy rồi chuồn nhanh trước khi tiếng động thu hút bất kỳ ai.',
        stats: { stamina: -10, sanity: -3 },
        gain: [water('Nước khoáng đóng chai', 45, 1), canFood('Đồ hộp đậu hầm sốt cà (Nguyên seal)', 35)],
      },
      {
        text: 'Ném viên đá sang góc phố đối diện để thử phản ứng của lũ zombie',
        outcome: 'Viên đá vỡ choang xuống nền gạch. Cả bầy nhỏ lập tức quay đầu rồi lục tục kéo đến chỗ phát ra tiếng. Bạn học được chúng phản ứng với âm thanh nhanh đến mức nào, và đó là thông tin quý.',
        stats: { sanity: 1, stamina: -2 },
      },
    ],
  },
  {
    id: 'r_water_hunt',
    need: (c) => c.thirst >= 68 || (c.waterCut && c.thirst >= 58),
    situation: (c) =>
      `${c.waterCut ? 'Vòi nước đã khô cạn từ lâu, chỉ còn tiếng rít của không khí.' : 'Bình nước trong ba lô gần như cạn sạch.'} Cổ họng bạn khô rát, môi nứt nẻ. Nước sạch giờ là thứ quý hơn bất kỳ viên đạn nào.`,
    choices: [
      {
        text: 'Leo lên sân thượng tìm bồn nước sinh hoạt rồi lọc qua vải',
        outcome: 'Bồn inox trên sân thượng vẫn còn chút nước đọng, hơi đục nhưng chưa có mùi. Bạn lọc qua lớp vải dày rồi đun sôi trên bếp cồn. Đủ để cầm cự thêm một thời gian.',
        stats: { stamina: -12, thirst: -25 },
        gain: [water('Bình nước đun sôi để nguội 1L', 40, 1)],
      },
      {
        text: 'Cạy máy bán nước tự động ở sảnh tầng trệt',
        outcome: 'Mặt kính cường lực vỡ toang. Bên trong có vài chai nước ngọt còn nguyên, nhưng tiếng kính vỡ khiến bạn nín thở ngóng nghe suốt một phút liền.',
        stats: { stamina: -8, sanity: -3, thirst: -15 },
        gain: [water('Chai nước ngọt có ga', 30, 2)],
      },
      {
        text: 'Căng tấm bạt ngoài ban công hứng sương đêm và hơi nước đọng',
        outcome: 'Bạn chờ đợi suốt nhiều giờ, từng giọt nước ngưng tụ nhỏ xuống cái xô. Chậm chạp, nhưng an toàn và không tốn một giọt mồ hôi.',
        stats: { thirst: -10, stamina: -3 },
        gain: [water('Nước sương lắng 1L', 25, 1)],
      },
    ],
  },
  {
    id: 'r_food_cook',
    need: (c) => c.hunger >= 68,
    situation: (c) =>
      `Bụng bạn cồn cào, cơn đói khiến tay chân run rẩy. ${c.blackout ? 'Không còn điện, mọi thực phẩm tươi đều đang thối rữa.' : 'Số thức ăn còn lại không nhiều, phải tính toán thật kỹ.'} Mùi thức ăn có thể thu hút bất kỳ thứ gì ở gần đó.`,
    choices: [
      {
        text: 'Ăn ngay đồ hộp nguội, không nhóm lửa để tránh phát mùi',
        outcome: 'Bạn xé nắp hộp, ăn nhanh trong bóng tối. Vị mặn lạnh trượt qua cuống họng, nhưng dạ dày cuối cùng cũng yên. Không ai biết bạn đang ở đây.',
        stats: { hunger: -18, stamina: 2 },
      },
      {
        text: 'Nhóm bếp cồn nấu bữa nóng, che kín cửa sổ bằng chăn dày',
        outcome: 'Hơi ấm và mùi thức ăn chín khiến bạn gần như bật khóc. Bạn ăn chậm để tận hưởng từng thìa, thể lực và tinh thần hồi phục rõ rệt. Cái giá là mùi khói bay nhẹ ra ngoài.',
        stats: { hunger: -28, stamina: 8, sanity: 6 },
      },
      {
        text: 'Chia bớt khẩu phần, ăn một nửa để dành cho ngày mai',
        outcome: 'Bạn nén cơn đói, đóng nắp hộp lại cất kỹ. Dạ dày vẫn quặn đau nhưng ít nhất bạn còn dự trữ cho những ngày tới.',
        stats: { hunger: -10, sanity: -2 },
      },
    ],
  },
  {
    id: 'r_wound_care',
    when: (c) => c.hasWound,
    need: (c) => c.hasWound,
    situation: () =>
      'Vết thương trên người bạn bắt đầu nóng rát, rìa da sưng đỏ và hơi rỉ dịch vàng. Bạn biết nếu không xử lý kịp, nhiễm trùng sẽ lan nhanh hơn bất kỳ con zombie nào.',
    choices: [
      {
        text: 'Rửa sạch bằng nước đun sôi và băng bó bằng gạc vô trùng',
        outcome: 'Nước ấm chạm vào vết thương làm bạn nghiến răng. Bạn lau sạch mủ, băng gạc chặt tay. Cơn nóng rát dần dịu đi, vết thương trông ổn hơn rõ rệt.',
        stats: { stamina: -4, sanity: 2 },
        healWound: true,
        requires: [{ re: /băng|gạc|cồn/i, label: 'Băng gạc hoặc cồn sát trùng' }],
      },
      {
        text: 'Đổ cồn đỏ Povidone lên miệng vết thương rồi cắn răng chịu đựng',
        outcome: 'Cơn đau xé toạc như lửa đốt khiến bạn gập người. Nhưng mùi cồn nồng và vệt nâu i-ốt lan trên da khiến bạn yên tâm rằng vi khuẩn đã bị tiêu diệt.',
        stats: { stamina: -6, sanity: -2, infection: -8 },
        healWound: true,
        requires: [{ re: /cồn|povidone/i, label: 'Cồn sát trùng' }],
      },
      {
        text: 'Tạm quấn vải sạch, chờ thêm chút nữa xem có đỡ không',
        outcome: 'Bạn quấn vải qua loa rồi tiếp tục công việc. Cơn nóng rát tăng dần theo từng giờ, nhưng bạn tự nhủ vẫn còn thời gian.',
        stats: { sanity: -3 },
      },
    ],
  },
  {
    id: 'r_noise_next_room',
    situation: () =>
      'Giữa đêm, một tiếng đổ vỡ khô khốc vọng qua tường từ căn phòng bên cạnh, rồi im bặt. Sau đó là một chuỗi tiếng gõ nhịp nhàng, như thể có thứ gì đó đang thử từng cánh cửa. Bạn nín thở, cả cơ thể căng cứng.',
    choices: [
      {
        text: 'Cầm vũ khí, mở hé cửa nhìn thử bằng gương nhỏ',
        outcome: 'Qua mặt gương, bạn thấy một con zombie đang loay hoay cố mở tủ lạnh trống rỗng. Nó chưa phát hiện ra bạn. Bạn đóng cửa lại thật khẽ, mồ hôi lạnh nhỏ giọt xuống cằm.',
        stats: { sanity: -4, stamina: -3 },
      },
      {
        text: 'Giữ nguyên vị trí, tắt đèn và chờ tiếng động tự dứt',
        outcome: 'Bạn ngồi bất động suốt cả tiếng đồng hồ. Cuối cùng tiếng gõ nhỏ dần rồi tắt hẳn. Một đêm dài đến mức bạn không còn chắc mình đã tỉnh hay mơ.',
        stats: { sanity: -5, stamina: -2 },
      },
      {
        text: 'Bí mật ném một vật xuống sảnh để dụ nó rời khỏi phòng bên',
        outcome: 'Vật nặng rơi xuống tầng dưới kêu choang. Tiếng bước lê lết nặng nề chuyển hướng ngay lập tức. Bạn tranh thủ lẻn sang phòng bên lục tìm, được ít thức ăn khô trước khi nó quay lại.',
        stats: { stamina: -6, sanity: -2 },
        gain: [canFood('Thanh kẹo năng lượng Chocolate', 20, 2)],
      },
    ],
  },
  {
    id: 'r_rooftop_view',
    when: (c) => c.weather !== 'heavy_rain',
    situation: (c) =>
      `Cầu thang lên sân thượng đóng bằng một cánh cửa sắt đã bị ai đó cạy. Gió thổi phần phật qua những chiếc ăng-ten gãy. Từ đây có thể thấy gần như toàn bộ khu phố. ${c.baseType === 'Military Base' ? 'Mấy chiếc hộp nhựa vứt vương vãi chứng tỏ binh lính từng đóng ở đây.' : ''}`,
    choices: [
      {
        text: 'Đặt vài thùng nhựa hứng nước rồi canh gác một lúc',
        outcome: 'Bạn bày xô chậu quanh sân thượng, ngồi canh trong gió lạnh. Thành phố bên dưới im lặng chết chóc, lâu lâu mới có khói bốc lên từ phía xa. Ít nhất xô chậu cũng sắp đầy.',
        stats: { stamina: -4, thirst: -8, sanity: 2 },
        gain: [water('Nước mưa hứng lắng 1L', 25, 1)],
      },
      {
        text: 'Dùng ống nhòm quét khắp các tòa nhà xung quanh tìm dấu hiệu sự sống',
        outcome: 'Sau nhiều phút, bạn thấy một tia sáng chớp qua tấm gương phản chiếu ở tòa nhà xa tít. Có người khác còn sống ở đó, nhưng quá xa để biết họ là bạn hay thù.',
        stats: { sanity: 3, stamina: -3 },
      },
      {
        text: 'Lục soát phòng kỹ thuật cạnh bồn nước để tìm đồ dùng',
        outcome: 'Phòng kỹ thuật chứa vài cuộn dây điện, bình ắc quy cũ và một hộp dụng cụ rỉ sét. Bạn chọn những thứ còn dùng được rồi quay xuống.',
        stats: { stamina: -7 },
        gain: [scrap('Dây kẽm gai', 1), scrap('Thanh sắt V & Đinh 10 phân', 1)],
      },
    ],
  },
  {
    id: 'r_night_watch',
    when: (c) => c.blackout || c.weather === 'night_dark',
    situation: (c) =>
      `Bóng tối đặc quánh nuốt chửng hành lang, ${c.blackout ? 'không còn một ánh đèn nào trong toàn thành phố' : 'trăng bị mây che kín'}. Đêm là lúc lũ zombie hoạt động mạnh nhất, và bạn hoàn toàn mù trong bóng tối nếu không có nguồn sáng. Bạn phải quyết định cách trải qua đêm nay.`,
    choices: [
      {
        text: 'Thay phiên canh gác, chỉ bật đèn pin vài giây khi thật cần thiết',
        outcome: 'Cả đêm bạn chập chờn giữa tỉnh và mơ, tai căng ra nghe mọi tiếng động. Pin đèn yếu dần nhưng bạn sống sót qua đêm mà không bị đột nhập.',
        stats: { stamina: -8, sanity: -3 },
      },
      {
        text: 'Ngủ sâu trong góc kín sau lớp chướng ngại để lấy lại sức',
        outcome: 'Bạn thiếp đi vì kiệt sức. Giấc ngủ chập chờn nhưng cơ thể cuối cùng cũng được nghỉ ngơi. Sáng ra bạn thấy vết cào mới trên cửa, may mà nó không vào được.',
        stats: { stamina: 15, sanity: -2 },
      },
      {
        text: 'Thắp ngọn nến nhỏ trong thùng kín để làm việc dưới ánh sáng yếu ớt',
        outcome: 'Ngọn nến lung linh trong thùng kim loại dày soi đủ cho bạn sắp xếp lại ba lô và mài lại lưỡi dao. Nhưng mùi sáp nến bay thoang thoảng khiến bạn thấp thỏm.',
        stats: { stamina: -4, sanity: 2 },
      },
    ],
  },
  {
    id: 'r_companion_talk',
    when: (c) => c.hasCompanion,
    situation: (c) =>
      `${c.companionName} ngồi co ro ở góc phòng, mắt nhìn đăm đăm vào khoảng không. Lần đầu tiên sau nhiều ngày, cô ấy/anh ấy mở lời: "Anh nghĩ có bao nhiêu người còn sống ngoài kia?" Một khoảnh khắc yên lặng hiếm hoi giữa tận thế.`,
    choices: [
      {
        text: 'Ngồi xuống bên cạnh, lắng nghe và chia sẻ khẩu phần ấm',
        outcome: 'Bạn chia đôi thanh kẹo cuối cùng, hai người nói về những điều bình thường trước ngày tận thế. Không giải quyết được gì, nhưng cả hai đều thấy nhẹ lòng.',
        stats: { sanity: 8, stamina: 3, hunger: 3 },
      },
      {
        text: 'Phân công việc canh gác và kiểm kê đồ đạc để giữ cho đầu óc bận rộn',
        outcome: 'Bạn lập danh sách đồ dùng và chia lịch gác. Công việc khiến cả hai không còn nghĩ ngợi, nhưng bầu không khí vẫn nặng trĩu.',
        stats: { stamina: -4, sanity: 1 },
      },
      {
        text: 'Nói thẳng rằng đừng hy vọng quá, hãy tập trung vào sống sót từng ngày',
        outcome: 'Câu nói thẳng thừng khiến đối phương im lặng một lúc lâu, ánh mắt tối lại. Nhưng sau cùng cô ấy/anh ấy gật đầu, nhận ra đó là sự thật.',
        stats: { sanity: -4 },
      },
    ],
  },
  {
    id: 'r_pharmacy_trip',
    situation: () =>
      'Ở góc ngã tư, một quầy thuốc nhỏ với biển hiệu đổ nghiêng vẫn còn nguyên cửa cuốn bị kéo xuống một nửa. Có thể ai đó đã vơ vét sạch, nhưng những hộc tủ cuối quầy thường bị bỏ sót.',
    choices: [
      {
        text: 'Chui qua khe cửa cuốn, lục tủ dưới quầy rất khẽ',
        outcome: 'Bạn chui qua khe hẹp, bò sát nền gạch đầy bụi. Dưới quầy còn mấy vỉ thuốc hết hạn và vài gói gạc nguyên bọc. Bạn nhét hết vào ba lô rồi thoát ra không kinh động ai.',
        stats: { stamina: -9, sanity: -2 },
        gain: [gauze(2)],
      },
      {
        text: 'Đẩy cửa cuốn lên hẳn để quan sát rõ, lục kỹ cả quầy',
        outcome: 'Cánh cửa rít lên lớn đến nỗi bạn rùng mình. Bạn tìm được cả cồn sát trùng và gạc, nhưng một bóng đen ở cuối đường đã ngẩng đầu nhìn về phía này.',
        stats: { stamina: -12, sanity: -5 },
        gain: [gauze(2), { id: 'sc_povidone', name: 'Chai cồn đỏ Povidone sát trùng', category: 'medical', quantity: 1, infectionReduce: 30, description: 'Cồn i-ốt dã chiến sát khuẩn vết thương.', rarity: 'uncommon' }],
      },
      {
        text: 'Không vào, canh chừng từ xa xem có ai ra vào không',
        outcome: 'Bạn ngồi sau chiếc xe bỏ hoang quan sát hơn nửa tiếng. Không có động tĩnh, nhưng cũng không có manh mối gì thêm. Bạn quay về tay không.',
        stats: { sanity: 1, stamina: -2 },
      },
    ],
  },
  {
    id: 'r_stray_survivor',
    situation: () =>
      'Một người lạ mặt, gầy gò và mặt đầy bụi, đứng ở đầu cầu thang tầng dưới giơ hai tay cao quá đầu. Trên người không thấy vũ khí. Hắn nói giọng khàn khàn: "Tôi chỉ muốn xin chút nước, tôi sẽ đi ngay."',
    choices: [
      {
        text: 'Ném xuống một chai nước nhỏ, yêu cầu hắn đi ngay',
        outcome: 'Hắn nhặt chai nước, cúi đầu cảm ơn rồi lặng lẽ biến mất sau khúc quanh. Bạn không chắc mình đã làm đúng, nhưng ít nhất lương tâm vẫn yên.',
        stats: { thirst: 6, sanity: 4 },
        lose: [{ name: 'nước', quantity: 1 }],
      },
      {
        text: 'Quát lớn đuổi đi, đồng thời giơ vũ khí cảnh cáo',
        outcome: 'Hắn lùi lại ngay với ánh mắt thất vọng và sợ hãi. Bạn đứng yên cả phút để chắc chắn hắn không quay lại. Mọi thứ vẫn an toàn nhưng lòng bạn nặng trĩu.',
        stats: { sanity: -4 },
      },
      {
        text: 'Hỏi hắn đã thấy gì ngoài kia, đổi thông tin lấy nước',
        outcome: 'Hắn nói trên đại lộ chính có xe cứu thương bị lật, hẻm sau chợ có băng nhóm hay qua lại. Bạn đưa nửa chai nước và ghi nhớ lời hắn. Có thể hắn nói thật.',
        stats: { thirst: 4, sanity: 1 },
        lose: [{ name: 'nước', quantity: 1 }],
      },
    ],
  },
  {
    id: 'r_rest_recover',
    need: (c) => c.stamina < 28,
    situation: () =>
      'Đôi chân bạn nặng như chì, mắt mờ đi từng đợt và các khớp ngón tay run bần bật. Cơ thể đang đòi nghỉ ngơi, và nếu cố gượng thêm, một sai lầm nhỏ cũng có thể là cuối cùng.',
    choices: [
      {
        text: 'Ngủ trưa vài tiếng trong góc kín được chèn cẩn thận',
        outcome: 'Bạn chìm vào giấc ngủ nặng nề, thỉnh thoảng giật mình vì những tiếng động quen thuộc. Khi tỉnh dậy, đầu óc đã sáng hơn nhiều.',
        stats: { stamina: 28, hunger: 4, sanity: 3 },
      },
      {
        text: 'Ngồi thiền, hít thở sâu và giữ tỉnh táo trong khi nghỉ ngơi',
        outcome: 'Bạn nhắm mắt, chầm chậm điều hòa nhịp thở. Không phải ngủ thật nhưng đầu óc dịu hẳn. Cơ thể phục hồi đủ để tiếp tục.',
        stats: { stamina: 16, sanity: 6 },
      },
      {
        text: 'Uống nước, ăn nhẹ và chợp mắt ngắn',
        outcome: 'Bữa ăn nhỏ cùng giấc ngủ ngắn giúp bạn gượng dậy. Chưa phải hồi phục hoàn toàn, nhưng đủ để làm việc tiếp.',
        stats: { stamina: 18, hunger: -8, thirst: -8 },
      },
    ],
  },
  {
    id: 'r_set_traps',
    situation: (c) =>
      `Bạn nhận thấy lũ zombie hay lê bước qua một lối đi hẹp bên hông tòa nhà. ${c.hasCompanion ? `${c.companionName} đề nghị cùng làm bẫy.` : ''} Một chút chuẩn bị ở đây có thể đổi lấy nhiều đêm yên giấc hơn.`,
    choices: [
      {
        text: 'Căng dây kẽm và treo vỏ lon dọc lối đi làm chuông báo động',
        outcome: 'Hai tiếng sau, lối đi đã chăng đầy dây mảnh. Mỗi bước chân qua đó sẽ gây tiếng động. Không tiêu diệt được ai nhưng đủ để bạn kịp phản ứng.',
        stats: { stamina: -9, sanity: 3 },
        gain: [],
      },
      {
        text: 'Đào hố nông, cắm cọc nhọn xuống đáy và phủ giấy báo lên trên',
        outcome: 'Mồ hôi nhễ nhại, bạn hoàn thành cái bẫy thô sơ. Nó sẽ không cản được cả bầy, nhưng đủ làm vài con ngã chúi.',
        stats: { stamina: -18, sanity: 2 },
      },
      {
        text: 'Bỏ ý định, thay vào đó mài lại và kiểm tra vũ khí',
        outcome: 'Bạn mài lại lưỡi dao, siết chặt cán vũ khí và quấn lại băng keo. Một việc nhỏ nhưng khiến bạn tự tin hơn khi đối đầu.',
        stats: { stamina: -3, sanity: 3 },
      },
    ],
  },
  {
    id: 'r_vehicle_wreck',
    when: (c) => c.weather !== 'heavy_rain',
    situation: () =>
      'Một chiếc ô tô con nằm chổng ngược bên vệ đường, kính vỡ nát, mùi xăng nồng nặc. Thi thể nằm gục sau tay lái đã khô quắt. Trong cốp có thể còn chút gì đó hữu ích, nhưng mùi xăng sẽ thu hút những kẻ nhạy mùi.',
    choices: [
      {
        text: 'Rút xăng từ bình nhiên liệu bằng ống nhựa vào can',
        outcome: 'Bạn ngậm ống nhựa hút mồi, cố không nuốt phải. Xăng chảy chậm vào can nhưng sau cùng bạn có được thứ nhiên liệu quý giá để chạy máy phát hoặc làm chai cháy.',
        stats: { stamina: -9, sanity: -2 },
        gain: [{ id: 'sc_gasoline', name: 'Can xăng mini 5 lít', category: 'material', quantity: 1, description: 'Xăng đặc chế tạo chai cháy hoặc chạy máy phát.', rarity: 'rare' }],
      },
      {
        text: 'Cạy cốp xe, lục tìm đồ dùng cá nhân của chủ xe',
        outcome: 'Cốp xe bật tung với tiếng rít. Bạn tìm thấy túi xách thể thao có vài chai nước và hộp cứu thương cũ. Bạn thở phào, vơ hết rồi rời đi.',
        stats: { stamina: -7, sanity: -3 },
        gain: [water('Nước khoáng đóng chai', 45, 1), gauze(1)],
      },
      {
        text: 'Đi vòng qua, không đụng vào chiếc xe vì mùi xăng quá nồng',
        outcome: 'Bạn đi vòng hẳn sang bên kia đường, giữ khoảng cách. Một lựa chọn thận trọng nhưng bỏ lỡ cơ hội.',
        stats: { sanity: 1 },
      },
    ],
  },
];
