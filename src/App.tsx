/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
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
import { encodeMapAction, WorldNode } from './data/worldMap';
import { sound } from './utils/audio';

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

  // Emergency countdown: mỗi giây trừ 1; hết giờ thì xử lý đúng một lần (không gọi trong state updater như trước)
  useEffect(() => {
    if (!activeEmergency) return;
    if (emergencySecondsLeft <= 0) {
      handleEmergencyTimeout();
      return;
    }
    const id = window.setTimeout(() => setEmergencySecondsLeft((prev) => prev - 1), 1000);
    return () => window.clearTimeout(id);
  }, [activeEmergency, emergencySecondsLeft]);

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
        scene_id: data.scene_id || 'r_start',
        system_trigger: data.system_trigger,
        radio_transmission: data.radio_transmission,
      };

      setPendingEvents(data.pending_events || []);
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
          turnCount,
          tomorrowForecast,
          pendingEvents,
          chosenAction: action,
          actionType,
          currentLocation: location,
          day,
          weather,
          worldFlags: {
            rescued_pharmacist: companions.some((c) => c.name.includes('Giang')),
            rescued_doctor: companions.some((c) => c.name.includes('Uyên')),
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

      const effectiveMaxHp = lockedMaxHp || player.stats.maxHp;
      const nextHp = Math.max(0, Math.min(effectiveMaxHp, player.stats.hp + (data.statChanges?.hp || 0)));
      const nextHunger = Math.max(0, Math.min(100, player.stats.hunger + (data.statChanges?.hunger ?? 5)));
      const nextThirst = Math.max(0, Math.min(100, player.stats.thirst + thirstDelta));
      const nextInfection = Math.max(0, Math.min(100, player.stats.infection + (data.statChanges?.infection || 0) + infectionPenalty));
      const nextSanity = Math.max(0, Math.min(100, player.stats.sanity + (data.statChanges?.sanity || 0) - sanityPenalty));
      const nextStamina = Math.max(0, Math.min(maxStamina, player.stats.stamina + staminaDelta));

      // 3. Food Spoilage Progression
      const decayRate = data.weather === 'heatwave' ? 18 : 8;

      let updatedInventory = player.inventory.map((item) => {
        if (item.category === 'food' && item.canSpoil && !item.isSealed && !item.isDried) {
          const loss = item.isCooked ? Math.round(decayRate * 0.5) : decayRate;
          const newFreshness = Math.max(0, (item.freshness ?? 100) - loss);
          return { ...item, freshness: newFreshness };
        }
        return { ...item };
      });

      let updatedBaseWarehouse = base.warehouse.map((item) => {
        if (item.category === 'food' && item.canSpoil && !item.isSealed && !item.isDried) {
          if (base.facilities.hasGeneratorAndFridge) {
            return item;
          }
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
            existing.quantity += gItem.quantity;
          } else {
            updatedInventory.push(gItem);
          }
        });
      }

      if (data.itemsLost && data.itemsLost.length > 0) {
        data.itemsLost.forEach((lItem: { name: string; quantity: number }) => {
          const existing = updatedInventory.find((it) => it.name.includes(lItem.name));
          if (existing) {
            existing.quantity = Math.max(0, existing.quantity - lItem.quantity);
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

      let updatedBase = { ...base, warehouse: updatedBaseWarehouse };
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

      let updatedCompanions = companions.map((c) => ({ ...c }));
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
      if (data.newCompanion && !updatedCompanions.some((c) => c.id === data.newCompanion.id)) {
        updatedCompanions.push({ ...data.newCompanion, hasBeenRescued: true });
        setRecentCompanionBanner(data.newCompanion);
        setTimeout(() => setRecentCompanionBanner(null), 6000);
      }
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
        dangerLevel: data.dangerLevel || dangerLevel,
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
        system_trigger: data.system_trigger,
        radio_transmission: data.radio_transmission,
        game_ending: data.game_ending,
      };

      setPendingEvents(data.pending_events || []);
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
  const handleTravelFromMap = (node: WorldNode, lootStyle: 'quick' | 'thorough', hops: number) => {
    if (isAiProcessing) return;
    setShowMapModal(false);
    const visits = mapVisits[node.id] || 0;
    const text = lootStyle === 'quick'
      ? `Tôi di chuyển đến ${node.name} (${hops} chặng), lục soát nhanh gọn, ưu tiên giữ im lặng tuyệt đối.`
      : `Tôi di chuyển đến ${node.name} (${hops} chặng), dùng xà beng phá khóa tủ sắt và chấp nhận rủi ro tiếng động để tìm vật tư cao cấp.`;
    setMapVisits((prev) => ({ ...prev, [node.id]: (prev[node.id] || 0) + 1 }));
    setVisitedNodes((prev) => (prev.includes(node.id) ? prev : [...prev, node.id]));
    handleExecuteTurn(encodeMapAction(node.id, lootStyle, hops, visits, text), 'choice');
  };

  // Emergency timeout fallback
  const handleEmergencyTimeout = () => {
    handleExecuteTurn(
      'Tôi bị đông cứng người vì quá hoảng loạn và do dự, không kịp phản ứng trước mối nguy hiểm bất ngờ!',
      'emergency_timeout'
    );
  };

  // Use Item from Inventory
  const handleUseItem = (item: Item) => {
    sound.playLoot();

    const isSpoiled = item.category === 'food' && item.freshness !== undefined && item.freshness < 30;

    let hpChange = item.healAmount || 0;
    let hungerChange = item.hungerReduce ? -item.hungerReduce : 0;
    let thirstChange = item.thirstReduce ? -item.thirstReduce : 0;
    let infectionChange = item.infectionReduce ? -item.infectionReduce : 0;

    if (isSpoiled) {
      sound.playCue('zombie_growl');
      infectionChange += 30;
      hpChange -= 20;
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
      .map((it) => (it.id === item.id ? { ...it, quantity: it.quantity - 1 } : it))
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

  // Dry / Cure food
  const handleDryFood = (item: Item) => {
    sound.playLoot();
    const updatedInv = player.inventory.map((it) => {
      if (it.id === item.id) {
        return {
          ...it,
          name: `${it.name} (Sấy khô / Ướp muối)`,
          isDried: true,
          canSpoil: false,
          freshness: 100,
          description: `${it.description} (Đã ướp muối sấy khô, không bao giờ ôi thiu).`,
        };
      }
      return it;
    });
    setPlayer({ ...player, inventory: updatedInv });
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
      .map((it) => (it.id === item.id ? { ...it, quantity: it.quantity - qtyToMove } : it))
      .filter((it) => it.quantity > 0);

    let updatedWarehouse = [...base.warehouse];
    const existingInWarehouse = updatedWarehouse.find((it) => it.name === item.name);
    if (existingInWarehouse) {
      existingInWarehouse.quantity += qtyToMove;
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
      .map((it) => (it.id === item.id ? { ...it, quantity: it.quantity - qtyToMove } : it))
      .filter((it) => it.quantity > 0);

    let updatedBackpack = [...player.inventory];
    const existingInBackpack = updatedBackpack.find((it) => it.name === item.name);
    if (existingInBackpack) {
      existingInBackpack.quantity += qtyToMove;
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

      {/* Loot Notification Pop-up Toast */}
      <LootToast
        notifications={lootNotifications}
        onDismiss={() => setLootNotifications([])}
      />

      {/* 1. Title Screen */}
      {gamePhase === 'title' && (
        <TitleScreen
          onStartGame={() => setGamePhase('creation')}
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
                    <span className="font-bold text-sm text-white">{player.name}</span>
                    <span className="text-[11px] text-neutral-400 font-mono">
                      ({player.backgroundTitle})
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
                  <span>Ba Lô ({player.inventory.reduce((a, b) => a + b.quantity, 0)})</span>
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
                    setShowChronicle(true);
                  }}
                  className="p-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded text-sky-400 transition-colors cursor-pointer"
                  title="Nhật ký 5 nhánh cốt truyện"
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
            <EmergencyEventAlert
              secondsLeft={emergencySecondsLeft}
              totalSeconds={currentTurn?.emergencySeconds || 15}
              onTimeout={handleEmergencyTimeout}
            />
          )}

          {/* Bản tin radio (chỉ hiện khi có thông tin về tương lai) */}
          {currentTurn?.radio_transmission && (
            <RadioBroadcast key={`radio-${currentTurn.turnNumber}`} text={currentTurn.radio_transmission} />
          )}

          {/* Story Narrative & Outcome Card (Smooth, stable, clear reading experience) */}
          <main className="flex-1 bg-neutral-900/90 border border-neutral-800 rounded-xl p-5 sm:p-7 backdrop-blur-md shadow-2xl flex flex-col justify-between mb-4">
            <div className="space-y-5">
              {/* Previous Outcome Callout */}
              {currentTurn?.outcome && (
                <div className="p-4 bg-neutral-950/80 border-l-4 border-amber-500 rounded-r-lg text-sm text-neutral-300 leading-relaxed shadow-sm">
                  <div className="text-[11px] font-mono text-amber-400 uppercase tracking-wider mb-1 font-semibold">
                    KẾT QUẢ HÀNH ĐỘNG VỪA QUA
                  </div>
                  <p>{currentTurn.outcome}</p>
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
        <BaseManagementModal
          base={base}
          backpack={player.inventory}
          onStoreItem={handleStoreItem}
          onRetrieveItem={handleRetrieveItem}
          onUpgradeFortification={handleUpgradeFortification}
          onInstallFacility={handleInstallFacility}
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
          onTravel={handleTravelFromMap}
          onClose={() => setShowMapModal(false)}
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
              hasSafeBase={base.hasBase && base.fortification >= 50}
              onClose={() => setShowCompanions(false)}
            />
          </div>
        </div>
      )}

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
