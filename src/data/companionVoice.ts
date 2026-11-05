// Giọng nói có hồn cho đồng đội: câu trả lời không còn là một dòng đóng khung mà được thêm cử chỉ, phản ứng với điều người chơi vừa nói,
// nhận xét theo hoàn cảnh (thời tiết, ngày, căn cứ), tính cách riêng, và một câu hỏi lại đời thường. Có nhớ những gì đã nói để không lặp.
type Rng = () => number;
type Mood = 'warm' | 'neutral' | 'wary' | 'upset' | 'flirty' | 'shy' | 'sad';

export interface VoiceInput {
  reply: string;
  text: string;                       // câu người chơi vừa nói
  intent: string;
  mood: Mood;
  tier: 'low' | 'mid' | 'high';
  traits: string[];
  affection: number;
  role?: string;
  history: { from: 'player' | 'npc'; text: string }[];
  context?: { day?: number; weather?: string; hasBase?: boolean; needs?: { hunger: number; thirst: number; stamina: number; sanity: number }; wounded?: boolean; recent?: string[] };
  age?: number;
  gender?: string;
  fill: (t: string) => string;
  rng: Rng;
}

const OPENERS: Record<Mood, string[]> = {
  warm: ['*khẽ mỉm cười* ', '*nghiêng đầu nhìn {you}* ', 'Ừ, {me} nghe đây. ', '', ''],
  neutral: ['', '', 'Ừm... ', 'À... ', '*chống cằm suy nghĩ* '],
  wary: ['*liếc qua một cái* ', '... ', 'Hừm. ', '*khoanh tay* '],
  upset: ['*quay mặt đi* ', '*siết chặt nắm tay* ', ''],
  shy: ['*cúi mặt, hơi đỏ tai* ', '*gãi gáy* ', '*bối rối nghịch vạt áo* '],
  flirty: ['*cười nửa miệng* ', '*liếc nhìn {you}, rồi vội đảo mắt đi* ', '*hạ giọng* '],
  sad: ['*thở dài* ', '*nhìn xuống đôi bàn tay* ', '*im lặng một lúc* '],
};

const TRAIT_OPENERS: Record<string, string[]> = {
  coward: ['*giật mình, nhìn quanh* '],
  hot_tempered: ['*nghiến răng* '],
  kind: ['*dịu giọng* '],
  brave: ['*ưỡn thẳng vai* '],
};

// Phản ứng với điều người chơi nói ra (không phải máy: có nghe và có đáp lại)
const MIRRORS: { re: RegExp; lines: string[] }[] = [
  { re: /sợ|run|hoảng/, lines: ['Sợ thì cứ nói ra. Giữ trong lòng còn nặng hơn.', 'Ai ở đây mà chẳng sợ. Khác nhau là có người chịu thừa nhận.'] },
  { re: /mệt|kiệt|không nổi|chán/, lines: ['Nghỉ một chút đi, đừng gồng. Gục xuống rồi thì chẳng giúp được ai.', 'Mệt là phải rồi. Để {me} lo phần việc nhẹ cho.'] },
  { re: /nhớ|người thân|gia đình|mẹ|bố/, lines: ['Còn nhớ được là còn người để nhớ. Đừng bỏ nó đi.', 'Ai cũng có một người để nhớ. Mong họ đang ổn.'] },
  { re: /đói|khát|đồ ăn|nước/, lines: ['Chuyện ăn uống là chuyện lớn nhất bây giờ, {me} biết.', 'Có gì cứ chia, đừng để ai đói một mình.'] },
  { re: /cảm ơn|biết ơn/, lines: ['Đừng nói thế, {me} làm vì {me} muốn.', 'Giữa nhau đâu cần cảm ơn.'] },
  { re: /xin lỗi|lỗi của/, lines: ['Chuyện qua rồi. Điều quan trọng là mình còn ở đây.', 'Được rồi, {me} không giận đâu.'] },
  { re: /tương lai|mai|sau này|hy vọng/, lines: ['Mai ra sao ai biết. Nhưng nghĩ về nó cũng là một cách để sống tiếp.', '{me} không dám hứa gì. Chỉ biết là {me} vẫn muốn thử.'] },
  { re: /đẹp|xinh|dễ thương/, lines: ['Thôi nào, giữa lúc thế này mà còn khen...'] },
];

const WEATHER_ASIDES: Record<string, string[]> = {
  heavy_rain: ['Mưa thế này, cứ nghe nước nhỏ mà lòng {me} nặng trĩu.', 'Trời mưa làm {me} nhớ những ngày bình thường nhất.'],
  heatwave: ['Nóng quá. {me} thèm một ngụm nước đá đến phát điên.', 'Cái nóng này làm đầu óc người ta mụ đi.'],
  freezing_cold: ['Lạnh đến mức ngón tay {me} cứng đờ.', 'Trời lạnh thế này, chỉ muốn rúc vào một cái chăn dày.'],
  dense_fog: ['Sương dày thế này nhìn gì cũng như ma.', 'Sương mù: tốt để trốn, mà cũng tốt cho thứ khác lẻn lại gần.'],
  night_dark: ['Đêm đen quá. Nghe được cả hơi thở của chính mình.', 'Đêm thế này {me} chẳng dám ngủ sâu.'],
};

const CLOSERS = [
  'Mà {you} đã ngủ được chút nào chưa?',
  'Hôm nay {you} ăn gì chưa? Đừng bỏ bữa nhé.',
  '{you} có hay nhớ nhà không?',
  'Nếu mọi chuyện qua đi, {you} muốn làm gì đầu tiên?',
  'Lúc nãy {me} thấy {you} nhìn ra cửa sổ rất lâu. Có chuyện gì không?',
  '{you} thích nhất món gì ngày trước? {me} chợt thèm quá.',
];

const TRAIT_CLOSERS: Record<string, string[]> = {
  jealous: ['Còn... {you} có hay nói chuyện với người khác nhiều không? Không, {me} chỉ hỏi thế thôi.'],
  loyal: ['{me} nói thật: {you} đi đâu thì {me} đi đó.'],
  greedy: ['Phần ăn hôm nay... chia thế nào nhỉ? À, {me} chỉ tiện hỏi.'],
  coward: ['Mà... đêm nay mình có chặn cửa kỹ chưa nhỉ? {me} cứ thấy bất an.'],
  kind: ['Nếu {you} cần ai nghe chuyện thì cứ tìm {me}, lúc nào cũng được.'],
  brave: ['Có việc nặng thì cứ giao {me}, đừng ngại.'],
};

export function humanize(i: VoiceInput): string {
  const { rng } = i;
  const pick = <T,>(a: T[]): T => a[Math.floor(rng() * a.length)];
  const said = i.history.filter((m) => m.from === 'npc').map((m) => m.text);
  const used = (s: string) => said.some((t) => t.includes(i.fill(s).slice(0, 18)));
  const skip = ['assign', 'intimate', 'insult'].includes(i.intent) || i.reply.length > 320;
  if (skip) return i.reply;

  const parts: string[] = [];

  // 1) Cử chỉ mở đầu theo tâm trạng và tính cách
  const traitPool = i.traits.flatMap((t) => TRAIT_OPENERS[t] || []);
  const openers = rng() < 0.3 && traitPool.length ? traitPool : OPENERS[i.mood] || OPENERS.neutral;
  const opener = i.fill(pick(openers));
  parts.push(opener);

  // 2) Nghe và đáp lại điều người chơi nói
  const lower = i.text.toLowerCase();
  const mirror = MIRRORS.find((m) => m.re.test(lower));
  const mirrored = mirror && rng() < 0.7 ? i.fill(pick(mirror.lines)) : '';
  if (mirrored && !used(mirror!.lines[0])) parts.push(mirrored + ' ');

  // 3) Nội dung chính (câu trả lời gốc)
  let body = i.reply;
  if (said.includes(body)) body = `${body} ${i.fill(pick(['Ừ, như {me} đã nói rồi.', '{me} vẫn nghĩ thế.']))}`;
  parts.push(body);

  // 4) Nhận xét theo hoàn cảnh, thi thoảng mới xuất hiện
  const aside = i.context?.weather ? WEATHER_ASIDES[i.context.weather] : undefined;
  if (aside && i.tier !== 'low' && rng() < 0.3) {
    const a = pick(aside);
    if (!used(a)) parts.push(' ' + i.fill(a));
  } else if ((i.context?.day ?? 0) >= 8 && rng() < 0.15) {
    parts.push(' ' + i.fill(`Đã ngày thứ ${i.context!.day} rồi. {me} thôi đếm từ lâu, nhưng chẳng hiểu sao vẫn nhớ.`));
  } else if (i.context?.hasBase && i.tier === 'high' && rng() < 0.15) {
    parts.push(' ' + i.fill('Từ khi có chỗ này, {me} dám ngủ hơn một chút.'));
  }

  // 4b) Quan tâm tới tình trạng thật của người chơi (đói, khát, kiệt sức, bị thương, tinh thần xuống)
  const nd = i.context?.needs;
  if (i.tier !== 'low' && rng() < 0.4) {
    const care: string[] = [];
    if (nd && nd.hunger >= 70) care.push('{you} đói rồi đúng không? Nghe bụng {you} réo từ nãy.');
    if (nd && nd.thirst >= 70) care.push('Môi {you} nứt hết rồi kìa. Uống chút nước đi.');
    if (nd && nd.stamina < 30) care.push('Trông {you} kiệt sức thật. Nghỉ chút đi, đừng gồng.');
    if (i.context?.wounded) care.push('Vết thương của {you} sao rồi? Đừng giấu {me}.');
    if (nd && nd.sanity < 35) care.push('Giọng {you} lạ lắm. {you} có ổn không?');
    if (care.length) { const c = pick(care); if (!used(c)) parts.push(' ' + i.fill(c)); }
  }

  // 4c) Nhắc lại chuyện vừa xảy ra trong nhóm
  const recent = (i.context?.recent || []).filter(Boolean);
  if (recent.length && i.tier !== 'low' && rng() < 0.25) {
    const evt = recent[recent.length - 1].replace(/[.。]+$/, '').slice(0, 80);
    const line = i.fill(`Chuyện "${evt}" vẫn làm {me} nghĩ mãi.`);
    if (!used(line)) parts.push(' ' + line);
  }

  // 4d) Gọi lại điều người chơi từng nói trước đó trong cuộc trò chuyện
  const earlier = i.history.filter((m) => m.from === 'player').slice(0, -1);
  const callbackKeys: [RegExp, string][] = [[/mệt|kiệt/, 'Hồi nãy {you} bảo {you} mệt. Đỡ hơn chưa?'], [/sợ|hoảng/, 'Lúc nãy {you} nói {you} sợ. Giờ còn sợ không?'], [/nhớ|người thân|gia đình/, 'Chuyện {you} kể về người thân ấy, {me} vẫn nhớ.']];
  if (earlier.length && rng() < 0.3) {
    const hit = callbackKeys.find(([re]) => earlier.some((m) => re.test(m.text.toLowerCase())) && !re.test(lower));
    if (hit && !used(hit[1])) parts.push(' ' + i.fill(hit[1]));
  }

  // 5) Hỏi lại một câu đời thường (khi đã đủ tin), ưu tiên nét riêng của tính cách
  if (i.tier !== 'low' && rng() < 0.45) {
    const traitClosers = i.traits.flatMap((t) => TRAIT_CLOSERS[t] || []).filter((c) => (i.traits.includes('jealous') ? i.affection > 40 : true));
    const pool = (traitClosers.length && rng() < 0.5 ? traitClosers : CLOSERS).filter((c) => !used(c));
    if (pool.length) parts.push(' ' + i.fill(pick(pool)));
  }

  let out = parts.join('').replace(/\s{2,}/g, ' ').replace(/(\*[^*]+\*)(?=\S)/g, '$1 ').trim();
  // Giọng theo tuổi và giới: người trẻ hay thêm "nhé/nha", người lớn tuổi hay "đấy/chứ"
  const young = (i.age ?? 30) < 30 && i.gender === 'female';
  const elder = (i.age ?? 30) >= 45;
  if ((young || elder) && rng() < 0.35) {
    const particle = young ? pick(['nhé', 'nha', 'mà']) : pick(['đấy', 'chứ', 'ờ']);
    out = out.replace(/([\p{L}])\.(\s|$)/u, (_m, ch: string, sp: string) => `${ch} ${particle}.${sp}`);
  }
  // Chưa tin thì nói ngập ngừng
  if (i.tier === 'low' && rng() < 0.4) out = out.replace(/([\p{L}]),\s/u, '$1... ');
  return out;
}
