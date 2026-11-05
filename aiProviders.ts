import { GoogleGenAI } from '@google/genai';

// ====================================================================
// LUÂN PHIÊN NHIỀU KHÓA API (Gemini, OpenAI, Claude) ĐỂ TIẾT KIỆM VÀ KHÔNG BỊ GIÁN ĐOẠN.
// - Mỗi nhà cung cấp có thể có nhiều khóa (ngăn cách bằng dấu phẩy): GEMINI_API_KEYS=a,b,c
// - Khóa hết hạn mức (429/quota) hoặc sai (401/403) bị "nghỉ" một thời gian rồi tự thử lại.
// - Hết sạch khóa ở mọi nhà cung cấp -> ném lỗi để server chuyển sang kịch bản offline.
// ====================================================================

export type ProviderName = 'gemini' | 'openai' | 'anthropic';

interface Slot {
  provider: ProviderName;
  key: string;
  label: string;
  cooldownUntil: number;
  lastError?: string;
}

const split = (v?: string) => (v || '').split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);

function loadSlots(): Slot[] {
  const order = split(process.env.AI_PROVIDER_ORDER || 'gemini,openai,anthropic') as ProviderName[];
  const keysOf: Record<ProviderName, string[]> = {
    gemini: [...split(process.env.GEMINI_API_KEYS), ...split(process.env.GEMINI_API_KEY)],
    openai: [...split(process.env.OPENAI_API_KEYS), ...split(process.env.OPENAI_API_KEY)],
    anthropic: [...split(process.env.ANTHROPIC_API_KEYS), ...split(process.env.ANTHROPIC_API_KEY)],
  };
  const slots: Slot[] = [];
  for (const p of order) {
    if (!keysOf[p]) continue;
    [...new Set(keysOf[p])].forEach((key, i) => slots.push({ provider: p, key, label: `${p}#${i + 1}`, cooldownUntil: 0 }));
  }
  return slots;
}

let slots: Slot[] = [];
const rotation: Record<string, number> = {};
const geminiClients = new Map<string, GoogleGenAI>();
let lastUsed = '';

export function initProviders() {
  slots = loadSlots();
}

export function aiAvailable(): boolean {
  const now = Date.now();
  return slots.some((s) => s.cooldownUntil <= now);
}

export function aiStatus() {
  const now = Date.now();
  const by: Record<string, { keys: number; ready: number }> = {};
  for (const s of slots) {
    by[s.provider] ||= { keys: 0, ready: 0 };
    by[s.provider].keys++;
    if (s.cooldownUntil <= now) by[s.provider].ready++;
  }
  return { configured: slots.length, ready: slots.filter((s) => s.cooldownUntil <= now).length, providers: by, lastUsed };
}

function classify(err: any): { cooldownMs: number; reason: string } {
  const msg = String(err?.message || err || '');
  const status = Number(err?.status || err?.code || (msg.match(/\b(4\d\d|5\d\d)\b/) || [])[1] || 0);
  if (status === 401 || status === 403 || /API key not valid|invalid x-api-key|Incorrect API key|PERMISSION_DENIED/i.test(msg)) {
    return { cooldownMs: 24 * 3600e3, reason: 'khóa không hợp lệ' };
  }
  if (status === 429 || /quota|RESOURCE_EXHAUSTED|rate limit|insufficient_quota|credit/i.test(msg)) {
    return /insufficient|credit|billing/i.test(msg)
      ? { cooldownMs: 15 * 60e3, reason: 'hết hạn mức' }
      : { cooldownMs: 5e3, reason: 'giới hạn tốc độ' };
  }
  if (status === 503 || /high demand|temporar|overloaded|504|timeout/i.test(msg)) {
    // 503 quá tải tức thời chỉ cần nghỉ 3s thay vì 30s để phục hồi ngay
    return { cooldownMs: 3e3, reason: 'quá tải tạm thời (503)' };
  }
  return { cooldownMs: 4e3, reason: 'lỗi tạm thời' };
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(Object.assign(new Error('timeout'), { status: 504 })), ms);
    p.then((v) => { clearTimeout(t); resolve(v); }, (e) => { clearTimeout(t); reject(e); });
  });
}

export function parseJsonLoose(text: string): any {
  const t = (text || '').trim();
  try { return JSON.parse(t); } catch { /* thử cắt khối JSON */ }
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a >= 0 && b > a) return JSON.parse(t.slice(a, b + 1));
  throw new Error('AI không trả về JSON hợp lệ');
}

const GEMINI_MODELS = [
  process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  'gemini-2.5-flash',
];

async function callGemini(slot: Slot, prompt: string): Promise<string> {
  let client = geminiClients.get(slot.key);
  if (!client) {
    client = new GoogleGenAI({ apiKey: slot.key, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
    geminiClients.set(slot.key, client);
  }

  let lastError: any;
  for (const model of GEMINI_MODELS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await client.models.generateContent({
          model,
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });
        return response.text || '';
      } catch (err: any) {
        lastError = err;
        const msg = String(err?.message || err);
        const isTransient = /503|high demand|temporar|overloaded|429|RESOURCE_EXHAUSTED|504|timeout/i.test(msg);
        if (isTransient && attempt === 0) {
          await new Promise((r) => setTimeout(r, 600));
          continue;
        }
        break;
      }
    }
  }
  throw lastError;
}

async function callOpenAI(slot: Slot, prompt: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${slot.key}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.9,
    }),
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body?.error?.message || `OpenAI ${res.status}`), { status: res.status });
  return body?.choices?.[0]?.message?.content || '';
}

async function callAnthropic(slot: Slot, prompt: string): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': slot.key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5',
      max_tokens: 2500,
      messages: [{ role: 'user', content: `${prompt}\n\nChỉ trả về duy nhất một đối tượng JSON hợp lệ, không kèm văn bản nào khác.` }],
    }),
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(body?.error?.message || `Anthropic ${res.status}`), { status: res.status });
  return (body?.content || []).map((c: any) => c?.text || '').join('');
}

// Thử lần lượt các khóa còn dùng được; khóa thành công sẽ được xoay vòng xuống cuối để trải đều hạn mức.
export async function generateJson(prompt: string): Promise<{ text: string; provider: string }> {
  const now = Date.now();
  let candidates = slots.filter((s) => s.cooldownUntil <= now);

  // Nếu tất cả slot đều đang cooldown tạm thời (<= 3s), chờ một nhịp ngắn thay vì từ chối
  if (candidates.length === 0 && slots.length > 0) {
    const minWait = Math.min(...slots.map((s) => Math.max(0, s.cooldownUntil - now)));
    if (minWait > 0 && minWait <= 3500) {
      await new Promise((r) => setTimeout(r, minWait + 100));
      candidates = slots.filter((s) => s.cooldownUntil <= Date.now());
    }
  }

  // xoay vòng trong từng nhà cung cấp
  const ordered: Slot[] = [];
  const seenProv = new Set<string>();
  for (const s of candidates) {
    if (seenProv.has(s.provider)) continue;
    seenProv.add(s.provider);
    const group = candidates.filter((x) => x.provider === s.provider);
    const start = (rotation[s.provider] || 0) % group.length;
    ordered.push(...group.slice(start), ...group.slice(0, start));
  }
  let lastErr: any;
  for (const slot of ordered) {
    try {
      const call = slot.provider === 'gemini' ? callGemini : slot.provider === 'openai' ? callOpenAI : callAnthropic;
      const text = await withTimeout(call(slot, prompt), 30000);
      rotation[slot.provider] = (rotation[slot.provider] || 0) + 1;
      lastUsed = slot.label;
      return { text, provider: slot.label };
    } catch (err: any) {
      const c = classify(err);
      slot.cooldownUntil = Date.now() + c.cooldownMs;
      slot.lastError = c.reason;
      lastErr = err;
      console.warn(`[AI] ${slot.label} lỗi (${c.reason}), nghỉ ${Math.round(c.cooldownMs / 1000)}s: ${String(err?.message || err).slice(0, 120)}`);
    }
  }
  throw Object.assign(new Error('AI tạm thời bận, tự động chuyển sang chế độ kịch bản'), { cause: lastErr, exhausted: true });
}

