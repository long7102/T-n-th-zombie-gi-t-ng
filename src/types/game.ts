export type WeatherType =
  | 'clear'          // Trời râm mát, ổn định
  | 'heatwave'       // Nắng gắt thiêu đốt (Khát x2, thực phẩm hỏng nhanh)
  | 'heavy_rain'     // Mưa lớn xối xả (Thể lực tụt nhanh 20%, nguy cơ cảm sốt)
  | 'freezing_cold'  // Gió lạnh buốt giá (Thể lực tụt nhanh 20%, cóng tay)
  | 'dense_fog'      // Sương mù dày đặc (Giảm tầm nhìn, zombie chỉ nghe tiếng động)
  | 'night_dark';    // Đêm đen tĩnh mịch (Tầm nhìn mù, buộc dùng đèn hoặc cận chiến)

export type BackgroundEffectType =
  | 'rain_light'
  | 'thunder_soft'
  | 'fog_dense'
  | 'night_dark'
  | 'sunny_harsh';

export interface WeatherForecast {
  weather: WeatherType;
  label: string;
  accuracyPercent: number; // VD: 60-70% (độ chính xác không cao để người chơi phải chuẩn bị nhiều phương án)
}

export interface StatBlock {
  hp: number;
  maxHp: number;
  lockedMaxHp?: number; // Bị khóa trần HP khi nhiễm trùng máu
  hunger: number;       // 0 = no, 100 = chết đói
  thirst: number;       // 0 = đủ nước, 100 = chết khát
  infection: number;    // 0% = sạch, 100% = biến dị
  sanity: number;       // 100 = tỉnh táo, 0 = hoảng loạn/điên
  stamina: number;      // 100 = sung mãn, 0 = kiệt sức
  maxStamina: number;   // Có thể bị tụt xuống 70% khi sốt lạnh
  isFeverish?: boolean; // Bị cảm sốt do mưa lạnh
}

export type SkillCategory = 'combat' | 'survival' | 'craft' | 'mental';

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  level: number;
  unique?: boolean;
}

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic';
export type ItemCategory = 'weapon' | 'ammo' | 'medical' | 'food' | 'material' | 'tool' | 'special' | 'gift';

export interface Item {
  id: string;
  name: string;
  category: ItemCategory;
  quantity: number;
  durability?: number;
  maxDurability?: number;
  damage?: number;
  defense?: number;
  healAmount?: number;
  hungerReduce?: number;
  thirstReduce?: number;
  infectionReduce?: number;
  sanityRestore?: number;
  affectionBonus?: number; // Tặng quà tăng điểm thiện cảm
  description: string;
  rarity: ItemRarity;
  iconName?: string;

  // Thuộc tính bảo quản & ôi thiu thực phẩm
  freshness?: number;     // 100 = tươi mới, <30 = ôi thiu
  canSpoil?: boolean;     // Thực phẩm tươi, thịt, đồ nấu chín
  isSealed?: boolean;     // Đồ hộp nguyên kẹp chì (không hỏng cho đến khi mở)
  isCooked?: boolean;     // Đã được nấu chín an toàn
  isDried?: boolean;      // Thịt sấy khô / ướp muối bảo quản lâu dài
}

export interface WoundState {
  hasOpenWound: boolean;
  status: 'none' | 'open' | 'inflamed' | 'septic'; // Hở -> Sưng mủ -> Nhiễm trùng máu
  turnsUnchecked: number; // Số lượt chưa xử lý y tế
  locationOnBody: string; // Vết cào ở bắp tay, rách đùi, trầy sườn...
}

export interface BaseCamp {
  hasBase: boolean;
  name: string;
  location: string;
  description: string;
  fortification: number;  // 0 - 100% (Độ kiên cố chống bầy zombie xô đẩy)
  base_type?: 'Apartment' | 'Military Base' | 'Civilian Shelter' | 'Nomad';
  warehouse: Item[];      // Kho chứa an toàn trong căn cứ
  facilities: {
    hasStove: boolean;           // Bếp dã chiến nấu ăn
    hasFoamBox: boolean;         // Thùng xốp ướp muối giảm hỏng
    hasGeneratorAndFridge: boolean; // Máy phát điện + Tủ lạnh cũ (dừng phân hủy)
    hasTripwireAlarms: boolean;  // Bẫy chuông cảnh báo cướp/zombie
  };
}

export interface InfectionIncubation {
  isInfected: boolean;       // Có bị nhiễm trùng ẩn không
  incubationTurns: number;   // Số lượt ủ bệnh (1-3: sốt trộm, khát khô; 4-5: gân đen, rỉ máu đen; >5: biến đổi)
  stage: 'none' | 'hidden' | 'symptomatic' | 'transformed';
  isQuarantined: boolean;    // Đang bị trói / cách ly trong phòng riêng
  isTreated: boolean;        // Đã được tiêm liều kháng sinh mạnh
  secretBiteLocation?: string; // Vết cắn giấu ở bắp đùi, sau gáy
}

export interface Companion {
  id: string;
  name: string;
  nickname?: string;
  gender: 'female' | 'male';
  age: number;
  role: string;
  personality: string;
  bio: string;
  avatar: string;
  hp: number;
  maxHp: number;
  morale: number;    // 0 - 100 (Tự trọng & nỗi sợ riêng, quá thấp có thể hoảng loạn hoặc bỏ trốn)
  trust: number;     // 0 - 100 (Lòng tin vào sự lãnh đạo)
  affection: number; // 0 - 100 (Điểm thiện cảm & thân mật tình cảm)
  status: 'healthy' | 'injured' | 'infected' | 'exhausted' | 'unconscious' | 'deceased';
  incubation: InfectionIncubation; // Cơ chế ủ bệnh ẩn
  skills: string[];
  equipment?: string;
  lastComment?: string;
  hasBeenRescued?: boolean; // Chỉ gia nhập khi được cứu hộ cụ thể
  intimacyLevel?: 'stranger' | 'friend' | 'close' | 'romantic' | 'soulmate'; // Mức độ quan hệ
}

export interface PlayerCharacter {
  name: string;
  gender: 'male' | 'female' | 'other';
  background: string;
  backgroundTitle: string;
  avatar: string;
  customBackgroundPrompt?: string; // Bối cảnh khởi đầu tự do do người chơi tự nhập
  stats: StatBlock;
  wound: WoundState;
  skills: Skill[];
  inventory: Item[];
  equippedWeapon?: Item;
  equippedArmor?: Item;
}

export interface MapLocation {
  id: string;
  location_name: string;
  distance_time: string; // VD: "15 phút đi bộ lén lút"
  potential_resources: string[]; // VD: ["Kháng sinh", "Băng gạc tiệt trùng", "Cồn y tế"]
  danger_level: number; // 1-5
  area_type: 'hospital' | 'police_station' | 'supermarket' | 'hardware_store' | 'residential';
  description?: string;
}

export interface GameEndingState {
  is_game_over: boolean;
  is_victory: boolean;
  cause_of_death?: string;
  epilogue?: string; // Đoạn Vĩ Thanh tóm tắt cuộc đời và tương lai căn cứ
}

export interface StoryTurn {
  day: number;
  turnNumber: number;
  location: string;
  weather: WeatherType;
  weatherLabel: string;
  tomorrowForecast?: WeatherForecast; // Dự báo thời tiết ngày tiếp theo với độ chính xác ~65%
  background_effect: BackgroundEffectType;
  dangerLevel: number; // 1 to 5
  situation: string;   // Viết rõ ràng, ổn định, tả thực giác quan, tuyệt đối không chớp giật
  choices: [string, string, string];
  customChoiceAllowed: boolean;
  selectedChoice?: string;
  outcome?: string;
  isEmergency?: boolean;
  emergencySeconds?: number;
  statChanges?: {
    hp?: number;
    hunger?: number;
    thirst?: number;
    infection?: number;
    sanity?: number;
    stamina?: number;
  };
  woundChange?: {
    inflicted?: boolean;
    location?: string;
    healed?: boolean;
  };
  itemsGained?: Item[];
  itemsLost?: { name: string; quantity: number }[];
  loot_notification?: string[]; // Thông báo pop-up vật tư vừa loot được
  unlocked_map_locations?: MapLocation[]; // Bản đồ mở khóa khi thiếu nguyên liệu
  system_note?: string; // Cảnh báo thời gian thực sử dụng vật phẩm cứu trợ
  system_trigger?: string | null; // Trigger hệ thống ép mạch truyện: 'Weather: Heavy Storm' | 'Event: Horde Attack'
  world_flags?: Record<string, boolean>; // Cột mốc thế giới đã mở khóa
  companionUpdates?: {
    name: string;
    trustChange?: number;
    hpChange?: number;
    moraleChange?: number;
    affectionChange?: number;
    incubationTick?: boolean;
    statusChange?: 'healthy' | 'injured' | 'infected' | 'exhausted' | 'unconscious' | 'deceased';
    dialogue?: string;
  }[];
  newCompanion?: Companion; // Chỉ xuất hiện sau hành động cứu hộ cụ thể
  newSkill?: {
    name: string;
    description: string;
    category: SkillCategory;
  };
  discoveredBase?: {
    name: string;
    location: string;
    description: string;
    base_type?: 'Apartment' | 'Military Base' | 'Civilian Shelter' | 'Nomad';
  };
  cityWaterCutoff?: boolean; // Ngày 7 mất nước toàn thành phố
  cityPowerBlackout?: boolean; // Ngày 10 cắt điện toàn thành phố
  game_ending?: GameEndingState;
  soundCue?: 'zombie_growl' | 'gunshot' | 'slash' | 'heartbeat' | 'thunder' | 'alarm' | 'loot' | 'craft';
}

export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  category: 'weapon' | 'medical' | 'survival' | 'ammo';
  resultItem: Item;
  requiredItems: { itemName: string; quantity: number }[];
  requiredSkill?: string;
}

export interface GameState {
  gamePhase: 'title' | 'creation' | 'playing' | 'game_over' | 'victory';
  day: number;
  turnCount: number;
  location: string;
  weather: WeatherType;
  tomorrowForecast?: WeatherForecast;
  background_effect: BackgroundEffectType;
  dangerLevel: number;
  player: PlayerCharacter;
  base: BaseCamp;
  companions: Companion[];
  history: StoryTurn[];
  currentTurn: StoryTurn | null;
  activeEmergency: boolean;
  emergencyTimeLeft: number;
  isAiProcessing: boolean;
  hasApiKey: boolean;
  audioEnabled: boolean;
  volume: number;
  unlockedMapLocations: MapLocation[];
  lootNotifications: string[];
  worldFlags?: Record<string, boolean>;
  systemTrigger?: string | null;
  cityWaterCutoff?: boolean;
  cityPowerBlackout?: boolean;
}

