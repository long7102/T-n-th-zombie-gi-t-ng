// ====================================================================
// TẦNG CỐT TRUYỆN DÀI HƠI
//  - Bí ẩn dịch bệnh: 6 manh mối rải rác (sổ tay, hồ sơ, radio, mẫu vật...). Gom đủ thì hé lộ bí mật cốt lõi.
//  - Nhiệm vụ đang dang dở: suy ra từ manh mối, cờ quyết định và tình trạng căn cứ.
//  - Phe phái: Quân đội sơ tán, Bunker 13, Huyết Lang, nhóm Mầm Xanh (nhà nghiên cứu), nhóm đối thủ Đội Cây Cầu.
//  - Nhiệm vụ cuối cùng: kết cục được TÍNH từ ai còn sống, căn cứ còn hay mất, đồng minh, manh mối và quyết định cũ.
// ====================================================================

export interface Clue {
  id: string;
  title: string;
  text: string;
  hint: string; // nơi hay tìm thấy
}

export const CLUES: Clue[] = [
  { id: 'clue_1', title: 'Sổ tay nhân viên bệnh viện', text: 'Những dòng nguệch ngoạc: "Mẫu Alpha thoát ra ngoài. Đừng tin thông báo của bộ y tế. Đây không phải cúm."', hint: 'Bệnh viện, tủ y tế, xác nhân viên' },
  { id: 'clue_2', title: 'Hồ sơ dự án "Mầm Xanh"', text: 'Một dự án nghiên cứu sinh học quân sự dùng chủng virus để tạo "chiến binh bền bỉ". Tên người đứng đầu bị bôi đen.', hint: 'Văn phòng, kho tài liệu, tòa nhà hành chính' },
  { id: 'clue_3', title: 'Công thức huyết thanh', text: 'Thuốc giải cần hai thứ: mẫu Alpha còn nguyên vẹn và huyết thanh từ người miễn dịch. Chỉ nhóm Mầm Xanh còn giữ phòng thí nghiệm.', hint: 'Bệnh viện, phòng thí nghiệm, xác nhà nghiên cứu' },
  { id: 'clue_4', title: 'Tín hiệu sơ tán quân đội', text: 'Bản tin lặp đi lặp lại: "Điểm sơ tán cuối cùng mở trong 48 giờ trên nóc tòa tháp trung tâm. Chỉ nhận người có mẫu huyết thanh."', hint: 'Radio, bộ đàm, trạm phát sóng' },
  { id: 'clue_5', title: 'Mật lệnh phong tỏa', text: 'Lệnh viết tay: sau đợt sơ tán, cả khu vực sẽ bị ném bom để "dọn dẹp". Không ai ở lại sẽ sống sót.', hint: 'Kho quân sự, trạm phát sóng, xe quân đội' },
  { id: 'clue_6', title: 'Lời nhắn của người miễn dịch', text: 'Một người sống sót kể rằng họ bị cắn nhiều lần mà không biến đổi. Họ đang ẩn ở đâu đó trong thành phố, sợ bị bắt làm vật thí nghiệm.', hint: 'Các nhóm người sống sót, hầm trú ẩn' },
];

export const CLUE_BY_FLAG: Record<string, Clue> = Object.fromEntries(CLUES.map((c) => [c.id, c]));

// Tên gọi dễ đọc cho các cờ quyết định (dùng trong nhật ký / tóm tắt thế giới)
export const FLAG_TEXT: Record<string, string> = {
  abandoned_stranger: 'Đã bỏ mặc một người lạ đang cần giúp',
  abandoned_survivor: 'Đã bỏ rơi một người sống sót',
  saved_stranger: 'Đã cứu một người lạ và nhận họ vào nhóm',
  stair_alarm: 'Đã giăng dây báo động ở cầu thang bộ',
  water_stored: 'Đã kịp xả nước trữ trước khi vòi cạn',
  killed_raiders: 'Đã đánh trả băng cướp',
  bloodwolf_nemesis: 'Huyết Lang trở thành kẻ thù của bạn',
  bloodwolf_neutral_tribute: 'Đã cống nạp cho Huyết Lang để qua cầu',
  bloodwolf_sabotaged: 'Đã phá kho đạn của Huyết Lang',
  bunker13_heroes: 'Đã chiến đấu cứu Bunker 13',
  bunker13_diverted_horde: 'Đã dụ bầy zombie đi để cứu Bunker 13',
  bunker13_abandoned_looter: 'Đã phớt lờ Bunker 13 và nhân cơ hội vơ vét',
  saved_nhauyen: 'Đã cứu nữ bác sĩ ở bệnh viện',
  abandoned_nhauyen_rich_loot: 'Đã bỏ nữ bác sĩ để cướp thuốc',
  burned_containment_alpha_dead: 'Đã thiêu rụi khu thí nghiệm Alpha',
  companion_cured_super_immune: 'Đồng đội được chữa khỏi và trở nên miễn dịch',
  companion_amputated_scarred: 'Đồng đội sống sót sau ca phẫu thuật dã chiến',
  companion_exiled_or_ended: 'Đã cách ly hoặc kết thúc đồng đội nhiễm bệnh',
  rival_met: 'Đã chạm trán nhóm đối thủ Đội Cây Cầu',
  rival_allied: 'Liên minh với nhóm Đội Cây Cầu',
  rival_hostile: 'Có thù với nhóm Đội Cây Cầu',
  building_secured: 'Đã quét sạch và làm chủ cả tòa nhà',
  clinic_breach: 'Đã phá được cổng cách ly của trạm y tế',
  raid_won: 'Đã đẩy lùi một cuộc tấn công vào căn cứ',
  base_breached: 'Căn cứ từng bị đột nhập và cướp phá',
  raid_evacuated: 'Đã bỏ căn cứ cho kẻ tấn công để giữ mạng người',
  pet_dog: 'Đã nhận nuôi một chú chó hoang',
  dog_refused: 'Đã xua con chó hoang đi',
  companion_betrayed: 'Một đồng đội đã phản bội và bỏ đi cùng đồ của nhóm',
  companion_sacrificed: 'Một đồng đội đã hy sinh để cả nhóm sống sót',
  quest_family: 'Đã hứa giúp đồng đội tìm người thân thất lạc',
  family_resolved: 'Câu chuyện người thân của đồng đội đã có hồi kết',
  personal_story_done: 'Đã nghe câu chuyện quá khứ của một đồng đội',
  jealousy_done: 'Đã giải quyết cơn ghen trong nhóm',
  evac_contact: 'Đã liên lạc được điểm sơ tán',
  sample_secured: 'Đã giữ được mẫu huyết thanh',
};

export const clueCount = (flags: string[]) => CLUES.filter((c) => flags.includes(c.id)).length;

export interface Quest {
  id: string;
  title: string;
  desc: string;
  progress: string;
  done: boolean;
  open: boolean;
}

interface QuestInput { flags: string[]; day: number; fortification: number; hasBase: boolean; companionsAlive: number }

// Nhiệm vụ đang dang dở / đã xong, suy ra từ trạng thái hiện tại (không lưu riêng nên không bao giờ lệch).
export function computeQuests(s: QuestInput): Quest[] {
  const clues = clueCount(s.flags);
  const has = (f: string) => s.flags.includes(f);
  const quests: Quest[] = [
    { id: 'q_origin', title: 'Tìm hiểu nguồn gốc dịch bệnh', desc: 'Gom đủ manh mối để biết điều gì thực sự đã xảy ra.', progress: `${clues}/6 manh mối`, done: clues >= 5, open: clues > 0 && clues < 5 },
    { id: 'q_secure', title: 'Dựng một nơi trú ẩn đáng tin', desc: 'Lập căn cứ và gia cố đến ít nhất 60%.', progress: s.hasBase ? `Kiên cố ${s.fortification}%` : 'Chưa có căn cứ', done: s.hasBase && s.fortification >= 60, open: !(s.hasBase && s.fortification >= 60) },
    { id: 'q_evac', title: 'Liên lạc điểm sơ tán', desc: 'Dò tín hiệu quân đội và xác định điểm sơ tán cuối cùng.', progress: has('evac_contact') ? 'Đã liên lạc' : has('clue_4') ? 'Đã nghe tín hiệu, cần xác nhận' : 'Chưa nghe thấy gì', done: has('evac_contact'), open: has('clue_4') && !has('evac_contact') },
    { id: 'q_sample', title: 'Giữ lấy mẫu huyết thanh', desc: 'Tìm mẫu thuốc giải trước khi người khác lấy mất.', progress: has('sample_secured') ? 'Đã có mẫu' : has('clue_3') ? 'Biết công thức, cần mẫu vật' : 'Chưa biết cần gì', done: has('sample_secured'), open: has('clue_3') && !has('sample_secured') },
    ...(has('quest_family') ? [{ id: 'q_family', title: 'Tìm người thân của đồng đội', desc: 'Bạn đã hứa giúp một đồng đội tìm lại người thân thất lạc từ đêm đầu tiên.', progress: has('family_resolved') ? 'Đã có hồi kết' : 'Đang lần theo dấu vết', done: has('family_resolved'), open: !has('family_resolved') }] : []),
    { id: 'q_rival', title: 'Giải quyết nhóm đối thủ', desc: 'Một nhóm người sống sót khác đang tranh giành nguồn tài nguyên với bạn.', progress: has('rival_allied') ? 'Đã liên minh' : has('rival_hostile') ? 'Đang thù địch' : has('rival_met') ? 'Đã gặp, chưa ngã ngũ' : 'Chưa gặp', done: has('rival_allied'), open: has('rival_met') && !has('rival_allied') },
  ];
  if (s.day >= 14 || clues >= 4) {
    quests.push({ id: 'q_final', title: 'Nhiệm vụ cuối cùng', desc: 'Quyết định: cùng sơ tán, mang thuốc giải về hầm trú ẩn, hay tự xây tương lai của mình.', progress: s.day >= 20 ? 'Sắp tới hạn' : `Ngày ${s.day}/20`, done: false, open: true });
  }
  return quests;
}

export interface FactionState { id: string; name: string; standing: string; tone: 'ally' | 'neutral' | 'enemy' | 'unknown' }

export function factionStanding(flags: string[]): FactionState[] {
  const has = (f: string) => flags.includes(f);
  return [
    { id: 'military', name: 'Quân đội sơ tán', standing: has('evac_contact') ? 'Đã liên lạc được' : has('clue_4') ? 'Đã nghe tín hiệu' : 'Chưa biết', tone: has('evac_contact') ? 'ally' : 'unknown' },
    { id: 'bunker13', name: 'Bunker 13', standing: has('bunker13_heroes') || has('bunker13_diverted_horde') ? 'Biết ơn bạn' : has('bunker13_abandoned_looter') ? 'Căm ghét bạn' : 'Chưa gặp', tone: has('bunker13_heroes') || has('bunker13_diverted_horde') ? 'ally' : has('bunker13_abandoned_looter') ? 'enemy' : 'unknown' },
    { id: 'bloodwolf', name: 'Huyết Lang', standing: has('bloodwolf_nemesis') ? 'Truy sát bạn' : has('bloodwolf_sabotaged') ? 'Tan rã vì bạn' : has('bloodwolf_neutral_tribute') ? 'Đã cống nạp' : 'Chưa gặp', tone: has('bloodwolf_nemesis') ? 'enemy' : has('bloodwolf_neutral_tribute') ? 'neutral' : 'unknown' },
    { id: 'green_seed', name: 'Nhóm Mầm Xanh', standing: has('clue_2') ? 'Biết có tồn tại, đang ẩn' : 'Chưa biết', tone: 'unknown' },
    { id: 'rival', name: 'Đội Cây Cầu', standing: has('rival_allied') ? 'Liên minh' : has('rival_hostile') ? 'Thù địch' : has('rival_met') ? 'Đã gặp' : 'Chưa gặp', tone: has('rival_allied') ? 'ally' : has('rival_hostile') ? 'enemy' : has('rival_met') ? 'neutral' : 'unknown' },
  ];
}

export interface EndingInput {
  choice: 'helo' | 'last_stand' | 'wasteland' | 'broadcast' | 'bunker' | 'street';
  flags: string[];
  companions: { name: string; realName?: string; nameKnown?: boolean; status?: string; trust?: number; affection?: number; intimacyLevel?: string }[];
  base: { hasBase?: boolean; fortification?: number; name?: string };
}

// Kết cục TÍNH từ trạng thái: ai sống, ai mất, căn cứ còn hay không, đồng minh, bí mật đã biết.
export function composeEnding(e: EndingInput): string {
  const has = (f: string) => e.flags.includes(f);
  const clues = clueCount(e.flags);
  const alive = e.companions.filter((c) => c.status !== 'deceased');
  const dead = e.companions.filter((c) => c.status === 'deceased');
  const nm = (c: { name: string; realName?: string; nameKnown?: boolean }) => (c.nameKnown === false ? c.name : c.realName || c.name);
  const fort = e.base.fortification ?? 0;
  const lines: string[] = [];

  if (e.choice === 'helo') lines.push('Bạn mở đường máu lên nóc tháp, kích nổ thang máy chặn bầy quái vật và bước lên chiếc trực thăng cuối cùng.');
  if (e.choice === 'last_stand') lines.push('Bạn ở lại tử thủ chân tháp để những người còn lại kịp bay đi, bắn cho đến viên đạn cuối cùng.');
  if (e.choice === 'wasteland') lines.push('Bạn từ chối di tản, phá hủy chiếc trực thăng và giữ lại căn cứ cho riêng mình.');
  if (e.choice === 'broadcast') lines.push('Bạn chiếm đài phát sóng trên tháp. Giữa tiếng rè của sóng, bạn đọc từng manh mối bạn đã nhặt nhạnh suốt những ngày qua: tín hiệu quân đội, nhóm Mầm Xanh, lệnh phong tỏa. Bầy zombie đã tới cầu thang, nhưng giọng bạn vẫn bay đi khắp thành phố.');
  if (e.choice === 'bunker') lines.push(has('bunker13_heroes') || has('bunker13_diverted_horde') ? 'Bạn bỏ lại chiếc trực thăng, dẫn mọi người chui qua đường hầm cũ. Ở đầu kia, cánh cổng Bunker 13 mở ra trước khi bạn kịp gõ.' : 'Bạn dẫn mọi người chui đường hầm tới Bunker 13.');
  if (e.choice === 'street') lines.push('Bạn từ chối lên máy bay. Cùng Đội Cây Cầu, bạn dựng chướng ngại bằng xe cộ đổ nát chặn đầu phố, và đứng cạnh họ khi đợt xác sống cuối cùng ập tới.');

  // Nhóm
  if (alive.length) lines.push(`Bên bạn còn lại ${alive.length} người: ${alive.map(nm).join(', ')}.`);
  else lines.push('Không còn ai bên cạnh bạn; mọi người đã ngã xuống trên đường.');
  if (dead.length) lines.push(`Những người đã mất: ${dead.map(nm).join(', ')}. Bạn nhớ họ.`);
  const lover = alive.find((c) => c.intimacyLevel === 'romantic' || c.intimacyLevel === 'soulmate');
  if (lover) lines.push(`${nm(lover)} nắm chặt tay bạn: dù ngày mai ra sao, hai người sẽ cùng đối mặt.`);

  // Căn cứ
  if (e.choice === 'street') {
    lines.push(fort >= 50 ? 'Căn cứ của bạn thành điểm tựa phía sau chiến tuyến, nơi người bị thương được đưa vào và vũ khí được chia.' : 'Không có căn cứ vững phía sau, chiến tuyến chỉ còn dựa vào lòng can đảm của từng người.');
  } else if (e.choice === 'bunker') {
    lines.push(e.base.hasBase ? `${e.base.name || 'Căn cứ'} khép lại sau lưng. Bạn không ngoảnh lại.` : 'Bạn đến Bunker 13 gần như tay trắng, nhưng không bị hỏi một câu.');
  } else if (e.choice === 'wasteland') {
    lines.push(e.base.hasBase && fort >= 60 ? `${e.base.name || 'Căn cứ'} đủ vững để thành pháo đài đầu tiên của một vùng đất mới.` : 'Căn cứ còn quá mỏng manh: sau vài tháng bầy zombie và kẻ cướp sẽ tìm tới.');
  } else {
    lines.push(e.base.hasBase ? `${e.base.name || 'Căn cứ'} bị bỏ lại phía sau, ${fort >= 60 ? 'vững vàng đến phút cuối như một đài tưởng niệm lặng lẽ' : 'sụp xuống dưới sức nặng của bầy đàn ngay đêm đó'}.` : 'Bạn chẳng còn gì để bỏ lại ngoài những ký ức.');
  }

  // Đồng minh / kẻ thù
  if (has('bunker13_heroes') || has('bunker13_diverted_horde')) lines.push('Người của Bunker 13 mở cổng đón bạn như người nhà, một nơi trú ẩn thực sự.');
  if (has('bunker13_abandoned_looter')) lines.push('Bunker 13 không còn nữa: tín hiệu cầu cứu năm xưa vẫn ám ảnh bạn.');
  if (has('bloodwolf_nemesis')) lines.push('Huyết Lang vẫn còn đó, và chúng chưa quên bạn.');
  if (has('rival_allied')) lines.push('Đội Cây Cầu ở lại giữ phố, đúng như lời hứa.');
  if (has('rival_hostile')) lines.push('Đội Cây Cầu đã chiếm phố sau lưng bạn.');
  if (has('base_breached')) lines.push('Căn cứ từng bị đột nhập, và những vết cháy trên tường vẫn nhắc bạn đã suýt mất tất cả đêm đó.');
  else if (has('raid_won')) lines.push('Căn cứ đã chịu được những cuộc tấn công, và người ta bắt đầu gọi nơi đó là pháo đài.');
  if (has('companion_sacrificed')) lines.push('Người đã hy sinh để bạn sống sót chưa một ngày nào rời khỏi suy nghĩ của bạn.');
  if (has('companion_betrayed')) lines.push('Người đã phản bội nhóm vẫn là một vết dao trong lòng bạn, dù bạn không rõ họ còn sống không.');
  if (has('pet_dog')) lines.push('Chú chó hoang năm nào vẫn ngoắc đuôi chạy sau bạn trên con đường mới.');
  if (has('abandoned_stranger') || has('abandoned_survivor')) lines.push('Những người bạn bỏ lại trên đường đi theo bạn vào từng giấc mơ.');

  // Bí mật cốt lõi
  if (clues >= 5) {
    if (e.choice === 'helo') lines.push('Bạn biết điều mà ít ai biết: sau đợt sơ tán, cả thành phố sẽ bị ném bom. Bạn nói điều đó với mọi người trên máy bay, và họ cũng bàng hoàng.');
    else if (e.choice === 'last_stand') lines.push('Bạn đã biết cả thành phố sắp bị phong tỏa, và bạn cố giữ chân bầy zombie đủ lâu để những người trên máy bay kịp tới nơi an toàn, mang theo sự thật.');
    else if (e.choice === 'broadcast') lines.push('Những ai nghe được đã kịp chui xuống hầm trước đợt phong tỏa. Bạn không biết bao nhiêu người, nhưng sự thật đã không còn nằm trong tay kẻ che giấu nó.');
    else if (e.choice === 'bunker') lines.push('Bạn kể cho Bunker 13 về lệnh phong tỏa. Họ đào sâu thêm, và mưa bom đi qua phía trên đầu như một cơn sấm xa.');
    else if (e.choice === 'street') lines.push('Bạn báo cho cả phố biết về đợt phong tỏa, và họ rút xuống các tầng hầm cùng bạn. Phố không còn, nhưng người thì còn.');
    else lines.push('Bạn biết thành phố sẽ bị ném bom, nên đã chuyển nhóm vào hầm sâu trước khi đợt phong tỏa tới. Một mình bạn sống sót qua mưa bom, và đó là lý do bạn dám ở lại.');
  } else if (clues >= 3) lines.push('Bạn nghi ngờ có điều gì đó lớn hơn dịch bệnh đứng sau tất cả, nhưng chưa đủ mảnh ghép để biết.');
  else lines.push('Bạn chưa bao giờ biết vì sao thảm họa xảy ra. Có lẽ đó không còn là điều quan trọng nữa.');

  if (has('sample_secured') && e.choice === 'helo') lines.push('Mẫu huyết thanh bạn mang theo trở thành hy vọng đầu tiên của thế giới mới.');
  const verdict = alive.length >= 2 && fort >= 50 ? 'Một cái kết có hy vọng.' : alive.length === 0 ? 'Một cái kết cô độc.' : 'Một cái kết còn dang dở, nhưng bạn vẫn đang thở.';
  lines.push(verdict);
  return lines.join(' ');
}
