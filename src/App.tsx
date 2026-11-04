/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Heart,
  Droplet,
  Utensils,
  Dna,
  Brain,
  Zap,
  Package,
  Hammer,
  Users,
  BookOpen,
  Volume2,
  VolumeX,
  Skull,
  Send,
  Sparkles,
  Shield,
  Compass,
  CloudRain,
  ChevronRight,
  RefreshCw,
  Home,
  Sun,
  Moon,
  CloudFog,
  Wind,
  AlertCircle,
  MapPin,
  Navigation,
} from 'lucide-react';

import {
  PlayerCharacter,
  Companion,
  Item,
  Skill,
  StoryTurn,
  CraftingRecipe,
  GameState,
  BaseCamp,
  WeatherType,
  WeatherForecast,
  BackgroundEffectType,
  PendingEvent,
} from './types/game';

import { AtmosphereCanvas } from './components/AtmosphereCanvas';
import { TitleScreen } from './components/TitleScreen';
import { CharacterCreator } from './components/CharacterCreator';
import { CompanionPanel } from './components/CompanionPanel';
import { InventoryDrawer } from './components/InventoryDrawer';
import { CraftingModal } from './components/CraftingModal';
import { ChronicleModal } from './components/ChronicleModal';
import { BaseManagementModal } from './components/BaseManagementModal';
import { DynamicMapModal } from './components/DynamicMapModal';
import { LootToast } from './components/LootToast';
import { EmergencyEventAlert } from './components/EmergencyEventAlert';
import { EndGameModal } from './components/EndGameModal';
import { RadioBroadcast } from './components/RadioBroadcast';
import { CompanionChat, ChatMsg } from './components/CompanionChat';
import { computeTeamEffects } from './utils/teamEffects';
import type { RoleId } from './data/companionChat';
import { SceneIllustration } from './components/SceneIllustration';
import { encodeMapAction, WorldNode, generateOutposts, buildOutpostNodes, OutpostInstance, getNodeAny } from './data/worldMap';
import { BaseHub } from './components/BaseHub';
import { rq, addQty, fmtNamed, servingOf } from './data/units';
import { FORTIFY_ACTIONS } from './utils/baseSystem';
import { tickBase, payCost, MODULE_BY_ID, SHELTER_SUITABILITY, applyBaseDelta } from './utils/baseSystem';
import { exposureOf } from './data/raid';
import { getSetting } from './data/settings';
import { WorldSummaryModal } from './components/WorldSummaryModal';
import { buildWorldSummary, eventsFromFlags, WorldEvent } from './data/worldState';
import { computeQuests, factionStanding, FLAG_TEXT } from './data/storyArc';
import { Vehicle, VehicleKind, VEHICLES, REPAIR_COST, FUEL_RE, FUEL_PER_CAN } from './data/vehicles';
import { sound } from './utils/audio';

const SAVE_KEY = 'zombie-survival-save-v1';
const SEEN_KEY = 'zombie-seen-scenes-v1';

// Đếm số lần đã gặp từng cảnh qua mọi ván chơi: server dùng để ưu tiên cảnh mới, tránh lặp lại các cảnh đã qua.
function loadSeen(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) || '{}');
  } catch {
    return {};
  }
}
function bumpSeen(sceneId?: string) {
  if (!sceneId) return;
  try {
    const key = sceneId.startsWith('stranger:') ? 'stranger' : sceneId;
    const seen = loadSeen();
    seen[key] = (seen[key] || 0) + 1;
    localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  } catch {
    // bỏ qua
  }
}

export default function App() {
  // Game Lifecycle State
  const [gamePhase, setGamePhase] = useState<'title' | 'creation' | 'playing' | 'game_over' | 'victory'>('title');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Player State
  const [player, setPlayer] = useState<PlayerCharacter>({
    name: 'Kẻ Sinh Tồn',
    gender: 'male',
    background: 'apartment_survivors',
    backgroundTitle: 'Dân Thường Cố Thủ',
    avatar: '🧑',
    stats: {
      hp: 100,
      maxHp: 100,
      hunger: 10,
      thirst: 15,
      infection: 0,
      sanity: 85,
      stamina: 100,
      maxStamina: 100,
    },
    wound: {
      hasOpenWound: false,
      status: 'none',
      turnsUnchecked: 0,
      locationOnBody: '',
    },
    skills: [],
    inventory: [],
  });

  // Base & Warehouse State
  const [base, setBase] = useState<BaseCamp>({
    hasBase: false,
    name: 'Trạm Trú Ẩn Chưa Thiết Lập',
    location: 'Đang di chuyển lang bạt',
    description: 'Chưa có căn cứ an toàn cố định.',
    fortification: 25,
    warehouse: [],
    facilities: {
      hasStove: false,
      hasFoamBox: false,
      hasGeneratorAndFridge: false,
      hasTripwireAlarms: false,
    },
  });

  // Companions State
  const [companions, setCompanions] = useState<Companion[]>([]);
  const [day, setDay] = useState(1);
  const [turnCount, setTurnCount] = useState(1);
  const [location, setLocation] = useState('Khu Chung Cư Linh Đàm - Tầng 7');
  const [weather, setWeather] = useState<WeatherType>('dense_fog');
  const [weatherLabel, setWeatherLabel] = useState('Sương mù dày đặc buốt giá');
  const [tomorrowForecast, setTomorrowForecast] = useState<WeatherForecast | undefined>(undefined);
  const [backgroundEffect, setBackgroundEffect] = useState<BackgroundEffectType>('fog_dense');
  const [dangerLevel, setDangerLevel] = useState(2);

  // Dynamic Map & Scavenging State
  const [visitedNodes, setVisitedNodes] = useState<string[]>([]);
  const [mapVisits, setMapVisits] = useState<Record<string, number>>({});
  const [showMapModal, setShowMapModal] = useState(false);

  // Sự kiện đã lên lịch (được báo trước qua radio)
  const [pendingEvents, setPendingEvents] = useState<PendingEvent[]>([]);
  const [pendingRecruit, setPendingRecruit] = useState<Companion | null>(null);

  // Bối cảnh khởi đầu & vùng đang đứng (chỗ trú / xung quanh / ngoài đường / sân thượng)
  const [settingId, setSettingId] = useState('apartment_survivors');
  const [zone, setZone] = useState('shelter');
  const [awayTurns, setAwayTurns] = useState(0);

  // Hậu quả lâu dài của các quyết định (bỏ rơi người, giết/tha kẻ cướp, cứu hầm trú...): sẽ được nhắc lại ở các cảnh sau
  const [worldFlags, setWorldFlags] = useState<string[]>([]);
  const [aiNote, setAiNote] = useState('');

  // Trò chuyện & phân công đồng đội
  const [chatCompanionId, setChatCompanionId] = useState<string | null>(null);
  const [chatLogs, setChatLogs] = useState<Record<string, ChatMsg[]>>({});
  const [chatBusy, setChatBusy] = useState(false);
  const [nameAskId, setNameAskId] = useState<string | null>(null);
  const [teamLog, setTeamLog] = useState<string[]>([]);

  // Cứ điểm ngẫu nhiên quanh căn cứ (mỗi ván một bộ khác nhau) và trạng thái vòng khép kín của căn cứ
  const [outposts, setOutposts] = useState<OutpostInstance[]>([]);
  const outpostNodes = useMemo(() => buildOutpostNodes(outposts), [outposts]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);

  // Nhật ký sự kiện quan trọng + tóm tắt trạng thái thế giới (ký ức dài hạn)
  const [worldLog, setWorldLog] = useState<WorldEvent[]>([]);
  const [showWorldSummary, setShowWorldSummary] = useState(false);
  const [loopStatus, setLoopStatus] = useState<Record<string, 'ok' | 'starved' | 'off'>>({});

  // Lưu/tiếp tục ván chơi (localStorage; có thể bị chặn nên luôn bọc try/catch)
  const [hasSave, setHasSave] = useState(() => {
    try {
      return !!localStorage.getItem(SAVE_KEY);
    } catch {
      return false;
    }
  });

  // Loot Pop-up Notifications State
  const [lootNotifications, setLootNotifications] = useState<string[]>([]);

  // Story History & Turn State
  const [history, setHistory] = useState<StoryTurn[]>([]);
  const [currentTurn, setCurrentTurn] = useState<StoryTurn | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [customActionText, setCustomActionText] = useState('');

  // Emergency / Quick-time State
  const [activeEmergency, setActiveEmergency] = useState(false);
  const [emergencySecondsLeft, setEmergencySecondsLeft] = useState(15);
  const emergencyTimerRef = useRef<number | null>(null);

  // Modals
  const [showInventory, setShowInventory] = useState(false);
  const [showCrafting, setShowCrafting] = useState(false);
  const [showCompanions, setShowCompanions] = useState(false);
  const [showChronicle, setShowChronicle] = useState(false);
  const [showBaseModal, setShowBaseModal] = useState(false);
  const [isCraftingLoading, setIsCraftingLoading] = useState(false);

  // Notification Banners State
  const [recentSkillBanner, setRecentSkillBanner] = useState<Skill | null>(null);
  const [recentCompanionBanner, setRecentCompanionBanner] = useState<Companion | null>(null);
  const [recentBaseBanner, setRecentBaseBanner] = useState<string | null>(null);

  // Check backend health & Gemini status on startup
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHasApiKey(!!data.hasApiKey);
      })
      .catch((err) => {
        console.warn('Backend health check error:', err);
      });
  }, []);

  // Tự động lưu sau mỗi lượt; xóa save khi thắng/thua để không tiếp tục một ván đã kết thúc.
  useEffect(() => {
    try {
      if (gamePhase === 'playing' && currentTurn && !isAiProcessing) {
        const snapshot = {
          player, base, companions, day, turnCount, location, weather, weatherLabel, tomorrowForecast,
          backgroundEffect, dangerLevel, history: history.slice(-60), currentTurn, pendingEvents, pendingRecruit, visitedNodes, mapVisits,
          settingId, zone, awayTurns, worldFlags, outposts, vehicle, worldLog,
        };
        localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
        setHasSave(true);
      } else if (gamePhase === 'game_over' || gamePhase === 'victory') {
        localStorage.removeItem(SAVE_KEY);
        setHasSave(false);
      }
    } catch {
      // đầy bộ nhớ hoặc bị chặn: bỏ qua, game vẫn chơi được
    }
  }, [gamePhase, currentTurn, isAiProcessing]);

  const handleContinueGame = () => {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      setPlayer(s.player);
      setBase(s.base);
      setCompanions(s.companions || []);
      setDay(s.day);
      setTurnCount(s.turnCount);
      setLocation(s.location);
      setWeather(s.weather);
      setWeatherLabel(s.weatherLabel);
      setTomorrowForecast(s.tomorrowForecast);
      setBackgroundEffect(s.backgroundEffect);
      setDangerLevel(s.dangerLevel);
      setHistory(s.history || []);
      setCurrentTurn(s.currentTurn);
      setPendingEvents(s.pendingEvents || []);
      setPendingRecruit(s.pendingRecruit || null);
      setVisitedNodes(s.visitedNodes || []);
      setMapVisits(s.mapVisits || {});
      setSettingId(s.settingId || 'apartment_survivors');
      setZone(s.zone || 'shelter');
      setAwayTurns(s.awayTurns || 0);
      setWorldFlags(s.worldFlags || []);
      setOutposts(s.outposts || generateOutposts(4));
      setVehicle(s.vehicle || null);
      setWorldLog(s.worldLog || []);
      setActiveEmergency(false);
      setGamePhase('playing');
    } catch {
      localStorage.removeItem(SAVE_KEY);
      setHasSave(false);
    }
  };

  // Chọn nhạc nền theo hoàn cảnh: bản đồ / nhà / vùng nguy hiểm / tuyệt vọng
  useEffect(() => {
    if (!audioEnabled) { sound.stopMusic(); return; }
    let theme: 'map' | 'home' | 'danger' | 'despair' | 'off' = 'off';
    if (gamePhase === 'game_over') theme = 'despair';
    else if (gamePhase === 'victory') theme = 'home';
    else if (gamePhase === 'playing') {
      const low = player.stats.sanity < 30 || player.stats.hp < 30;
      if (showMapModal) theme = 'map';
      else if (activeEmergency || dangerLevel >= 4) theme = 'danger';
      else if (low) theme = 'despair';
      else if (zone === 'shelter' || zone === 'roof') theme = 'home';
      else theme = 'map';
    }
    sound.setMusicTheme(theme);
  }, [gamePhase, audioEnabled, showMapModal, activeEmergency, dangerLevel, zone, player.stats.sanity < 30 || player.stats.hp < 30]);

  // Synchronize dynamic ambient soundscape with weather & danger level
  useEffect(() => {
    if (gamePhase === 'playing' && audioEnabled) {
      sound.updateAmbientSoundscape(weather, dangerLevel);
    }
  }, [weather, dangerLevel, gamePhase, audioEnabled]);

  // Audio toggle helper
  const handleToggleAudio = () => {
    const nextState = !audioEnabled;
    setAudioEnabled(nextState);
    sound.setMute(!nextState);
  };

  // Weather icon helper
  const getWeatherIcon = (w: WeatherType) => {
    switch (w) {
      case 'heatwave': return <Sun className="w-3.5 h-3.5 text-amber-500" />;
      case 'heavy_rain': return <CloudRain className="w-3.5 h-3.5 text-sky-400" />;
      case 'freezing_cold': return <Wind className="w-3.5 h-3.5 text-cyan-300" />;
      case 'dense_fog': return <CloudFog className="w-3.5 h-3.5 text-neutral-400" />;
      case 'night_dark': return <Moon className="w-3.5 h-3.5 text-indigo-400" />;
      default: return <Sun className="w-3.5 h-3.5 text-yellow-400" />;
    }
  };

  // Start new game after character creation
  const handleCharacterCreated = async (
    newChar: PlayerCharacter,
    startingCompanion: Companion | null,
    scenarioId?: string,
    customPrompt?: string
  ) => {
    setPlayer(newChar);
    const initialComps = startingCompanion ? [startingCompanion] : [];
    setCompanions(initialComps);
    setGamePhase('playing');
    setIsAiProcessing(true);

    try {
      const res = await fetch('/api/story/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player: newChar,
          scenarioId,
          customPrompt,
          seenBefore: loadSeen(),
        }),
      });
      const data = await res.json();

      if (data.calculatedItems && data.calculatedItems.length > 0) {
        newChar.inventory = data.calculatedItems;
        newChar.equippedWeapon = data.calculatedItems.find((i: Item) => i.category === 'weapon');
      }
      if (data.initialSkills && data.initialSkills.length > 0) {
        newChar.skills = data.initialSkills;
      }
      if (data.startingHp) {
        newChar.stats.hp = data.startingHp;
        newChar.stats.maxHp = data.startingHp;
      }
      setPlayer({ ...newChar });

      const bgEff: BackgroundEffectType = data.background_effect || 'fog_dense';
      const initialTurn: StoryTurn = {
        day: 1,
        turnNumber: 1,
        location: data.location || 'Khu Chung Cư Linh Đàm',
        weather: data.weather || 'dense_fog',
        weatherLabel: data.weatherLabel || 'Sương mù dày đặc',
        tomorrowForecast: data.tomorrowForecast,
        background_effect: bgEff,
        dangerLevel: data.dangerLevel || 2,
        situation: data.situation,
        choices: data.choices || [
          'Lục soát tìm kiếm thêm đồ hộp và nước uống',
          'Gia cố cửa nẻo chặn đường bầy quái vật',
          'Lén lút di chuyển sang vị trí an toàn hơn',
        ],
        customChoiceAllowed: true,
        scene_id: data.scene_id || 'ai_start',
        zone: data.zone || 'shelter',
        system_trigger: data.system_trigger,
        radio_transmission: data.radio_transmission,
      };

      setPendingEvents(data.pending_events || []);
      const startSettingId = data.settingId || scenarioId || 'apartment_survivors';
      setSettingId(startSettingId);
      setZone(data.zone || 'shelter');
      // Xuất phát ở chỗ đủ vững (chung cư, nhà riêng, siêu thị, trạm y tế) thì đó chính là căn cứ của bạn.
      const startSuit = SHELTER_SUITABILITY[startSettingId];
      if (startSuit && startSuit.score >= 55) {
        const st = getSetting(startSettingId);
        setBase((b) => ({
          ...b,
          hasBase: true,
          name: `Căn cứ ${st.place}`,
          location: st.labels.shelter,
          description: `Chỗ trú đủ vững để thành căn cứ: ${startSuit.pros[0].toLowerCase()}.`,
          fortification: 15 + Math.round(startSuit.score / 5),
          base_type: startSuit.kind,
          modules: { ...(b.modules || {}) },
          fuel: b.fuel || 0,
        }));
        setRecentBaseBanner(`Căn cứ ${st.place}`);
        setTimeout(() => setRecentBaseBanner(null), 6000);
      }
      setAwayTurns(0);
      setOutposts(generateOutposts(4));
      bumpSeen(initialTurn.scene_id);
      setCurrentTurn(initialTurn);
      setLocation(initialTurn.location);
      setWeather(initialTurn.weather);
      setWeatherLabel(initialTurn.weatherLabel);
      if (data.tomorrowForecast) {
        setTomorrowForecast(data.tomorrowForecast);
      }
      setBackgroundEffect(bgEff);
      setDangerLevel(initialTurn.dangerLevel);

      if (data.soundCue) {
        sound.playCue(data.soundCue);
      }
      if (data.radio_transmission) sound.playRadioStatic();
    } catch (err) {
      console.error('Error starting story:', err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Turn Execution (Choice or Custom Action)
  const handleExecuteTurn = async (
    action: string,
    actionType: 'choice' | 'custom' | 'emergency_timeout' = 'choice'
  ) => {
    if (isAiProcessing || !currentTurn) return;

    if (emergencyTimerRef.current) {
      clearInterval(emergencyTimerRef.current);
    }
    setActiveEmergency(false);
    sound.stopHeartbeat();

    if (action.toLowerCase().includes('bắn') || action.toLowerCase().includes('súng')) {
      sound.playGunshot();
    } else if (action.toLowerCase().includes('chém') || action.toLowerCase().includes('dao') || action.toLowerCase().includes('rìu') || action.toLowerCase().includes('búa')) {
      sound.playSlash();
    } else {
      sound.playClick();
    }

    setIsAiProcessing(true);
    setCustomActionText('');

    try {
      const res = await fetch('/api/story/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player,
          base,
          companions,
          history: history.slice(-6),
          doneSceneIds: history.map((h) => h.scene_id).filter(Boolean),
          sceneId: currentTurn.scene_id,
          settingId,
          zone,
          awayTurns,
          flags: worldFlags,
          hasVehicle: !!vehicle,
          worldSummary: makeSummary().text,
          seenBefore: loadSeen(),
          turnCount,
          tomorrowForecast,
          pendingEvents,
          pendingRecruit,
          chosenAction: action,
          actionType,
          currentLocation: location,
          day,
          weather,
          worldFlags: {
            rescued_pharmacist: companions.some((c) => (c.realName || c.name).includes('Giang')),
            rescued_doctor: companions.some((c) => (c.realName || c.name).includes('Uyên')),
            has_safe_base: base.hasBase,
            base_location: base.base_type || (location.toLowerCase().includes('quân sự') ? 'Military Base' : 'Apartment'),
          },
        }),
      });

      const data = await res.json();

      if (data.soundCue) {
        sound.playCue(data.soundCue);
      }

      const completedTurn: StoryTurn = {
        ...currentTurn,
        selectedChoice: action.replace(/^\[MAP_TRAVEL\].*?::\s*/s, ''),
        outcome: data.outcome,
        statChanges: data.statChanges,
        itemsGained: data.itemsGained,
        itemsLost: data.itemsLost,
        loot_notification: data.loot_notification,
      };

      setHistory((prev) => [...prev, completedTurn]);

      // Handle loot notifications popup
      if (data.loot_notification && data.loot_notification.length > 0) {
        setLootNotifications(data.loot_notification);
      }

      // 1. Thời tiết: hiệu ứng lên khát/thể lực đã được server tính một lần; client chỉ xét cảm sốt.
      const thirstDelta = data.statChanges?.thirst ?? 6;
      const staminaDelta = data.statChanges?.stamina ?? -8;
      let isFeverish = player.stats.isFeverish || false;
      let maxStamina = player.stats.maxStamina || 100;

      if (data.weather === 'heavy_rain' || data.weather === 'freezing_cold') {
        if (!isFeverish && Math.random() < 0.15) {
          isFeverish = true;
          maxStamina = 70;
        }
      }

      // 2. Wound Infection Progression
      let currentWound = { ...player.wound };
      let lockedMaxHp = player.stats.lockedMaxHp;

      if (data.woundChange?.inflicted) {
        currentWound.hasOpenWound = true;
        currentWound.status = 'open';
        currentWound.turnsUnchecked = 0;
        currentWound.locationOnBody = data.woundChange.location || 'Vết cắn trầy xước ở bắp tay';
      } else if (data.woundChange?.healed && currentWound.hasOpenWound) {
        currentWound = { hasOpenWound: false, status: 'none', turnsUnchecked: 0, locationOnBody: '' };
      } else if (currentWound.hasOpenWound) {
        currentWound.turnsUnchecked += 1;
        if (currentWound.turnsUnchecked >= 2 && currentWound.status === 'open') {
          currentWound.status = 'inflamed';
        } else if (currentWound.turnsUnchecked >= 4 && currentWound.status === 'inflamed') {
          currentWound.status = 'septic';
          lockedMaxHp = 65;
        }
      }

      let sanityPenalty = 0;
      let infectionPenalty = 0;
      if (currentWound.status === 'inflamed') {
        sanityPenalty = 4;
      } else if (currentWound.status === 'septic') {
        sanityPenalty = 6;
        infectionPenalty = 5;
      }

      const team = computeTeamEffects(companions, base.hasBase, currentWound.hasOpenWound, worldFlags);
      const bt = tickBase(base, (data.weather || weather) as WeatherType, turnCount + 1);
      const effectiveMaxHp = lockedMaxHp || player.stats.maxHp;
      const nextHp = Math.max(0, Math.min(effectiveMaxHp, player.stats.hp + (data.statChanges?.hp || 0)));
      const nextHunger = Math.max(0, Math.min(100, player.stats.hunger + (data.statChanges?.hunger ?? 5) + team.hunger));
      const nextThirst = Math.max(0, Math.min(100, player.stats.thirst + thirstDelta));
      const nextInfection = Math.max(0, Math.min(100, player.stats.infection + (data.statChanges?.infection || 0) + infectionPenalty + team.infection + bt.infection));
      const nextSanity = Math.max(0, Math.min(100, player.stats.sanity + (data.statChanges?.sanity || 0) - sanityPenalty + team.sanity + bt.sanity));
      const nextStamina = Math.max(0, Math.min(maxStamina, player.stats.stamina + staminaDelta));

      // 3. Food Spoilage Progression
      const decayRate = data.weather === 'heatwave' ? 18 : 8;

      const cityPower = day < 10;
      let updatedInventory = player.inventory.map((item) => {
        // Đang ướp muối: đồ không hỏng trong lúc ướp, xong thì thành đồ khô bảo quản được lâu
        if (item.curingTurns && item.curingTurns > 0) {
          const left = item.curingTurns - 1;
          if (left > 0) return { ...item, curingTurns: left };
          return { ...item, curingTurns: 0, isDried: true, canSpoil: false, freshness: 100, name: item.name.replace(/ \(đang ướp muối\)$/, '') + ' (ướp muối)', description: `${item.description} (Đã ướp muối xong, để được rất lâu.)` };
        }
        if (item.category === 'food' && item.canSpoil && !item.isSealed && !item.isDried) {
          const loss = item.isCooked ? Math.round(decayRate * 0.5) : decayRate;
          const newFreshness = Math.max(0, (item.freshness ?? 100) - loss);
          return { ...item, freshness: newFreshness };
        }
        return { ...item };
      });

      let updatedBaseWarehouse = bt.base.warehouse.map((item) => {
        if (item.category === 'food' && item.canSpoil && !item.isSealed && !item.isDried) {
          if (bt.base.facilities.hasGeneratorAndFridge) {
            return item;
          }
          // Tủ đông chỉ giữ lạnh khi còn điện (lưới thành phố hoặc máy phát)
          if (item.frozen && cityPower) return item;
          const baseDecay = base.facilities.hasFoamBox ? Math.round(decayRate * 0.25) : Math.round(decayRate * 0.5);
          const newFreshness = Math.max(0, (item.freshness ?? 100) - baseDecay);
          return { ...item, freshness: newFreshness };
        }
        return item;
      });

      if (data.itemsGained && data.itemsGained.length > 0) {
        data.itemsGained.forEach((gItem: Item) => {
          const existing = updatedInventory.find((it) => it.name === gItem.name);
          if (existing) {
            addQty(existing, gItem.quantity);
          } else {
            updatedInventory.push(gItem);
          }
        });
      }

      team.loot.forEach((gItem: Item) => {
        const ex = updatedInventory.find((it) => it.name === gItem.name);
        if (ex) addQty(ex, gItem.quantity);
        else updatedInventory.push(gItem);
      });
      if (team.loot.length) setLootNotifications((prev) => [...prev, ...team.loot.map((g) => `${fmtNamed(g)}`)]);
      setTeamLog([...team.log, ...bt.log]);
      setLoopStatus(bt.loopStatus);

      if (data.itemsLost && data.itemsLost.length > 0) {
        data.itemsLost.forEach((lItem: { name: string; quantity: number }) => {
          const existing = updatedInventory.find((it) => it.name.includes(lItem.name));
          if (existing) {
            existing.quantity = rq(Math.max(0, existing.quantity - lItem.quantity));
          }
        });
        updatedInventory = updatedInventory.filter((it) => it.quantity > 0);
      }

      let updatedSkills = [...player.skills];
      if (data.newSkill) {
        sound.playLoot();
        const skillObj: Skill = {
          id: 'skill_' + Date.now(),
          name: data.newSkill.name,
          description: data.newSkill.description,
          category: data.newSkill.category || 'combat',
          level: 1,
          unique: true,
        };
        updatedSkills.push(skillObj);
        setRecentSkillBanner(skillObj);
        setTimeout(() => setRecentSkillBanner(null), 6000);
      }

      let updatedBase = { ...bt.base, warehouse: updatedBaseWarehouse, fortification: Math.min(100, bt.base.fortification + team.fortification) };
      if (data.base_delta) updatedBase = applyBaseDelta(updatedBase, data.base_delta);
      if (data.discoveredBase && !base.hasBase) {
        sound.playLoot();
        updatedBase = {
          ...updatedBase,
          hasBase: true,
          name: data.discoveredBase.name,
          location: data.discoveredBase.location,
          description: data.discoveredBase.description,
          fortification: 40,
        };
        setRecentBaseBanner(data.discoveredBase.name);
        setTimeout(() => setRecentBaseBanner(null), 6000);
      }
      setBase(updatedBase);

      setPlayer({
        ...player,
        stats: {
          hp: nextHp,
          maxHp: player.stats.maxHp,
          lockedMaxHp,
          hunger: nextHunger,
          thirst: nextThirst,
          infection: nextInfection,
          sanity: nextSanity,
          stamina: nextStamina,
          maxStamina,
          isFeverish,
        },
        wound: currentWound,
        inventory: updatedInventory,
        skills: updatedSkills,
      });

      let updatedCompanions = companions.map((c) => {
        const dl = team.companionDelta[c.id];
        return dl ? { ...c, morale: Math.max(0, Math.min(100, c.morale + (dl.morale || 0))), hp: Math.min(c.maxHp, c.hp + (dl.hp || 0)) } : { ...c };
      });
      if (data.companionUpdates && data.companionUpdates.length > 0) {
        data.companionUpdates.forEach((up: any) => {
          const comp = updatedCompanions.find((c) => c.name === up.name);
          if (comp) {
            if (up.trustChange) comp.trust = Math.max(0, Math.min(100, comp.trust + up.trustChange));
            if (up.hpChange) comp.hp = Math.max(0, Math.min(comp.maxHp, comp.hp + up.hpChange));
            if (up.moraleChange) comp.morale = Math.max(0, Math.min(100, comp.morale + up.moraleChange));
            if (up.affectionChange) comp.affection = Math.max(0, Math.min(100, (comp.affection || 0) + up.affectionChange));
            if (up.statusChange) comp.status = up.statusChange;
            if (up.dialogue) comp.lastComment = up.dialogue;
            if (up.revealName && comp.nameKnown === false && comp.realName) {
              comp.name = comp.realName;
              comp.nameKnown = true;
            }
          }
        });
      }

      // Advance companion incubation progression (turns 1-3 hidden, turns 4-5 symptomatic)
      updatedCompanions = updatedCompanions.map((c) => {
        if (c.incubation?.isInfected && !c.incubation.isTreated) {
          const newTurns = (c.incubation.incubationTurns || 0) + 1;
          let newStage: 'none' | 'hidden' | 'symptomatic' | 'transformed' = c.incubation.stage;
          if (newTurns >= 4) {
            newStage = 'symptomatic';
          } else if (newTurns >= 1) {
            newStage = 'hidden';
          }
          return {
            ...c,
            incubation: {
              ...c.incubation,
              incubationTurns: newTurns,
              stage: newStage,
            },
          };
        }
        return c;
      });

      // Conditional Companion Recruitment: Only if specifically rescued
      if ('pending_recruit' in data) setPendingRecruit(data.pending_recruit || null);
      if (data.newCompanion && !updatedCompanions.some((c) => c.id === data.newCompanion.id)) {
        updatedCompanions.push({ ...data.newCompanion, hasBeenRescued: true, joinedTurn: turnCount + 1 });
        setRecentCompanionBanner(data.newCompanion);
        setTimeout(() => setRecentCompanionBanner(null), 6000);
      }
      // Đồng đội bỏ đi (phản bội, bỏ nhóm) rời khỏi danh sách; người hy sinh được đánh dấu đã mất
      {
        const leaving = (data.companionUpdates || []).filter((u: any) => u.leave).map((u: any) => u.name);
        if (leaving.length) {
          updatedCompanions = updatedCompanions.filter((c) => !leaving.includes(c.name));
          setWorldLog((prev) => [...prev, { day: nextDay, turn: nextTurnNum, kind: 'relation' as const, text: `Một đồng đội đã rời nhóm: ${leaving.join(', ')}` }].slice(-60));
        }
        const died = (data.companionUpdates || []).filter((u: any) => u.statusChange === 'deceased').map((u: any) => u.name);
        if (died.length) setWorldLog((prev) => [...prev, { day: nextDay, turn: nextTurnNum, kind: 'relation' as const, text: `Đã mất: ${died.join(', ')}` }].slice(-60));
      }

      // Người mới chưa biết tên: lộ tên khi đủ tin tưởng hoặc sau vài lượt đồng hành.
      updatedCompanions = updatedCompanions.map((c) => {
        if (c.nameKnown === false && c.realName && (c.trust >= 60 || turnCount + 1 - (c.joinedTurn ?? turnCount + 1) >= 5)) {
          return { ...c, name: c.realName, nameKnown: true, lastComment: `À, tôi chưa kịp nói... tôi tên là ${c.realName}.` };
        }
        return c;
      });
      setCompanions(updatedCompanions);

      const nextTurnNum = turnCount + 1;
      const nextDay = Math.floor(nextTurnNum / 3) + 1;
      setTurnCount(nextTurnNum);
      setDay(nextDay);

      // Check Defeat Conditions (HP <= 0 or Sanity <= 0)
      if (nextHp <= 0 || nextSanity <= 0 || nextInfection >= 100 || data.game_ending?.is_game_over) {
        sound.playCue('zombie_growl');
        setGamePhase('game_over');
        return;
      }

      // Check Victory Conditions (30 days survival milestone or fully fortified self-sustaining base)
      const hasSelfSustainingBase = base.fortification >= 100 && base.facilities.hasGeneratorAndFridge && base.facilities.hasStove;
      if (nextDay >= 30 || hasSelfSustainingBase || data.game_ending?.is_victory) {
        sound.playCue('loot');
        setGamePhase('victory');
        return;
      }

      const bgEff: BackgroundEffectType = data.background_effect || backgroundEffect;
      const nextTurnObj: StoryTurn = {
        day: nextDay,
        turnNumber: nextTurnNum,
        location: data.location || location,
        weather: data.weather || weather,
        weatherLabel: data.weatherLabel || weatherLabel,
        tomorrowForecast: data.tomorrowForecast,
        background_effect: bgEff,
        dangerLevel: Math.max(1, (data.dangerLevel || dangerLevel) + bt.danger),
        situation: data.situation,
        choices: data.choices || [
          'Lục soát tìm kiếm thêm đồ hộp và nước uống',
          'Gia cố vị trí an toàn',
          'Lén lút di chuyển trinh sát',
        ],
        customChoiceAllowed: true,
        outcome: data.outcome,
        isEmergency: data.isEmergency,
        emergencySeconds: data.emergencySeconds || 15,
        loot_notification: data.loot_notification,
        system_note: data.system_note,
        scene_id: data.scene_id,
        zone: data.zone,
        system_trigger: data.system_trigger,
        radio_transmission: data.radio_transmission,
        game_ending: data.game_ending,
      };

      if (data.vehicle_delta) {
        setVehicle((v) => (v ? { ...v, condition: Math.max(0, Math.min(100, v.condition + (data.vehicle_delta.condition || 0))), fuel: Math.max(0, Math.min(VEHICLES[v.kind].maxFuel, v.fuel + (data.vehicle_delta.fuel || 0))) } : v));
      }
      setPendingEvents(data.pending_events || []);
      setZone(data.zone || zone);
      setAwayTurns(data.awayTurns ?? 0);
      setWorldFlags((prev) => [...new Set([...prev, ...(data.flags_add || [])])].filter((f) => !(data.flags_remove || []).includes(f)));
      setAiNote(data.ai_note || '');
      {
        const evts: WorldEvent[] = [...eventsFromFlags(data.flags_add || [], nextDay, nextTurnNum)];
        const sid: string = data.scene_id || '';
        if (data.newCompanion) evts.push({ day: nextDay, turn: nextTurnNum, kind: 'relation', text: 'Một người sống sót mới gia nhập nhóm (chưa biết tên)' });
        if (sid.startsWith('milestone_')) evts.push({ day: nextDay, turn: nextTurnNum, kind: 'story', text: 'Một bước ngoặt cốt truyện xảy ra' });
        if (sid === 'event_horde_night') evts.push({ day: nextDay, turn: nextTurnNum, kind: 'world', text: 'Một bầy zombie lớn kéo ngang khu phố' });
        if (sid === 'event_supply_drop') evts.push({ day: nextDay, turn: nextTurnNum, kind: 'world', text: 'Thùng tiếp tế rơi gần khu vực của bạn' });
        if (sid === 'event_acid_rain_superstorm') evts.push({ day: nextDay, turn: nextTurnNum, kind: 'world', text: 'Bão mưa lớn đổ bộ như dự báo' });
        if (sid.startsWith('stranger:')) evts.push({ day: nextDay, turn: nextTurnNum, kind: 'relation', text: 'Gặp một người lạ ngẫu nhiên' });
        if (data.system_note && /CỘT MỐC NGÀY/.test(data.system_note)) evts.push({ day: nextDay, turn: nextTurnNum, kind: 'world', text: String(data.system_note).replace('⚠️ ', '') });
        if (evts.length) setWorldLog((prev) => [...prev, ...evts].slice(-60));
        if ((data.flags_add || []).includes('building_secured')) {
          setBase((b) => ({ ...b, fortification: Math.min(100, b.fortification + 20) }));
          setRecentBaseBanner('Đã làm chủ cả tòa nhà (+20% kiên cố)');
          setTimeout(() => setRecentBaseBanner(null), 6000);
        }
      }
      bumpSeen(data.scene_id);
      if (data.radio_transmission) sound.playRadioStatic();
      if (typeof data.scene_id === 'string' && data.scene_id.startsWith('milestone_')) sound.playStinger();
      setCurrentTurn(nextTurnObj);
      setLocation(nextTurnObj.location);
      setWeather(nextTurnObj.weather);
      setWeatherLabel(nextTurnObj.weatherLabel);
      if (data.tomorrowForecast) {
        setTomorrowForecast(data.tomorrowForecast);
      }
      setBackgroundEffect(bgEff);
      setDangerLevel(nextTurnObj.dangerLevel);

      if (data.isEmergency) {
        setActiveEmergency(true);
        setEmergencySecondsLeft(data.emergencySeconds || 15);
      }
    } catch (err) {
      console.error('Error executing turn:', err);
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Di chuyển & lục soát từ bản đồ: hành động được mã hóa để server xử lý tất định theo quãng đường/độ nguy hiểm.
  const handleTravelFromMap = (node: WorldNode, lootStyle: 'quick' | 'thorough', hops: number, opts: { useVehicle: boolean; crew: number } = { useVehicle: false, crew: 0 }) => {
    if (isAiProcessing) return;
    setShowMapModal(false);
    const visits = mapVisits[node.id] || 0;
    const text = lootStyle === 'quick'
      ? `Tôi di chuyển đến ${node.name} (${hops} chặng), lục soát nhanh gọn, ưu tiên giữ im lặng tuyệt đối.`
      : `Tôi di chuyển đến ${node.name} (${hops} chặng), dùng xà beng phá khóa tủ sắt và chấp nhận rủi ro tiếng động để tìm vật tư cao cấp.`;
    setMapVisits((prev) => ({ ...prev, [node.id]: (prev[node.id] || 0) + 1 }));
    setVisitedNodes((prev) => (prev.includes(node.id) ? prev : [...prev, node.id]));
    if (opts.useVehicle && vehicle) sound.playEngine();
    handleExecuteTurn(
      encodeMapAction(node.id, lootStyle, hops, visits, text, opts.useVehicle && vehicle ? { vehicle: vehicle.kind, vcond: vehicle.condition, vfuel: vehicle.fuel, crew: opts.crew } : { crew: 0 }),
      'choice',
    );
  };

  // Use Item from Inventory
  const handleUseItem = (item: Item) => {
    sound.playLoot();

    const isSpoiled = item.category === 'food' && item.freshness !== undefined && item.freshness < 30;

    let hpChange = item.healAmount || 0;
    const people = 1 + companions.filter((c) => c.status !== 'deceased').length;
    const serving = servingOf(item, people);
    let hungerChange = serving.hunger ? -serving.hunger : 0;
    let thirstChange = serving.thirst ? -serving.thirst : 0;
    let infectionChange = item.infectionReduce ? -item.infectionReduce : 0;

    if (isSpoiled) {
      sound.playCue('zombie_growl');
      infectionChange += 30;
      hpChange -= 20;
    }

    // Thức ăn/nước cần nấu mà dùng sống: no ít hơn và hại bụng
    if (item.needsCooking && !item.isCooked) {
      hungerChange = Math.round(hungerChange * 0.55);
      infectionChange += 8;
    }

    let updatedWound = { ...player.wound };
    let lockedMaxHp = player.stats.lockedMaxHp;

    if (item.category === 'medical' && player.wound.hasOpenWound) {
      updatedWound = {
        hasOpenWound: false,
        status: 'none',
        turnsUnchecked: 0,
        locationOnBody: '',
      };
      lockedMaxHp = undefined;
    }

    const effectiveMaxHp = lockedMaxHp || player.stats.maxHp;
    const newHp = Math.max(0, Math.min(effectiveMaxHp, player.stats.hp + hpChange));
    const newHunger = Math.max(0, player.stats.hunger + hungerChange);
    const newThirst = Math.max(0, player.stats.thirst + thirstChange);
    const newInfection = Math.max(0, Math.min(100, player.stats.infection + infectionChange));

    const updatedInv = player.inventory
      .map((it) => (it.id === item.id ? { ...it, quantity: rq(it.quantity - serving.used) } : it))
      .filter((it) => it.quantity > 0);

    setPlayer({
      ...player,
      stats: {
        ...player.stats,
        hp: newHp,
        lockedMaxHp,
        hunger: newHunger,
        thirst: newThirst,
        infection: newInfection,
      },
      wound: updatedWound,
      inventory: updatedInv,
    });
  };

  // Cook fresh food
  const handleCookFood = (item: Item) => {
    sound.playLoot();
    const updatedInv = player.inventory.map((it) => {
      if (it.id === item.id) {
        return {
          ...it,
          name: `${it.name} (Đã nấu chín)`,
          isCooked: true,
          freshness: 100,
          hungerReduce: (it.hungerReduce || 20) + 10,
          description: `${it.description} (Đã được nấu chín khử trùng an toàn).`,
        };
      }
      return it;
    });
    setPlayer({ ...player, inventory: updatedInv });
  };

  // Ướp muối: cần muối và mất vài lượt, đồ không hỏng trong lúc ướp
  const handleDryFood = (item: Item) => {
    const salt = player.inventory.find((i) => /muối ăn|muối hạt|muối/i.test(i.name) && i.category !== 'medical' && i.quantity > 0);
    if (!salt) { setLootNotifications(['Cần muối để ướp. Hãy tìm gói muối ăn trong bếp.']); return; }
    sound.playLoot();
    const curing = /thịt|cá|tôm|ốc|xúc xích|gà|heo|bò/i.test(item.name) ? 3 : 2;
    const updatedInv = player.inventory
      .map((it) => {
        if (it.id === item.id) return { ...it, name: `${it.name} (đang ướp muối)`, curingTurns: curing, description: `${it.description} (Đang ướp muối, xong sau ${curing} lượt.)` };
        if (it.id === salt.id) return { ...it, quantity: rq(it.quantity - 1) };
        return it;
      })
      .filter((it) => it.quantity > 0);
    setPlayer({ ...player, inventory: updatedInv });
    setLootNotifications([`Bắt đầu ướp muối ${item.name}: xong sau ${curing} lượt`]);
  };

  // Cất tủ đông trong căn cứ (cần có điện): đồ tươi không hỏng cho tới khi mất điện
  const hasFreezerPower = base.hasBase && (base.facilities.hasGeneratorAndFridge || day < 10);
  const handleFreezeFood = (item: Item) => {
    if (!hasFreezerPower) { setLootNotifications(['Không có điện hoặc chưa có căn cứ để cất tủ đông.']); return; }
    sound.playLoot();
    const rest = player.inventory.filter((it) => it.id !== item.id);
    const frozenItem: Item = { ...item, frozen: true, name: item.name.includes('(đông lạnh)') ? item.name : `${item.name} (đông lạnh)` };
    const ex = base.warehouse.find((w) => w.name === frozenItem.name);
    const warehouse = ex ? base.warehouse.map((w) => (w.id === ex.id ? { ...w, quantity: rq(w.quantity + item.quantity) } : w)) : [...base.warehouse, frozenItem];
    setPlayer({ ...player, inventory: rest });
    setBase({ ...base, warehouse });
    setLootNotifications([`Đã cất ${item.name} vào tủ đông của căn cứ`]);
  };

  // Equip Item
  const handleEquipItem = (item: Item) => {
    if (item.category === 'weapon') {
      setPlayer({ ...player, equippedWeapon: item });
    } else if (item.category === 'special') {
      setPlayer({ ...player, equippedArmor: item });
    }
  };

  // Base Warehouse Transfer: Backpack -> Warehouse
  const handleStoreItem = (item: Item, quantity: number = 1) => {
    const qtyToMove = Math.min(item.quantity, quantity);
    let updatedBackpack = player.inventory
      .map((it) => (it.id === item.id ? { ...it, quantity: rq(it.quantity - qtyToMove) } : it))
      .filter((it) => it.quantity > 0);

    let updatedWarehouse = [...base.warehouse];
    const existingInWarehouse = updatedWarehouse.find((it) => it.name === item.name);
    if (existingInWarehouse) {
      addQty(existingInWarehouse, qtyToMove);
    } else {
      updatedWarehouse.push({ ...item, quantity: qtyToMove });
    }

    setPlayer({ ...player, inventory: updatedBackpack });
    setBase({ ...base, warehouse: updatedWarehouse });
  };

  // Base Warehouse Transfer: Warehouse -> Backpack
  const handleRetrieveItem = (item: Item, quantity: number = 1) => {
    const qtyToMove = Math.min(item.quantity, quantity);
    let updatedWarehouse = base.warehouse
      .map((it) => (it.id === item.id ? { ...it, quantity: rq(it.quantity - qtyToMove) } : it))
      .filter((it) => it.quantity > 0);

    let updatedBackpack = [...player.inventory];
    const existingInBackpack = updatedBackpack.find((it) => it.name === item.name);
    if (existingInBackpack) {
      addQty(existingInBackpack, qtyToMove);
    } else {
      updatedBackpack.push({ ...item, quantity: qtyToMove });
    }

    setPlayer({ ...player, inventory: updatedBackpack });
    setBase({ ...base, warehouse: updatedWarehouse });
  };

  // Upgrade Base Fortification
  const handleUpgradeFortification = () => {
    const scrap = player.inventory.find(i => i.name.toLowerCase().includes('phế liệu') || i.name.toLowerCase().includes('sắt'));
    if (!scrap) return;

    const updatedInv = player.inventory
      .map((it) => (it.id === scrap.id ? { ...it, quantity: it.quantity - 1 } : it))
      .filter((it) => it.quantity > 0);

    setPlayer({ ...player, inventory: updatedInv });
    setBase({
      ...base,
      fortification: Math.min(100, base.fortification + 15),
    });
  };

  // Install Base Facility
  const handleInstallFacility = (key: keyof BaseCamp['facilities']) => {
    setBase({
      ...base,
      facilities: {
        ...base.facilities,
        [key]: true,
      },
    });
  };

  // Crafting standard recipe
  const handleCraftRecipe = (recipe: CraftingRecipe) => {
    let updatedInv = [...player.inventory];

    recipe.requiredItems.forEach((req) => {
      let needed = req.quantity;
      updatedInv = updatedInv
        .map((it) => {
          if (needed > 0 && it.name.toLowerCase().includes(req.itemName.toLowerCase().split(' ')[0])) {
            const deduct = Math.min(it.quantity, needed);
            needed -= deduct;
            return { ...it, quantity: it.quantity - deduct };
          }
          return it;
        })
        .filter((it) => it.quantity > 0);
    });

    const existingResult = updatedInv.find((i) => i.name === recipe.resultItem.name);
    if (existingResult) {
      existingResult.quantity += recipe.resultItem.quantity;
    } else {
      updatedInv.push(recipe.resultItem);
    }

    setPlayer({ ...player, inventory: updatedInv });
  };

  // Custom AI Crafting
  const handleCustomCraft = async (itemName: string, materials: string, description: string) => {
    setIsCraftingLoading(true);
    try {
      const res = await fetch('/api/story/craft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemName, materials, description }),
      });
      const data = await res.json();

      if (data.resultItem) {
        const updatedInv = [...player.inventory, data.resultItem];
        setPlayer({ ...player, inventory: updatedInv });
      }
    } catch (err) {
      console.error('Error crafting custom weapon:', err);
    } finally {
      setIsCraftingLoading(false);
      setShowCrafting(false);
    }
  };

  // Companion Medical Care
  const handleHealCompanion = (companionId: string) => {
    const medItem = player.inventory.find((i) => i.category === 'medical' && i.quantity > 0);
    if (!medItem) return;

    sound.playLoot();
    const updatedInv = player.inventory
      .map((it) => (it.id === medItem.id ? { ...it, quantity: it.quantity - 1 } : it))
      .filter((it) => it.quantity > 0);

    const updatedComps = companions.map((c) => {
      if (c.id === companionId) {
        return {
          ...c,
          hp: Math.min(c.maxHp, c.hp + 35),
          trust: Math.min(100, c.trust + 15),
          lastComment: 'Cảm ơn anh... Vết thương đã đỡ đau buốt nhiều rồi.',
        };
      }
      return c;
    });

    setPlayer({ ...player, inventory: updatedInv });
    setCompanions(updatedComps);
  };

  // Tóm tắt trạng thái thế giới: dựng từ trạng thái hiện tại + nhật ký sự kiện
  const makeSummary = () =>
    buildWorldSummary({
      day, turn: turnCount, weatherLabel, forecastLabel: tomorrowForecast?.label, locationText: location, dangerLevel,
      flags: worldFlags, companions, base, inventory: player.inventory, vehicle,
      visitedNames: visitedNodes.map((id) => getNodeAny(id)?.name || '').filter(Boolean),
      outpostNames: [],
      stats: { hp: player.stats.hp, maxHp: player.stats.maxHp, hunger: player.stats.hunger, thirst: player.stats.thirst, infection: player.stats.infection, sanity: player.stats.sanity, stamina: player.stats.stamina },
      equippedWeapon: player.equippedWeapon?.name,
      log: worldLog,
    });
  const pushLog = (kind: WorldEvent['kind'], text: string) => setWorldLog((prev) => [...prev, { day, turn: turnCount, kind, text }].slice(-60));

  // Bỏ căn cứ hiện tại để chọn nơi khác: kho chuyển vào ba lô, công trình mất
  const handleAbandonBase = () => {
    sound.playClick();
    const carried = base.warehouse.filter((i) => i.quantity > 0);
    setPlayer((p) => {
      const inv = p.inventory.map((i) => ({ ...i }));
      for (const it of carried) {
        const ex = inv.find((i) => i.name === it.name);
        if (ex) ex.quantity = rq(ex.quantity + it.quantity); else inv.push({ ...it, frozen: false });
      }
      return { ...p, inventory: inv };
    });
    setBase({ hasBase: false, name: '', location: '', description: '', fortification: 0, warehouse: [], modules: {}, fuel: 0, fortified: [], facilities: { hasStove: false, hasFoamBox: false, hasGeneratorAndFridge: false, hasTripwireAlarms: false } });
    pushLog('survival', 'Bỏ căn cứ cũ để tìm chỗ khác');
    setLootNotifications(['Đã bỏ căn cứ. Hãy đi tìm chỗ khác trên bản đồ rồi chiếm làm căn cứ mới.']);
  };

  // Lập căn cứ tại chỗ trú hiện tại
  const handleEstablishBase = () => {
    const st = getSetting(settingId);
    const suit = SHELTER_SUITABILITY[settingId] || SHELTER_SUITABILITY.apartment_survivors;
    sound.playLoot();
    setBase((b) => ({
      ...b,
      hasBase: true,
      name: `Căn cứ ${st.place}`,
      location: st.labels.shelter,
      description: `Căn cứ dựng ngay tại ${st.labels.shelter}.`,
      fortification: Math.max(b.fortification, 15 + Math.round(suit.score / 5)),
      base_type: suit.kind,
      modules: { ...(b.modules || {}) },
      fuel: b.fuel || 0,
    }));
    setRecentBaseBanner(`Căn cứ ${st.place}`);
    setTimeout(() => setRecentBaseBanner(null), 6000);
    pushLog('survival', `Lập căn cứ tại ${st.labels.shelter}`);
  };

  // Gia cố chỗ ở: một việc cụ thể, làm một lần, tốn vật tư và sức
  const handleFortify = (actionId: string) => {
    const a = FORTIFY_ACTIONS.find((x) => x.id === actionId);
    if (!a || (base.fortified || []).includes(a.id)) return;
    const paid = payCost(a.cost, player.inventory, base.warehouse);
    if (!paid) return;
    sound.playLoot();
    setPlayer({ ...player, inventory: paid.backpack, stats: { ...player.stats, stamina: Math.max(0, player.stats.stamina - a.stamina) } });
    setBase({ ...base, warehouse: paid.warehouse, fortification: Math.min(100, base.fortification + a.gain), fortified: [...(base.fortified || []), a.id], facilities: { ...base.facilities, hasTripwireAlarms: base.facilities.hasTripwireAlarms || a.id === 'hall_alarm' || a.id === 'trap_entrance' } });
    setRecentBaseBanner(a.name);
    setTimeout(() => setRecentBaseBanner(null), 5000);
    pushLog('survival', a.name);
  };

  // Xây hoặc nâng cấp một công trình: trừ vật tư (ba lô trước, rồi kho căn cứ)
  const handleBuildModule = (moduleId: string) => {
    const def = MODULE_BY_ID[moduleId];
    if (!def) return;
    const cur = base.modules?.[moduleId] || 0;
    if (cur >= def.maxLevel) return;
    const paid = payCost(def.cost(cur + 1), player.inventory, base.warehouse);
    if (!paid) return;
    sound.playLoot();
    setPlayer({ ...player, inventory: paid.backpack });
    setBase({
      ...base,
      warehouse: paid.warehouse,
      modules: { ...(base.modules || {}), [moduleId]: cur + 1 },
      fortification: moduleId === 'walls' ? Math.min(100, base.fortification + 15) : base.fortification,
      facilities: {
        ...base.facilities,
        hasStove: base.facilities.hasStove || moduleId === 'stove',
      },
    });
    setRecentBaseBanner(`${def.name} (cấp ${cur + 1})`);
    setTimeout(() => setRecentBaseBanner(null), 5000);
  };

  // Chiếm một cứ điểm tìm được trên bản đồ làm căn cứ
  const handleClaimBase = (node: WorldNode) => {
    if (!node.outpost) return;
    setShowMapModal(false);
    sound.playLoot();
    setBase((b) => ({
      ...b,
      hasBase: true,
      name: node.outpost!.baseName,
      location: node.name,
      description: node.description,
      fortification: 20 + (node.outpost!.bonus.walls || 0) * 15,
      base_type: node.outpost!.baseKind,
      baseNodeId: node.id,
      fortified: [],
      modules: { ...node.outpost!.bonus },
      fuel: b.fuel || 0,
    }));
    setRecentBaseBanner(node.outpost.baseName);
    setTimeout(() => setRecentBaseBanner(null), 6000);
    pushLog('survival', `Chiếm ${node.name} làm căn cứ mới`);
  };

  // Lắp xe từ phụ tùng; sửa xe; đổ xăng
  const handleBuildVehicle = (kind: VehicleKind) => {
    const paid = payCost(VEHICLES[kind].cost, player.inventory, base.warehouse);
    if (!paid) return;
    sound.playLoot();
    setPlayer({ ...player, inventory: paid.backpack });
    setBase({ ...base, warehouse: paid.warehouse });
    setVehicle({ kind, condition: 70, fuel: 0 });
    pushLog('survival', `Lắp ráp ${VEHICLES[kind].name}`);
    setRecentBaseBanner(`Đã lắp ${VEHICLES[kind].name}`);
    setTimeout(() => setRecentBaseBanner(null), 5000);
  };
  const handleRepairVehicle = () => {
    if (!vehicle) return;
    const paid = payCost(REPAIR_COST, player.inventory, base.warehouse);
    if (!paid) return;
    sound.playLoot();
    setPlayer({ ...player, inventory: paid.backpack });
    setBase({ ...base, warehouse: paid.warehouse });
    setVehicle({ ...vehicle, condition: Math.min(100, vehicle.condition + 35) });
  };
  const handleRefuelVehicle = () => {
    if (!vehicle) return;
    const max = VEHICLES[vehicle.kind].maxFuel;
    if (vehicle.fuel >= max) return;
    const takeOne = (items: Item[]) => {
      const it = items.find((i) => FUEL_RE.test(i.name) && i.category === 'material' && i.quantity > 0);
      if (!it) return null;
      return items.map((i) => (i.id === it.id ? { ...i, quantity: i.quantity - 1 } : i)).filter((i) => i.quantity > 0);
    };
    const bp = takeOne(player.inventory);
    const wh = bp ? null : takeOne(base.warehouse);
    if (!bp && !wh) return;
    sound.playLoot();
    if (bp) setPlayer({ ...player, inventory: bp });
    if (wh) setBase({ ...base, warehouse: wh });
    setVehicle({ ...vehicle, fuel: Math.min(max, vehicle.fuel + FUEL_PER_CAN) });
  };

  // Giao việc cho đồng đội (từ giao diện hoặc từ lời nói trong khung chat)
  const handleSetRole = (companionId: string, role: RoleId) => {
    setCompanions((prev) => prev.map((c) => (c.id === companionId ? { ...c, assignment: role === 'none' ? undefined : role } : c)));
  };

  // Gửi câu người chơi gõ cho đồng đội: AI (nếu còn khóa) hoặc engine offline trả lời, rồi cập nhật thiện cảm.
  const handleSendChat = async (text: string, forId?: string) => {
    const comp = companions.find((c) => c.id === (forId || chatCompanionId));
    if (!comp || chatBusy) return;
    const history = chatLogs[comp.id] || [];
    setChatLogs((prev) => ({ ...prev, [comp.id]: [...history, { from: 'player', text }] }));
    setChatBusy(true);
    try {
      const res = await fetch('/api/companion/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companion: { ...comp, hp: comp.hp },
          player: { gender: player.gender, name: player.name, nameKnown: player.nameKnown !== false, sanity: player.stats.sanity },
          text,
          history: history.filter((m) => m.from !== 'system').slice(-8),
          context: { day, zoneLabel: location, weather, hasBase: base.hasBase, safe: base.hasBase },
          askedName: !!comp.askedPlayerName,
        }),
      });
      const r = await res.json();
      const clamp = (n: number) => Math.max(0, Math.min(100, n));
      setCompanions((prev) =>
        prev.map((c) =>
          c.id !== comp.id ? c : {
            ...c,
            affection: clamp((c.affection || 0) + (r.affectionChange || 0)),
            trust: clamp(c.trust + (r.trustChange || 0)),
            morale: clamp(c.morale + (r.moraleChange || 0)),
            intimacyLevel: r.intimacyLevel || c.intimacyLevel,
            name: r.revealName && c.realName ? c.realName : c.name,
            nameKnown: r.revealName ? true : c.nameKnown,
            assignment: r.assignment && r.assignment !== 'none' ? r.assignment : c.assignment,
            askedPlayerName: c.askedPlayerName || !!r.asksPlayerName,
            lastComment: r.reply,
          },
        ),
      );
      if (r.sanityChange) setPlayer((p) => ({ ...p, stats: { ...p.stats, sanity: Math.max(0, Math.min(100, p.stats.sanity + r.sanityChange)) } }));
      setChatLogs((prev) => ({
        ...prev,
        [comp.id]: [
          ...(prev[comp.id] || []),
          { from: 'npc', text: r.reply, delta: { aff: r.affectionChange, trust: r.trustChange } },
          ...(r.revealName && comp.realName ? [{ from: 'system' as const, text: `Bạn đã biết tên người này: ${comp.realName}.` }] : []),
          ...(r.assignment && r.assignment !== 'none' ? [{ from: 'system' as const, text: 'Đã ghi nhận phân công.' }] : []),
        ],
      }));
      if (r.asksPlayerName) setNameAskId(comp.id);
      if (r.ai_note) setAiNote(r.ai_note);
    } catch {
      setChatLogs((prev) => ({ ...prev, [comp.id]: [...(prev[comp.id] || []), { from: 'system', text: 'Không kết nối được máy chủ, hãy thử lại.' }] }));
    } finally {
      setChatBusy(false);
    }
  };

  // Đồng đội hỏi tên: người chơi tự quyết định có nói tên mình hay không
  const handleAnswerName = (name: string | null) => {
    const id = nameAskId;
    if (!id) return;
    setNameAskId(null);
    if (name) {
      setPlayer((p) => ({ ...p, name, nameKnown: true }));
      setCompanions((prev) => prev.map((c) => (c.id === id ? { ...c, trust: Math.min(100, c.trust + 4), affection: Math.min(100, (c.affection || 0) + 2) } : c)));
      setChatLogs((prev) => ({ ...prev, [id]: [...(prev[id] || []), { from: 'player', text: `Tôi tên là ${name}.` }, { from: 'npc', text: `${name}... một cái tên đẹp. Rất vui được biết bạn.`, delta: { aff: 2, trust: 4 } }] }));
    } else {
      setChatLogs((prev) => ({ ...prev, [id]: [...(prev[id] || []), { from: 'player', text: '(Im lặng, chưa muốn nói tên mình.)' }, { from: 'npc', text: 'Không sao. Khi nào tiện thì nói, tôi không ép đâu.' }] }));
    }
  };

  // Companion Talk / Morale
  const handleTalkCompanion = (companionId: string) => {
    sound.playClick();
    setCompanions((prev) =>
      prev.map((c) => {
        if (c.id === companionId) {
          return {
            ...c,
            morale: Math.min(100, c.morale + 10),
            trust: Math.min(100, c.trust + 5),
          };
        }
        return c;
      })
    );
  };

  // Companion Flirt / Social
  const handleFlirtCompanion = (companionId: string) => {
    sound.playClick();
    setCompanions((prev) =>
      prev.map((c) => {
        if (c.id === companionId) {
          const newAff = Math.min(100, (c.affection || 0) + 6);
          const newMorale = Math.min(100, c.morale + 8);
          return {
            ...c,
            affection: newAff,
            morale: newMorale,
          };
        }
        return c;
      })
    );
  };

  // Companion Gift
  const handleGiftCompanion = (companionId: string, item: Item) => {
    sound.playLoot();
    const updatedInv = player.inventory
      .map((it) => {
        if (it.id === item.id) {
          return { ...it, quantity: it.quantity - 1 };
        }
        return it;
      })
      .filter((it) => it.quantity > 0);

    const bonus = item.affectionBonus || (item.category === 'gift' ? 25 : 15);
    setCompanions((prev) =>
      prev.map((c) => {
        if (c.id === companionId) {
          return {
            ...c,
            affection: Math.min(100, (c.affection || 0) + bonus),
            trust: Math.min(100, c.trust + 15),
            morale: Math.min(100, c.morale + 15),
            lastComment: `Cảm ơn anh... Món quà [${item.name}] này thật ý nghĩa giữa lúc cùng cực này.`,
          };
        }
        return c;
      })
    );
    setPlayer({ ...player, inventory: updatedInv });
  };

  // Propose Intimacy
  const handleProposeIntimacy = (companionId: string) => {
    sound.playLoot();
    const partner = companions.find((c) => c.id === companionId);
    if (partner) pushLog('survival', `Đêm ấy bạn và ${partner.name} gần nhau hơn, giữa căn phòng kín và những tiếng động xa xa`);
    setCompanions((prev) =>
      prev.map((c) => {
        if (c.id === companionId) {
          return {
            ...c,
            affection: 100,
            trust: 100,
            morale: 100,
            intimacyLevel: 'romantic',
            lastComment: 'Em/Tôi sẽ ở bên anh, sống hay chết đều sẽ không rời xa...',
          };
        }
        return c;
      })
    );
    setPlayer((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        sanity: Math.min(100, prev.stats.sanity + 25),
      },
    }));
  };

  // Companion Quarantine
  const handleQuarantineCompanion = (companionId: string) => {
    sound.playClick();
    setCompanions((prev) =>
      prev.map((c) => {
        if (c.id === companionId) {
          const nextQuarantined = !c.incubation?.isQuarantined;
          return {
            ...c,
            trust: nextQuarantined ? Math.max(0, c.trust - 15) : c.trust,
            incubation: {
              ...(c.incubation || { isInfected: false, incubationTurns: 0, stage: 'none', isTreated: false }),
              isQuarantined: nextQuarantined,
            },
            lastComment: nextQuarantined
              ? 'Anh... anh trói em lại sao? Em hiểu là vì an toàn căn cứ, nhưng xin anh đừng bỏ rơi em...'
              : 'Cảm ơn anh đã tin tưởng tháo dây trói cho em.',
          };
        }
        return c;
      })
    );
  };

  // Treat Incubation with Antibiotics & Alcohol
  const handleTreatIncubation = (companionId: string) => {
    sound.playLoot();
    const medItem = player.inventory.find(
      (i) =>
        i.quantity > 0 &&
        (i.name.toLowerCase().includes('kháng sinh') ||
          i.name.toLowerCase().includes('cồn') ||
          i.name.toLowerCase().includes('thuốc') ||
          i.infectionReduce)
    );
    if (!medItem) return;

    const updatedInv = player.inventory
      .map((it) => {
        if (it.id === medItem.id) {
          return { ...it, quantity: it.quantity - 1 };
        }
        return it;
      })
      .filter((it) => it.quantity > 0);

    setCompanions((prev) =>
      prev.map((c) => {
        if (c.id === companionId) {
          return {
            ...c,
            trust: Math.min(100, c.trust + 25),
            affection: Math.min(100, (c.affection || 0) + 15),
            incubation: {
              ...(c.incubation || { isInfected: true, incubationTurns: 1, stage: 'hidden', isQuarantined: false }),
              isTreated: true,
              stage: 'none',
            },
            lastComment: 'Cảm ơn anh... liều kháng sinh mạnh này đã cứu mạng em. Cơn sốt đang dịu đi rồi!',
          };
        }
        return c;
      })
    );
    setPlayer({ ...player, inventory: updatedInv });
  };

  // Purge / Exile Companion
  const handlePurgeCompanion = (companionId: string) => {
    sound.playGunshot();
    setCompanions((prev) => prev.filter((c) => c.id !== companionId));
    setPlayer((prev) => ({
      ...prev,
      stats: {
        ...prev.stats,
        sanity: Math.max(0, prev.stats.sanity - 12),
      },
    }));
  };

  // Reset Game
  const handleRestartGame = () => {
    setDay(1);
    setTurnCount(1);
    setHistory([]);
    setCurrentTurn(null);
    setCompanions([]);
    setVisitedNodes([]);
    setMapVisits({});
    setPendingEvents([]);
    setPendingRecruit(null);
    setZone('shelter');
    setAwayTurns(0);
    setWorldFlags([]);
    setOutposts([]);
    setVehicle(null);
    setWorldLog([]);
    setLoopStatus({});
    setTomorrowForecast(undefined);
    setLootNotifications([]);
    setActiveEmergency(false);
    setBase({
      hasBase: false,
      name: 'Trạm Trú Ẩn Chưa Thiết Lập',
      location: 'Đang di chuyển lang bạt',
      description: 'Chưa có căn cứ an toàn cố định.',
      fortification: 25,
      warehouse: [],
      facilities: {
        hasStove: false,
        hasFoamBox: false,
        hasGeneratorAndFridge: false,
        hasTripwireAlarms: false,
      },
    });
    setGamePhase('creation');
  };

  return (
    <div className="relative min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Synchronized Atmosphere Canvas (Rain, Fog, Harsh Sun, Dark Night) */}
      <AtmosphereCanvas
        weather={weather}
        backgroundEffect={backgroundEffect}
        dangerLevel={dangerLevel}
        isEmergency={activeEmergency}
        day={day}
        cityWaterCutoff={day >= 7}
        cityPowerBlackout={day >= 10}
      />

      {/* Lớp hạt nhiễu phim + tối góc: cảm giác tranh than chì, giấy ố, bụi tro */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[5] opacity-[0.16] mix-blend-overlay"
        style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.5  0 0 0 0 0.45  0 0 0 0 0.4  0 0 0 0.9 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")" }}
      />
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[5]" style={{ background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(8,5,2,0.55) 100%)' }} />

      {/* Loot Notification Pop-up Toast */}
      <LootToast
        notifications={lootNotifications}
        onDismiss={() => setLootNotifications([])}
      />

      {/* 1. Title Screen */}
      {gamePhase === 'title' && (
        <TitleScreen
          onStartGame={() => setGamePhase('creation')}
          onContinueGame={hasSave ? handleContinueGame : undefined}
          onOpenChronicle={() => setShowChronicle(true)}
          audioEnabled={audioEnabled}
          onToggleAudio={handleToggleAudio}
          hasApiKey={hasApiKey}
        />
      )}

      {/* 2. Character Creation */}
      {gamePhase === 'creation' && (
        <CharacterCreator
          onComplete={handleCharacterCreated}
          onBack={() => setGamePhase('title')}
        />
      )}

      {/* 3. Main Gameplay HUD & Realistic Story Engine */}
      {gamePhase === 'playing' && (
        <div className="relative z-10 flex flex-col min-h-screen max-w-6xl w-full mx-auto px-4 py-4 sm:py-6">
          {/* Top Perimeter HUD Cluster */}
          <header className="bg-neutral-900/90 border border-neutral-800 rounded-xl p-3 sm:p-4 mb-4 backdrop-blur-md shadow-lg">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800/80 pb-3 mb-3">
              {/* Character Identity & Day */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-lg">
                  {player.avatar}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-white">{player.nameKnown === false ? 'Người sống sót' : player.name}</span>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      {player.nameKnown === false ? '(chưa ai biết tên)' : `(${player.backgroundTitle})`}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono">
                    <span className="text-amber-400 font-bold">NGÀY {day} / 30</span>
                    <span>·</span>
                    <span>Lượt {turnCount}</span>
                  </div>
                </div>
              </div>

              {/* Location & Dynamic Weather Status */}
              <div className="flex items-center gap-2.5 text-xs">
                <div className="flex items-center gap-1.5 text-neutral-300 bg-neutral-950/70 border border-neutral-800 px-2.5 py-1 rounded">
                  <Compass className="w-3.5 h-3.5 text-red-500" />
                  <span className="truncate max-w-[150px] sm:max-w-[190px]">{location}</span>
                </div>

                <div className="flex items-center gap-1.5 text-neutral-300 bg-neutral-950/70 border border-neutral-800 px-2.5 py-1 rounded">
                  {getWeatherIcon(weather)}
                  <span className="truncate max-w-[130px] sm:max-w-[180px]">{weatherLabel}</span>
                </div>

                {tomorrowForecast && (
                  <div
                    className="hidden lg:flex items-center gap-1.5 text-neutral-300 bg-neutral-950/70 border border-amber-900/50 px-2.5 py-1 rounded shadow-inner"
                    title="Dự báo thời tiết ngày mai (Độ chính xác tương đối ~65%)"
                  >
                    <span className="text-[10px] text-amber-400 font-mono font-semibold uppercase">Ngày mai:</span>
                    {getWeatherIcon(tomorrowForecast.weather)}
                    <span className="truncate max-w-[140px] text-[11px] text-neutral-300">{tomorrowForecast.label}</span>
                    <span className="text-[9px] font-mono text-amber-400/90 bg-neutral-900 px-1 py-0.5 rounded border border-neutral-800">
                      ~{tomorrowForecast.accuracyPercent}%
                    </span>
                  </div>
                )}

                {vehicle && (
                  <div className="flex items-center gap-1.5 bg-sky-950/40 border border-sky-800/50 px-2 py-1 rounded text-sky-300 font-mono text-[11px]" title="Xe của bạn">
                    <span>{VEHICLES[vehicle.kind].icon}</span>
                    <span>⛽{Math.round(vehicle.fuel)}</span>
                    <span>🔧{Math.round(vehicle.condition)}%</span>
                  </div>
                )}

                <div className="flex items-center gap-1 bg-red-950/40 border border-red-800/50 px-2 py-1 rounded text-red-400 font-mono">
                  <Skull className="w-3.5 h-3.5" />
                  <span>Cấp {dangerLevel}</span>
                </div>
              </div>

              {/* Utility buttons */}
              <div className="flex items-center gap-2">
                {/* Dynamic Map Scavenging Button */}
                <button
                  onClick={() => {
                    sound.playMapOpen();
                    setShowMapModal(true);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border rounded text-xs font-medium transition-colors cursor-pointer ${
                    'bg-sky-950/70 border-sky-600 text-sky-300 hover:bg-sky-900 shadow-sm'
                  }`}
                  title="Bản đồ tìm kiếm tài nguyên dã chiến"
                >
                  <Navigation className="w-3.5 h-3.5 text-sky-400" />
                  <span>Bản Đồ</span>
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    setShowBaseModal(true);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 border rounded text-xs font-medium transition-colors cursor-pointer ${
                    base.hasBase
                      ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300 hover:bg-emerald-900'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:bg-neutral-700'
                  }`}
                  title="Căn cứ & Kho bãi"
                >
                  <Home className="w-3.5 h-3.5" />
                  <span>{base.hasBase ? 'Căn Cứ' : 'Lập Căn Cứ'}</span>
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    setShowCompanions(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded text-xs font-medium text-rose-300 transition-colors cursor-pointer"
                  title="Xem đồng đội sống sót"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Đồng Đội ({companions.length})</span>
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    setShowInventory(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded text-xs font-medium text-amber-300 transition-colors cursor-pointer"
                  title="Mở ba lô hành trang"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Ba Lô ({player.inventory.length})</span>
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    setShowCrafting(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded text-xs font-medium text-emerald-300 transition-colors cursor-pointer"
                  title="Bàn chế tạo dã chiến"
                >
                  <Hammer className="w-3.5 h-3.5" />
                  <span>Chế Tạo</span>
                </button>

                <button
                  onClick={() => {
                    sound.playClick();
                    setShowWorldSummary(true);
                  }}
                  className="p-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded text-sky-400 transition-colors cursor-pointer"
                  title="Tóm tắt trạng thái thế giới"
                >
                  <BookOpen className="w-4 h-4" />
                </button>

                <button
                  onClick={handleToggleAudio}
                  className="p-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded text-neutral-300 transition-colors cursor-pointer"
                  title="Bật/Tắt âm thanh"
                >
                  {audioEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-neutral-500" />}
                </button>
              </div>
            </div>

            {/* Vitals Status Clusters */}
            <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 pt-1 text-xs font-mono">
              {/* HP */}
              <div className="bg-neutral-950/60 p-2 rounded border border-neutral-800/80">
                <div className="flex justify-between items-center text-[11px] mb-1">
                  <span className="text-red-400 flex items-center gap-1">
                    <Heart className="w-3 h-3 fill-red-500 text-red-500" />
                    <span>Máu (HP)</span>
                  </span>
                  <span className="font-bold text-white tabular-nums">
                    {player.stats.hp}/{player.stats.lockedMaxHp || player.stats.maxHp}
                    {player.stats.lockedMaxHp && <span className="text-red-400 text-[10px] ml-1">(Khóa)</span>}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{ width: `${(player.stats.hp / player.stats.maxHp) * 100}%` }}
                  />
                </div>
              </div>

              {/* Hunger */}
              <div className="bg-neutral-950/60 p-2 rounded border border-neutral-800/80">
                <div className="flex justify-between items-center text-[11px] mb-1">
                  <span className="text-amber-400 flex items-center gap-1">
                    <Utensils className="w-3 h-3" />
                    <span>Đói</span>
                  </span>
                  <span className="font-bold text-white tabular-nums">{player.stats.hunger}%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-300"
                    style={{ width: `${player.stats.hunger}%` }}
                  />
                </div>
              </div>

              {/* Thirst */}
              <div className="bg-neutral-950/60 p-2 rounded border border-neutral-800/80">
                <div className="flex justify-between items-center text-[11px] mb-1">
                  <span className="text-blue-400 flex items-center gap-1">
                    <Droplet className="w-3 h-3" />
                    <span>Khát</span>
                  </span>
                  <span className="font-bold text-white tabular-nums">
                    {player.stats.thirst}% {weather === 'heatwave' && '(x2)'}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{ width: `${player.stats.thirst}%` }}
                  />
                </div>
              </div>

              {/* Infection */}
              <div className="bg-neutral-950/60 p-2 rounded border border-neutral-800/80">
                <div className="flex justify-between items-center text-[11px] mb-1">
                  <span className="text-teal-400 flex items-center gap-1">
                    <Dna className="w-3 h-3" />
                    <span>Nhiễm Độc</span>
                  </span>
                  <span className={`font-bold tabular-nums ${player.stats.infection > 40 ? 'text-red-400' : 'text-white'}`}>
                    {player.stats.infection}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${player.stats.infection > 50 ? 'bg-red-500' : 'bg-teal-500'}`}
                    style={{ width: `${player.stats.infection}%` }}
                  />
                </div>
              </div>

              {/* Sanity */}
              <div className="bg-neutral-950/60 p-2 rounded border border-neutral-800/80">
                <div className="flex justify-between items-center text-[11px] mb-1">
                  <span className="text-purple-400 flex items-center gap-1">
                    <Brain className="w-3 h-3" />
                    <span>Tinh Thần</span>
                  </span>
                  <span className="font-bold text-white tabular-nums">{player.stats.sanity}%</span>
                </div>
                <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 transition-all duration-300"
                    style={{ width: `${player.stats.sanity}%` }}
                  />
                </div>
              </div>

              {/* Stamina */}
              <div className="bg-neutral-950/60 p-2 rounded border border-neutral-800/80">
                <div className="flex justify-between items-center text-[11px] mb-1">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    <span>Thể Lực</span>
                  </span>
                  <span className="font-bold text-white tabular-nums">
                    {player.stats.stamina}/{player.stats.maxStamina || 100}
                    {player.stats.isFeverish && <span className="text-amber-400 text-[10px] ml-1">(Sốt)</span>}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-neutral-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${(player.stats.stamina / (player.stats.maxStamina || 100)) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </header>

          {/* Persistent Wound Warning Bar */}
          {player.wound.hasOpenWound && (
            <div className="p-3 bg-red-950/70 border border-red-700/80 rounded-lg mb-4 flex items-center justify-between text-xs text-red-200 shadow-md">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <span>
                  <strong>Vết thương thực tế:</strong> {player.wound.locationOnBody} (Trạng thái:{' '}
                  {player.wound.status === 'open' ? 'Vết thương hở chưa sát trùng' :
                   player.wound.status === 'inflamed' ? 'Đang mưng mủ (Trừ tinh thần)' :
                   'Nhiễm trùng máu (Khóa máu tối đa 65/100, tăng nhiễm độc!)'}
                  ).
                </span>
              </div>
              <button
                onClick={() => setShowInventory(true)}
                className="px-2.5 py-1 bg-red-900 hover:bg-red-800 text-white rounded text-[11px] font-semibold cursor-pointer shrink-0 ml-2"
              >
                Mở Ba Lô Băng Bó
              </button>
            </div>
          )}

          {/* Real-time System Note Bar (e.g. Urgency Alert) */}
          {currentTurn?.system_note && (
            <div className="p-3 bg-amber-950/60 border border-amber-600/70 rounded-lg mb-4 text-xs text-amber-200 shadow-md flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{currentTurn.system_note}</span>
            </div>
          )}

          {/* New Skill Banner Notification */}
          {recentSkillBanner && (
            <div className="p-3 bg-rose-950/80 border border-rose-500 rounded-lg mb-4 flex items-center gap-3 text-rose-200 text-xs shadow-lg">
              <Sparkles className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <span className="font-bold uppercase text-white">MỞ KHÓA KỸ NĂNG ĐỘC BẢN:</span> {recentSkillBanner.name} - {recentSkillBanner.description}
              </div>
            </div>
          )}

          {/* New Base Discovered Banner */}
          {recentBaseBanner && (
            <div className="p-3 bg-emerald-950/80 border border-emerald-500 rounded-lg mb-4 flex items-center gap-3 text-emerald-200 text-xs shadow-lg">
              <Home className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <span className="font-bold uppercase text-white">ĐÃ KHÁM PHÁ CĂN CỨ MỚI:</span> {recentBaseBanner}! Bạn có thể cất giữ nhu yếu phẩm vào kho an toàn.
              </div>
            </div>
          )}

          {/* New Companion Banner Notification */}
          {recentCompanionBanner && (
            <div className="p-3 bg-sky-950/80 border border-sky-500 rounded-lg mb-4 flex items-center gap-3 text-sky-200 text-xs shadow-lg">
              <Users className="w-5 h-5 text-sky-400 shrink-0" />
              <div>
                <span className="font-bold uppercase text-white">ĐÃ GIẢI CỨU THÀNH CÔNG ĐỒNG ĐỘI:</span> {recentCompanionBanner.name} ({recentCompanionBanner.role}) đã đồng hành cùng bạn!
              </div>
            </div>
          )}

          {/* Emergency Event Alert (If active) */}
          {activeEmergency && (
            <EmergencyEventAlert />
          )}

          {/* Bản tin radio (chỉ hiện khi có thông tin về tương lai) */}
          {currentTurn?.radio_transmission && (
            <RadioBroadcast key={`radio-${currentTurn.turnNumber}`} text={currentTurn.radio_transmission} />
          )}

          {/* Story Narrative & Outcome Card (Smooth, stable, clear reading experience) */}
          <main className="flex-1 bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 sm:p-7 backdrop-blur-md shadow-2xl flex flex-col justify-between mb-4">
            <div className="space-y-5">
              <SceneIllustration
                sceneId={currentTurn?.scene_id}
                weather={weather}
                dangerLevel={dangerLevel}
                blackout={day >= 10}
              />

              {/* Previous Outcome Callout */}
              {currentTurn?.outcome && (
                <div className="p-4 bg-neutral-950/80 border-l-4 border-amber-500 rounded-r-lg text-sm text-neutral-300 leading-relaxed shadow-sm">
                  <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider mb-1 font-semibold">
                    KẾT QUẢ HÀNH ĐỘNG VỪA QUA
                  </div>
                  <p>{currentTurn.outcome}</p>
                </div>
              )}

              {teamLog.length > 0 && (
                <div className="rounded-r-lg border-l-4 border-sky-600 bg-sky-950/20 p-3 text-xs leading-relaxed text-sky-100">
                  <div className="mb-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-sky-300">Nhóm làm việc</div>
                  {teamLog.map((l, i) => (<div key={i}>• {l}</div>))}
                </div>
              )}

              {/* Current Situation Narrative */}
              <div>
                <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 uppercase tracking-wider mb-2">
                  <Skull className="w-3.5 h-3.5 text-red-500" />
                  <span>BỐI CẢNH HIỆN TẠI</span>
                </div>

                <div className="text-sm sm:text-base text-neutral-100 leading-relaxed space-y-3 font-normal whitespace-pre-line">
                  {currentTurn?.situation || 'Đang quan sát xung quanh...'}
                </div>
              </div>
            </div>

            {/* AI Decision & Choices Panel */}
            <div className="mt-8 pt-6 border-t border-neutral-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-neutral-400 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-red-500" />
                  <span>HÃY ĐƯA RA LỰA CHỌN CỦA BẠN (3 GỢI Ý HOẶC TỰ NHẬP):</span>
                </span>
                {isAiProcessing && (
                  <span className="text-xs text-amber-400 font-mono flex items-center gap-1.5">
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Gemini AI Đang Phân Tích Diễn Biến...</span>
                  </span>
                )}
              </div>

              {/* 3 AI Suggested Choices */}
              <div className="grid grid-cols-1 gap-2.5">
                {currentTurn?.choices?.map((choiceText, idx) => (
                  <button
                    key={idx}
                    disabled={isAiProcessing}
                    onClick={() => handleExecuteTurn(choiceText, 'choice')}
                    className="group relative flex items-start gap-3 p-3.5 bg-neutral-950/70 hover:bg-neutral-800/90 border border-neutral-800 hover:border-red-600/70 rounded-lg text-left transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
                  >
                    <span className="w-6 h-6 rounded bg-neutral-900 border border-neutral-700 group-hover:border-red-500 flex items-center justify-center text-xs font-mono font-bold text-neutral-300 group-hover:text-red-400 shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="text-sm text-neutral-200 group-hover:text-white leading-snug">
                      {choiceText}
                    </span>
                  </button>
                ))}
              </div>

              {/* 4th Option: Custom Action Text Input */}
              <div className="pt-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (customActionText.trim() && !isAiProcessing) {
                      handleExecuteTurn(customActionText.trim(), 'custom');
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  <div className="relative flex-1">
                    <input
                      type="text"
                      disabled={isAiProcessing}
                      value={customActionText}
                      onChange={(e) => setCustomActionText(e.target.value)}
                      placeholder="Hoặc tự gõ hành động độc đáo (VD: Phá khớp gối zombie, ném lon sắt đánh lạc hướng, rút xăng xe...)..."
                      className="w-full px-4 py-3 bg-neutral-950 border border-neutral-700 focus:border-red-500 rounded-lg text-sm text-white placeholder-neutral-500 focus:outline-none transition-colors shadow-inner"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isAiProcessing || !customActionText.trim()}
                    className={`px-5 py-3 rounded-lg text-xs font-semibold uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shrink-0 shadow-md ${
                      !customActionText.trim() || isAiProcessing
                        ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-500 text-white shadow-red-900/30'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Gửi Hành Động</span>
                  </button>
                </form>
              </div>
            </div>
          </main>
        </div>
      )}

      {/* 4. Game Over or Victory Modal */}
      {(gamePhase === 'game_over' || gamePhase === 'victory') && (
        <EndGameModal
          gameState={{
            gamePhase,
            day,
            turnCount,
            location,
            weather,
            background_effect: backgroundEffect,
            dangerLevel,
            player,
            base,
            companions,
            history,
            currentTurn,
            activeEmergency,
            emergencyTimeLeft: emergencySecondsLeft,
            isAiProcessing,
            hasApiKey,
            audioEnabled,
            volume: 0.7,
            lootNotifications,
          }}
          onRestart={handleRestartGame}
        />
      )}

      {/* Auxiliary Modals */}
      {showInventory && (
        <InventoryDrawer
          inventory={player.inventory}
          equippedWeapon={player.equippedWeapon}
          equippedArmor={player.equippedArmor}
          wound={player.wound}
          onUseItem={handleUseItem}
          onCookFood={handleCookFood}
          onDryFood={handleDryFood}
          onFreezeFood={handleFreezeFood}
          canFreeze={hasFreezerPower}
          onEquipItem={handleEquipItem}
          onOpenCrafting={() => {
            setShowInventory(false);
            setShowCrafting(true);
          }}
          onOpenBaseWarehouse={base.hasBase ? () => {
            setShowInventory(false);
            setShowBaseModal(true);
          } : undefined}
          onClose={() => setShowInventory(false)}
        />
      )}

      {showCrafting && (
        <CraftingModal
          inventory={player.inventory}
          onCraftRecipe={handleCraftRecipe}
          onCustomCraft={handleCustomCraft}
          onClose={() => setShowCrafting(false)}
          isCraftingLoading={isCraftingLoading}
        />
      )}

      {showBaseModal && (
        <BaseHub
          base={base}
          backpack={player.inventory}
          settingId={settingId}
          shelterLabel={getSetting(settingId).labels.shelter}
          placeName={getSetting(settingId).place}
          loopStatus={loopStatus}
          onEstablish={handleEstablishBase}
          onAbandon={handleAbandonBase}
          onBuild={handleBuildModule}
          onFortify={handleFortify}
          companions={companions}
          exposure={exposureOf({ base, flags: worldFlags, day, companionCount: companions.filter((c) => c.status !== 'deceased').length, hasVehicle: !!vehicle })}
          vehicle={vehicle}
          onBuildVehicle={handleBuildVehicle}
          onRepairVehicle={handleRepairVehicle}
          onRefuelVehicle={handleRefuelVehicle}
          onStoreItem={handleStoreItem}
          onRetrieveItem={handleRetrieveItem}
          onClose={() => setShowBaseModal(false)}
        />
      )}

      {showMapModal && (
        <DynamicMapModal
          visitedNodes={visitedNodes}
          visitCounts={mapVisits}
          weather={weather}
          stamina={player.stats.stamina}
          homeName={base.hasBase ? base.name : location}
          extraNodes={outpostNodes}
          baseNodeId={base.baseNodeId}
          hasBase={base.hasBase}
          onClaimBase={handleClaimBase}
          vehicle={vehicle}
          crewAvailable={companions.filter((c) => c.status !== 'deceased' && c.hp >= 25).length}
          onTravel={handleTravelFromMap}
          onClose={() => setShowMapModal(false)}
        />
      )}

      {chatCompanionId && companions.find((c) => c.id === chatCompanionId) && (
        <CompanionChat
          companion={companions.find((c) => c.id === chatCompanionId)!}
          playerGender={player.gender}
          playerNameKnown={player.nameKnown !== false}
          log={chatLogs[chatCompanionId] || []}
          busy={chatBusy}
          askingName={nameAskId === chatCompanionId}
          onSend={handleSendChat}
          onSetRole={(role) => handleSetRole(chatCompanionId, role)}
          onAnswerName={handleAnswerName}
          onClose={() => setChatCompanionId(null)}
        />
      )}

      {showCompanions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-4xl">
            <CompanionPanel
              companions={companions}
              inventory={player.inventory}
              onHealCompanion={handleHealCompanion}
              onTalkCompanion={handleTalkCompanion}
              onFlirtCompanion={handleFlirtCompanion}
              onGiftCompanion={handleGiftCompanion}
              onProposeIntimacy={handleProposeIntimacy}
              onQuarantineCompanion={handleQuarantineCompanion}
              onTreatIncubation={handleTreatIncubation}
              onPurgeCompanion={handlePurgeCompanion}
              hasSafeBase={zone === 'shelter' && !worldFlags.includes('raid_warned')}
              playerGender={player.gender}
              onOpenChat={(c) => { setShowCompanions(false); setChatCompanionId(c.id); }}
              onQuickChat={(c, text) => { setShowCompanions(false); setChatCompanionId(c.id); void handleSendChat(text, c.id); }}
              onClose={() => setShowCompanions(false)}
            />
          </div>
        </div>
      )}

      {showWorldSummary && (() => {
        const summary = makeSummary();
        return (
          <WorldSummaryModal
            summary={summary}
            quests={computeQuests({ flags: worldFlags, day, fortification: base.fortification, hasBase: base.hasBase, companionsAlive: companions.filter((c) => c.status !== 'deceased').length })}
            factions={factionStanding(worldFlags)}
            flagsText={worldFlags.filter((f) => FLAG_TEXT[f] && !/^clue_/.test(f)).map((f) => FLAG_TEXT[f])}
            clueIds={worldFlags.filter((f) => /^clue_/.test(f))}
            log={worldLog}
            onClose={() => setShowWorldSummary(false)}
          />
        );
      })()}

      {showChronicle && (
        <ChronicleModal
          currentDay={day}
          history={history}
          skills={player.skills}
          companions={companions}
          onClose={() => setShowChronicle(false)}
        />
      )}
    </div>
  );
}
