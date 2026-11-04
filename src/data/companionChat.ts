// ====================================================================
// TRÒ CHUYỆN VỚI ĐỒNG ĐỘI: người chơi gõ câu bất kỳ (tâm sự, hỏi han, đùa, tán tỉnh, phân công...),
// đồng đội trả lời theo tính cách, độ tin cậy và thiện cảm, rồi thiện cảm thay đổi tương ứng.
// - Có AI (Gemini/OpenAI/Claude): dùng buildChatPrompt + sanitizeChat.
// - Hết khóa: offlineChat phân tích ý định bằng từ khóa và trả lời từ kho câu đa dạng.
// Luật quan hệ: chỉ giữa hai người trưởng thành KHÁC GIỚI (nam - nữ), cả hai bên đồng thuận, mô tả kín đáo.
// ====================================================================

type Rng = () => number;

export type Mood = 'warm' | 'neutral' | 'wary' | 'upset' | 'flirty' | 'shy' | 'sad';
export type RoleId = 'guard' | 'cook' | 'scout' | 'repair' | 'medic' | 'forage' | 'rest' | 'none';

export const ROLES: Record<RoleId, { label: string; words: RegExp; skills: RegExp; effect: string }> = {
  guard: { label: 'Canh gác', words: /canh|gác|trực|cảnh giới|giữ cửa/, skills: /canh|gác|chiến|bảo vệ|lính|nghe ngóng|cận chiến/i, effect: 'Giữ nhóm yên tâm hơn (+tinh thần mỗi lượt)' },
  cook: { label: 'Nấu ăn', words: /nấu|bếp|chuẩn bị bữa|lo bữa/, skills: /nấu|đầu bếp|thực phẩm|ướp|sấy/i, effect: 'Bữa ăn của nhóm no hơn (giảm đói mỗi lượt)' },
  scout: { label: 'Trinh sát', words: /trinh sát|dò đường|thăm dò|do thám/, skills: /trinh sát|lén|đường|luồn|ghi nhớ|quan sát/i, effect: 'Thỉnh thoảng tìm được đồ quanh khu vực' },
  repair: { label: 'Sửa chữa & gia cố', words: /sửa|gia cố|hàn|đóng cửa|chặn cửa|dựng rào/, skills: /sửa|gia cố|cơ khí|điện|hàn|thợ/i, effect: 'Tăng độ kiên cố của căn cứ mỗi lượt' },
  medic: { label: 'Chăm sóc y tế', words: /y tế|chữa|băng bó|chăm sóc|sơ cứu/, skills: /sơ cứu|y tá|dược|thuốc|băng ép|nhiễm trùng|y tế/i, effect: 'Giảm nhiễm độc và giúp vết thương hồi phục' },
  forage: { label: 'Kiếm đồ ăn', words: /kiếm ăn|tìm đồ ăn|hái|câu cá|đi lục|lục tìm|kiếm thức ăn/, skills: /nông|câu|hái|trồng|bắt cá|thực phẩm|trái|rau/i, effect: 'Thỉnh thoảng mang về rau quả, cá, đồ ăn' },
  rest: { label: 'Nghỉ ngơi', words: /nghỉ|ngủ|dưỡng sức|nằm/, skills: /./, effect: 'Hồi máu và tinh thần cho chính họ' },
  none: { label: 'Chưa phân công', words: /^$/, skills: /./, effect: '' },
};

export function roleFit(role: RoleId, companion: { role?: string; skills?: string[] }): 'great' | 'ok' | 'poor' {
  if (role === 'none' || role === 'rest') return 'ok';
  const text = `${companion.role || ''} ${(companion.skills || []).join(' ')}`;
  if (ROLES[role].skills.test(text)) return 'great';
  return /y tá|dược|bác sĩ/i.test(companion.role || '') && role === 'guard' ? 'poor' : 'ok';
}

export interface ChatCompanion {
  name: string; realName?: string; nameKnown?: boolean; gender: 'male' | 'female'; age: number; role?: string;
  personality?: string; bio?: string; skills?: string[]; trust: number; affection: number; morale: number;
  intimacyLevel?: string; status?: string; assignment?: string; hp?: number;
}
export interface ChatPlayer { gender: 'male' | 'female' | 'other'; name?: string; nameKnown?: boolean; sanity?: number; }
export interface ChatReq {
  companion: ChatCompanion; player: ChatPlayer; text: string;
  history?: { from: 'player' | 'npc'; text: string }[];
  context?: { day?: number; zoneLabel?: string; weather?: string; hasBase?: boolean; safe?: boolean };
  askedName?: boolean;
}
export interface ChatRes {
  reply: string; affectionChange: number; trustChange: number; moraleChange: number; sanityChange: number;
  mood: Mood; intimacyLevel?: string; revealName?: boolean; asksPlayerName?: boolean; assignment?: RoleId;
  romanceAllowed: boolean; intent: string;
}

const W = (alt: string) => new RegExp('(?<![\\p{L}])(?:' + alt + ')(?![\\p{L}])', 'u');
const pick = <T,>(a: T[], r: Rng): T => a[Math.floor(r() * a.length)];
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(n)));

// Chỉ cho phép quan hệ tình cảm giữa người trưởng thành khác giới.
export function romanceAllowed(c: ChatCompanion, p: ChatPlayer): boolean {
  return (p.gender === 'male' || p.gender === 'female') && c.gender !== p.gender && c.age >= 18;
}

type Intent = 'insult' | 'assign' | 'intimate' | 'confess' | 'flirt' | 'askName' | 'askPast' | 'comfort' | 'compliment' | 'thanks' | 'apology' | 'food' | 'plan' | 'joke' | 'greet' | 'other';

export function detectIntent(text: string): { intent: Intent; role?: RoleId } {
  const a = text.toLowerCase();
  if (W('ngu|đần|câm mồm|im đi|đồ khốn|chết đi|vô dụng|đồ ăn hại|ghét').test(a)) return { intent: 'insult' };
  for (const id of ['guard', 'cook', 'scout', 'repair', 'medic', 'forage', 'rest'] as RoleId[]) {
    if (ROLES[id].words.test(a) && W('nhờ|giúp|lo|phụ trách|đảm nhận|phân công|cậu|bạn|em|chị|anh|cô|chú|giao|để').test(a)) {
      return { intent: 'assign', role: id };
    }
  }
  if (W('phân công|giao việc|giao nhiệm vụ').test(a)) return { intent: 'assign', role: 'none' };
  if (W('làm tình|quan hệ|lên giường|ngủ với|ngủ cùng|qua đêm|ôm ngủ|hôn|âu yếm|ân ái').test(a)) return { intent: 'intimate' };
  if (W('yêu|làm người yêu|làm bạn gái|làm bạn trai|ở bên|lấy|cưới|thích (em|anh|chị|cô|cậu|bạn)').test(a)) return { intent: 'confess' };
  if (W('đẹp|xinh|dễ thương|duyên|quyến rũ|cuốn hút|nhớ (em|anh|chị|cô)|tán|cười|ôm|nắm tay|đẹp trai|ga lăng|thơm').test(a)) return { intent: 'flirt' };
  if (W('tên (anh|chị|cô|chú|bác|bạn|cậu|em|của|là gì)|hỏi tên|tên gì|gọi (là|bằng)').test(a)) return { intent: 'askName' };
  if (W('quê|gia đình|trước đây|nghề|làm gì|từng|ngày xưa|con cái|bố mẹ|người thân|tuổi|sống ở').test(a)) return { intent: 'askPast' };
  if (W('mệt|sợ|buồn|nhớ nhà|đau|lo lắng|khóc|tâm sự|cô đơn|stress|ổn không|có sao không|khỏe không|chịu được').test(a)) return { intent: 'comfort' };
  if (W('cảm ơn|biết ơn|nhờ có|may mà').test(a)) return { intent: 'thanks' };
  if (W('xin lỗi|tha thứ|lỗi của tôi|là do tôi').test(a)) return { intent: 'apology' };
  if (W('ăn|đói|uống|khát|chia|đưa|cho (em|anh|chị|cô|cậu|bạn)').test(a)) return { intent: 'food' };
  if (W('kế hoạch|ngày mai|nên làm gì|tính sao|làm sao|bây giờ|tiếp theo|đi đâu|chiến lược|căn cứ').test(a)) return { intent: 'plan' };
  if (W('đùa|hài|cười|vui|haha|chuyện vui|kể chuyện|giải trí').test(a)) return { intent: 'joke' };
  if (W('chào|alo|ê|này|hello|hi|sao rồi|dạo này').test(a)) return { intent: 'greet' };
  return { intent: 'other' };
}

function pronouns(c: ChatCompanion, p: ChatPlayer, romantic: boolean) {
  const you = p.gender === 'male' ? 'anh' : p.gender === 'female' ? 'chị' : 'bạn';
  let me = 'tôi';
  let yourTerm = you;
  if (romantic && p.gender === 'male' && c.gender === 'female') me = 'em';
  if (romantic && p.gender === 'female' && c.gender === 'male') { me = 'anh'; yourTerm = 'em'; }
  if (!romantic && c.gender === 'female' && c.age < 28 && p.gender === 'male') me = 'em';
  return { me, you: yourTerm };
}

type Pool = { low: string[]; mid: string[]; high: string[] };
const POOLS: Partial<Record<Intent, Pool>> = {
  greet: {
    low: ['Ừ... {you} cần gì không?', 'Tôi vẫn ổn. Có chuyện gì à?', '*gật đầu ngắn, mắt vẫn dõi ra cửa*'],
    mid: ['Chào {you}. Hôm nay yên ắng bất thường, {me} không thích thế này lắm.', 'Ừ, {me} đây. Vừa kiểm tra lại đồ xong.', 'Có {you} ở đây {me} thấy yên tâm hơn một chút.'],
    high: ['À, {you} đây rồi. {me} vừa nghĩ tới {you} đấy.', 'Ngồi xuống đi, {me} dành cho {you} chỗ ấm nhất.', 'Nhìn thấy {you} bình an là {me} bớt lo hẳn.'],
  },
  comfort: {
    low: ['Cảm ơn đã hỏi. {me} chịu được, đừng lo.', '*im lặng một lúc* Không ai ổn cả, nhưng mình vẫn phải sống.', 'Nói thật thì {me} sợ. Nhưng chắc ai cũng thế.'],
    mid: ['{me} hay mơ thấy những ngày trước, giờ nghĩ lại như chuyện của người khác... Có {you} nghe, {me} thấy nhẹ hơn.', 'Ban đêm là lúc khó nhất. {me} cứ nghe tiếng gió mà giật mình. Cảm ơn {you} đã hỏi.', '{me} mệt lắm, nhưng nếu ai cũng bỏ cuộc thì còn ai sống nữa. Ngồi cạnh {me} một lát nhé.'],
    high: ['*tựa đầu vào vai {you}* Cứ để {me} ngồi thế này một lát. {me} chỉ cần biết {you} còn ở đây.', '{me} nhớ nhà đến nghẹn. Nhưng ít nhất bây giờ {me} không còn cô đơn nữa, nhờ có {you}.', 'Đừng lo cho {me} quá. {me} mạnh hơn {you} nghĩ, chỉ là... đôi khi cũng cần được ôm.'],
  },
  compliment: {
    low: ['Ờ... cảm ơn. Đừng nói mấy lời đó, giờ không phải lúc.', '*liếc {you} dè dặt* {you} muốn gì ở {me} vậy?', 'Cảm ơn, nhưng lời khen không giúp mình sống sót được đâu.'],
    mid: ['*mỉm cười nhẹ* Lâu lắm rồi mới có người nói thế với {me}.', 'Hừm, {you} khéo nói đấy. {me} ghi nhận.', 'Cảm ơn. Nghe vậy {me} thấy ấm lòng giữa cảnh tan hoang này.'],
    high: ['*cúi mặt cười, hơi đỏ tai* {you} cứ thế này {me} không biết giấu đâu ra cho hết ngượng.', 'Nói thêm đi... {me} thích nghe {you} nói lắm.', '{you} làm {me} quên mất mình đang ở giữa tận thế.'],
  },
  flirt: {
    low: ['*lùi nửa bước, giọng cứng lại* Đừng đùa kiểu đó. {me} còn chưa hiểu {you} là người thế nào.', 'Chúng ta mới quen. Hãy cùng sống sót trước đã.', '{me} không có tâm trạng cho chuyện này.'],
    mid: ['*bật cười ngượng* {you} bạo thật... nhưng {me} không ghét đâu.', 'Đừng nhìn {me} như thế, {me} lúng túng đấy.', '{you} biết không, giữa nơi này mà vẫn có người làm {me} đỏ mặt, cũng lạ.'],
    high: ['*khẽ nắm lấy tay {you}* Ở gần {you}, {me} thấy mình còn là con người.', 'Nếu mai {me} không còn nữa, {me} muốn {you} biết đêm nay {me} rất hạnh phúc.', '*nghiêng người lại gần* {you} có biết {me} nghĩ đến {you} nhiều thế nào không?'],
  },
  confess: {
    low: ['Khoan. {me} chưa sẵn sàng nghe điều đó từ ai cả. Chúng ta hãy cứ là đồng đội đã.', '*nhìn đi chỗ khác* Xin lỗi, {me} chưa thể trả lời.', '{you} nói thật lòng, nên {me} cũng thật lòng: chưa phải lúc.'],
    mid: ['*im lặng rất lâu* {me} cũng có cảm giác lạ với {you}... nhưng {me} cần thêm thời gian.', '{you} làm {me} bối rối. Cho {me} vài ngày nữa, được không?', '{me} không từ chối. Chỉ là... {me} sợ lại mất thêm một người.'],
    high: ['*mắt đỏ hoe, mỉm cười* {me} chờ câu này lâu lắm rồi. {me} cũng vậy... {me} chọn {you}.', 'Vậy là ta cùng nhau, bất kể ngày mai ra sao. {me} đồng ý.', '*ôm lấy {you}* Đừng bao giờ buông tay {me} nhé.'],
  },
  intimate: {
    low: ['*gạt tay ra, giọng lạnh* Không. Đừng bao giờ hỏi như thế khi {me} chưa tin {you}.', '{me} không phải món đồ để đổi lấy sự an toàn. Dừng lại.', 'Xin {you} tôn trọng {me}.'],
    mid: ['*lắc đầu nhẹ* Chưa. {me} cần chắc chắn {you} thật lòng, không chỉ vì nơi này quá cô đơn.', '{me} muốn lắm... nhưng chưa phải đêm nay. Hãy để mọi thứ tự nhiên.', '{you} làm {me} dao động, nhưng cho {me} thêm chút thời gian.'],
    high: ['*khẽ gật, giọng run nhẹ* Nếu {you} cũng thật lòng... {me} đồng ý. Khóa cửa lại giúp {me} nhé.', '*tay siết nhẹ* Ở đây an toàn. Đêm nay, {me} chỉ muốn ở bên {you}.', '{me} tin {you}. Hãy tắt đèn đi.'],
  },
  askPast: {
    low: ['{me} không muốn kể nhiều. Quá khứ giờ cũng chẳng giúp ích gì.', 'Chuyện cũ... {me} không nhớ nữa. Hỏi chuyện khác đi.', '*ngập ngừng* Chỉ nói được là {me} từng làm {role}.'],
    mid: ['{me} từng làm {role}. {bio}', 'Chuyện cũ dài lắm. Tóm lại là {role}, rồi mọi thứ sụp đổ trong một đêm.', 'Nói {you} nghe nhé: {bio}'],
    high: ['Ở trước ngày tận thế, {me} là {role}. {bio} Giờ nhắc lại mới thấy mình đã mất nhiều thế nào... nhưng cũng may còn có {you}.', '{bio} {me} chưa từng kể cho ai nghe đủ như vậy.', '*thở dài* {bio} Cảm ơn {you} vì đã muốn nghe.'],
  },
  thanks: {
    low: ['Không có gì. Mình giúp nhau thôi.', 'Ừ. Đừng bận tâm.', 'Cứ coi như không nợ nhau nữa.'],
    mid: ['Đừng khách sáo. {me} cũng nhờ {you} mới còn đây.', 'Nghe {you} nói vậy là đủ rồi.', 'Mình là một nhóm mà.'],
    high: ['{you} cảm ơn {me} hoài, {me} ngại lắm đó.', 'Chuyện nhỏ. Vì là {you}, {me} làm gì cũng được.', '*mỉm cười* Lần sau lại nhờ {me} nhé.'],
  },
  apology: {
    low: ['Ừ. Hy vọng không có lần sau.', '{me} nhớ rồi. Đừng lặp lại.', 'Không sao... nhưng {me} cần thời gian.'],
    mid: ['Thôi, ai cũng có lúc nóng. {me} bỏ qua.', 'Cảm ơn {you} đã nói ra. {me} thấy dễ chịu hơn.', 'Ừ, {me} hiểu. Giữa tận thế thì ai cũng căng.'],
    high: ['Đừng áy náy nữa. {me} chưa từng giận {you} lâu được.', '*nắm tay {you}* Bỏ qua hết nhé. Mình còn nhau là được.', 'Được rồi, {me} tha cho {you}... lần này.'],
  },
  food: {
    low: ['Cảm ơn nhưng {me} vẫn còn phần của mình.', 'Giữ lại cho {you} đi. Đừng làm hao nguồn dự trữ.', 'Ừ, {me} nhận. Lần sau đừng tự thiệt vì {me}.'],
    mid: ['Cảm ơn nhé. Ăn xong {me} sẽ có sức làm việc hơn.', 'Chia đôi nhé, {me} không muốn {you} nhịn vì {me}.', '*cười nhẹ* Đúng lúc quá, bụng {me} đang réo.'],
    high: ['{you} lúc nào cũng nghĩ cho {me} trước. Ăn cùng nhé?', '*bẻ đôi phần ăn, đưa cho {you}* Cùng ăn thì mới ngon.', 'Có {you} chia phần, {me} thấy đây là bữa ngon nhất tuần.'],
  },
  plan: {
    low: ['{me} nghĩ nên tiết kiệm đồ, đừng đi xa khi chưa biết đường.', 'Cứ làm theo cách an toàn nhất. {me} không muốn mạo hiểm.', '{me} chưa quen khu này, {you} quyết đi.'],
    mid: ['{me} nghĩ mình nên gia cố chỗ này trước, rồi mới tính chuyện đi xa.', 'Nước và thức ăn là ưu tiên. Sau đó mới đến chỗ ở lâu dài.', 'Nếu {you} đi lục đồ, {me} sẽ canh gác. Chúng ta chia việc theo sở trường nhé.'],
    high: ['{me} tin vào quyết định của {you}. Dù mai đi đâu, {me} cũng theo.', 'Mình lập kế hoạch cho cả tuần nhé? {me} sẽ lo phần hậu cần, {you} lo phần ngoài.', 'Có một chỗ {me} muốn thử: nơi đủ vững để gọi là nhà. {you} nghĩ sao?'],
  },
  joke: {
    low: ['*nhếch môi* Hài thật... nhưng {me} không cười nổi.', 'Giờ này mà còn đùa được sao?', 'Cố lên, {you} cần thêm vốn từ trước đã.'],
    mid: ['Hahaha... lâu lắm rồi {me} mới cười. Kể tiếp đi.', 'Khá hài đấy. {me} sẽ nhớ để kể lại cho người khác.', '*bật cười* Đừng làm {me} cười to, zombie nghe thấy bây giờ.'],
    high: ['*cười đến chảy nước mắt* {you} làm {me} quên mất mình đang đói đấy.', 'Kể nữa đi, {me} đang cần cười nhiều như thế này.', '*huých vai {you}* Đúng là {you}, lúc nào cũng làm {me} bớt sợ.'],
  },
  insult: {
    low: ['*ánh mắt lạnh đi* Tôi sẽ nhớ câu đó.', 'Nếu {you} đã nghĩ vậy thì cứ tự lo lấy.', '*quay lưng bỏ đi*'],
    mid: ['Nói thế là quá đáng. {me} đã vì {you} biết bao nhiêu...', '*mắt đỏ lên* {me} không nghĩ {you} lại nói thế với {me}.', 'Dừng lại. Đừng bắt {me} thất vọng thêm nữa.'],
    high: ['*lặng người, giọng khàn* ... {you} thật sự nghĩ vậy sao?', '*quay đi lau nước mắt* {me} tưởng {you} khác chứ.', '{me} đau lắm. Nhưng {me} sẽ cho {you} thời gian để nghĩ lại.'],
  },
  other: {
    low: ['{me} nghe đây, {you} nói tiếp đi.', 'Ừ... {me} chưa hiểu ý {you} lắm.', 'Có thể nói rõ hơn không?'],
    mid: ['{me} đang nghe. Có chuyện gì {you} cứ nói thẳng.', '*gật đầu* {me} hiểu rồi. Cứ tiếp tục.', 'Thú vị đấy. {you} nghĩ sao nếu mình làm thế?'],
    high: ['Nói gì {me} cũng nghe, vì là {you}.', '*nhìn {you} chăm chú* Kể thêm đi, {me} đang nghe.', '{you} cứ nói, {me} ở đây.'],
  },
};

// Đêm bên nhau: lãng mạn, giàu cảm xúc nhưng kín đáo, chuyển cảnh nhẹ nhàng (không miêu tả chi tiết).
const ROMANTIC_NIGHTS = [
  '(Họ ngồi sát bên nhau trước ngọn nến nhỏ, nói rất lâu về những điều chưa từng kể với ai. Khi ngọn nến sắp tàn, một nụ hôn dịu dàng đến rất tự nhiên, như thể cả hai đã chờ nó từ lâu. Ngoài kia gió vẫn rít qua những tòa nhà đổ nát, nhưng trong căn phòng nhỏ chỉ còn hơi ấm của hai người. Sáng hôm sau, cả hai thức dậy bên nhau, bình yên lạ lùng, như chưa từng có tận thế.)',
  '(Tiếng mưa rơi đều trên mái tôn. Họ tựa vào nhau dưới tấm chăn cũ, bàn tay đan chặt, và lần đầu tiên sau bao ngày, không ai nghĩ tới bầy zombie ngoài kia. Một cái ôm kéo dài, một lời thì thầm, rồi bóng tối dịu dàng khép lại phần còn lại của đêm. Khi bình minh đến, lòng cả hai nhẹ đi nhiều.)',
  '(Giữa căn phòng khóa kín và ánh sáng lập lòe của cây nến cuối cùng, họ nhìn nhau thật lâu rồi cùng bật cười, vì cả hai đều ngượng. Một nụ hôn, một cái siết tay, và đêm ấy thuộc về riêng hai người. Họ ngủ yên, lần đầu tiên không có ai phải thức canh.)',
];

const ASSIGN_REPLY: Record<'great' | 'ok' | 'poor', string[]> = {
  great: ['Việc đó đúng sở trường của {me}. {you} cứ yên tâm giao cho {me}.', '{me} từng làm việc tương tự rồi, để {me} lo.', 'Nhận! {me} sẽ làm thật cẩn thận.'],
  ok: ['{me} chưa giỏi lắm nhưng sẽ cố hết sức.', 'Được, {me} làm. Nếu có gì sai thì chỉ bảo thêm nhé.', 'Ừ, {me} nhận việc. Tối nay báo cáo lại.'],
  poor: ['Hơi trái nghề với {me}... nhưng nếu không ai làm thì {me} sẽ cố.', '{me} không rành việc này lắm, {you} chắc chứ?', '{me} làm được nhưng kết quả có thể không như {you} mong.'],
};

const tier = (c: ChatCompanion): 'low' | 'mid' | 'high' => {
  const s = c.trust * 0.5 + c.affection * 0.5;
  return s >= 62 ? 'high' : s >= 36 ? 'mid' : 'low';
};

function fill(t: string, c: ChatCompanion, pr: { me: string; you: string }) {
  const role = (c.role || 'người sống sót').toLowerCase();
  const out = t.replace(/\{me\}/g, pr.me).replace(/\{you\}/g, pr.you).replace(/\{role\}/g, role).replace(/\{bio\}/g, c.bio || 'Chuyện cũ nhiều, kể mãi không hết.');
  // Viết hoa đầu câu (sau dấu chấm/hỏi/than hoặc lời dẫn hành động *...*)
  return out.replace(/(^|[.!?]\s+|\*\s+)(\p{Ll})/gu, (_m, p: string, ch: string) => p + ch.toUpperCase());
}

export function offlineChat(req: ChatReq, rng: Rng = Math.random): ChatRes {
  const c = req.companion;
  const p = req.player;
  const romantic = c.intimacyLevel === 'romantic' || c.intimacyLevel === 'soulmate';
  const allow = romanceAllowed(c, p);
  const { intent, role } = detectIntent(req.text);
  const pr = pronouns(c, p, romantic && allow);
  const tr = tier(c);
  const res: ChatRes = { reply: '', affectionChange: 0, trustChange: 0, moraleChange: 0, sanityChange: 0, mood: 'neutral', romanceAllowed: allow, intent };

  const line = (pool?: Pool) => fill(pick((pool || POOLS.other!)[tr], rng), c, pr);

  switch (intent) {
    case 'greet': res.reply = line(POOLS.greet); res.trustChange = 1; res.mood = 'neutral'; break;
    case 'comfort': res.reply = line(POOLS.comfort); res.trustChange = 3; res.moraleChange = 6; res.affectionChange = 2; res.sanityChange = 2; res.mood = tr === 'low' ? 'wary' : 'sad'; break;
    case 'compliment': res.reply = line(POOLS.compliment); res.affectionChange = tr === 'low' ? 0 : tr === 'mid' ? 2 : 3; res.mood = tr === 'high' ? 'shy' : 'neutral'; break;
    case 'thanks': res.reply = line(POOLS.thanks); res.trustChange = 1; res.mood = 'warm'; break;
    case 'apology': res.reply = line(POOLS.apology); res.trustChange = 2; res.mood = 'neutral'; break;
    case 'food': res.reply = line(POOLS.food); res.trustChange = 2; res.moraleChange = 3; res.mood = 'warm'; break;
    case 'plan': res.reply = line(POOLS.plan); res.trustChange = 1; res.mood = 'neutral'; break;
    case 'joke': res.reply = line(POOLS.joke); res.moraleChange = 5; res.affectionChange = 1; res.mood = 'warm'; break;
    case 'askPast': res.reply = line(POOLS.askPast); res.trustChange = tr === 'low' ? 0 : 2; res.mood = 'neutral'; break;
    case 'insult': res.reply = line(POOLS.insult); res.trustChange = -10; res.affectionChange = -8; res.moraleChange = -10; res.mood = 'upset'; break;
    case 'askName': {
      if (c.nameKnown === false && c.realName) {
        if (c.trust >= 35) { res.reply = `${c.realName}. Gọi {me} thế cho gần gũi.`.replace('{me}', pr.me); res.revealName = true; res.trustChange = 3; res.mood = 'warm'; }
        else { res.reply = fill('Chưa tiện nói. Ở ngoài này, tên là thứ {me} giữ cho riêng mình, khi nào tin {you} hơn {me} sẽ nói.', c, pr); res.mood = 'wary'; }
      } else {
        res.reply = `${c.realName || c.name}. Vậy là {you} đã biết rồi nhỉ.`.replace('{you}', pr.you); res.mood = 'neutral';
      }
      break;
    }
    case 'assign': {
      const r = role || 'none';
      if (r === 'none') { res.reply = fill('Việc gì cũng được, {you} cứ nói rõ: canh gác, nấu ăn, trinh sát, sửa chữa, y tế, kiếm đồ ăn, hay nghỉ ngơi?', c, pr); break; }
      if (c.status === 'injured' || (c.hp !== undefined && c.hp < 25)) { res.reply = fill('{me} đang yếu quá, chắc không làm tốt việc này được lúc này.', c, pr); res.mood = 'sad'; break; }
      if (c.morale < 20 || c.trust < 20) { res.reply = fill('{me} không muốn nhận việc từ {you} lúc này.', c, pr); res.mood = 'upset'; res.moraleChange = -2; break; }
      const fit = roleFit(r, c);
      res.assignment = r;
      res.reply = fill(pick(ASSIGN_REPLY[fit], rng), c, pr) + ` (Nhận việc: ${ROLES[r].label}.)`;
      res.trustChange = fit === 'great' ? 3 : 1; res.moraleChange = fit === 'poor' ? -2 : 2; res.mood = 'neutral';
      break;
    }
    case 'flirt': {
      if (!allow) { res.reply = fill('{me} quý {you} như một người đồng đội thôi. Mong {you} hiểu cho {me}.', c, pr); res.mood = 'neutral'; res.trustChange = -1; break; }
      res.reply = line(POOLS.flirt);
      res.affectionChange = tr === 'low' ? -2 : tr === 'mid' ? 4 : 6; res.moraleChange = tr === 'low' ? -2 : 4;
      res.mood = tr === 'low' ? 'wary' : tr === 'mid' ? 'shy' : 'flirty';
      break;
    }
    case 'confess': {
      if (!allow) { res.reply = fill('{me} trân trọng tình cảm của {you}, nhưng {me} không nghĩ theo hướng đó. Chúng ta cứ là đồng đội nhé.', c, pr); res.mood = 'sad'; res.trustChange = -1; break; }
      res.reply = line(POOLS.confess);
      if (c.affection >= 60 && c.trust >= 55) { res.affectionChange = 8; res.intimacyLevel = 'romantic'; res.mood = 'flirty'; res.moraleChange = 10; res.sanityChange = 8; }
      else { res.affectionChange = c.affection >= 35 ? 2 : -2; res.mood = 'shy'; }
      break;
    }
    case 'intimate': {
      if (!allow) { res.reply = fill('Không. {me} chỉ coi {you} là đồng đội. Xin đừng nhắc chuyện này nữa.', c, pr); res.mood = 'upset'; res.trustChange = -3; res.affectionChange = -2; break; }
      const ready = (c.intimacyLevel === 'romantic' || c.intimacyLevel === 'soulmate') && c.affection >= 75 && (req.context?.safe ?? true);
      res.reply = ready ? line(POOLS.intimate) : fill(pick(tr === 'low' ? POOLS.intimate!.low : POOLS.intimate!.mid, rng), c, pr);
      if (ready) {
        res.affectionChange = 8; res.moraleChange = 15; res.sanityChange = 12; res.trustChange = 5; res.mood = 'flirty';
        res.reply += ` ${pick(ROMANTIC_NIGHTS, rng)}`;
        if (c.affection >= 92) res.intimacyLevel = 'soulmate';
      } else { res.affectionChange = tr === 'low' ? -4 : 0; res.mood = tr === 'low' ? 'upset' : 'shy'; res.trustChange = tr === 'low' ? -3 : 0; }
      break;
    }
    default: res.reply = line(POOLS.other); res.mood = 'neutral';
  }

  // Người lạ đã cho biết tên rồi mà người chơi chưa nói tên: hỏi lại một lần
  if (!req.askedName && c.nameKnown !== false && !p.nameKnown && c.trust >= 30 && intent !== 'insult' && intent !== 'intimate') {
    res.asksPlayerName = true;
    res.reply += ` ${fill('À, còn {you}? Cho tới giờ {me} vẫn chưa biết nên gọi {you} thế nào.', c, pr)}`;
  }
  // Cập nhật mức quan hệ theo thiện cảm sau lượt này (không tự lên "romantic" nếu chưa tỏ tình)
  const aff = c.affection + res.affectionChange;
  if (!res.intimacyLevel) {
    const cur = c.intimacyLevel || 'stranger';
    if (cur === 'stranger' && aff >= 30) res.intimacyLevel = 'friend';
    else if (cur === 'friend' && aff >= 55) res.intimacyLevel = 'close';
  }
  return res;
}

// ---------- Đường AI ----------
export function buildChatPrompt(req: ChatReq): string {
  const c = req.companion;
  const p = req.player;
  const allow = romanceAllowed(c, p);
  const hist = (req.history || []).slice(-8).map((m) => `${m.from === 'player' ? 'Người chơi' : c.name}: ${m.text}`).join('\n');
  return `Bạn đóng vai một nhân vật phụ trong game sinh tồn tận thế zombie. 100% tiếng Việt, tự nhiên như người thật, ngắn gọn (1-4 câu), có thể kèm hành động trong dấu *...*.

NHÂN VẬT CỦA BẠN:
- Tên hiển thị: ${c.name}${c.nameKnown === false ? ` (tên thật là ${c.realName}, CHƯA nói cho người chơi biết)` : ''}
- Giới tính: ${c.gender === 'female' ? 'nữ' : 'nam'}, ${c.age} tuổi, nghề: ${c.role || 'người sống sót'}
- Tính cách: ${c.personality || 'bình thường'}; Tiểu sử: ${c.bio || ''}; Kỹ năng: ${(c.skills || []).join(', ')}
- Tin cậy ${c.trust}/100, thiện cảm ${c.affection}/100, tinh thần ${c.morale}/100, quan hệ: ${c.intimacyLevel || 'stranger'}
- Đang được giao việc: ${c.assignment || 'chưa'}; Bối cảnh: ngày ${req.context?.day ?? 1}, ${req.context?.zoneLabel || ''}, thời tiết ${req.context?.weather || ''}

NGƯỜI CHƠI: giới tính ${p.gender}; ${p.nameKnown ? `tên ${p.name}` : 'CHƯA ai biết tên người chơi'}.

LUẬT:
1. Phản ứng đúng tính cách, độ tin cậy/thiện cảm: tin cậy thấp thì dè dặt, không dễ mở lòng; được quan tâm chân thành thì ấm lên dần.
2. Quan hệ tình cảm/thân mật CHỈ giữa hai người trưởng thành KHÁC GIỚI. ${allow ? 'Hai người được phép phát triển tình cảm nếu đủ tin cậy và đồng thuận; cảnh thân mật phải lãng mạn, giàu cảm xúc (ánh nến, hơi ấm, nụ hôn, lời thì thầm) nhưng kín đáo, chuyển cảnh nhẹ nhàng sang sáng hôm sau, tuyệt đối không miêu tả chi tiết tình dục.' : 'Hai người KHÔNG được phép có quan hệ tình cảm/thân mật: từ chối khéo, nhẹ nhàng, giữ tình đồng đội.'}
3. Nếu bị ép buộc, xúc phạm, nài nỉ khi chưa sẵn sàng: nhân vật từ chối thẳng, giảm tin cậy và thiện cảm.
4. Chỉ nói tên thật khi tin cậy >= 35 và người chơi hỏi tên; nếu nói thì revealName = true. Nếu đã biết tên nhau mà người chơi chưa nói tên: có thể hỏi tên người chơi (asksPlayerName = true).
5. Nếu người chơi giao việc (canh gác, nấu ăn, trinh sát, sửa chữa, y tế, kiếm đồ ăn, nghỉ ngơi), trả lời theo khả năng thật của nhân vật và đặt assignment tương ứng (guard|cook|scout|repair|medic|forage|rest).
6. Các thay đổi chỉ số nhỏ và hợp lý: affectionChange, trustChange, moraleChange trong -10..10; sanityChange (của người chơi) trong -5..10.

Lịch sử gần đây:
${hist || '(chưa có)'}

NGƯỜI CHƠI VỪA NÓI: "${req.text}"

Trả về DUY NHẤT JSON:
{"reply":"...","affectionChange":0,"trustChange":0,"moraleChange":0,"sanityChange":0,"mood":"warm|neutral|wary|upset|flirty|shy|sad","intimacyLevel":null,"revealName":false,"asksPlayerName":false,"assignment":null}`;
}

export function sanitizeChat(parsed: any, req: ChatReq): ChatRes | null {
  if (!parsed || typeof parsed.reply !== 'string' || parsed.reply.trim().length < 2) return null;
  const allow = romanceAllowed(req.companion, req.player);
  const levels = ['stranger', 'friend', 'close', 'romantic', 'soulmate'];
  let intimacy: string | undefined = levels.includes(parsed.intimacyLevel) ? parsed.intimacyLevel : undefined;
  if (!allow && (intimacy === 'romantic' || intimacy === 'soulmate')) intimacy = undefined; // luật khác giới
  const mood = ['warm', 'neutral', 'wary', 'upset', 'flirty', 'shy', 'sad'].includes(parsed.mood) ? parsed.mood : 'neutral';
  const assignment = (Object.keys(ROLES) as RoleId[]).includes(parsed.assignment) ? parsed.assignment : undefined;
  const wantsReveal = !!parsed.revealName && req.companion.nameKnown === false && req.companion.trust >= 35;
  return {
    reply: parsed.reply.trim(),
    affectionChange: clamp(Number(parsed.affectionChange) || 0, -10, 10) * (allow || Number(parsed.affectionChange) <= 0 ? 1 : 0),
    trustChange: clamp(Number(parsed.trustChange) || 0, -10, 10),
    moraleChange: clamp(Number(parsed.moraleChange) || 0, -10, 10),
    sanityChange: clamp(Number(parsed.sanityChange) || 0, -5, 10),
    mood, intimacyLevel: intimacy, revealName: wantsReveal, asksPlayerName: !!parsed.asksPlayerName && !req.player.nameKnown,
    assignment, romanceAllowed: allow, intent: 'ai',
  };
}
