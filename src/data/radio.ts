import { WeatherType } from '../types/game';

// ============ HỆ THỐNG PHÁT SÓNG RADIO ============
// Nhận "system_trigger" mang thông tin về TƯƠNG LAI và biên dịch thành bản tin radio
// đứt quãng, dính tạp âm. Tuyệt đối KHÔNG tiết lộ kết cục hay kết quả lựa chọn của người chơi:
// chỉ đưa ra cảnh báo môi trường mang tính chiến thuật.

export const FUTURE_TRIGGER_RE = /^(Forecast|Upcoming|SupplyDrop)\b/i;

export function isFutureTrigger(trigger?: string | null): boolean {
  if (!trigger) return false;
  return trigger.split('||').some((p) => FUTURE_TRIGGER_RE.test(p.trim()));
}

export type RadioKind = 'weather' | 'horde' | 'supply' | 'bandit';

export interface RadioIntel {
  kind: RadioKind;
  weather?: WeatherType;
  dueDay?: number;
}

const pick = <T,>(arr: T[], rng: () => number): T => arr[Math.floor(rng() * arr.length)];

const WEATHER_LINES: Record<WeatherType, string[]> = {
  clear: [
    'Bầu trời... trong... ít mây, tầm nhìn tốt... nhưng đừng chủ quan... yên ắng quá cũng là điềm...',
    'Khu vực... trời râm, gió nhẹ... ngày mai... tầm nhìn ổn định...',
  ],
  heatwave: [
    '...nắng gắt, nhiệt độ vượt ngưỡng... thực phẩm tươi sẽ hỏng rất nhanh... giữ nước... lặp lại, giữ nước...',
    'Cảnh báo nóng... hầm hập từ sáng sớm... khát nước tăng gấp đôi... đồ sống nên ăn ngay hoặc ướp muối...',
  ],
  heavy_rain: [
    'Cảnh báo... bão mưa lớn tràn vào... ngập úng các ngõ trũng... khuyến cáo trú tầng cao, chuẩn bị bạt hứng nước...',
    '...mây dông kéo về từ phía đông... mưa xối xả... nước bẩn lẫn mầm bệnh... đừng lội nước nếu không cần...',
  ],
  freezing_cold: [
    '...gió mùa... lạnh buốt, nhiệt độ tụt mạnh... giữ ấm, hao thể lực... chuẩn bị chăn và nhiên liệu sưởi...',
    'Đợt rét... tràn xuống từ phía bắc... ngón tay cóng sẽ khó thao tác... che chắn kỹ...',
  ],
  dense_fog: [
    '...sương mù... dày đặc, tầm nhìn dưới mười mét... thây ma lần theo âm thanh... hạn chế tiếng ồn...',
    'Sương dày... tầm nhìn gần như bằng không... giữ im lặng, đừng bật đèn khi không cần...',
  ],
  night_dark: [
    '...mây đen che kín... trời tối sớm... đêm sẽ dài... đèn pin và pin dự phòng... kiểm tra lại ngay...',
    'Bóng đêm... buông xuống sớm hơn thường lệ... di chuyển ban đêm... cực kỳ nguy hiểm...',
  ],
};

const EVENT_LINES: Record<Exclude<RadioKind, 'weather'>, string[]> = {
  horde: [
    '...bầy lớn... hướng đại lộ chính... có thể tràn qua khu dân cư vào {when}... gia cố cửa, tắt đèn, giữ im lặng...',
    'Cảnh báo... dòng thây ma di chuyển... từ phía nam... dự kiến đi ngang qua {when}... chuẩn bị đường lui...',
    '...tiếng rên... nhiều vô kể... {when}... ai ở tầng thấp... nên lên cao...',
  ],
  supply: [
    '...chuyến bay tiếp tế... thả hàng xuống bãi đất trống gần chợ... {when}... có thể không chỉ một người nghe tin này...',
    'Thông báo... thùng tiếp tế... rơi tại khu vực phía sau chợ... {when}... tiếng động sẽ thu hút... cẩn thận...',
    '...dù... thả... khoảng {when}... ai còn nghe... hãy... chuẩn bị... vũ khí...',
  ],
  bandit: [
    '...nhóm vũ trang... xuất hiện quanh cầu vượt phía tây... {when}... chúng giữ súng và chặn đường... tránh đi một mình...',
    'Tin xấu... Huyết Lang... lại hoạt động... quanh khu cầu vượt... {when}... mang theo thứ có thể trao đổi...',
  ],
};

const SIGNOFF = [
  '...hết... rè rè...',
  '...lặp lại... lặp lại... rè...',
  '...mất tín hiệu... xin lỗi... xrrrr...',
  '...nếu ai nghe thấy... hãy... bảo trọng...',
];

function whenText(dueDay: number | undefined, nowDay: number): string {
  if (!dueDay) return 'sớm';
  const d = dueDay - nowDay;
  if (d <= 0) return 'hôm nay';
  if (d === 1) return 'ngày mai';
  return `ngày ${dueDay}`;
}

const PROTECTED_WORD_RE = /mưa|bão|nắng|nóng|rét|lạnh|sương|mù|bầy|thây|tiếp|tế|thùng|dù|huyết|lang|cầu|vượt|ngày|mai|nay|chợ|đại|lộ|cướp|súng|vũ|trang|thể|lực|nước|thực|phẩm|\.\.\./i;

// Thêm tạp âm: thỉnh thoảng nuốt mất một cụm ngắn ở giữa câu (không đụng vào từ khóa đầu/cuối).
function addStatic(text: string, rng: () => number): string {
  const parts = text.split(' ');
  if (parts.length < 8) return text;
  const out = [...parts];
  const n = 1 + Math.floor(rng() * 2);
  for (let i = 0; i < n; i++) {
    // Chỉ nuốt chữ phụ: không bao giờ làm mất từ khóa cảnh báo (mưa, bầy, thùng tiếp tế, ngày mai...)
    for (let attempt = 0; attempt < 6; attempt++) {
      const at = 3 + Math.floor(rng() * (out.length - 6));
      if (PROTECTED_WORD_RE.test(out[at]) || out[at] === '[rè]') continue;
      out[at] = rng() < 0.5 ? '[rè]' : '...';
      break;
    }
  }
  return out.join(' ');
}

export function buildRadioTransmission(
  intel: RadioIntel[],
  ctx: { baseType: string; day: number },
  rng: () => number = Math.random,
): string | null {
  if (!intel.length) return null;

  const military = ctx.baseType === 'Military Base';
  const freq = (88 + Math.floor(rng() * 19) + rng()).toFixed(1);
  const header = military
    ? `📻 [Bộ đàm quân sự — tần số ${freq} MHz] Bạn bật máy từ phòng chỉ huy, kim sóng dao động giữa tiếng rè rè.`
    : `📻 [Radio pin AA — tần số ${freq} MHz] Bạn kê radio sát cửa sổ chung cư, xoay núm dò đài trong tiếng xào xạc.`;

  const lines: string[] = [];
  for (const it of intel) {
    if (it.kind === 'weather') {
      const w = it.weather || 'clear';
      lines.push(addStatic(pick(WEATHER_LINES[w] || WEATHER_LINES.clear, rng), rng));
    } else {
      const raw = pick(EVENT_LINES[it.kind], rng).replace('{when}', whenText(it.dueDay, ctx.day));
      lines.push(addStatic(raw, rng));
    }
  }
  return `${header}\n\n“${lines.join(' ... ')} ${pick(SIGNOFF, rng)}”`;
}

// Chuyển system_trigger tương lai thành danh sách intel.
export function parseFutureTrigger(trigger?: string | null): RadioIntel[] {
  if (!trigger) return [];
  const intel: RadioIntel[] = [];
  for (const raw of trigger.split('||')) {
    const p = raw.trim();
    const dueMatch = p.match(/day\s*(\d+)/i);
    const dueDay = dueMatch ? parseInt(dueMatch[1], 10) : undefined;
    if (/^Forecast:/i.test(p)) {
      const w = p.split(':')[1]?.trim().split(/\s|\|/)[0] as WeatherType;
      intel.push({ kind: 'weather', weather: w });
    } else if (/Horde/i.test(p)) intel.push({ kind: 'horde', dueDay });
    else if (/Supply/i.test(p)) intel.push({ kind: 'supply', dueDay });
    else if (/Bandit/i.test(p)) intel.push({ kind: 'bandit', dueDay });
  }
  return intel;
}
