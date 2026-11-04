import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { RANDOM_EVENTS, REALISTIC_SURVIVOR_ROSTER } from './src/data/randomEvents.ts';
import { STORY_MILESTONES } from './src/data/storyBranches.ts';
import { STARTING_SCENARIOS } from './src/data/startingScenarios.ts';
import { BackgroundEffectType, MapLocation } from './src/types/game.ts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: '10mb' }));

// Initialize GoogleGenAI SDK as per gemini-api skill
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// Health / Status endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: !!apiKey,
    model: 'gemini-3.8-flash',
  });
});

// Weather & Background effect helper
const WEATHER_EFFECT_MAP: Record<string, { label: string; effect: BackgroundEffectType }> = {
  clear: { label: 'Trời râm mát yên tĩnh', effect: 'fog_dense' },
  heatwave: { label: 'Nắng gắt hầm hập thiêu đốt (Khát x2, thức ăn nhanh hỏng)', effect: 'sunny_harsh' },
  heavy_rain: { label: 'Mưa lớn xối xả (Thể lực tụt nhanh 20%, nguy cơ cảm sốt)', effect: 'rain_light' },
  freezing_cold: { label: 'Gió lạnh buốt giá tê tái (Thể lực tụt nhanh 20%)', effect: 'thunder_soft' },
  dense_fog: { label: 'Sương mù dày đặc (Tầm nhìn mù tịt, zombie lần theo âm thanh)', effect: 'fog_dense' },
  night_dark: { label: 'Bóng đêm đặc quánh (Buộc dùng đèn hoặc cận chiến)', effect: 'night_dark' },
};

// Generate realistic next-day weather forecast with ~65% accuracy
function generateTomorrowForecast(currentWeather: string) {
  const weathers = ['clear', 'heatwave', 'heavy_rain', 'freezing_cold', 'dense_fog', 'night_dark'];
  const willShift = Math.random() < 0.6;
  const picked = willShift
    ? weathers[Math.floor(Math.random() * weathers.length)]
    : currentWeather;

  const forecastLabels: Record<string, string> = {
    clear: 'Có khả năng trời râm mát, tầm nhìn ổn định',
    heatwave: 'Nguy cơ xuất hiện nắng gắt hầm hập (Thực phẩm hỏng nhanh, khát x2)',
    heavy_rain: 'Dự báo bão mưa lớn xối xả (Thể lực tụt nhanh, nguy cơ cảm sốt)',
    freezing_cold: 'Đợt gió mùa buốt giá tê tái tràn về (Thể lực hao mòn)',
    dense_fog: 'Sương mù dày đặc che khuất tầm nhìn (Zombie nhạy với âm thanh)',
    night_dark: 'Mây đen che kín trời, bóng đêm bao trùm sớm',
  };

  return {
    weather: picked,
    label: forecastLabels[picked] || 'Thời tiết biến động khó đoán',
    accuracyPercent: 65,
  };
}

// Generate realistic map scavenging locations when player lacks key materials
function getDynamicScavengingLocations(missingCategory?: string): MapLocation[] {
  return [
    {
      id: 'loc_hospital_bachmai',
      location_name: 'Bệnh Viện Bạch Mai - Kho Thuốc Khoa Cấp Cứu',
      distance_time: '18 phút luồn lách qua ngõ',
      potential_resources: ['Băng gạc Celox tiệt trùng', 'Cồn đỏ Povidone', 'Kháng sinh Amoxicillin', 'Kim chỉ khâu'],
      danger_level: 4,
      area_type: 'hospital',
      description: 'Nơi tập trung nhiều xác chết nhưng có kho dược liệu vô giá để cứu chữa vết thương hoại tử.',
    },
    {
      id: 'loc_police_station',
      location_name: 'Đồn Công An Phường Cũ - Xe Tải Áp Giải Đổ Nghiêng',
      distance_time: '25 phút bò trườn qua hàng rào sắt',
      potential_resources: ['Súng lục Colt 1911 (Hiếm)', 'Đạn 9mm quân dụng', 'Dao găm đặc chủng', 'Áo giáp chống đâm'],
      danger_level: 4,
      area_type: 'police_station',
      description: 'Nơi có thể tìm thấy súng ống hạng nặng và đạn dược, nhưng có các xác chết cảnh sát còn mang súng.',
    },
    {
      id: 'loc_hardware_store',
      location_name: 'Tiệm Kim Khí & Vật Liệu Xây Dựng Số 8',
      distance_time: '12 phút đi bộ sát chân tường',
      potential_resources: ['Thanh sắt V & Đinh 10 phân', 'Dây kẽm gai', 'Xà beng thép đúc', 'Băng keo bạc dã chiến'],
      danger_level: 2,
      area_type: 'hardware_store',
      description: 'Nguồn vật liệu hoàn hảo để gia cố then cửa căn cứ và chế tạo bẫy phòng thủ.',
    },
    {
      id: 'loc_wholesale_grocer',
      location_name: 'Kho Bách Hóa Lương Thực Bến Xe Giáp Bát',
      distance_time: '20 phút lội qua con đường ngập',
      potential_resources: ['Thùng đồ hộp nguyên seal', 'Nước khoáng đóng chai 5L', 'Muối hạt ướp thực phẩm', 'Gạo đóng bao'],
      danger_level: 3,
      area_type: 'supermarket',
      description: 'Kho chứa đồ hộp dồi dào, cần phá khóa cửa cuốn bằng xà beng hoặc búa sắt.',
    },
  ];
}

// Offline generation helper with realistic sensory writing and physical mechanics
function generateOfflineTurn(turnReq: any) {
  const day = turnReq.day || 1;
  const historyLen = turnReq.history?.length || 0;
  const chosenAction = turnReq.chosenAction || 'Cẩn trọng quan sát';
  const weatherKey = turnReq.weather || 'clear';
  const weatherInfo = WEATHER_EFFECT_MAP[weatherKey] || WEATHER_EFFECT_MAP.clear;

  const isEmergency = Math.random() < 0.28 || turnReq.isEmergency;
  const randomEvent = RANDOM_EVENTS[historyLen % RANDOM_EVENTS.length];

  let outcome = `Bạn đã quyết định: "${chosenAction}". Bạn nín thở, lắng nghe tiếng tim đập thình thịch trong lồng ngực.`;

  // Cross-validation mechanism: if player attempts to use an item they don't have
  const usesGun = ['bắn', 'súng', 'bóp cò', 'colt', 'ak', 'shotgun'].some(w => chosenAction.toLowerCase().includes(w));
  const hasGun = (turnReq.player?.inventory || []).some((i: any) => i.name.toLowerCase().includes('súng') || i.category === 'weapon');
  if (usesGun && !hasGun) {
    outcome = `[THẤT BẠI - THIẾU TRANG BỊ] Bạn hoảng loạn vung tay định bóp cò súng, nhưng sờ vào thắt lưng chỉ thấy túi rỗng không! Balo của bạn hoàn toàn KHÔNG có khẩu súng nào! Cú bóp trượt trong tuyệt vọng khiến bạn sững sờ, con zombie chồm tới xô ngã bạn xuống đất!`;
  } else if (chosenAction.toLowerCase().includes('khớp') || chosenAction.toLowerCase().includes('chân') || chosenAction.toLowerCase().includes('bánh chè')) {
    outcome += ` Cú vung đòn nặng trịch giáng thẳng vào khớp gối con quái vật! Tiếng xương gãy rắc giòn giã, nó ngã quỵ xuống sàn gạch bẩn thỉu và chỉ còn có thể lê lết cánh tay một cách bất lực. Máu đen tanh nồng bắn vương vãi trên nền đất.`;
  } else if (chosenAction.toLowerCase().includes('né') || chosenAction.toLowerCase().includes('quán tính') || chosenAction.toLowerCase().includes('lách')) {
    outcome += ` Do lao đi với tốc độ cao và quán tính quá lớn, con zombie không thể phanh lại kịp. Bạn lách người sang một bên, nó vấp phải bậc thềm gãy và ngã lộn nhào, đập nát đầu vào góc tường bê tông.`;
  } else if (chosenAction.toLowerCase().includes('nấu') || chosenAction.toLowerCase().includes('bếp') || chosenAction.toLowerCase().includes('lửa')) {
    outcome += ` Mùi thơm của thực phẩm chín bốc lên ngào ngạt, đối lập hoàn toàn với cái lạnh buốt và mùi tanh tưởi bên ngoài. Hơi ấm của ngọn lửa sưởi ấm bàn tay đang cóng của bạn.`;
  } else if (chosenAction.toLowerCase().includes('phá khóa') || chosenAction.toLowerCase().includes('loot kỹ')) {
    outcome += ` Tiếng xà beng cạy ken két vang lên chói tai. Bạn cẩn thận lôi ra một chiếc hộp kim loại bám đầy bụi... Mùi dầu súng nồng nàn và cảm giác kim loại lạnh ngắt truyền qua đầu ngón tay khiến tim bạn đập rộn ràng!`;
  } else {
    outcome += ` Bạn thu mình vào góc khuất, thận trọng kiểm tra từng góc nhìn và bảo toàn tài nguyên.`;
  }

  // Check for loot drops
  const itemsGained: any[] = [];
  const lootNotifications: string[] = [];

  if (chosenAction.toLowerCase().includes('loot') || chosenAction.toLowerCase().includes('lục soát') || Math.random() < 0.45) {
    const isRareDrop = Math.random() < 0.12; // 12% high-tier loot drop
    if (isRareDrop) {
      itemsGained.push({
        id: 'high_tier_colt_1911_' + Date.now(),
        name: 'Súng lục Colt 1911 (Đầy băng đạn 7 viên)',
        category: 'weapon',
        quantity: 1,
        damage: 60,
        durability: 95,
        maxDurability: 95,
        rarity: 'rare',
        description: 'Vũ khí quân dụng nguyên bản bám mùi dầu súng, kim loại lạnh toát đầm tay với 7 viên đạn .45 ACP.',
      });
      lootNotifications.push('Súng lục Colt 1911 (7 viên đạn) x1');
    } else {
      itemsGained.push({
        id: 'scavenged_food_' + Date.now(),
        name: 'Đồ hộp thịt lợn hầm (Nguyên seal)',
        category: 'food',
        quantity: 1,
        hungerReduce: 35,
        isSealed: true,
        canSpoil: false,
        description: 'Đồ hộp quân đội nguyên niêm phong, không lo ôi thiu.',
        rarity: 'common',
      });
      lootNotifications.push('Đồ hộp thịt lợn hầm (Nguyên seal) x1');
    }
  }

  // Check if player is low on materials -> unlock scavenging map
  const hasBandages = (turnReq.player?.inventory || []).some((i: any) => i.name.toLowerCase().includes('băng') || i.name.toLowerCase().includes('thuốc'));
  const unlockedMap = !hasBandages ? getDynamicScavengingLocations() : undefined;

  let situation = '';
  let choices: [string, string, string] = [
    'Loot nhanh: Thu gom nhanh các đồ hộp rơi vãi trên sàn rồi rút lui trong im lặng',
    'Loot kỹ: Dùng xà beng cạy tung tủ sắt có khóa dù tạo tiếng động lớn',
    'Tìm kiếm thanh sắt và vật liệu xây dựng để gia cố chốt cửa căn cứ',
  ];

  let systemNote: string | undefined = isEmergency ? 'CẢNH BÁO THỜI GIAN THỰC: Hành động khẩn cấp cần được quyết định ngay trước khi cạn giờ!' : undefined;

  const isWaterCutoff = day >= 7;
  const isPowerBlackout = day >= 10;

  if (isEmergency && randomEvent) {
    situation = `[TÌNH HUỐNG KHẨN CẤP THỜI GIAN THỰC]\n\n${randomEvent.title}\n\n${randomEvent.description}`;
    choices = [
      randomEvent.choices[0].text,
      randomEvent.choices[1].text,
      randomEvent.choices[2].text,
    ];
  } else if (day === 7) {
    situation = `[CỘT MỐC SINH TỬ NGÀY 7 - MẤT NƯỚC TOÀN ĐÔ THỊ]\n\nBạn mở van vòi nước trong góc nhà, nhưng chỉ nghe thấy tiếng rít sặc sụa của không khí khô khốc và vài giọt cặn gỉ sét đỏ quạch rơi tõm xuống lòng bồn. Hệ thống nhà máy cấp nước thành phố đã chính thức sụp đổ hoàn toàn! Mọi vòi nước sinh hoạt đều đã cạn kiệt. Kể từ hôm nay, nước đóng chai và nước mưa là nguồn sống duy nhất.`;
    systemNote = '⚠️ CỘT MỐC NGÀY 7: Hệ thống cấp nước toàn đô thị đã sụp đổ! Tốc độ khát nước tăng +50%.';
  } else if (day === 10) {
    situation = `[CỘT MỐC SINH TỬ NGÀY 10 - LƯỚI ĐIỆN QUỐC GIA SỤP ĐỔ HOÀN TOÀN]\n\nMột tiếng nổ trầm đục vang dội từ phía trạm biến áp cao thế xa xa, kéo theo ánh chớp xanh le lói rồi lịm hẳn. Tiếng quạt thông gió và đèn huỳnh quang chớp tắt lần cuối rồi tắt ngấm. Toàn bộ các cao ốc chọc trời biến thành những nấm mồ bê tông đen đặc trong đêm. Mất điện đồng nghĩa mọi thực phẩm tươi sống trong tủ lạnh dân sự sẽ thối rữa thần tốc nếu căn cứ chưa có máy phát điện riêng!`;
    systemNote = '⚠️ CỘT MỐC NGÀY 10: Lưới điện quốc gia đã sụp đổ vĩnh viễn! Kỷ nguyên đêm tối và hư hỏng thực phẩm bắt đầu.';
  } else {
    situation = `Ngày thứ ${day} tại ${turnReq.currentLocation || 'Khu nhà bỏ hoang'}.${isPowerBlackout ? ' Thành phố chìm trong bóng tối đen đặc không một ánh đèn.' : isWaterCutoff ? ' Không khí ngột ngạt và nguồn nước máy đã cạn kiệt hoàn toàn.' : ''}\n\nKhông khí tĩnh lặng đến nghẹt thở. Mùi ẩm mốc hòa lẫn mùi bùn rỉ sét nồng nặc. Dưới lòng đường, bóng dáng một bầy xác sống đang kéo lê bước chân vô định. Bạn cần đưa ra quyết định thực dụng: tiếp tục tích trữ nhu yếu phẩm hay gia cố căn cứ trước khi đêm đen buông xuống.`;
  }

  // Check Victory (day >= 30 or base 100% fortified)
  const isVictory = day >= 30 || (turnReq.base?.fortification >= 100 && turnReq.base?.facilities?.hasGeneratorAndFridge);

  return {
    outcome,
    situation,
    choices,
    customChoiceAllowed: true,
    dangerLevel: isEmergency ? 4 : isPowerBlackout ? 3 : 2,
    location: turnReq.currentLocation || 'Khu nhà bỏ hoang',
    weather: weatherKey,
    weatherLabel: weatherInfo.label,
    tomorrowForecast: generateTomorrowForecast(weatherKey),
    background_effect: weatherInfo.effect,
    isEmergency: isEmergency,
    emergencySeconds: isEmergency ? 15 : undefined,
    cityWaterCutoff: isWaterCutoff,
    cityPowerBlackout: isPowerBlackout,
    statChanges: {
      hp: isEmergency ? -5 : 0,
      hunger: 6,
      thirst: isWaterCutoff ? 14 : weatherKey === 'heatwave' ? 16 : 8,
      stamina: weatherKey === 'heavy_rain' ? -14 : -9,
      infection: 0,
      sanity: -2,
    },
    itemsGained,
    itemsLost: [],
    loot_notification: lootNotifications,
    unlocked_map_locations: unlockedMap,
    system_note: systemNote,
    companionUpdates: turnReq.companions?.[0] ? [
      {
        name: turnReq.companions[0].name,
        trustChange: 5,
        dialogue: 'Chúng ta nên cẩn thận tiếng cạy tủ... lũ quái có thể nghe thấy từ xa.',
      },
    ] : [],
    game_ending: isVictory ? {
      is_game_over: false,
      is_victory: true,
      epilogue: `Bạn đã sống sót qua ${day} ngày khốc liệt và hoàn thiện Căn Cứ Tự Cung Tự Cấp kiên cố. Kho lương thực dự trữ dồi dào và nguồn nước sạch đã đảm bảo sự an toàn vĩnh viễn cho bạn và những người đồng đội sống sót.`,
    } : undefined,
    soundCue: isEmergency ? 'heartbeat' : (lootNotifications.length > 0 ? 'loot' : 'zombie_growl'),
  };
}

// Start Game Endpoint
app.post('/api/story/start', async (req: Request, res: Response) => {
  const { player, scenarioId, customPrompt } = req.body;
  const playerName = player?.name || 'Kẻ Sinh Tồn';

  const preset = STARTING_SCENARIOS.find(s => s.id === scenarioId);

  // If user provided a custom prompt and Gemini AI is active:
  if (customPrompt && customPrompt.trim() && ai) {
    try {
      const prompt = `Bạn là Quản trò Game Master AI của tựa game RPG sinh tồn Zombie thực tế "Hồi Kết Zombie: Kỷ Nguyên Sinh Tồn".
NGÔN NGỮ: 100% TIẾNG VIỆT TRƠN TRU, RÕ RÀNG, ỔN ĐỊNH.
QUY ĐỊNH BẮT BUỘC:
- TUYỆT ĐỐI KHÔNG chèn mô tả chớp nháy, giật lag hay đèn neon nhấp nháy (tránh mỏi mắt).
- BỐI CẢNH MỞ ĐẦU HOANG TÀN: Đoạn văn mở đầu 'situation' PHẢI miêu tả sinh động cảm giác tiếng còi báo động khẩn cấp đã tắt từ lâu, những chiếc xe kẹt cứng cháy rụi trên đường phố, những tòa cao ốc chọc trời trơ khung rỉ sét, mùi tro tàn và xác thối thoang thoảng trong từng cơn gió buốt, và góc trú ẩn cụ thể trước Lượt 1.
- VĂN PHONG TẢ THỰC GIÁC QUAN: Miêu tả chi tiết mùi ẩm mốc, tiếng kim loại va chạm, hơi thở lạnh buốt, cảm giác gồ ghề của bức tường bê tông.
- MỤC TIÊU: Sinh tồn lâu dài, tìm kiếm đồ hộp, nước sạch, gia cố căn cứ an toàn (không làm anh hùng cứu thế giới).
- ZOMBIE LOGIC: Chân gãy phải bò, chạy nhanh bị quán tính ngã nhào nếu vấp ngã; mắt mờ trong bóng tối/sương mù, cực nhạy với tiếng động và ánh sáng.

THÔNG TIN NGƯỜI CHƠI:
- Tên nhân vật: "${playerName}"
- BỐI CẢNH TỰ NHẬP: "${customPrompt}"

Hãy dựa vào bối cảnh để tạo:
1. situation: Đoạn văn mở đầu sống động, chi tiết về các giác quan, trơn tru rõ ràng, thể hiện sự hoang tàn u ám.
2. location: Địa điểm thực tế.
3. weather: 'clear' | 'heatwave' | 'heavy_rain' | 'freezing_cold' | 'dense_fog' | 'night_dark'.
4. background_effect: 'rain_light' | 'thunder_soft' | 'fog_dense' | 'night_dark' | 'sunny_harsh' (trùng khớp với weather).
5. calculatedItems: 3-4 món đồ thực tế (đồ tươi: canSpoil: true, freshness: 100; đồ hộp: isSealed: true).
6. initialSkills: 2 kỹ năng sinh tồn thiết thực.
7. choices: Đúng 3 lựa chọn AI thực tế.

Trả về DUY NHẤT một chuỗi JSON hợp lệ:
{
  "situation": "Đoạn văn mở đầu...",
  "location": "Tên địa điểm...",
  "weather": "dense_fog",
  "weatherLabel": "Sương mù dày đặc",
  "background_effect": "fog_dense",
  "startingHp": 90,
  "startingStamina": 90,
  "startingSanity": 80,
  "initialSkills": [
    { "id": "s1", "name": "Tên kỹ năng", "description": "Mô tả", "category": "survival", "level": 1 }
  ],
  "calculatedItems": [
    { "id": "it1", "name": "Tên món", "category": "weapon", "quantity": 1, "damage": 30, "rarity": "common", "description": "..." }
  ],
  "choices": ["Lựa chọn 1", "Lựa chọn 2", "Lựa chọn 3"],
  "soundCue": "zombie_growl"
}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsed = JSON.parse(response.text || '{}');
      const wKey = parsed.weather || 'dense_fog';
      const wInfo = WEATHER_EFFECT_MAP[wKey] || WEATHER_EFFECT_MAP.dense_fog;

      return res.json({
        situation: parsed.situation,
        location: parsed.location || 'Khu vực trú ẩn ban đầu',
        weather: wKey,
        weatherLabel: parsed.weatherLabel || wInfo.label,
        tomorrowForecast: generateTomorrowForecast(wKey),
        background_effect: parsed.background_effect || wInfo.effect,
        startingHp: parsed.startingHp || 90,
        startingStamina: parsed.startingStamina || 90,
        startingSanity: parsed.startingSanity || 80,
        initialSkills: parsed.initialSkills || [],
        calculatedItems: parsed.calculatedItems || [],
        choices: parsed.choices || [
          'Lục soát nhanh tìm kiếm thêm đồ hộp và nước uống',
          'Tìm kiếm vật liệu gỗ sắt gia cố cửa nẻo',
          'Lén lút di chuyển trinh sát xung quanh',
        ],
        customChoiceAllowed: true,
        dangerLevel: 2,
        soundCue: parsed.soundCue || 'zombie_growl',
      });
    } catch (err: any) {
      console.error('Error generating custom start with Gemini:', err?.message);
    }
  }

  // Fallback to preset
  const chosenPreset = preset || STARTING_SCENARIOS[0];
  const wInfo = WEATHER_EFFECT_MAP[chosenPreset.initialWeather] || WEATHER_EFFECT_MAP.clear;

  // Add evocative desolate opening sensory prelude to preset
  const evocativePrelude = 'Tiếng còi báo động khẩn cấp của chính phủ đã im bặt từ nhiều ngày trước. Bên ngoài, những hàng dài xe hơi cháy rụi nằm chồng chất ngổn ngang trên đại lộ, những tòa cao ốc chọc trời sừng sững trơ khung kim loại rỉ sét xám ngoét. Mùi tro tàn khét lẹt hòa lẫn mùi xác thối phân hủy thoang thoảng theo từng cơn gió buốt lạnh. Trong góc trú ẩn ẩm thấp này, ';
  const enrichedSituation = evocativePrelude + chosenPreset.openingNarrative.charAt(0).toLowerCase() + chosenPreset.openingNarrative.slice(1);

  return res.json({
    situation: enrichedSituation,
    location: chosenPreset.startingLocation,
    weather: chosenPreset.initialWeather,
    weatherLabel: chosenPreset.weatherLabel,
    tomorrowForecast: generateTomorrowForecast(chosenPreset.initialWeather),
    background_effect: wInfo.effect,
    startingHp: chosenPreset.startingHp,
    startingStamina: chosenPreset.startingStamina,
    startingSanity: chosenPreset.startingSanity,
    initialSkills: chosenPreset.initialSkills,
    calculatedItems: chosenPreset.initialItems,
    choices: [
      'Lục soát xung quanh để thu thập thức ăn và vật dụng y tế',
      'Tìm vật liệu gia cố cửa nẻo chặn đường bầy quái',
      'Thăm dò các lối thoát hiểm bí mật',
    ],
    customChoiceAllowed: true,
    dangerLevel: 2,
    soundCue: 'zombie_growl',
  });
});

// Turn Processing Endpoint
app.post('/api/story/turn', async (req: Request, res: Response) => {
  const {
    player,
    base,
    companions,
    history,
    chosenAction,
    actionType,
    currentLocation,
    day,
    weather,
    worldFlags,
    systemTrigger,
  } = req.body;

  // Compute realistic weather transitions occasionally
  const weatherKeys = Object.keys(WEATHER_EFFECT_MAP);
  const shouldChangeWeather = Math.random() < 0.35;
  const nextWeatherKey = shouldChangeWeather
    ? weatherKeys[Math.floor(Math.random() * weatherKeys.length)]
    : weather || 'clear';
  const nextWeatherInfo = WEATHER_EFFECT_MAP[nextWeatherKey] || WEATHER_EFFECT_MAP.clear;

  const baseLocationType = base?.base_type || (currentLocation?.toLowerCase().includes('quân sự') ? 'Military Base' : 'Apartment');

  // Calculate or preserve active system trigger
  let activeSystemTrigger = systemTrigger || null;
  if (!activeSystemTrigger) {
    if (nextWeatherKey === 'heavy_rain' && Math.random() < 0.2) {
      activeSystemTrigger = 'Weather: Heavy Storm';
    } else if ((day || 1) >= 4 && (Math.random() < (baseLocationType === 'Military Base' ? 0.38 : 0.14))) {
      activeSystemTrigger = 'Event: Horde Attack';
    }
  }

  if (!ai) {
    const fallback = generateOfflineTurn({
      ...req.body,
      weather: nextWeatherKey,
      systemTrigger: activeSystemTrigger,
    });
    return res.json(fallback);
  }

  try {
    const historySummary = (history || [])
      .slice(-3)
      .map((h: any, i: number) => `Lượt ${i + 1}: Hành động: "${h.selectedChoice}" -> Kết quả: "${h.outcome?.slice(0, 95)}..."`)
      .join('\n');

    const currentInventory = (player?.inventory || []).map((it: any) => ({
      name: it.name,
      quantity: it.quantity,
      category: it.category,
      freshness: it.freshness,
      canSpoil: it.canSpoil,
      isSealed: it.isSealed,
    }));

    const currentSkills = (player?.skills || []).map((sk: any) => ({
      name: sk.name,
      category: sk.category,
      level: sk.level,
    }));

    const activeWorldFlags = worldFlags || {
      rescued_pharmacist: (companions || []).some((c: any) => c.name.includes('Giang')),
      rescued_doctor: (companions || []).some((c: any) => c.name.includes('Uyên')),
      has_safe_base: !!base?.hasBase,
      base_location: baseLocationType,
    };

    const globalState = {
      day: day || 1,
      current_location: currentLocation || 'Khu nhà bỏ hoang',
      base_location: baseLocationType,
      character: {
        name: player?.name || 'Kẻ Sinh Tồn',
        origin: player?.backgroundTitle || 'Dân thường',
        hp: player?.stats?.hp,
        max_hp: player?.stats?.maxHp,
        hunger: player?.stats?.hunger,
        thirst: player?.stats?.thirst,
        infection: player?.stats?.infection,
        sanity: player?.stats?.sanity,
        stamina: player?.stats?.stamina,
        is_feverish: !!player?.stats?.isFeverish,
        wound: player?.wound?.hasOpenWound ? `${player.wound.locationOnBody} (${player.wound.status})` : 'none',
      },
      inventory: currentInventory,
      skills: currentSkills,
      world_flags: activeWorldFlags,
      companions: (companions || []).map((c: any) => ({
        name: c.name,
        role: c.role,
        hp: c.hp,
        morale: c.morale,
        trust: c.trust,
        affection: c.affection || 0,
        status: c.status,
        incubation: c.incubation?.isInfected ? {
          turns: c.incubation.incubationTurns,
          stage: c.incubation.stage,
          quarantined: c.incubation.isQuarantined,
          treated: c.incubation.isTreated,
        } : null,
      })),
    };

    const prompt = `Bạn là một hàm xử lý thuần túy (Pure Function) quản trò AI của tựa game RPG sinh tồn Zombie thực tế "Hồi Kết Zombie: Kỷ Nguyên Sinh Tồn".
NGÔN NGỮ: BẮT BUỘC 100% TIẾNG VIỆT TRƠN TRU, RÕ RÀNG, ỔN ĐỊNH.

# 1. KIỂM SOÁT BỘ NHỚ VÀ TRẠNG THÁI (QUẢN LÝ ĐỐT TOKEN)
- Bạn không sở hữu bộ nhớ dài hạn của trò chơi. Dưới đây là "global_state" (nguồn sự thật duy nhất về chỉ số, balo, và các cột mốc) và "local_context" (ngữ cảnh ngắn hạn gần nhất).
- Hãy tin tưởng hoàn toàn vào dữ liệu trong "global_state". Đây là nguồn sự thật duy nhất về chỉ số, balo (inventory), và các cột mốc (flags) của nhân vật.
- Tuyệt đối không tự bịa ra vật phẩm hoặc sự kiện mâu thuẫn với dữ liệu trong "global_state".

# 2. KHUNG LUẬT THẾ GIỚI & CHẶN THAO TÚNG (GUARDRAILS)
- Hiện thực khốc liệt: Mọi hành động đều có cái giá của nó. Không có ngày nào an toàn, không có cơ chế hồi phục kỳ diệu kiểu tiên hiệp.
- Cơ chế chống chết bất đắc kỳ tử: Tuyệt đối không đột ngột giết chết nhân vật ở giai đoạn đầu (từ Ngày 1 đến Ngày 15) trừ khi người chơi liên tục chọn các option cực kỳ nguy hiểm khi lượng HP đã quá thấp. Hãy ưu tiên gây chấn thương, trừ điểm tinh thần (Sanity), hoặc bào mòn tài nguyên (thức ăn/nước uống/đạn dược) để trừng phạt các lựa chọn sai lầm.
- Quy tắc sinh tồn của NPC Nữ: Khi tạo ra hoặc cho người chơi đụng độ survivor/bạn đồng hành là nữ, hãy phân bổ kỹ năng của họ một cách thực tế dựa trên sự thích nghi sinh tồn. Ưu tiên các kỹ năng hậu cần thiết yếu, lén lút, y tế, hoặc nấu nướng/quản lý kho thay vì cho họ thành thục các loại súng quân sự hạng nặng (trừ khi có flag cốt truyện đặc biệt chứng minh lý lịch của họ).
- Định dạng đầu ra bắt buộc: Bạn CHỈ ĐƯỢC PHÉP trả về một đối tượng JSON hợp lệ duy nhất theo cấu trúc yêu cầu. Không kèm theo lời thoại dẫn dắt của AI, không bọc trong thẻ định dạng markdown (như \`\`\`json), không viết thêm ghi chú ngoài JSON.

# 3. CƠ CHẾ KIỂM TRA CHÉO (VALIDATION MECHANISM)
- Bạn phải đối chiếu hành động nhập vào của người chơi: "${chosenAction}" với danh sách vật phẩm trong "global_state.inventory" và kỹ năng trong "global_state.skills".
- Nếu người chơi cố tình chọn một hành động sử dụng vật phẩm họ không có (Ví dụ: Chọn bắn súng lục trong khi balo không có súng hoặc có súng nhưng 0 đạn, chọn băng bó khi không có gạc tiệt trùng), bạn phải xử lý lựa chọn đó theo hướng THẤT BẠI: súng bị kẹt, bóp cò chỉ nghe tiếng cạch khô khốc, hoặc súng đã rơi mất, khiến nhân vật rơi vào trạng thái hoảng loạn (-Sanity) hoặc bị zombie phản công ngay lập tức!

# 4. THAY ĐỔI BỐI CẢNH VÀ ĐỊA HÌNH TỰ ĐỘNG
Căn cứ / Địa hình hiện tại: "${baseLocationType}"
- Nếu "Apartment" (Chung cư/Nhà dân): Chỉ số ẩn nấp (stealth) cao, nhưng khả năng phòng thủ trước các đợt bầy đàn (horde) thấp, vật phẩm nhặt được chủ yếu là đồ nhu yếu phẩm dân sự cấp thấp.
- Nếu "Military Base" (Căn cứ quân sự): Nhặt được vũ khí hạng nặng cấp cao (Ví dụ: mìn định hướng Claymore, súng trường), tường phòng thủ kiên cố, nhưng độ nguy hiểm và rủi ro bị tấn công tăng x3. Nơi này cực kỳ thu hút các siêu bầy đàn (Massive Hordes) do tiếng ồn cơ khí, còi báo động tự động kích hoạt hoặc các dải sóng tần số quân đội còn sót lại.

# 5. SỰ KIỆN KÍCH HOẠT HỆ THỐNG (TRIGGER EVENT)
${activeSystemTrigger ? `[TRIGGER HỆ THỐNG KHẨN CẤP]: "${activeSystemTrigger}". BẮT BUỘC bạn phải lập tức bẻ lái mạch truyện ép người chơi phải đối phó trực tiếp với mối đe dọa này, đè lên các vòng lặp khám phá thông thường!` : `Không có trigger hệ thống đặc biệt.`}

# 6. CỘT MỐC MÔI TRƯỜNG ĐÔ THỊ SỤP ĐỔ (BẮT BUỘC THEO DÕI THEO NGÀY):
- NGÀY THỨ 7 MẤT NƯỚC TOÀN THÀNH PHỐ (DAY 7 WATER CUTOFF):
  + Hiện tại đang là Ngày ${day || 1}.
  + Nếu global_state.day >= 7: Hệ thống nhà máy xử lý nước và đường ống cấp nước toàn thành phố đã ngừng hoạt động hoàn toàn. Mọi vòi nước sinh hoạt trong mọi tòa nhà đều cạn khô, chỉ còn tiếng rít khan rỗng tuếch hoặc vài giọt cặn gỉ sét. Người chơi chỉ còn có thể tìm nước đóng chai, nước mưa, hoặc nước bẩn đun sôi. Tốc độ mất nước (Thirst) tăng +12 đến +16 mỗi lượt!
  + Nếu global_state.day === 7 (hoặc vừa chạm Ngày 7): Đoạn văn "situation" hoặc "outcome" BẮT BUỘC PHẢI miêu tả sự bàng hoàng khi người chơi phát hiện vòi nước đã cạn kiệt, đánh dấu kỷ nguyên khát nước tàn khốc, và đặt "system_note": "⚠️ CỘT MỐC NGÀY 7: Hệ thống cấp nước toàn đô thị đã sụp đổ hoàn toàn!".
- NGÀY THỨ 10 CẮT ĐIỆN TOÀN THÀNH PHỐ (DAY 10 ELECTRICAL BLACKOUT):
  + Nếu global_state.day >= 10: Toàn bộ lưới điện quốc gia đã sụp đổ vĩnh viễn (Total Blackout). Không còn trạm biến áp, đèn đường hay thang máy nào hoạt động. Toàn thành phố chìm trong bóng tối đen đặc nguyên thủy. Mọi tủ lạnh gia đình đều mất điện: thực phẩm tươi sống (thịt, cá, đồ tươi) không có máy phát điện sẽ ôi thiu thối rữa với tốc độ phi mã! Độ nguy hiểm ban đêm tăng thêm (+1 Danger).
  + Nếu global_state.day === 10 (hoặc vừa chạm Ngày 10): Đoạn văn "situation" hoặc "outcome" BẮT BUỘC PHẢI miêu tả tiếng biến áp nổ đục phía xa, ánh đèn cao áp cuối cùng vụt tắt, bóng tối nuốt trọn thành phố, và đặt "system_note": "⚠️ CỘT MỐC NGÀY 10: Lưới điện quốc gia sụp đổ vĩnh viễn - Kỷ nguyên đêm tối và hư hỏng thực phẩm bắt đầu!".

# 7. QUY ĐỊNH BẮT BUỘC VỀ LOOT NOTIFICATION VÀ BACKGROUND:
- Khi người chơi thu thập/loot/chế tạo được bất kỳ vật phẩm nào, BẮT BUỘC xuất ra mảng "loot_notification": ["Tên vật phẩm + Số lượng"] (Ví dụ: ["Súng lục Colt 1911 x1", "Đồ hộp thịt lợn hầm x2", "Băng gạc tiệt trùng x1"]) để giao diện kích hoạt hiệu ứng pop-up trượt từ cạnh màn hình lên!
- Trong "background_effect", BẮT BUỘC trả về hiệu ứng đồng bộ chuẩn xác với thời tiết: "rain_light" (mưa nhẹ), "thunder_soft" (bão sấm chớp), "fog_dense" (sương mù dày), "night_dark" (đêm tối), "sunny_harsh" (nắng gắt gay gắt).

# QUY TẮC PHÂN TÍCH TRẠNG THÁI (TUYỆT ĐỐI KHÔNG BỊA ĐẶT)
1. Bạn là một hàm xử lý thuần túy (Pure Function). Bạn chỉ được phép đọc dữ liệu từ đối tượng JSON "global_state" được cung cấp ở đầu vào để phân tích bối cảnh.
2. KHÔNG TỰ BỊA VẬT PHẨM: Nếu một vật phẩm không nằm trong mảng "global_state.inventory", người chơi hoàn toàn không có nó. Nếu họ chọn hành động sử dụng vật phẩm đó, hãy xử lý thất bại ngay lập tức (Ví dụ: kiểm tra balo không thấy vũ khí).
3. KHÔNG TỰ BỊA CỘT MỐC: Mọi mối quan hệ, sự kiện lịch sử phải dựa vào các khóa true/false trong "global_state.world_flags". Nếu khóa không tồn tại hoặc bằng false, coi như sự kiện đó chưa từng diễn ra trong thế giới game.
4. CƠ CHẾ Ủ BỆNH ẨN Ở ĐỒNG ĐỘI:
   - Nếu có đồng đội nhiễm trùng ẩn (isInfected: true) và chưa bị cách ly:
     + Lượt 1-3 sau khi cứu: Cài cắm khéo léo triệu chứng sốt nhẹ, mệt mỏi, đổ mồ hôi trộm, cổ họng khô khát liên tục uống nước vào hội thoại hoặc hành vi.
     + Lượt 4-5: Cảnh báo phát tác nguy cấp: sốt cao mê sảng, đồng tử giãn, đường gân đen nổi rõ quanh cổ, vết cào rỉ máu đen.
   - Nếu người chơi trói / cách ly họ: Giảm lòng tin (-15) nhưng bảo toàn an toàn cho căn cứ.
   - Nếu người chơi tiêm kháng sinh liều cao & cồn đỏ: Bày tỏ xúc động, tăng lòng tin (+20) và ức chế ủ bệnh.
5. TƯƠNG TÁC TÌNH CẢM & XÃ HỘI (AFFECTION & ROMANCE):
   - Nếu người chơi tán tỉnh / trêu đùa: Đáp lại với tâm lý học thực tế của người đối diện (e thẹn, bất ngờ, hoặc cảnh giác nếu chưa thân thiết), tăng affectionChange (+5 đến +10).
   - Nếu người chơi tặng quà: Tăng mạnh affectionChange (+15 đến +25) và trustChange (+10).
   - Nếu người chơi ngỏ lời yêu thương / đề nghị thân mật tại căn cứ an toàn khi thiện cảm cao: Khắc họa khoảnh khắc gắn kết thiêng liêng, sưởi ấm tâm hồn giữa thời tận thế.
6. ĐIỀU KIỆN THẮNG / THUA:
   - Thua nếu HP <= 0 hoặc Sanity <= 0.
   - Thắng nếu Day >= 30 hoặc Căn cứ kiên cố 100% có đầy đủ tiện nghi tự cung tự cấp. Khi Thắng, viết đoạn Vĩ thanh (epilogue) cảm động.

DỮ LIỆU ĐẦU VÀO:
=== global_state ===
${JSON.stringify(globalState, null, 2)}

=== local_context (Lịch sử ngắn hạn) ===
${historySummary || 'Lượt 1: Mới bắt đầu cuộc phiêu lưu sinh tồn.'}

HÀNH ĐỘNG CỦA NGƯỜI CHƠI: "${chosenAction}" (Loại: ${actionType || 'choice'})
THỜI TIẾT HIỆN TẠI: "${nextWeatherInfo.label}" (Mã: ${nextWeatherKey})

Trả về DUY NHẤT một JSON hợp lệ (không kèm theo bất kỳ văn bản nào khác):
{
  "outcome": "Diễn biến kết quả chi tiết tả thực giác quan bằng tiếng Việt...",
  "situation": "Tình huống tiếp theo bằng tiếng Việt...",
  "choices": ["Lựa chọn 1", "Lựa chọn 2", "Lựa chọn 3"],
  "customChoiceAllowed": true,
  "dangerLevel": 2,
  "location": "${currentLocation || 'Khu nhà bỏ hoang'}",
  "weather": "${nextWeatherKey}",
  "weatherLabel": "${nextWeatherInfo.label}",
  "tomorrowForecast": {
    "weather": "heavy_rain",
    "label": "Có khả năng mưa lớn xối xả (Độ chính xác ~65%)",
    "accuracyPercent": 65
  },
  "background_effect": "${nextWeatherInfo.effect}",
  "isEmergency": false,
  "emergencySeconds": 15,
  "system_trigger": ${activeSystemTrigger ? `"${activeSystemTrigger}"` : "null"},
  "statChanges": {
    "hp": 0,
    "hunger": 6,
    "thirst": 8,
    "infection": 0,
    "sanity": -2,
    "stamina": -9
  },
  "woundChange": null,
  "itemsGained": [],
  "itemsLost": [],
  "loot_notification": [],
  "unlocked_map_locations": null,
  "system_note": null,
  "companionUpdates": [],
  "newCompanion": null,
  "newSkill": null,
  "discoveredBase": null,
  "game_ending": null,
  "soundCue": "zombie_growl"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const eff = parsed.background_effect || nextWeatherInfo.effect;

    return res.json({
      outcome: parsed.outcome || `Bạn đã thực hiện: "${chosenAction}". Bạn bình tĩnh xử lý tình huống theo tư duy sinh tồn thực tế.`,
      situation: parsed.situation || `Bầu không khí căng thẳng bao trùm. Bạn phải tiếp tục tính toán đường đi nước bước để duy trì nguồn nhu yếu phẩm.`,
      choices: parsed.choices && parsed.choices.length === 3 ? parsed.choices : [
        'Loot nhanh: Thu gom nhanh các đồ hộp rơi vãi trên sàn rồi rút lui',
        'Loot kỹ: Dùng xà beng cạy tung hòm sắt dù tạo tiếng động lớn',
        'Tìm kiếm thanh sắt và vật liệu xây dựng để gia cố chốt cửa',
      ],
      customChoiceAllowed: true,
      dangerLevel: parsed.dangerLevel || 2,
      location: parsed.location || currentLocation || 'Khu nhà bỏ hoang',
      weather: parsed.weather || nextWeatherKey,
      weatherLabel: parsed.weatherLabel || nextWeatherInfo.label,
      tomorrowForecast: parsed.tomorrowForecast || generateTomorrowForecast(nextWeatherKey),
      background_effect: eff,
      isEmergency: !!parsed.isEmergency,
      emergencySeconds: parsed.emergencySeconds || 15,
      statChanges: parsed.statChanges || { hunger: 6, thirst: 8, stamina: -9 },
      woundChange: parsed.woundChange || null,
      itemsGained: parsed.itemsGained || [],
      itemsLost: parsed.itemsLost || [],
      loot_notification: parsed.loot_notification || [],
      unlocked_map_locations: parsed.unlocked_map_locations || undefined,
      system_note: parsed.system_note || undefined,
      companionUpdates: parsed.companionUpdates || [],
      newCompanion: parsed.newCompanion || undefined,
      newSkill: parsed.newSkill || undefined,
      discoveredBase: parsed.discoveredBase || undefined,
      game_ending: parsed.game_ending || undefined,
      soundCue: parsed.soundCue || (parsed.isEmergency ? 'alarm' : 'zombie_growl'),
    });
  } catch (err: any) {
    console.error('Error in /api/story/turn with Gemini:', err?.message);
    const fallback = generateOfflineTurn({
      ...req.body,
      weather: nextWeatherKey,
    });
    return res.json(fallback);
  }
});

// Custom Crafting evaluation endpoint
app.post('/api/story/craft', async (req: Request, res: Response) => {
  const { itemName, materials, description } = req.body;

  if (!ai) {
    return res.json({
      success: true,
      resultItem: {
        id: 'custom_crafted_' + Date.now(),
        name: itemName,
        category: 'weapon',
        quantity: 1,
        damage: 42,
        durability: 85,
        maxDurability: 85,
        rarity: 'rare',
        description: description || 'Vũ khí tự chế sáng tạo từ phế liệu và các linh kiện thu thập được.',
      },
      evaluation: `Bạn đã kết hợp khéo léo các nguyên liệu để chế tạo ${itemName}. Thiết kế này mang tính thực tế cao cho việc tự vệ!`,
    });
  }

  try {
    const prompt = `Người chơi trong game sinh tồn Zombie vừa chế tạo một món đồ:
Tên món: "${itemName}"
Vật liệu: "${materials}"
Cơ chế & Ý tưởng: "${description}"

Hãy thẩm định độ thực dụng ngoài đời thực của món đồ bằng TIẾNG VIỆT (chú ý logic vật lý, tính khả thi).
Tính toán chỉ số hợp lý (damage: 25-65, durability: 40-95).
Trả về JSON duy nhất:
{
  "success": true,
  "resultItem": {
    "name": "${itemName}",
    "category": "weapon",
    "damage": 42,
    "durability": 80,
    "maxDurability": 80,
    "rarity": "rare",
    "description": "Mô tả chất lượng dã chiến bằng tiếng Việt..."
  },
  "evaluation": "Nhận xét thực tế của AI về độ bền và tính thực dụng..."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json({
      success: true,
      resultItem: {
        id: 'crafted_' + Date.now(),
        name: parsed.resultItem?.name || itemName,
        category: parsed.resultItem?.category || 'weapon',
        quantity: 1,
        damage: parsed.resultItem?.damage || 40,
        durability: parsed.resultItem?.durability || 80,
        maxDurability: parsed.resultItem?.maxDurability || 80,
        rarity: parsed.resultItem?.rarity || 'rare',
        description: parsed.resultItem?.description || description,
      },
      evaluation: parsed.evaluation || `Chế tạo thành công ${itemName}!`,
    });
  } catch (err: any) {
    console.error('Error in /api/story/craft:', err?.message);
    return res.json({
      success: true,
      resultItem: {
        id: 'fallback_crafted_' + Date.now(),
        name: itemName,
        category: 'weapon',
        quantity: 1,
        damage: 38,
        durability: 75,
        maxDurability: 75,
        rarity: 'uncommon',
        description: description || 'Vũ khí dã chiến chắc chắn.',
      },
      evaluation: `Chế tạo thành công ${itemName}.`,
    });
  }
});

// Setup Vite middleware in dev or static files in prod
async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on port ${port} (prod: ${isProd})`);
  });
}

startServer();
