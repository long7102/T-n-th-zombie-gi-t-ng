import { Item, Skill } from '../types/game';

export interface StartingScenarioPreset {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  startingLocation: string;
  initialWeather: 'clear' | 'heatwave' | 'heavy_rain' | 'freezing_cold' | 'dense_fog' | 'night_dark';
  weatherLabel: string;
  startingHp: number;
  startingStamina: number;
  startingSanity: number;
  initialSkills: Skill[];
  initialItems: Item[];
  openingNarrative: string;
}

export const STARTING_SCENARIOS: StartingScenarioPreset[] = [
  {
    id: 'apartment_survivors',
    title: 'Khu Chung Cư Đổ Nát Cùng Những Người Xa Lạ',
    subtitle: 'Dân thường cố thủ trong căn hộ tầng 7',
    description: 'Bạn đang trốn trong căn hộ chung cư cùng 3 người hàng xóm xa lạ. Thức ăn đã cạn kiệt suốt 3 ngày nay, tiếng cào cấu ken két vang lên từ cầu thang bộ thoát hiểm. Nỗi sợ hãi và sự nghi kỵ bắt đầu biến những người cùng phòng thành mối nguy hiểm khôn lường.',
    startingLocation: 'Khu Chung Cư Linh Đàm - Tầng 7',
    initialWeather: 'dense_fog',
    weatherLabel: 'Sương mù dày đặc buốt giá',
    startingHp: 90,
    startingStamina: 85,
    startingSanity: 70, // Tâm lý bất an, nghi kỵ
    initialSkills: [
      { id: 'sk_lockpick', name: 'Mở Khóa Khẩn Cấp', description: 'Có thể cạy mở chốt cửa các căn hộ bỏ hoang.', category: 'survival', level: 1 },
      { id: 'sk_negotiate', name: 'Đọc Vị Tâm Lý', description: 'Nhận biết ý đồ phản bội hoặc toan tính của người cùng nhóm.', category: 'mental', level: 1 },
    ],
    initialItems: [
      { id: 'item_kitchen_knife', name: 'Dao chặt thịt nhà bếp', category: 'weapon', quantity: 1, damage: 28, durability: 80, maxDurability: 80, rarity: 'common', description: 'Lưỡi thép gia dụng nhưng đầm tay.' },
      { id: 'item_canned_fish', name: 'Hộp cá ngâm dầu (Nguyên seal)', category: 'food', quantity: 2, hungerReduce: 30, isSealed: true, canSpoil: false, rarity: 'common', description: 'Đồ hộp còn nguyên nắp, bảo quản được lâu.' },
      { id: 'item_boiled_water', name: 'Bình nước đun sôi để nguội 1L', category: 'food', quantity: 1, thirstReduce: 40, canSpoil: false, rarity: 'common', description: 'Nước uống sạch dự trữ.' },
      { id: 'item_flashlight', name: 'Đèn pin pin sạc yếu', category: 'tool', quantity: 1, durability: 60, maxDurability: 60, rarity: 'common', description: 'Chiếu sáng trong hành lang tối tăm.' },
    ],
    openingNarrative: 'Căn phòng khách tối om, rèm cửa kéo kín mít để ngăn ánh sáng lọt ra ngoài. Bên cạnh bạn, người đàn ông trung niên ôm chặt chiếc ba lô đồ hộp của riêng mình với ánh mắt cảnh giác cao độ. Từ khe cửa chính, tiếng bước chân kéo lê và tiếng thở phì phò của bầy zombie đang dừng lại ngay trước ngưỡng cửa...',
  },
  {
    id: 'supermarket_lockdown',
    title: 'Kẹt Trong Siêu Thị Tiện Lợi Khóa Trái',
    subtitle: 'Nhân viên văn phòng cố thủ nơi kho thực phẩm',
    description: 'Đại dịch bùng phát đúng lúc bạn đang mua đồ ăn trưa. Cửa cuốn sắt của siêu thị tiện lợi bị ai đó kéo sập xuống khóa nửa chừng. Nguồn đồ hộp và mì gói còn khá nhiều, nhưng kệ hàng bị đổ ngổn ngang và có tiếng rên rỉ kỳ lạ phát ra từ kho đông lạnh phía sau...',
    startingLocation: 'Siêu thị tiện lợi MiniMart - Phố Bà Triệu',
    initialWeather: 'heatwave',
    weatherLabel: 'Nắng gắt gay gắt hầm hập',
    startingHp: 95,
    startingStamina: 90,
    startingSanity: 80,
    initialSkills: [
      { id: 'sk_resource_stockpile', name: 'Phân Loại Nhu Yếu Phẩm', description: 'Nhận biết thực phẩm còn hạn sử dụng và cách trữ đồ chống ẩm mốc.', category: 'survival', level: 1 },
      { id: 'sk_makeshift_barricade', name: 'Gia Cố Chướng Ngại Vật', description: 'Xếp chồng tủ kệ tạo thành rào cản chặn bước bầy zombie.', category: 'craft', level: 1 },
    ],
    initialItems: [
      { id: 'item_fire_extinguisher', name: 'Bình chữa cháy mini CO2', category: 'weapon', quantity: 1, damage: 32, durability: 50, maxDurability: 50, rarity: 'uncommon', description: 'Có thể xịt mù mắt zombie hoặc đập vỡ sọ.' },
      { id: 'item_fresh_bread', name: 'Bánh mì sandwich mềm (Đồ tươi)', category: 'food', quantity: 2, hungerReduce: 25, freshness: 100, canSpoil: true, rarity: 'common', description: 'Thực phẩm tươi, sẽ nhanh ôi thiu nếu trời nắng gắt!' },
      { id: 'item_canned_beans', name: 'Đồ hộp đậu hầm sốt cà (Nguyên seal)', category: 'food', quantity: 3, hungerReduce: 35, isSealed: true, canSpoil: false, rarity: 'common', description: 'Giàu năng lượng, không lo ôi thiu.' },
      { id: 'item_mineral_water_pack', name: 'Chai nước khoáng 1.5L', category: 'food', quantity: 2, thirstReduce: 45, canSpoil: false, rarity: 'common', description: 'Nước khoáng vô trùng an toàn.' },
    ],
    openingNarrative: 'Không khí trong siêu thị ngột ngạt và nóng hầm hập do mất điện. Bạn ngồi bệt sau quầy thu ngân vỡ kính, tay giữ chặt chiếc bình chữa cháy. Qua khe hở dưới chân cửa cuốn sắt, bạn nhìn thấy đôi chân dính máu khô của một xác sống đang bước qua... và phía kho đông lạnh tối om sau lưng, cánh cửa sắt bắt đầu rung lên từng nhịp bần bật.',
  },
  {
    id: 'highway_traffic_breakdown',
    title: 'Xe Chết Máy Giữa Đại Lộ Xác Xe Ngổn Ngang',
    subtitle: 'Kẻ lái xe đơn độc kẹt giữa đường vành đai',
    description: 'Chiếc xe bán tải của bạn bị hỏng két nước và chết máy giữa hàng trăm chiếc xe hơi dồn ứ trên đường cao tốc trên cao. Mặt trời đang lặn dần, bỏ lại bạn chơ vơ giữa không gian trống trải gió lạnh buốt. Phía xa, đàn quái vật đang lùng sục từng khoang xe...',
    startingLocation: 'Đường Vành Đai 3 Trên Cao - Km 14',
    initialWeather: 'freezing_cold',
    weatherLabel: 'Gió lạnh buốt giá tê tái',
    startingHp: 100,
    startingStamina: 95,
    startingSanity: 85,
    initialSkills: [
      { id: 'sk_engine_salvage', name: 'Hút Xăng & Phế Liệu Xe', description: 'Biết cách rút xăng từ bình xe khác và tận dụng phụ tùng.', category: 'craft', level: 1 },
      { id: 'sk_silent_crawl', name: 'Bò Trườn Qua Kẽ Xe', description: 'Luồn lách dưới gầm và nóc xe tải mà không tạo tiếng động.', category: 'survival', level: 1 },
    ],
    initialItems: [
      { id: 'item_tire_iron', name: 'Cần tuýp mở ốc bánh xe', category: 'weapon', quantity: 1, damage: 36, durability: 95, maxDurability: 95, rarity: 'uncommon', description: 'Thanh thép cứng cáp, đòn bẩy uy lực.' },
      { id: 'item_jerrycan_gasoline', name: 'Can xăng mini 5 lít', category: 'material', quantity: 1, rarity: 'rare', description: 'Xăng đặc chế tạo chai cháy hoặc chạy máy phát.' },
      { id: 'item_beef_jerky', name: 'Túi thịt bò sấy khô hút chân không', category: 'food', quantity: 2, hungerReduce: 30, isDried: true, canSpoil: false, rarity: 'uncommon', description: 'Bảo quản vô thời hạn, không lo thiu hỏng.' },
      { id: 'item_duct_tape', name: 'Cuộn băng keo bạc dã chiến', category: 'material', quantity: 1, rarity: 'common', description: 'Dùng băng bó khẩn cấp hoặc chế đồ.' },
    ],
    openingNarrative: 'Gió đêm rít qua khe cửa kính xe buốt giá thấu xương. Hơi nước phì ra từ nắp capo xe bốc khói mờ ảo. Phía trước bạn, hàng dài xe hơi nối đuôi nhau dập nát, nhiều chiếc vẫn còn vương vết máu loang lổ trên kính chắn gió. Một tiếng va đập kim loại chói tai vang lên từ chiếc xe container đối diện...',
  },
  {
    id: 'metro_train_derailment',
    title: 'Thảm Họa Trên Chuyến Tàu Điện Ngầm (Train to Busan)',
    subtitle: 'Hành khách sống sót giữa đường hầm tối đen',
    description: 'Chuyến tàu điện ngầm đô thị phanh gấp do đường ray bị sập. Khoang tàu chìm vào bóng tối đặc quánh. Tiếng la hét xô đẩy, người giẫm đạp lên nhau giành giật đường sống khi một nhóm hành khách phía đầu tàu bị biến đổi thành zombie hung hãn lao đi như điên cuồng.',
    startingLocation: 'Ga Tàu Ngầm Cát Linh - Đường Hầm Sâu 20m',
    initialWeather: 'night_dark',
    weatherLabel: 'Bóng đêm đặc quánh trong lòng đất',
    startingHp: 90,
    startingStamina: 100,
    startingSanity: 65, // Hoảng loạn cao
    initialSkills: [
      { id: 'sk_crowd_escape', name: 'Luồn Lách Đám Đông', description: 'Không bị ngã hoặc giẫm đạp khi dòng người hoảng loạn tháo chạy.', category: 'survival', level: 1 },
      { id: 'sk_sound_distraction', name: 'Tạo Tiếng Động Đánh Lạc Hướng', description: 'Tận dụng quán tính và thính giác zombie để dẫn dụ chúng đâm sầm vào tường.', category: 'combat', level: 1 },
    ],
    initialItems: [
      { id: 'item_emergency_hammer', name: 'Búa thoát hiểm phá kính xe', category: 'weapon', quantity: 1, damage: 30, durability: 70, maxDurability: 70, rarity: 'common', description: 'Đầu nhọn kim cương đập vỡ kính cường lực và sọ zombie.' },
      { id: 'item_smartphone_torch', name: 'Điện thoại di động (Pin 28%)', category: 'tool', quantity: 1, durability: 28, maxDurability: 100, rarity: 'common', description: 'Phát nhạc đánh lạc hướng hoặc soi đèn chớp nhoáng.' },
      { id: 'item_energy_bars', name: 'Thanh kẹo năng lượng Chocolate', category: 'food', quantity: 3, hungerReduce: 20, isSealed: true, canSpoil: false, rarity: 'common', description: 'Bổ sung calo tức thì khi chạy bộ thoát thân.' },
    ],
    openingNarrative: 'Bóng tối đen đặc bao trùm toa tàu. Mùi khét của phanh tàu và mùi tanh nồng của máu xộc vào mũi bạn. Tiếng gào thét vang dội: "Cửa kẹt rồi! Nó đang cắn người!". Do trong hầm tối mù mịt, bầy zombie lao về phía trước chỉ biết đuổi theo tiếng động và ánh sáng điện thoại, đâm sầm vào các cánh cửa kính vỡ nát...',
  },
  {
    id: 'private_house',
    title: 'Nhà Riêng Trong Ngõ Nhỏ',
    subtitle: 'Chủ nhà cố thủ, mỗi nhà hàng xóm một cảnh tượng',
    description: 'Bạn ở một mình trong căn nhà ba tầng của chính mình. Cả ngõ im phăng phắc, chỉ có tiếng kéo lê thỉnh thoảng vọng qua tường. Nhà hàng xóm hai bên còn đồ, nhưng mỗi nhà đều có chuyện riêng: nhà có người, nhà có xác, nhà đã bị khóa trái.',
    startingLocation: 'Nhà riêng - Ngõ 12',
    initialWeather: 'dense_fog',
    weatherLabel: 'Sương mù sáng sớm trong ngõ nhỏ',
    startingHp: 95,
    startingStamina: 90,
    startingSanity: 75,
    initialSkills: [
      { id: 'sk_wall_climb', name: 'Trèo Tường Rào', description: 'Leo qua tường, mái nhà, ban công nhà hàng xóm mà không gây tiếng động.', category: 'survival', level: 1 },
      { id: 'sk_home_repair', name: 'Sửa Chữa Gia Đình', description: 'Biết gia cố cửa, vá mái, sửa ống nước cơ bản.', category: 'craft', level: 1 },
    ],
    initialItems: [
      { id: 'item_cleaver', name: 'Dao phay nhà bếp', category: 'weapon', quantity: 1, damage: 28, durability: 70, maxDurability: 70, rarity: 'common', description: 'Lưỡi dày, chặt xương gọn.' },
      { id: 'item_rice', name: 'Gạo tẻ (túi 1kg)', category: 'food', quantity: 1, hungerReduce: 55, needsCooking: true, canSpoil: false, rarity: 'common', description: 'Cần nấu cơm; no lâu nhưng phải có lửa và nước sạch.' },
      { id: 'item_noodle', name: 'Mì tôm gói', category: 'food', quantity: 3, hungerReduce: 28, needsCooking: true, canSpoil: false, rarity: 'common', description: 'Có thể bóp sống ăn tạm (hại bụng) hoặc nấu chín.' },
      { id: 'item_water_home', name: 'Bình nước đun sôi để nguội 1L', category: 'food', quantity: 2, thirstReduce: 40, canSpoil: false, rarity: 'common', description: 'Nước uống sạch dự trữ.' },
      { id: 'item_lighter', name: 'Bật lửa gas', category: 'tool', quantity: 1, rarity: 'common', description: 'Nhóm lửa nấu ăn.' },
    ],
    openingNarrative: 'Căn nhà ba tầng của bạn vẫn đứng nguyên, nhưng mọi tiếng động quen thuộc đã biến mất. Qua khe cửa sổ tầng hai, bạn thấy hai mái nhà hàng xóm sát vách, một nhà tắt đèn từ lâu, nhà kia có ánh nến leo lét. Tiếng gõ chậm rãi vọng ra từ đâu đó trong ngõ...',
  },
  {
    id: 'clinic_containment',
    title: 'Tỉnh Dậy Giữa Trạm Y Tế Dã Chiến Cách Ly',
    subtitle: 'Bệnh nhân may mắn qua khỏi cơn sốt ban đầu',
    description: 'Bạn vừa hồi tỉnh trên chiếc giường gấp dã chiến. Toàn bộ bác sĩ và y tá đã sơ tán hoặc bị nhiễm bệnh. Xung quanh ngổn ngang kim tiêm, bình dịch truyền và xác người phủ ga trắng. Bạn có vết thương nhẹ ở cẳng tay cần được xử lý ngay trước khi vi khuẩn mưng mủ.',
    startingLocation: 'Trạm Y Tế Phường Cầu Giấy',
    initialWeather: 'heavy_rain',
    weatherLabel: 'Mưa lớn xối xả đập vào mái tôn',
    startingHp: 80,
    startingStamina: 75,
    startingSanity: 85,
    initialSkills: [
      { id: 'sk_wound_hygiene', name: 'Xử Lý Khử Trùng Vết Thương', description: 'Giảm 50% nguy cơ vết thương hở tiến triển thành nhiễm trùng máu.', category: 'survival', level: 1 },
      { id: 'sk_chemical_mix', name: 'Pha Chế Cồn Sát Trùng', description: 'Biết cách điều chế dung dịch cồn nồng độ chuẩn từ hóa chất y tế.', category: 'craft', level: 1 },
    ],
    initialItems: [
      { id: 'item_iv_pole_spear', name: 'Cây treo bình truyền dịch vát nhọn', category: 'weapon', quantity: 1, damage: 31, durability: 75, maxDurability: 75, rarity: 'common', description: 'Thanh sắt rỗng có đầu vát nhọn, giữ khoảng cách an toàn với quái vật.' },
      { id: 'item_alcohol_bottle', name: 'Chai cồn đỏ Povidone Iodine 500ml', category: 'medical', quantity: 1, infectionReduce: 35, healAmount: 15, rarity: 'rare', description: 'Sát trùng vết thương hở ngăn ngừa mưng mủ.' },
      { id: 'item_sterile_gauze', name: 'Gói gạc vô trùng dã chiến', category: 'medical', quantity: 2, healAmount: 20, infectionReduce: 15, rarity: 'common', description: 'Băng bó cầm máu và bảo vệ mô da.' },
      { id: 'item_distilled_water', name: 'Chai nước cất y tế 500ml', category: 'food', quantity: 2, thirstReduce: 25, canSpoil: false, rarity: 'common', description: 'Nước tinh khiết vô trùng tuyệt đối.' },
    ],
    openingNarrative: 'Tiếng mưa rào rào đập xối xả vào mái tôn trạm xá. Không khí nồng nặc mùi thuốc sát trùng và cloramin B. Cẳng tay bạn nhức buốt với vết cào rách da đang ươn ướt máu. Trên bức tường kính phòng cấp cứu đối diện, một bàn tay đẫm máu vừa quệt một vệt dài trượt xuống...',
  },
];
