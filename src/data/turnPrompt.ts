// Prompt Gemini cho mỗi lượt. Director (storyDirector.ts) quyết định CẢNH kế tiếp, lựa chọn, thời tiết,
// lịch sự kiện; Gemini chỉ viết văn tả thực, xử lý hành động tự do và biên dịch bản tin radio.

export const RADIO_RULES = `# 8. LUẬT PHÁT SÓNG RADIO (RADIO BROADCAST SYSTEM)
1. Nếu trường dữ liệu "system_trigger" từ hệ thống truyền vào có chứa thông tin về tương lai (Ví dụ: "Dự báo thời tiết", "Sự kiện sắp diễn ra", "Thùng tiếp tế sắp rơi"), bạn PHẢI biên dịch thông tin đó thành nội dung dải sóng radio trong trường "radio_transmission".
2. Định dạng Radio: Phải viết theo phong cách hội thoại đứt quãng, dính tạp âm, mất chữ do sương mù hoặc bão (Ví dụ: dùng dấu ba chấm "..."), thể hiện đúng góc nhìn của một người sống sót đang dò đài từ Căn cứ quân sự hoặc Chung cư.
3. Tuyệt đối không được tiết lộ trước kết cục hay kết quả lựa chọn của người chơi trong bản tin radio này. Bạn chỉ được đưa ra thông tin dự báo môi trường mang tính cảnh báo chiến thuật.
4. Nếu "system_trigger" là null hoặc chỉ chứa trigger TỨC THỜI (Weather: Heavy Storm, Event: Horde Attack) thì "radio_transmission" = null cho phần tức thời đó; phần tương lai (Forecast:, Upcoming:) vẫn phải phát.`;

export interface TurnPromptInput {
  chosenAction: string;
  actionType: string;
  day: number;
  nextDay: number;
  weatherLabel: string;
  weatherKey: string;
  baseLocationType: string;
  systemTrigger: string | null;
  globalState: unknown;
  historySummary: string;
  deterministic: boolean;
  resolvedOutcome: string;
  nextSceneTitle: string;
  nextSceneSituation: string;
  nextChoices: string[];
  radioDraft: string | null;
}

export function buildTurnPrompt(i: TurnPromptInput): string {
  return `Bạn là Quản trò AI của tựa game RPG sinh tồn Zombie thực tế "Hồi Kết Zombie: Kỷ Nguyên Sinh Tồn".
NGÔN NGỮ: BẮT BUỘC 100% TIẾNG VIỆT TRƠN TRU, RÕ RÀNG. Không mô tả chớp nháy, giật lag.

# 1. NGUỒN SỰ THẬT
- "global_state" là nguồn sự thật duy nhất về chỉ số, balo, cột mốc. Trường "world_summary" là bản tóm tắt dài hạn của cả thế giới (nhân vật, vật tư, địa điểm, bí ẩn, nhiệm vụ dang dở, phe phái, hệ quả): tuyệt đối không mâu thuẫn với nó. Tuyệt đối không bịa vật phẩm hoặc sự kiện mâu thuẫn với nó.
- Bạn KHÔNG quyết định cảnh kế tiếp: hệ thống đã chọn sẵn cảnh (xem "CẢNH KẾ TIẾP") và bộ 3 lựa chọn. Bạn chỉ VIẾT LẠI phần tả cảnh cho sinh động, giữ nguyên sự kiện, địa điểm, nhân vật và mối đe dọa của cảnh đó, KHÔNG thêm biến cố mới (không tự nhảy sang băng cướp, bầy zombie, v.v. nếu cảnh không có).
- Phần dẫn nhập đã có sẵn trong cảnh: hãy giữ mạch chuyển cảnh mượt, hợp lý với hành động vừa rồi.

# 2. KHUNG LUẬT THẾ GIỚI
- Hiện thực khốc liệt, không có hồi phục kỳ diệu. Không giết nhân vật đột ngột ở Ngày 1-15 trừ khi liên tục chọn nguy hiểm khi HP rất thấp; ưu tiên chấn thương, trừ Sanity, bào mòn tài nguyên.
- NPC nữ: kỹ năng thực tế (hậu cần, lén lút, y tế, nấu ăn), không thành thục súng hạng nặng trừ khi có flag cốt truyện.
- Ngày 7 mất nước (thirst tăng nhanh), Ngày 10 mất điện (thực phẩm tươi hỏng nhanh, +1 nguy hiểm đêm). Hiện là Ngày ${i.nextDay}.
- Căn cứ hiện tại: "${i.baseLocationType}". Apartment: ẩn nấp tốt, phòng thủ yếu. Military Base: vũ khí nặng, rủi ro x3, thu hút siêu bầy đàn.

# 3. KIỂM TRA CHÉO
- Đối chiếu hành động "${i.chosenAction}" với global_state.inventory và skills. Dùng vật phẩm không có = THẤT BẠI (súng kẹt, bóp cò chỉ nghe tiếng cạch, mất bình tĩnh).

# 4. HÀNH ĐỘNG VỪA RỒI
- Loại hành động: ${i.actionType}.
${i.deterministic
    ? `- Kết quả của hành động này ĐÃ ĐƯỢC HỆ THỐNG QUYẾT ĐỊNH, dùng nguyên văn trong "outcome": """${i.resolvedOutcome}""" (bạn có thể thêm 1-2 câu tả giác quan nhưng không đổi kết quả).`
    : `- Đây là hành động tự do: tự viết "outcome" (3-5 câu, tả thực), chỉ số thay đổi hợp lý.`}

# 5. CẢNH KẾ TIẾP (ĐÃ CHỌN SẴN)
Tiêu đề: ${i.nextSceneTitle}
Nội dung gốc (hãy viết lại, giữ nguyên diễn biến): """${i.nextSceneSituation}"""
Ba lựa chọn cố định (không đổi): ${JSON.stringify(i.nextChoices)}

# 6. SYSTEM_TRIGGER
system_trigger = ${i.systemTrigger ? `"${i.systemTrigger}"` : 'null'}

${RADIO_RULES}
Bản nháp radio của hệ thống (dùng làm cơ sở, hãy viết lại sinh động hơn nhưng không đổi thông tin): ${i.radioDraft ? `"""${i.radioDraft}"""` : 'null'}

# 7. LOOT & HIỆU ỨNG
- Khi người chơi nhận vật phẩm, "loot_notification": ["Tên + Số lượng"].
- Thời tiết hiện tại: ${i.weatherLabel} (mã ${i.weatherKey}).

DỮ LIỆU ĐẦU VÀO:
=== global_state ===
${JSON.stringify(i.globalState, null, 2)}

=== local_context (Lịch sử ngắn hạn) ===
${i.historySummary || 'Lượt 1: Mới bắt đầu cuộc phiêu lưu sinh tồn.'}

HÀNH ĐỘNG CỦA NGƯỜI CHƠI: "${i.chosenAction}"

Trả về DUY NHẤT một JSON hợp lệ (không markdown):
{
  "outcome": "...",
  "situation": "Phần tả cảnh kế tiếp đã viết lại...",
  "system_trigger": ${i.systemTrigger ? `"${i.systemTrigger}"` : 'null'},
  "radio_transmission": null,
  "statChanges": { "hp": 0, "hunger": 6, "thirst": 8, "infection": 0, "sanity": -2, "stamina": -9 },
  "woundChange": null,
  "itemsGained": [],
  "itemsLost": [],
  "loot_notification": [],
  "companionUpdates": [],
  "newSkill": null,
  "discoveredBase": null,
  "soundCue": "zombie_growl"
}`;
}

export interface CustomPromptInput extends TurnPromptInput {
  zoneLabel: string;
  placeName: string;
}

// Chế độ hành động tự nhập: AI đọc văn bản người chơi gõ, phân tích ý định và viết diễn biến mới.
// Cơ chế (chỉ số, vật phẩm nhặt được, vùng mới) đã được hệ thống tính sẵn; AI chỉ kể lại và dựng tình huống kế tiếp.
export function buildCustomPrompt(i: CustomPromptInput): string {
  return `Bạn là Quản trò AI của game RPG sinh tồn Zombie thực tế. 100% TIẾNG VIỆT, tả thực giác quan, không chớp nháy.

NGƯỜI CHƠI VỪA TỰ GÕ HÀNH ĐỘNG: "${i.chosenAction}"

NHIỆM VỤ:
1. Đọc kỹ hành động, hiểu ý định (đi đâu, làm gì, dùng gì, với ai) và viết "outcome" 3-6 câu kể diễn biến CỤ THỂ dựa trên đúng nội dung người chơi gõ.
2. Kết quả cơ chế đã tính sẵn, bạn PHẢI giữ đúng mọi sự thật trong đó (vật phẩm nhặt/mất, chỉ số, di chuyển): """${i.resolvedOutcome}"""
3. Viết "situation" cho tình huống kế tiếp, nối thẳng từ hành động vừa rồi, người chơi đang ở: ${i.placeName} - ${i.zoneLabel}.
4. Đưa ra đúng 3 "choices" mới, khác nhau rõ rệt, hợp lý với tình huống đó (mỗi lựa chọn một hướng: hành động / thận trọng / rút lui hoặc tìm người).

LUẬT LOGIC KHÔNG ĐƯỢC PHÁ:
- Không dịch chuyển tức thời: người chơi chỉ ở ${i.zoneLabel}. Muốn tới nơi khác phải nêu rõ quãng đường (ví dụ đang ở tầng 7 muốn xuống tầng trệt phải đi qua cầu thang).
- Không bịa vật phẩm, nhân vật có tên, hay sự kiện lớn mâu thuẫn với global_state. Nhân vật mới (nếu có) chưa biết tên, chỉ mô tả ngoại hình/nghề.
- Đồ ăn/uống thực tế: thức ăn sống cần nấu, nước chưa đun phải đun sôi; đồ tươi dễ hỏng.
- Hiện là Ngày ${i.nextDay}, thời tiết: ${i.weatherLabel}. Hậu quả phải hợp lý và có cái giá.

${RADIO_RULES}
system_trigger = ${i.systemTrigger ? `"${i.systemTrigger}"` : 'null'}
Bản nháp radio: ${i.radioDraft ? `"""${i.radioDraft}"""` : 'null'}

=== global_state ===
${JSON.stringify(i.globalState, null, 2)}

=== local_context ===
${i.historySummary || 'Lượt đầu.'}

Trả về DUY NHẤT một JSON hợp lệ:
{
  "outcome": "...",
  "situation": "...",
  "choices": ["...", "...", "..."],
  "radio_transmission": null,
  "companionUpdates": [],
  "soundCue": "zombie_growl"
}`;
}
