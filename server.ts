import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { aiAvailable, aiStatus, generateJson, initProviders, parseJsonLoose } from './aiProviders.ts';
import { RANDOM_EVENTS, REALISTIC_SURVIVOR_ROSTER } from './src/data/randomEvents.ts';
import { STORY_MILESTONES } from './src/data/storyBranches.ts';
import { STARTING_SCENARIOS } from './src/data/startingScenarios.ts';
import { BackgroundEffectType } from './src/types/game.ts';
import { applyWeatherToStats, makeForecast, openingScene, planTurn, renderOfflineTurn } from './src/data/storyDirector.ts';
import { buildRadioTransmission, isFutureTrigger } from './src/data/radio.ts';
import { fmtNamed } from './src/data/units.ts';
import { buildCustomPrompt, buildTurnPrompt } from './src/data/turnPrompt.ts';
import { getSetting, locationText, zoneLabel } from './src/data/settings.ts';
import { buildChatPrompt, offlineChat, sanitizeChat, ChatReq } from './src/data/companionChat.ts';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const app = express();
const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json({ limit: '10mb' }));

// Luân phiên nhiều khóa API (Gemini / OpenAI / Claude). Hết khóa thì dùng kịch bản offline.
initProviders();

// Health / Status endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasApiKey: aiAvailable(),
    ai: aiStatus(),
  });
});

// Weather & Background effect helper
const WEATHER_EFFECT_MAP: Record<string, { label: string; effect: BackgroundEffectType }> = {
  clear: { label: 'Trời râm mát yên tĩnh', effect: 'overcast' },
  heatwave: { label: 'Nắng gắt hầm hập thiêu đốt (Khát x2, thức ăn nhanh hỏng)', effect: 'sunny_harsh' },
  heavy_rain: { label: 'Mưa lớn xối xả (Thể lực tụt nhanh 20%, nguy cơ cảm sốt)', effect: 'thunder_soft' },
  freezing_cold: { label: 'Gió lạnh buốt giá tê tái (Thể lực tụt nhanh 20%)', effect: 'frost_wind' },
  dense_fog: { label: 'Sương mù dày đặc (Tầm nhìn mù tịt, zombie lần theo âm thanh)', effect: 'fog_dense' },
  night_dark: { label: 'Bóng đêm đặc quánh (Buộc dùng đèn hoặc cận chiến)', effect: 'night_dark' },
};

// Thông tin chung cho lượt khởi đầu: dự báo, bản tin radio đầu tiên và mã cảnh.
function startExtras(weatherKey: string, scenarioId?: string, seenBefore?: Record<string, number>) {
  const forecast = makeForecast(weatherKey as any);
  const opening = openingScene(scenarioId, seenBefore);
  const trigger = `Forecast: ${forecast.weather}`;
  return {
    tomorrowForecast: forecast,
    system_trigger: trigger,
    radio_transmission: buildRadioTransmission([{ kind: 'weather', weather: forecast.weather }], { baseType: 'Apartment', day: 1 }),
    scene_id: opening.sceneId,
    choices: opening.choices,
    zone: opening.zone,
    settingId: opening.settingId,
    awayTurns: 0,
    pending_events: [],
  };
}

// Start Game Endpoint
app.post('/api/story/start', async (req: Request, res: Response) => {
  const { player, scenarioId, customPrompt, seenBefore } = req.body;
  const playerName = 'Người sống sót chưa ai biết tên';

  const preset = STARTING_SCENARIOS.find(s => s.id === scenarioId);

  // If user provided a custom prompt and Gemini AI is active:
  if (customPrompt && customPrompt.trim() && aiAvailable()) {
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

      const gen = await generateJson(prompt);
    const parsed = parseJsonLoose(gen.text);
      const wKey = parsed.weather || 'dense_fog';
      const wInfo = WEATHER_EFFECT_MAP[wKey] || WEATHER_EFFECT_MAP.dense_fog;

      return res.json({
        situation: parsed.situation,
        location: parsed.location || 'Khu vực trú ẩn ban đầu',
        weather: wKey,
        weatherLabel: parsed.weatherLabel || wInfo.label,
        ...startExtras(wKey, scenarioId, seenBefore),
        scene_id: 'ai_start',
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
      console.warn('[AI Start] Chuyển sang kịch bản khởi đầu dã chiến:', err?.message);
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
    weather: chosenPreset.initialWeather,
    weatherLabel: chosenPreset.weatherLabel,
    ...startExtras(chosenPreset.initialWeather, chosenPreset.id, seenBefore),
    location: locationText(getSetting(chosenPreset.id), 'shelter'),
    background_effect: wInfo.effect,
    startingHp: chosenPreset.startingHp,
    startingStamina: chosenPreset.startingStamina,
    startingSanity: chosenPreset.startingSanity,
    initialSkills: chosenPreset.initialSkills,
    calculatedItems: chosenPreset.initialItems,
    customChoiceAllowed: true,
    dangerLevel: 2,
    soundCue: 'zombie_growl',
  });
});

// Turn Processing Endpoint
// Director (storyDirector.ts) quyết định cảnh kế tiếp, lựa chọn, thời tiết, lịch sự kiện và bản tin radio.
// Gemini (nếu có) chỉ viết lại văn tả cảnh, xử lý hành động tự do và biên dịch radio.
app.post('/api/story/turn', async (req: Request, res: Response) => {
  const body = req.body || {};
  const plan = planTurn(body);
  const wInfo = WEATHER_EFFECT_MAP[plan.weather] || WEATHER_EFFECT_MAP.clear;
  const offline: any = renderOfflineTurn(body, plan);
  delete offline._needMap;
  const base = {
    ...offline,
    weatherLabel: wInfo.label,
    background_effect: wInfo.effect,
  };

  if (!aiAvailable()) return res.json({ ...base, ai_note: 'offline' });

  try {
    const player = body.player;
    const companions = body.companions || [];
    const baseLocationType = body.base?.base_type || (body.currentLocation?.toLowerCase().includes('quân sự') ? 'Military Base' : 'Apartment');

    const historySummary = (body.history || [])
      .slice(-3)
      .map((h: any) => `Lượt ${h.turnNumber ?? '?'}: Hành động: "${h.selectedChoice}" -> Kết quả: "${h.outcome?.slice(0, 95)}..."`)
      .join('\n');

    const globalState = {
      day: plan.nextDay,
      current_location: plan.location,
      lasting_consequences: body.flags || [],
      world_summary: typeof body.worldSummary === 'string' ? body.worldSummary.slice(0, 2600) : undefined,
      base_location: baseLocationType,
      character: {
        name: 'Người sống sót (chưa ai biết tên)',
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
      inventory: (player?.inventory || []).map((it: any) => ({ name: it.name, quantity: it.quantity, category: it.category, freshness: it.freshness, canSpoil: it.canSpoil, isSealed: it.isSealed })),
      skills: (player?.skills || []).map((sk: any) => ({ name: sk.name, category: sk.category, level: sk.level })),
      world_flags: {
        rescued_pharmacist: companions.some((c: any) => c.name.includes('Giang')),
        rescued_doctor: companions.some((c: any) => c.name.includes('Uyên')),
        has_safe_base: !!body.base?.hasBase,
        base_location: baseLocationType,
      },
      companions: companions.map((c: any) => ({ name: c.name, role: c.role, hp: c.hp, morale: c.morale, trust: c.trust, affection: c.affection || 0, status: c.status })),
    };

    const customMode = body.actionType === 'custom' && plan.resolution.kind === 'custom' && !plan.resolution.failed && plan.next.kind === 'routine';
    const setting = getSetting(plan.settingId);
    const promptArgs = {
      chosenAction: (body.chosenAction || '').replace(/^\[MAP_TRAVEL\].*?::\s*/s, ''),
      actionType: body.actionType || 'choice',
      day: plan.day,
      nextDay: plan.nextDay,
      weatherLabel: wInfo.label,
      weatherKey: plan.weather,
      baseLocationType,
      systemTrigger: plan.systemTrigger,
      globalState,
      historySummary,
      deterministic: plan.resolution.deterministic,
      resolvedOutcome: plan.resolution.outcome,
      nextSceneTitle: plan.next.id,
      nextSceneSituation: plan.next.situation,
      nextChoices: plan.next.choices,
      radioDraft: plan.radio,
      zoneLabel: zoneLabel(setting, plan.zone),
      placeName: setting.place,
    };
    const prompt = customMode ? buildCustomPrompt(promptArgs) : buildTurnPrompt(promptArgs);
    let aiProvider = '';

    const gen = await generateJson(prompt);
    const parsed = parseJsonLoose(gen.text);
    aiProvider = gen.provider;

    const det = plan.resolution.deterministic;
    const lockMech = det || customMode; // cơ chế (chỉ số, vật phẩm) do hệ thống quyết định, AI chỉ kể lại
    const clamp = (v: any, lim: number, d = 0) => (typeof v === 'number' && isFinite(v) ? Math.max(-lim, Math.min(lim, Math.round(v))) : d);
    const aiStats = parsed.statChanges
      ? applyWeatherToStats({
          hp: clamp(parsed.statChanges.hp, 40),
          hunger: clamp(parsed.statChanges.hunger, 40, 6),
          thirst: clamp(parsed.statChanges.thirst, 40, 8),
          infection: clamp(parsed.statChanges.infection, 30),
          sanity: clamp(parsed.statChanges.sanity, 30, -2),
          stamina: clamp(parsed.statChanges.stamina, 40, -9),
        }, plan.weather)
      : base.statChanges;
    const sanitizeItems = (arr: any) =>
      (Array.isArray(arr) ? arr : [])
        .filter((i: any) => i && typeof i.name === 'string' && i.name.trim())
        .slice(0, 4)
        .map((i: any, n: number) => ({ rarity: 'common', description: '', category: 'material', ...i, quantity: Math.max(1, Math.min(5, Number(i.quantity) || 1)), id: `ai_${Date.now().toString(36)}_${n}` }));

    const aiGained = lockMech ? base.itemsGained : sanitizeItems(parsed.itemsGained);
    const aiRadio = typeof parsed.radio_transmission === 'string' && parsed.radio_transmission.trim().length > 20 ? parsed.radio_transmission : null;
    const hasFuture = isFutureTrigger(plan.systemTrigger);

    return res.json({
      ...base,
      outcome: det ? (typeof parsed.outcome === 'string' && parsed.outcome.startsWith(plan.resolution.outcome.slice(0, 20)) ? parsed.outcome : base.outcome) : (parsed.outcome || base.outcome),
      situation: typeof parsed.situation === 'string' && parsed.situation.length > 60 ? parsed.situation : base.situation,
      // Hành động tự nhập: AI dựng tình huống + 3 lựa chọn mới bám sát văn bản người chơi gõ (chỉ khi hợp lệ).
      ...(customMode && Array.isArray(parsed.choices) && parsed.choices.length === 3 && parsed.choices.every((c: any) => typeof c === 'string' && c.trim().length > 5)
        ? { choices: parsed.choices.map((c: string) => c.trim()), scene_id: `ai_${body.turnCount ?? 0}` }
        : {}),
      statChanges: lockMech ? base.statChanges : aiStats,
      woundChange: lockMech ? base.woundChange : parsed.woundChange || null,
      itemsGained: aiGained,
      itemsLost: lockMech ? base.itemsLost : Array.isArray(parsed.itemsLost) ? parsed.itemsLost : [],
      loot_notification: aiGained.map((g: any) => `${fmtNamed(g)}`),
      companionUpdates: Array.isArray(parsed.companionUpdates) && parsed.companionUpdates.length ? parsed.companionUpdates : base.companionUpdates,
      newSkill: base.newSkill || parsed.newSkill || undefined,
      discoveredBase: parsed.discoveredBase || undefined,
      // Radio: bản của Gemini nếu có, nếu không dùng bản dựng sẵn; không phát khi không có thông tin tương lai.
      radio_transmission: hasFuture ? aiRadio || base.radio_transmission : null,
      soundCue: parsed.soundCue || base.soundCue,
      ai_note: aiProvider,
    });
  } catch (err: any) {
    console.warn('[AI Turn] Chuyển sang kịch bản offline:', err?.message);
    // Hết token ở mọi nhà cung cấp (hoặc AI lỗi): chuyển sang kịch bản offline, game vẫn chơi tiếp được.
    return res.json({ ...base, ai_note: (err as any)?.exhausted ? 'exhausted' : 'offline' });
  }
});

// Trò chuyện với đồng đội: AI (nếu còn khóa) hoặc engine offline phân tích câu người chơi gõ.
app.post('/api/companion/chat', async (req: Request, res: Response) => {
  const body = req.body as ChatReq;
  if (!body?.companion || !body?.player || typeof body.text !== 'string' || !body.text.trim()) {
    return res.status(400).json({ error: 'Thiếu dữ liệu trò chuyện' });
  }
  body.text = body.text.slice(0, 400);
  if (aiAvailable()) {
    try {
      const gen = await generateJson(buildChatPrompt(body));
      const clean = sanitizeChat(parseJsonLoose(gen.text), body);
      if (clean) return res.json({ ...clean, ai_note: gen.provider });
    } catch (err: any) {
      console.warn('Chat AI lỗi, dùng engine offline:', err?.message);
    }
  }
  return res.json({ ...offlineChat(body), ai_note: 'offline' });
});

// Custom Crafting evaluation endpoint
app.post('/api/story/craft', async (req: Request, res: Response) => {
  const { itemName, materials, description } = req.body;

  if (!aiAvailable()) {
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

    const gen = await generateJson(prompt);
    const parsed = parseJsonLoose(gen.text);
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
    console.warn('[AI Craft] Chuyển sang chế tạo dã chiến:', err?.message);
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
