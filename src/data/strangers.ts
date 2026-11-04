import { Companion, Item } from '../types/game';
import { Setting, Zone } from './settings';
import { rollLoot } from './lootTables';

// ====================================================================
// NGƯỜI LẠ NGẪU NHIÊN: mỗi lần gặp là một người khác (nghề, ngoại hình, tên, hoàn cảnh).
// Bạn KHÔNG biết tên họ: họ hiện ra bằng ngoại hình ("người phụ nữ mặc áo blouse lấm bẩn")
// và chỉ cho biết tên thật sau vài lượt hoặc khi đủ tin tưởng.
// Cảnh được mã hóa vào scene_id (stranger:a:d:n:l) để server không trạng thái vẫn xử lý đúng.
// ====================================================================

type Rng = () => number;

interface Archetype {
  job: string;
  avatar: string;
  looks: string[];
  skills: string[];
  equipment: string;
  personality: string;
  bio: string;
}

const ARCHETYPES: Archetype[] = [
  { job: 'Y tá', avatar: '🩺', looks: ['mặc áo blouse lấm bẩn', 'đeo thẻ nhân viên y tế bạc màu'], skills: ['Sơ cứu và băng ép cầm máu', 'Nhận biết dấu hiệu nhiễm trùng'], equipment: 'Kéo y tế và cuộn băng', personality: 'Điềm tĩnh, hay lo cho người khác', bio: 'Từng trực ca đêm ở phòng cấp cứu.' },
  { job: 'Thợ điện', avatar: '🔧', looks: ['đeo thắt lưng đầy dụng cụ', 'mặc áo bảo hộ sờn vai'], skills: ['Sửa máy phát điện', 'Đấu nối nguồn điện dã chiến'], equipment: 'Kìm điện và bút thử điện', personality: 'Ít nói, làm việc cẩn thận', bio: 'Hơn mười năm đi sửa điện các khu dân cư.' },
  { job: 'Đầu bếp', avatar: '🍳', looks: ['mặc tạp dề ám khói', 'có vết bỏng cũ trên cánh tay'], skills: ['Nấu nướng dã chiến (bữa ăn no hơn)', 'Ướp muối và sấy khô thực phẩm'], equipment: 'Con dao thái nhỏ', personality: 'Nóng tính nhưng rộng rãi', bio: 'Từng làm bếp trưởng một quán ăn nhỏ.' },
  { job: 'Bảo vệ tòa nhà', avatar: '🛡️', looks: ['mặc đồng phục bảo vệ xộc xệch', 'đội mũ lưỡi trai đã rách'], skills: ['Canh gác và nghe ngóng', 'Gia cố cửa khóa'], equipment: 'Chiếc dùi cui điện hết pin', personality: 'Cảnh giác, khó tin người', bio: 'Trực cổng nhiều năm ở khu chung cư.' },
  { job: 'Giáo viên', avatar: '📚', looks: ['đeo kính vỡ một bên tròng', 'ôm chặt chiếc cặp da cũ'], skills: ['Giữ bình tĩnh cho cả nhóm', 'Ghi nhớ đường đi'], equipment: 'Sổ tay và bút', personality: 'Kiên nhẫn, hay quan sát', bio: 'Dạy học ở một trường cấp ba gần đây.' },
  { job: 'Tài xế xe tải', avatar: '🚚', looks: ['mặc áo ba lỗ ám mùi dầu', 'đội mũ vải sờn'], skills: ['Rút xăng và sửa xe', 'Thuộc nhiều đường tắt'], equipment: 'Chiếc cờ lê dài', personality: 'Chất phác, nói nhiều khi căng thẳng', bio: 'Chạy tuyến Bắc Nam hơn hai mươi năm.' },
  { job: 'Sinh viên y', avatar: '🎓', looks: ['mang ba lô nặng trĩu sách', 'tóc rối bết mồ hôi'], skills: ['Sơ cứu cơ bản', 'Phân biệt thuốc thông dụng'], equipment: 'Ống nghe cũ', personality: 'Sợ hãi nhưng muốn giúp người', bio: 'Đang thực tập năm cuối ở bệnh viện.' },
  { job: 'Nông dân ngoại thành', avatar: '🌾', looks: ['đi dép tông bùn đất', 'đội nón lá rách mép'], skills: ['Trồng rau trên sân thượng', 'Bắt cá và đặt bẫy chim'], equipment: 'Con dao rựa', personality: 'Kiên nhẫn, ít nói', bio: 'Lên thành phố bán rau thì gặp biến cố.' },
  { job: 'Thợ sửa xe', avatar: '🔩', looks: ['tay lấm dầu nhớt', 'mặc áo thun in tên gara'], skills: ['Gia cố then cửa thép', 'Sửa chữa đồ cơ khí'], equipment: 'Kìm bấm chết và mỏ lết', personality: 'Bộc trực, từng trải', bio: 'Chủ một gara xe máy nhỏ.' },
  { job: 'Dược sĩ', avatar: '💊', looks: ['mặc áo dược sĩ trắng ngả vàng', 'ôm thùng thuốc nhỏ'], skills: ['Phân loại thuốc kháng sinh', 'Pha chế cồn sát trùng'], equipment: 'Kẹp gắp y tế', personality: 'Cẩn thận, tỉ mỉ', bio: 'Làm ở nhà thuốc tư nhân đầu phố.' },
  { job: 'Lính nghĩa vụ', avatar: '🪖', looks: ['mặc quân phục bạc màu', 'gương mặt còn non nhưng ánh mắt mệt mỏi'], skills: ['Chiến đấu cận chiến', 'Ngụy trang và di chuyển lặng lẽ'], equipment: 'Con dao găm quân dụng', personality: 'Kỷ luật, dễ nghe chỉ huy', bio: 'Rời đơn vị khi tình hình hỗn loạn.' },
  { job: 'Ngư dân hồ Tây', avatar: '🎣', looks: ['mặc áo mưa nhựa sờn', 'mang theo cần câu gấp'], skills: ['Câu cá và đánh lưới nhỏ', 'Lọc nước dã chiến'], equipment: 'Cần câu và lưới nhỏ', personality: 'Điềm đạm, quen chịu đựng', bio: 'Sống bằng nghề câu ở ven hồ nhiều năm.' },
];

const FEMALE_FIRST = ['Lan', 'Hương', 'Thu', 'Mai', 'Ngọc', 'Hà', 'Linh', 'Trang', 'Phương', 'Yến', 'Oanh', 'Hạnh'];
const MALE_FIRST = ['Hùng', 'Dũng', 'Tuấn', 'Nam', 'Khoa', 'Long', 'Bình', 'Thắng', 'Quân', 'Sơn', 'Hiếu', 'Phúc'];
const LAST = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Vũ', 'Đặng', 'Bùi', 'Hoàng', 'Đỗ', 'Ngô'];

interface Dilemma {
  id: string;
  zones: Zone[];
  situation: (who: string, s: Setting) => string;
  choices: [string, string, string];
}

const DILEMMAS: Dilemma[] = [
  {
    id: 'cornered', zones: ['outside', 'near'],
    situation: (who) => `Phía trước, ${who} đang bị hai con zombie dồn vào góc tường, tay giơ cao một thanh sắt gãy đầy tuyệt vọng. Chúng chưa kịp cắn nhưng chỉ vài giây nữa là hết cơ hội.`,
    choices: ['Lao ra dùng vũ khí hạ con đi đầu để mở đường cho người đó chạy', 'Ném một vật nặng sang phía bên kia để dụ chúng quay đi', 'Nhìn một lát rồi lặng lẽ lùi lại, không đáng liều mạng'],
  },
  {
    id: 'wounded', zones: ['near', 'outside'],
    situation: (who) => `${who} ngồi tựa vào tường, một tay ôm sườn đang rỉ máu qua kẽ ngón tay. Người đó ngước nhìn bạn, môi tái nhợt và run rẩy, không nói nên lời.`,
    choices: ['Dùng băng gạc cầm máu và băng bó vết thương cho người đó', 'Đưa cho một ít đồ ăn thức uống rồi dìu đứng dậy', 'Quay đi, mình còn phải lo cho bản thân'],
  },
  {
    id: 'locked_in', zones: ['near', 'outside'],
    situation: (who) => `Từ sau cánh cửa sắt bị chèn từ bên ngoài vọng ra tiếng gõ yếu ớt. Qua khe hở, bạn thấy ${who} đang co ro, giọng khàn đặc: "Làm ơn... mở giúp tôi, tôi không bị cắn."`,
    choices: ['Dùng vật cứng bẩy cánh cửa ra dù tốn sức và gây tiếng động', 'Nói chuyện qua khe cửa, hỏi người đó có thể đổi gì để được giúp', 'Bỏ đi, không thể biết người đó nói thật hay dối'],
  },
  {
    id: 'trade', zones: ['outside', 'near'],
    situation: (who) => `${who} xuất hiện ở đầu ngõ, hai tay giơ cao để bạn thấy không có vũ khí. Người đó ra hiệu có thứ muốn đổi và hỏi bạn có thể nhường chút đồ ăn không.`,
    choices: ['Đồng ý đổi một món thức ăn lấy đồ của người đó', 'Mời người đó đi cùng, hai người dễ sống sót hơn một mình', 'Từ chối thẳng thừng và yêu cầu người đó đi chỗ khác'],
  },
  {
    id: 'hidden_bite', zones: ['near', 'outside'],
    situation: (who) => `${who} bước tới khi bạn đang nghỉ chân, quần áo bám đầy bụi và mồ hôi. Người đó xin được đi cùng, miệng cười gượng và liên tục kéo tay áo che cẳng tay trái.`,
    choices: ['Chấp nhận cho đi cùng, người sống sót nào cũng quý', 'Yêu cầu xắn tay áo cho bạn kiểm tra trước khi tin', 'Từ chối, bảo đi tìm nhóm khác'],
  },
  {
    id: 'thief', zones: ['shelter', 'near'],
    situation: (who) => `Bạn giật mình khi thấy ${who} đang lén lục túi đồ của mình, tay nắm chặt một món đồ ăn. Người đó cứng đờ, mắt dán vào bạn, run rẩy.`,
    choices: ['Chặn đường và hỏi cho ra lẽ, cho người đó một cơ hội làm việc bù', 'Quát đuổi và giật lại đồ rồi tống ra khỏi cửa', 'Giả vờ không thấy, để người đó lấy chút rồi đi'],
  },
];

export interface StrangerSpec { a: number; d: number; n: number; l: number; g: number; }

export function rollStranger(rng: Rng, zone: Zone): StrangerSpec {
  const fit = DILEMMAS.map((d, i) => ({ d, i })).filter((x) => x.d.zones.includes(zone));
  const pickD = fit.length ? fit[Math.floor(rng() * fit.length)].i : 0;
  return {
    a: Math.floor(rng() * ARCHETYPES.length),
    d: pickD,
    n: Math.floor(rng() * 1000),
    l: Math.floor(rng() * 8),
    g: rng() < 0.5 ? 0 : 1,
  };
}

export const strangerId = (s: StrangerSpec) => `stranger:${s.a}:${s.d}:${s.n}:${s.l}:${s.g}`;
export function parseStrangerId(id: string): StrangerSpec | null {
  const m = id.match(/^stranger:(\d+):(\d+):(\d+):(\d+):(\d+)$/);
  if (!m) return null;
  const [a, d, n, l, g] = m.slice(1).map(Number);
  if (!ARCHETYPES[a] || !DILEMMAS[d]) return null;
  return { a, d, n, l, g };
}

function identity(s: StrangerSpec) {
  const arch = ARCHETYPES[s.a];
  const female = s.g === 0;
  const first = (female ? FEMALE_FIRST : MALE_FIRST)[s.n % 12];
  const last = LAST[Math.floor(s.n / 12) % LAST.length];
  const look = arch.looks[s.l % arch.looks.length];
  const alias = `${female ? 'Người phụ nữ lạ' : 'Người đàn ông lạ'} (${look})`;
  return { arch, female, realName: `${last} ${first}`, look, alias, who: `${female ? 'một người phụ nữ' : 'một người đàn ông'} ${look}` };
}

export function strangerZones(s: StrangerSpec): Zone[] {
  return DILEMMAS[s.d].zones;
}

export function strangerScene(s: StrangerSpec, setting: Setting) {
  const id = identity(s);
  const dil = DILEMMAS[s.d];
  return {
    id: strangerId(s),
    zone: dil.zones[0],
    title: 'Một Người Lạ Xuất Hiện',
    situation: dil.situation(id.who, setting),
    choices: dil.choices,
  };
}

const TRAIT_POOL = ['brave', 'coward', 'greedy', 'loyal', 'jealous', 'kind', 'hot_tempered'];
// Hai tính cách ổn định theo hạt giống của người lạ (không mâu thuẫn nhau)
function traitsFor(s: StrangerSpec): string[] {
  const a = TRAIT_POOL[(s.n + s.a) % TRAIT_POOL.length];
  let b = TRAIT_POOL[(s.n * 3 + s.l + 1) % TRAIT_POOL.length];
  const clash: Record<string, string> = { brave: 'coward', coward: 'brave', loyal: 'greedy', greedy: 'loyal' };
  if (b === a || clash[a] === b) b = 'kind';
  return a === b ? [a] : [a, b];
}

export function makeStrangerCompanion(s: StrangerSpec, turn: number, trustBonus: number, infected = false): Companion {
  const id = identity(s);
  const hp = 60 + (s.n % 30);
  return {
    id: `stranger_${s.a}_${s.n}`,
    name: id.alias,
    realName: id.realName,
    nameKnown: false,
    joinedTurn: turn,
    nickname: id.arch.job,
    gender: id.female ? 'female' : 'male',
    age: 22 + (s.n % 30),
    role: id.arch.job,
    personality: id.arch.personality,
    bio: id.arch.bio,
    avatar: id.arch.avatar,
    hp, maxHp: hp + 15,
    morale: 55 + (s.n % 20),
    trust: Math.max(5, Math.min(90, 30 + trustBonus)),
    affection: 10,
    intimacyLevel: 'stranger',
    status: 'healthy',
    incubation: infected
      ? { isInfected: true, incubationTurns: 0, stage: 'hidden', isQuarantined: false, isTreated: false, secretBiteLocation: 'Vết cắn giấu dưới tay áo trái' }
      : { isInfected: false, incubationTurns: 0, stage: 'none', isQuarantined: false, isTreated: false },
    skills: id.arch.skills,
    traits: traitsFor(s),
    equipment: id.arch.equipment,
    lastComment: 'Cảm ơn... tôi sẽ không làm gánh nặng cho anh đâu.',
    hasBeenRescued: true,
  };
}

export interface StrangerResolution {
  outcome: string;
  stats: { hp?: number; hunger?: number; thirst?: number; infection?: number; sanity?: number; stamina?: number };
  gain: Item[];
  lose: { name: string; quantity: number }[];
  recruit?: Companion;
  abandon?: boolean; // người chơi bỏ mặc người lạ đang cần giúp
  requires?: { re: RegExp; label: string };
}

// choiceIdx: 0/1/2 theo thứ tự lựa chọn trong cảnh.
export function resolveStranger(s: StrangerSpec, choiceIdx: number, turn: number, rng: Rng): StrangerResolution {
  const id = identity(s);
  const who = id.who;
  const r = (o: Partial<StrangerResolution> & { outcome: string }): StrangerResolution => ({ stats: {}, gain: [], lose: [], ...o });
  const dil = DILEMMAS[s.d].id;

  if (dil === 'cornered') {
    if (choiceIdx === 0) return r({ outcome: `Bạn lao vào, giáng thẳng vào khớp gối con đi đầu khiến nó đổ gục, bồi thêm một cú dứt điểm. Con còn lại bị ${who} đẩy lùi. Thở hổn hển, người đó nắm lấy tay bạn: "Tôi nợ anh mạng này."`, stats: { stamina: -18, hp: -6, sanity: 3 }, recruit: makeStrangerCompanion(s, turn, 35) });
    if (choiceIdx === 1) return r({ outcome: 'Vật nặng đập vỡ kính ở bên kia, hai con zombie lập tức xoay đầu. Người lạ chớp thời cơ chạy về phía bạn, mặt tái xanh nhưng còn nguyên vẹn. Người đó đi theo bạn mà không nói gì.', stats: { stamina: -10 }, recruit: makeStrangerCompanion(s, turn, 22) });
    return r({ outcome: 'Bạn lùi lại sau chiếc xe bỏ hoang. Tiếng thét ngắn ngủi vang lên rồi tắt hẳn. Bạn an toàn, nhưng hình ảnh ấy bám lấy đầu óc bạn suốt cả ngày.', stats: { sanity: -10 }, abandon: true });
  }
  if (dil === 'wounded') {
    if (choiceIdx === 0) return r({ requires: { re: /băng|gạc/i, label: 'Băng gạc' }, outcome: 'Bạn ép gạc lên vết thương, quấn chặt rồi cố định. Người lạ thở ra, nước mắt rơi xuống trong im lặng: "Anh không nợ tôi gì cả... vậy mà..."', stats: { stamina: -6, sanity: 4 }, lose: [{ name: 'Băng gạc', quantity: 1 }], recruit: makeStrangerCompanion(s, turn, 38) });
    if (choiceIdx === 1) return r({ outcome: 'Bạn chia cho người đó chút đồ ăn thức uống, dìu đứng dậy. Máu vẫn rỉ nhưng đã chậm lại, và người đó gật đầu cảm ơn, quyết định đi cùng bạn.', stats: { stamina: -8 }, lose: [{ name: 'nước', quantity: 1 }], recruit: makeStrangerCompanion(s, turn, 20) });
    return r({ outcome: 'Bạn quay đi. Phía sau có tiếng gọi yếu ớt rồi im lặng. Bạn tự nhủ không còn lựa chọn nào khác.', stats: { sanity: -8 }, abandon: true });
  }
  if (dil === 'locked_in') {
    if (choiceIdx === 0) return r({ outcome: 'Bạn dùng hết sức bẩy cánh cửa, tiếng kim loại ken két vang xa. Cửa bật ra, người bên trong lao ra thở dốc, nhìn quanh đầy sợ hãi rồi đi theo bạn.', stats: { stamina: -14, sanity: -2 }, recruit: makeStrangerCompanion(s, turn, 30) });
    if (choiceIdx === 1) return r({ outcome: 'Qua khe hở, người đó đẩy ra vài món đồ ăn thức uống: "Tôi chỉ có thế này, nhưng cửa này kẹt, tự tôi thoát được". Bạn nhận lấy và rời đi, không biết người đó có nói thật hay không.', stats: { sanity: -2 }, gain: rollLoot('household', 2, rng) });
    return r({ outcome: 'Bạn bỏ đi. Tiếng gõ cửa nhỏ dần phía sau, rồi tắt hẳn.', stats: { sanity: -6 }, abandon: true });
  }
  if (dil === 'trade') {
    if (choiceIdx === 0) return r({ outcome: 'Hai bên trao đổi không một lời thừa. Người lạ nhận món ăn của bạn, đặt xuống vài thứ kiếm được trên đường rồi nhìn quanh và đi về hướng khác.', stats: { stamina: -3 }, lose: [{ name: 'Đồ hộp', quantity: 1 }], gain: rollLoot('market', 2, rng) });
    if (choiceIdx === 1) {
      const robbed = rng() < 0.25;
      return r({ outcome: robbed ? 'Người đó đồng ý đi cùng, nhưng đến đêm đầu tiên bạn phát hiện một phần đồ ăn đã biến mất cùng với người ấy... không, người đó vẫn còn đây, chỉ là ánh mắt tránh né. Bạn biết mình phải để mắt.' : 'Người đó do dự rồi gật đầu. Hai người sánh bước, đỡ nhau qua những khúc quanh đầy xác xe.', stats: { stamina: -2 }, recruit: makeStrangerCompanion(s, turn, robbed ? 8 : 20) });
    }
    return r({ outcome: 'Bạn xua tay. Người lạ nhún vai, đi khuất sau góc đường. Không có gì thay đổi.', stats: { sanity: -1 } });
  }
  if (dil === 'hidden_bite') {
    if (choiceIdx === 0) return r({ outcome: 'Bạn cho người đó đi cùng. Cả ngày hôm ấy người đó cười nhiều, làm việc chăm chỉ, nhưng thỉnh thoảng bạn thấy trán họ lấm tấm mồ hôi dù trời không nóng.', stats: { sanity: 1 }, recruit: makeStrangerCompanion(s, turn, 20, true) });
    if (choiceIdx === 1) return r({ outcome: 'Người đó ngập ngừng rồi xắn tay áo: một vết cắn tím đen đã bắt đầu lan gân xanh. Hắn lùi lại, nước mắt chảy: "Tôi xin lỗi... Tôi chỉ muốn có người ở bên." Rồi quay đi, loạng choạng biến mất sau con hẻm.', stats: { sanity: -6, stamina: -4 } });
    return r({ outcome: 'Bạn lắc đầu. Người đó cố nài thêm một lần rồi cúi mặt bỏ đi, bước chân nặng nề.', stats: { sanity: -3 } });
  }
  // thief
  if (choiceIdx === 0) return r({ outcome: 'Bạn chặn cửa và hỏi thẳng. Người đó kể mình đã ba ngày không có gì ăn, xin ở lại làm việc bù. Bạn nhìn kỹ rồi miễn cưỡng gật đầu, vẫn để mắt tới từng cử động của họ.', stats: { sanity: -2 }, recruit: makeStrangerCompanion(s, turn, 8) });
  if (choiceIdx === 1) return r({ outcome: 'Bạn giật lại đồ và đẩy người đó ra khỏi cửa. Tiếng chửi rủa nhỏ dần ở cầu thang. Bạn khóa cửa lại, tim vẫn đập thình thịch.', stats: { stamina: -8, sanity: -3 } });
  return r({ outcome: 'Bạn nhắm mắt làm ngơ. Người đó lấy chút đồ rồi lặng lẽ lách ra ngoài, không dám ngoái lại.', stats: { hunger: 2 }, lose: [{ name: 'Đồ hộp', quantity: 1 }] });
}
