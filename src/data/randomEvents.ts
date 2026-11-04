import { Companion, Item, SkillCategory } from '../types/game';

export interface RandomEventChoice {
  id: string;
  text: string;
  tacticalNote: string;
  statImpact?: {
    hp?: number;
    hunger?: number;
    thirst?: number;
    infection?: number;
    sanity?: number;
    stamina?: number;
  };
  itemsGained?: Item[];
  itemsLost?: { name: string; quantity: number }[];
  companionImpact?: {
    trustChange?: number;
    hpChange?: number;
    comment: string;
  };
  rescuesCompanion?: boolean; // Chỉ khi giải cứu thành công mới được kết nạp!
  newSkillAwarded?: {
    name: string;
    description: string;
    category: SkillCategory;
  };
  outcomeNarrative: string;
}

export interface RandomEvent {
  id: string;
  category: 'new_survivor' | 'bandit_ambush' | 'environmental_zombie' | 'extreme_weather' | 'horde' | 'supply_drop';
  title: string;
  description: string;
  dangerLevel: number;
  isEmergency: boolean;
  emergencySeconds?: number;
  soundCue: 'zombie_growl' | 'gunshot' | 'slash' | 'heartbeat' | 'thunder' | 'alarm' | 'loot';
  survivorCandidate?: Companion;
  choices: [RandomEventChoice, RandomEventChoice, RandomEventChoice];
}

// Danh sách đồng đội thực tế đời thực (bác sĩ, chủ tiệm tạp hóa, dược sĩ, thu ngân, thợ sửa xe)
export const REALISTIC_SURVIVOR_ROSTER: Companion[] = [
  {
    id: 'companion_nhauyen',
    name: 'Bác sĩ Nhã Uyên',
    nickname: 'Bác Sĩ Dã Chiến',
    gender: 'female',
    age: 27,
    role: 'Bác sĩ nội trú cấp cứu Bệnh viện',
    personality: 'Điềm tĩnh nhưng dễ ám ảnh tâm lý sau khi chứng kiến bệnh nhân biến dị cắn xé nhau',
    bio: 'Từng trực ca đêm định mệnh tại phòng cấp cứu. Cô mang theo hộp y tế nhỏ và sổ tay phân loại dược phẩm dã chiến.',
    avatar: '👩‍⚕️',
    hp: 80,
    maxHp: 100,
    morale: 75,
    trust: 55,
    affection: 30,
    intimacyLevel: 'stranger',
    status: 'healthy',
    incubation: {
      isInfected: false,
      incubationTurns: 0,
      stage: 'none',
      isQuarantined: false,
      isTreated: false,
    },
    skills: ['Sơ cứu tiệt trùng (Chữa vết thương hở)', 'Phân loại thuốc kháng sinh', 'Băng ép cầm máu'],
    equipment: 'Kéo y tế & Hộp bông băng sát trùng',
    lastComment: 'Nếu có cồn đỏ Povidone, hãy đưa em xử lý vết trầy xước đó ngay trước khi nó mưng mủ.',
    hasBeenRescued: false,
  },
  {
    id: 'companion_thuha',
    name: 'Chị Thu Hà',
    nickname: 'Chủ Tiệm Bách Hóa',
    gender: 'female',
    age: 34,
    role: 'Chủ cửa hàng tạp hóa & Quản lý kho',
    personality: 'Thực dụng, sắc sảo, cảnh giác cao độ và cực kỳ tiết kiệm từng mẩu bánh mì',
    bio: 'Từng quản lý cửa hàng bách hóa gia đình. Chị biết chính xác cách phân loại đồ hộp, ướp muối thịt để không ôi thiu và quản lý kho bãi không thất thoát.',
    avatar: '👩‍💼',
    hp: 85,
    maxHp: 95,
    morale: 80,
    trust: 60,
    affection: 25,
    intimacyLevel: 'stranger',
    status: 'healthy',
    incubation: {
      isInfected: false,
      incubationTurns: 0,
      stage: 'none',
      isQuarantined: false,
      isTreated: false,
    },
    skills: ['Quản lý kho lương (+30% thời gian bảo quản thực phẩm)', 'Ướp muối sấy khô thịt', 'Chắt chiu nước sạch'],
    equipment: 'Sổ ghi chép & Dao gọt hoa quả cán gỗ',
    lastComment: 'Thời tiết nắng gắt thế này thì thịt tươi sẽ bốc mùi sau 2 tiếng đấy. Phải ướp muối hoặc nấu chín ngay!',
    hasBeenRescued: false,
  },
  {
    id: 'companion_lananh',
    name: 'Lan Anh',
    nickname: 'Thu Ngân Siêu Thị',
    gender: 'female',
    age: 22,
    role: 'Cựu nhân viên thu ngân siêu thị tiện lợi',
    personality: 'Nhanh nhẹn, tháo vát, sợ bóng tối nhưng biết mọi đường hầm và kho chứa hàng',
    bio: 'Sống sót nhờ trốn trong ống thông gió siêu thị suốt 4 ngày. Cô biết rõ địa điểm nào trong thành phố còn sót lại đồ hộp nguyên seal và nước đóng chai.',
    avatar: '🎒',
    hp: 75,
    maxHp: 85,
    morale: 70,
    trust: 50,
    affection: 35,
    intimacyLevel: 'stranger',
    status: 'healthy',
    incubation: {
      isInfected: false,
      incubationTurns: 0,
      stage: 'none',
      isQuarantined: false,
      isTreated: false,
    },
    skills: ['Trinh sát siêu thị (Tìm đồ hộp nguyên vẹn)', 'Luồn lách khe hẹp', 'Báo động tiếng động lạ'],
    equipment: 'Đèn pin móc khóa & Balo vải dù',
    lastComment: 'Ở kho sau của tiệm tạp hóa ngõ bên có một thùng nước khoáng còn nguyên kẹp chì đấy anh!',
    hasBeenRescued: false,
  },
  {
    id: 'companion_huonggiang',
    name: 'Hương Giang',
    nickname: 'Dược Sĩ Trẻ',
    gender: 'female',
    age: 26,
    role: 'Dược sĩ nhà thuốc tư nhân',
    personality: 'Cẩn thận, tỉ mỉ, có phần nhút nhát nhưng rất tận tâm khi đồng đội bị thương',
    bio: 'Tốt nghiệp Đại học Dược, hiểu rõ liều lượng kháng sinh amoxicillin, thuốc hạ sốt paracetamol và dung dịch cồn y tế để cứu chữa nhiễm trùng máu.',
    avatar: '💊',
    hp: 70,
    maxHp: 80,
    morale: 75,
    trust: 65,
    affection: 40,
    intimacyLevel: 'stranger',
    status: 'healthy',
    incubation: {
      isInfected: false,
      incubationTurns: 0,
      stage: 'none',
      isQuarantined: false,
      isTreated: false,
    },
    skills: ['Dược liệu dã chiến (Hạ sốt & Chống nhiễm trùng máu)', 'Nhận diện nấm mốc độc hại', 'Pha chế cồn sát trùng'],
    equipment: 'Kẹp gắp y tế & Túi vải đựng thuốc vỉ',
    lastComment: 'Nếu anh thấy vết cào bắt đầu sưng đỏ và nóng ran, phải uống kháng sinh này ngay!',
    hasBeenRescued: false,
  },
  {
    id: 'companion_chunam',
    name: 'Chú Năm Cơ Khí',
    nickname: 'Thợ Hàn Phố Cũ',
    gender: 'male',
    age: 53,
    role: 'Thợ sửa xe máy & Cơ khí dã chiến',
    personality: 'Bộc trực, từng trải, ít nói nhưng bàn tay thô ráp có thể sửa chữa bất cứ thanh sắt nào',
    bio: 'Hơn 30 năm làm nghề sửa xe và hàn xì. Chú có thể rút xăng từ xe ô tô hỏng, hàn gia cố then cài cửa căn cứ và biến xích xe đạp thành bẫy phòng thủ.',
    avatar: '👨‍🔧',
    hp: 95,
    maxHp: 100,
    morale: 85,
    trust: 70,
    affection: 20,
    intimacyLevel: 'stranger',
    status: 'healthy',
    incubation: {
      isInfected: false,
      incubationTurns: 0,
      stage: 'none',
      isQuarantined: false,
      isTreated: false,
    },
    skills: ['Gia cố then cửa thép (+30% Kiên cố căn cứ)', 'Rút xăng từ xác xe bỏ hoang', 'Sửa chữa máy phát điện'],
    equipment: 'Kìm bấm chết cá sấu & Mỏ hàn hơi cũ',
    lastComment: 'Cái cửa gỗ này mỏng lắm, đàn quái mà xô là sập ngay. Để tao đập thêm 2 thanh sắt V nẹp ngang vào!',
    hasBeenRescued: false,
  },
];

export const RANDOM_EVENTS: RandomEvent[] = [
  // ================= 1. GẶP NGƯỜI SỐNG SÓT MỚI (CHỈ KẾT NẠP NẾU CỨU THÀNH CÔNG) =================
  {
    id: 'event_rescue_pharmacist',
    category: 'new_survivor',
    title: 'Tiếng Đập Cửa Khẩn Thiết Trong Nhà Thuốc Vỡ Kính',
    description: 'Bên trong quầy thuốc tây tối om, Một cô gái mặc áo dược sĩ đang bị 2 con zombie cào xé cửa kính tủ thuốc bảo vệ. Cô đang ôm chặt thùng thuốc kháng sinh, tuyệt vọng la hét trong khi tấm kính nứt toác rạn vỡ!',
    dangerLevel: 3,
    isEmergency: true,
    emergencySeconds: 15,
    soundCue: 'heartbeat',
    survivorCandidate: REALISTIC_SURVIVOR_ROSTER[3], // Hương Giang
    choices: [
      {
        id: 'rescue_smash_zombie_knees',
        text: 'Lao vào dùng xà beng đập vỡ xương bánh chè của con quái vật cầm đầu',
        tacticalNote: 'Áp dụng quy tắc vật lý: làm gãy khớp gối khiến nó gục xuống bò lê lết, cứu người an toàn.',
        statImpact: { stamina: -20 },
        itemsGained: [{
          id: 'med_antibiotics_pack',
          name: 'Hộp thuốc kháng sinh Amoxicillin 500mg',
          category: 'medical',
          quantity: 2,
          infectionReduce: 35,
          healAmount: 10,
          description: 'Thuốc kháng sinh đặc trị nhiễm trùng vết thương hở.',
          rarity: 'rare',
        }],
        rescuesCompanion: true, // Kết nạp Hương Giang!
        companionImpact: { trustChange: 35, comment: 'Cảm ơn anh... Nếu anh không đập gãy chân nó, em đã bị cắn rách cổ rồi. Em xin đi theo giúp anh trị thương!' },
        outcomeNarrative: 'Bạn vung mạnh xà beng giáng thẳng vào khớp gối con zombie! Tiếng rắc rợn người vang lên, xương đùi nó gãy gập khiến nó ngã chúi xuống sàn gạch. Bạn bồi thêm một cú dứt khoát kết liễu nó và xua đuổi con còn lại. Cô gái run rẩy bước ra từ quầy thuốc, ánh mắt tràn đầy sự biết ơn.',
      },
      {
        id: 'rescue_throw_bottle_distract',
        text: 'Ném chai thủy tinh sang tòa nhà đối diện để tạo tiếng vang dụ bầy zombie rời đi',
        tacticalNote: 'Lợi dụng thính giác nhạy bén của zombie, không tốn thể lực nhưng thời gian eo hẹp.',
        statImpact: { stamina: -10 },
        rescuesCompanion: true,
        companionImpact: { trustChange: 20, comment: 'Pha đánh lạc hướng rất thông minh... Cảm ơn anh đã cứu em.' },
        outcomeNarrative: 'Tiếng chai vỡ choang vang lên cách đó 30 mét. Lũ zombie lập tức xoay ngoắt đầu và ùa về phía phát ra âm thanh. Bạn kéo cô gái lách qua cửa sổ thoát hiểm an toàn.',
      },
      {
        id: 'rescue_ignore_loot_drugs',
        text: 'Lén lút bò qua quầy thu ngân cướp lấy túi cồn đỏ và bông băng rồi tháo chạy',
        tacticalNote: 'Lựa chọn ích kỷ thực dụng: bảo toàn mạng sống và lấy vật tư y tế, bỏ mặc cô gái.',
        itemsGained: [{
          id: 'med_povidone_bottle',
          name: 'Chai cồn đỏ Povidone sát trùng',
          category: 'medical',
          quantity: 2,
          infectionReduce: 30,
          description: 'Cồn i-ốt dã chiến sát khuẩn vết thương.',
          rarity: 'uncommon',
        }],
        statImpact: { sanity: -15 },
        rescuesCompanion: false, // Không cứu -> Không kết nạp
        outcomeNarrative: 'Bạn ôm chặt túi thuốc sát trùng và lùi ra cửa sau. Tiếng kính vỡ toang và tiếng thét tuyệt vọng nghẹn lại phía sau... Bạn sống sót với đầy đủ thuốc men, nhưng cảm giác tội lỗi đè nặng lên tâm trí.',
      },
    ],
  },
  {
    id: 'event_rescue_mechanic_shop',
    category: 'new_survivor',
    title: 'Thợ Hàn Bị Dồn Vào Góc Xưởng Sửa Xe Máy',
    description: 'Một người thợ sửa xe lớn tuổi đang đứng trên nóc thùng phuy sắt trong xưởng. Phía dưới, 3 con zombie đang cào xé chân thùng phuy làm nó lắc lư sắp đổ. Chú đang lăm lăm mỏ hàn hơi nhưng sắp hết bình ga!',
    dangerLevel: 4,
    isEmergency: true,
    emergencySeconds: 16,
    soundCue: 'alarm',
    survivorCandidate: REALISTIC_SURVIVOR_ROSTER[4], // Chú Năm
    choices: [
      {
        id: 'rescue_kick_obstacle_trip',
        text: 'Đẩy ngã giá để phụ tùng sắt đè bẹp đàn zombie rồi kéo người thợ già xuống',
        tacticalNote: 'Tận dụng quán tính và trọng lực đè bẹp quái vật, giải cứu thợ cơ khí vô giá.',
        statImpact: { stamina: -25 },
        rescuesCompanion: true, // Kết nạp Chú Năm!
        companionImpact: { trustChange: 40, comment: 'Khá lắm cháu trai! Bàn tay cơ khí này từ nay sẽ gia cố căn cứ cho cháu vững như bàn thạch!' },
        newSkillAwarded: {
          name: 'Hàn Xì Cơ Khí Dã Chiến',
          description: 'Tăng 30% hiệu quả khi gia cố then cửa căn cứ và chế tạo bẫy sắt.',
          category: 'craft',
        },
        outcomeNarrative: 'Bạn dốc sức húc đổ chiếc giá sắt nặng hàng trăm cân! Khối kim loại đổ sập xuống nghiền nát cơ thể 3 con zombie dưới sàn. Người thợ già nhảy xuống đất vỗ vai bạn đầy thán phục. Chú đồng ý gia nhập để giúp bạn quản lý máy móc và hàn xì căn cứ.',
      },
      {
        id: 'rescue_fire_gas_torch',
        text: 'Ném can cồn mồi lửa để ngọn lửa bùng lên chặn đường lũ quái vật',
        tacticalNote: 'Tiêu hao vật liệu cháy nhưng an toàn cho bản thân.',
        itemsLost: [{ name: 'Cồn sát trùng', quantity: 1 }],
        statImpact: { stamina: -15 },
        rescuesCompanion: true,
        companionImpact: { trustChange: 25, comment: 'Cảm ơn cậu đã cứu ông già này. Xưởng này còn can xăng máy, tôi sẽ chia cho cậu!' },
        outcomeNarrative: 'Vệt lửa bùng lên khiến lũ zombie bị cháy rụi và lùi lại. Người thợ già chớp thời cơ nhảy qua tường rào cùng bạn rút lui an toàn.',
      },
      {
        id: 'loot_gasoline_leave',
        text: 'Nhanh tay cướp lấy 2 can xăng máy xe rồi quay đầu tháo chạy một mình',
        tacticalNote: 'Lấy được xăng quý giá nhưng bỏ mặc người thợ già.',
        itemsGained: [{
          id: 'gasoline_can_10l',
          name: 'Can xăng máy 10 lít',
          category: 'material',
          quantity: 2,
          description: 'Nhiên liệu chạy máy phát điện hoặc làm chai cháy Molotov.',
          rarity: 'rare',
        }],
        statImpact: { sanity: -20 },
        rescuesCompanion: false,
        outcomeNarrative: 'Bạn vác hai can xăng lên vai và chạy biến vào con ngõ. Tiếng thùng phuy đổ rầm sau lưng... Bạn có nhiên liệu quý giá để chạy máy phát, nhưng mất đi một người thợ hàn tài ba.',
      },
    ],
  },

  // ================= 2. BỊ CƯỚP BÓC VŨ TRANG =================
  {
    id: 'event_raider_ambush_bridge',
    category: 'bandit_ambush',
    title: 'Phục Kích! Băng Cướp Huyết Lang Chặn Cầu Vượt',
    description: 'Từ các thanh dầm cầu gỉ sét, 4 tên cướp đeo mặt nạ rách với súng hoa cải và gậy sắt chặn đầu. "Để hết ba lô thức ăn và can nước lại, hoặc tụi tao sẽ bắn nát đầu từng đứa làm mồi cho zombie!"',
    dangerLevel: 4,
    isEmergency: true,
    emergencySeconds: 15,
    soundCue: 'gunshot',
    choices: [
      {
        id: 'raider_molotov_counter',
        text: 'Ném chai cháy Molotov vào giữa đội hình chúng rồi nổ súng phản công',
        tacticalNote: 'Tạo vùng lửa hỗn loạn làm bỏng rát kẻ địch, đảo ngược tình thế phục kích.',
        itemsLost: [{ name: 'Chai cháy Molotov', quantity: 1 }, { name: 'Đạn súng', quantity: 2 }],
        statImpact: { hp: -15, stamina: -20 },
        itemsGained: [{
          id: 'looted_shotgun',
          name: 'Súng hoa cải tự chế cướp được',
          category: 'weapon',
          quantity: 1,
          damage: 45,
          durability: 80,
          maxDurability: 100,
          description: 'Khẩu súng cướp từ tên đầu sỏ, uy lực cực mạnh ở tầm gần.',
          rarity: 'uncommon',
        }],
        outcomeNarrative: 'Chai cháy vỡ tan, biển lửa bùng lên thiêu rụi áo giáp của tên cầm đầu. Tiếng la hét hỗn loạn vang trời! Bạn cùng đồng đội xả súng áp đảo, hạ gục 2 tên tại chỗ, 2 tên còn lại hoảng loạn tháo chạy để lại chiến lợi phẩm.',
      },
      {
        id: 'raider_deceive_bargain',
        text: 'Ném ra một hộp thịt thiu và túi đạn giả để câu giờ, đồng thời ra hiệu lách người né',
        tacticalNote: 'Chiến thuật lừa dối tâm lý, cần sự ăn ý tuyệt đối.',
        statImpact: { stamina: -15, sanity: +5 },
        outcomeNarrative: 'Tên cướp cúi xuống nhặt hộp thịt với vẻ đắc ý, đúng khoảnh khắc đó bạn lao ra vung gậy sắt quật gãy tay hắn! Những tên còn lại hồn xiêu phách lạc quẳng vũ khí bỏ chạy.',
      },
      {
        id: 'raider_surrender_loot',
        text: 'Chấp nhận giao nộp phân nửa khẩu phần lương thực để bảo toàn mạng sống',
        tacticalNote: 'Tránh hoàn toàn thương tích nhưng mất đi tài nguyên sinh tồn quý báu.',
        itemsLost: [{ name: 'Lương khô quân đội', quantity: 2 }, { name: 'Nước khoáng đóng chai', quantity: 1 }],
        statImpact: { sanity: -15 },
        outcomeNarrative: 'Lũ cướp cười ha hả cầm đồ ăn của bạn rồi rút lui. Bạn an toàn nhưng cái đói và sự cay đắng đè nặng lên tâm trí.',
      },
    ],
  },

  // ================= 3. TẤN CÔNG BẤT NGỜ TỪ MÔI TRƯỜNG =================
  {
    id: 'event_sewer_crawler_ambush',
    category: 'environmental_zombie',
    title: 'Nắp Cống Bật Tung! Zombie Bò Trườn Tấn Công Bàn Chân',
    description: 'Chiếc nắp cống kim loại dưới chân bạn bị hất văng! Một con Zombie Bò Trườn rách toạc da thịt lao thẳng vào cổ chân bạn với những chiếc móng vuốt đen ngòm!',
    dangerLevel: 4,
    isEmergency: true,
    emergencySeconds: 12,
    soundCue: 'zombie_growl',
    choices: [
      {
        id: 'sewer_shotgun_pointblank',
        text: 'Kê nòng súng bắn vỡ sọ con quái vật đang ôm chân bạn trong gang tấc',
        tacticalNote: 'Phản xạ chớp nhoáng chặn đứng việc bị cắn rách da nhiễm trùng.',
        itemsLost: [{ name: 'Đạn súng', quantity: 1 }],
        statImpact: { stamina: -15 },
        outcomeNarrative: 'Đoành! Đầu con quái vật nổ tung thành từng mảnh chất dịch đen ngòm. Máu bắn tung tóe lên ủng bạn. Bạn đạp xác nó xuống cống rồi dùng chân chặn đứng con thứ hai!',
      },
      {
        id: 'sewer_drop_heavy_cover',
        text: 'Dùng xà beng cạy tảng bê tông đè sập nắp cống khóa chặt nó lại',
        tacticalNote: 'Tận dụng trọng lực cơ học không tốn đạn dược.',
        statImpact: { stamina: -25 },
        outcomeNarrative: 'Bằng sức mạnh bộc phát, bạn đẩy tảng bê tông đè chặt nắp cống lại. Tiếng cào cấu bất lực bên dưới lòng cống nghẹt dần.',
      },
      {
        id: 'sewer_dodge_and_retreat',
        text: 'Lộn người lùi lại chấp nhận bị xước nhẹ ở mắt cá chân để giữ khoảng cách',
        tacticalNote: 'Tránh được vết cắn sâu nhưng có vết thương hở cần băng bó ngay.',
        statImpact: { hp: -12 },
        outcomeNarrative: 'Bạn lộn người né tránh, móng vuốt nó sượt qua ống quần làm rách da mắt cá chân chảy máu. Bạn lùi vào vị trí an toàn, nhưng vết thương hở này cần được sát trùng ngay!',
      },
    ],
  },

  // ================= 4. THỜI TIẾT KHẮC NGHIỆT =================
  {
    id: 'event_acid_rain_superstorm',
    category: 'extreme_weather',
    title: 'Cơn Bão Mưa Lớn Đổ Bộ: Nước Ngập Tràn Vào Hầm',
    description: 'Tiếng sấm rền vang và trận mưa xối xả bắt đầu đổ xuống làm tê buốt da thịt. Nước mưa bẩn dâng ngập đến đầu gối trong con ngõ trũng, kéo theo xác động vật và mầm bệnh nguy hiểm!',
    dangerLevel: 3,
    isEmergency: false,
    soundCue: 'thunder',
    choices: [
      {
        id: 'storm_search_sealed_bunker',
        text: 'Dốc toàn lực leo lên tầng 2 của một tòa nhà cao ráo để trú mưa',
        tacticalNote: 'Tránh hoàn toàn nước bẩn ngập úng nhưng tốn nhiều thể lực.',
        statImpact: { stamina: -25, hunger: +10, thirst: +10 },
        outcomeNarrative: 'Cả nhóm chạy đua với dòng nước ngập và đập cửa leo lên tầng 2 một cửa hàng quần áo. Các bạn an toàn và khô ráo, lắng nghe tiếng mưa gầm rú bên ngoài.',
      },
      {
        id: 'storm_collect_rainwater',
        text: 'Dùng bạt nhựa và xô chậu hứng nước mưa sạch để lọc uống dự trữ',
        tacticalNote: 'Bổ sung nguồn nước sạch quý giá cho kho căn cứ.',
        itemsGained: [{
          id: 'rainwater_jug_5l',
          name: 'Can nước mưa đã lắng 5L',
          category: 'food',
          quantity: 2,
          thirstReduce: 40,
          canSpoil: false,
          description: 'Nước mưa hứng sạch, đun sôi lên là uống an toàn.',
          rarity: 'uncommon',
        }],
        statImpact: { stamina: -15 },
        outcomeNarrative: 'Nhờ căng bạt khéo léo, bạn đã thu thập được hơn 10 lít nước mưa tinh khiết. Nguồn nước này giúp giải quyết cơn khát cho cả tuần sắp tới.',
      },
      {
        id: 'storm_brave_elements_scavenge',
        text: 'Lội nước lục soát chiếc xe cứu thương bị trôi dạt giữa ngã tư',
        tacticalNote: 'Rủi ro cảm sốt nhưng cơ hội nhặt được vật tư y tế cao cấp.',
        statImpact: { hp: -10, stamina: -30 },
        itemsGained: [{
          id: 'military_trauma_kit',
          name: 'Hộp cứu thương chấn thương dã chiến nguyên seal',
          category: 'medical',
          quantity: 1,
          healAmount: 50,
          infectionReduce: 40,
          description: 'Hộp cứu thương đặc dụng có đầy đủ morphin, chỉ khâu và gạc cầm máu Celox.',
          rarity: 'rare',
        }],
        outcomeNarrative: 'Bạn dầm mình dưới làn nước lạnh buốt cạy tung cửa sau xe cứu thương. Bàn tay run rẩy chạm vào chiếc hộp cứu thương màu cam còn nguyên niêm phong! Món đồ y tế vô giá này có thể cứu sống bạn trong những giờ khắc đen tối nhất.',
      },
    ],
  },

  // ================= 5. BẦY ZOMBIE TRÀN QUA (CÓ BÁO TRƯỚC QUA RADIO) =================
  {
    id: 'event_horde_night',
    category: 'horde',
    title: 'Bầy Thây Ma Kéo Qua Khu Phố',
    description: 'Mặt đường rung lên từng nhịp. Từ đầu phố, hàng trăm bóng đen lê bước chen chúc nhau, tiếng rên khô khốc nối thành một âm thanh ù ù không dứt. Chúng chưa biết bạn ở đây, nhưng chỉ cần một tiếng động nhỏ là cả bầy sẽ đổ về phía này.',
    dangerLevel: 4,
    isEmergency: true,
    emergencySeconds: 15,
    soundCue: 'heartbeat',
    choices: [
      {
        id: 'horde_hold_silent',
        text: 'Tắt hết ánh sáng, chèn kín cửa và nín thở chờ bầy đi qua',
        tacticalNote: 'Không tốn tài nguyên, nhưng căng thẳng tâm lý kéo dài và thể lực hao mòn vì không dám cử động.',
        statImpact: { sanity: -10, stamina: -10 },
        outcomeNarrative: 'Bạn ép sát lưng vào tường, bịt miệng đồng đội. Tiếng lê bước kéo dài gần một tiếng đồng hồ, có lúc một bàn tay thối rữa cào lên cánh cửa rồi lại trượt đi. Khi tiếng rên xa dần, áo bạn đã ướt đẫm mồ hôi lạnh nhưng không ai bị phát hiện.',
      },
      {
        id: 'horde_lure_with_noise',
        text: 'Ném chiếc đèn pin vỡ sang con phố bên kia để dẫn bầy đi hướng khác',
        tacticalNote: 'Lợi dụng thính giác nhạy bén của zombie, nhưng mất món đồ gây tiếng động và phải chạy nhanh.',
        statImpact: { stamina: -20, sanity: -3 },
        itemsLost: [{ name: 'Đèn pin', quantity: 1 }],
        outcomeNarrative: 'Bạn ném chiếc đèn pin xuống con phố đối diện, nó vỡ toang kèm tiếng loảng xoảng. Cả bầy xoay đầu đồng loạt rồi ùa theo âm thanh. Bạn bò dọc bờ tường sang hướng ngược lại, tim đập như muốn vỡ ra, và thoát khỏi vòng nguy hiểm.',
      },
      {
        id: 'horde_climb_rooftop',
        text: 'Leo lên sân thượng, rút thang sắt lên và quan sát bầy đi qua từ trên cao',
        tacticalNote: 'An toàn nếu còn sức, nhưng cú leo tốn nhiều thể lực và bạn sẽ không kịp cất đồ ở tầng dưới.',
        statImpact: { stamina: -25, hunger: +4 },
        outcomeNarrative: 'Bạn leo vội lên sân thượng, kéo thang sắt lên sau lưng. Từ trên cao, bạn thấy cả dòng người chết đặc quánh chảy qua đại lộ như một con sông tối. Bạn ghi nhớ hướng chúng đi, rồi kiệt sức ngồi bệt xuống trong gió lạnh.',
      },
    ],
  },

  // ================= 6. THÙNG TIẾP TẾ RƠI (CÓ BÁO TRƯỚC QUA RADIO) =================
  {
    id: 'event_supply_drop',
    category: 'supply_drop',
    title: 'Thùng Tiếp Tế Rơi Trên Bãi Đất Trống',
    description: 'Một chiếc dù trắng bạc phơ phất rơi chậm xuống bãi đỗ xe phía sau chợ, kéo theo thùng nhựa quân dụng đập xuống nền đất khô khốc. Tiếng động đủ lớn để mấy bóng người lảo đảo ngoài kia bắt đầu quay đầu. Có thể còn người khác cũng đã nghe thấy tiếng thùng rơi.',
    dangerLevel: 3,
    isEmergency: false,
    soundCue: 'loot',
    choices: [
      {
        id: 'drop_rush_crate',
        text: 'Lao ra ngay, vác thùng chạy về trước khi đám zombie kịp tới',
        tacticalNote: 'Lấy được cả thùng nhưng ồn ào, dễ bị thương và thu hút thêm quái vật.',
        statImpact: { hp: -8, stamina: -25 },
        itemsGained: [
          { id: 'drop_ration_pack', name: 'Lương khô quân đội', category: 'food', quantity: 3, hungerReduce: 40, isSealed: true, canSpoil: false, description: 'Khẩu phần quân đội đóng gói chân không.', rarity: 'uncommon' },
          { id: 'drop_water_ration', name: 'Nước khoáng đóng chai', category: 'food', quantity: 2, thirstReduce: 45, canSpoil: false, description: 'Nước đóng chai niêm phong từ thùng tiếp tế.', rarity: 'uncommon' },
          { id: 'drop_trauma_gauze', name: 'Băng gạc tiệt trùng y tế', category: 'medical', quantity: 2, healAmount: 20, infectionReduce: 15, description: 'Gạc vô trùng dã chiến.', rarity: 'uncommon' },
        ],
        outcomeNarrative: 'Bạn lao qua bãi đỗ xe, ôm trọn thùng nhựa nặng trịch rồi quay đầu chạy. Hai con zombie vồ trượt gấu áo, một con cào rách cánh tay bạn trước khi bạn đóng sập cánh cửa sắt lại. Bên trong thùng là lương khô, nước và băng gạc nguyên seal. Cái giá là vết cào rát bỏng và đôi chân run rẩy.',
      },
      {
        id: 'drop_wait_and_watch',
        text: 'Núp quan sát vài phút cho đám zombie tản đi rồi mới lấy từng món nhẹ',
        tacticalNote: 'Ít rủi ro nhưng chỉ lấy được một phần, có thể có người khác nhanh tay hơn.',
        statImpact: { stamina: -10 },
        itemsGained: [
          { id: 'drop_ration_pack', name: 'Lương khô quân đội', category: 'food', quantity: 2, hungerReduce: 40, isSealed: true, canSpoil: false, description: 'Khẩu phần quân đội đóng gói chân không.', rarity: 'uncommon' },
        ],
        outcomeNarrative: 'Bạn núp sau xe tải gỉ sét, đếm từng nhịp thở. Khi đám zombie bị tiếng chó hoang dụ đi, bạn bò ra mở nắp thùng, chỉ kịp vơ vài gói lương khô rồi rút lui. Phần còn lại đã bị ai đó khác chuyển đi từ lúc nào.',
      },
      {
        id: 'drop_set_trap_ambush',
        text: 'Bỏ qua thùng tiếp tế, ở trên cao canh chừng xem ai sẽ đến lấy rồi tính tiếp',
        tacticalNote: 'Không mất gì, biết thêm về những người xung quanh nhưng bỏ lỡ cơ hội.',
        statImpact: { sanity: -4 },
        outcomeNarrative: 'Bạn nằm yên trên ban công, nhìn qua khe lan can. Một nhóm ba người mặt bịt kín xuất hiện, mở thùng, nhìn quanh đầy cảnh giác rồi lặng lẽ khiêng đi. Không ai biết bạn ở đó. Bạn nhớ được lộ trình của họ nhưng bụng vẫn rỗng.',
      },
    ],
  },
];
