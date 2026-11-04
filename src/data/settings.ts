// ====================================================================
// BỐI CẢNH & VÙNG DI CHUYỂN
// Người chơi luôn đứng trong một "vùng" (zone). Đổi vùng PHẢI đi qua đoạn di chuyển rõ ràng
// (không còn cảnh đang ở tầng 7 mà bỗng đứng dưới sảnh tầng 1). Chuỗi vùng:
//   shelter (chỗ trú) — near (xung quanh, hành lang) — outside (ngoài đường)
//                          \_ roof (sân thượng/mái, nếu có)
// ====================================================================

export type Zone = 'shelter' | 'near' | 'outside' | 'roof';

export interface Setting {
  id: string;
  place: string;               // tên khu vực hiển thị
  labels: Record<Zone, string>;
  neighbor: string;            // chỗ lân cận có thể lục soát (ở vùng near)
  hasRoof: boolean;
  steps: Record<string, string>; // câu mô tả mỗi bước di chuyển giữa 2 vùng kề nhau
}

export const SETTINGS: Record<string, Setting> = {
  apartment_survivors: {
    id: 'apartment_survivors',
    place: 'Chung cư Linh Đàm',
    labels: { shelter: 'căn hộ tầng 7', near: 'hành lang và cầu thang bộ', outside: 'đường phố dưới chân tòa nhà', roof: 'sân thượng' },
    neighbor: 'căn hộ trống cuối hành lang',
    hasRoof: true,
    steps: {
      'shelter>near': 'Bạn tháo chốt cửa thật khẽ, hé ra hành lang tầng 7 tối om rồi lách ra ngoài.',
      'near>shelter': 'Bạn quay về căn hộ tầng 7, khóa chốt cửa và chèn ghế sau lưng.',
      'near>outside': 'Bạn đi xuống bảy tầng cầu thang bộ trong bóng tối, từng bậc một, tay bám lan can; đến tầng trệt bạn đẩy nặng nề cánh cửa thoát hiểm để bước ra đường.',
      'outside>near': 'Bạn quay vào sảnh tòa nhà, khóa cửa thoát hiểm rồi leo bảy tầng cầu thang, chân rã rời, dừng nghỉ ở mỗi chiếu nghỉ.',
      'near>roof': 'Bạn leo thêm hai tầng cầu thang hẹp, cạy chốt gỉ của cửa sắt và bước lên sân thượng đầy gió.',
      'roof>near': 'Bạn rời sân thượng, xuống lại hành lang tầng 7 và khép cánh cửa sắt lại.',
    },
  },
  supermarket_lockdown: {
    id: 'supermarket_lockdown',
    place: 'Siêu thị MiniMart - Phố Bà Triệu',
    labels: { shelter: 'kho sau siêu thị', near: 'gian bán hàng đổ ngổn ngang', outside: 'vỉa hè phố Bà Triệu', roof: 'mái siêu thị' },
    neighbor: 'dãy kệ hàng bị đổ ngổn ngang',
    hasRoof: true,
    steps: {
      'shelter>near': 'Bạn đẩy khẽ cánh cửa kho và bước ra gian bán hàng, né qua những mảnh chai vỡ.',
      'near>shelter': 'Bạn lùi về kho sau, kéo cửa lại và chèn thùng hàng vào chân cửa.',
      'near>outside': 'Bạn chui qua khe cửa cuốn sắt khóa nửa chừng, trườn ra vỉa hè phố Bà Triệu.',
      'outside>near': 'Bạn chui ngược qua khe cửa cuốn vào gian bán hàng rồi kéo thùng chặn lại.',
      'near>roof': 'Bạn leo cầu thang sắt phía sau kho lên mái siêu thị.',
      'roof>near': 'Bạn leo xuống cầu thang sắt, trở lại gian bán hàng.',
    },
  },
  highway_traffic_breakdown: {
    id: 'highway_traffic_breakdown',
    place: 'Đường Vành Đai 3 Trên Cao - Km 14',
    labels: { shelter: 'cabin xe bán tải', near: 'khoảng sát quanh xe bạn', outside: 'dòng xe kẹt cứng trên cao tốc', roof: 'nóc xe container' },
    neighbor: 'chiếc xe kẹt ngay cạnh',
    hasRoof: true,
    steps: {
      'shelter>near': 'Bạn mở cửa xe thật khẽ rồi trườn xuống mặt đường, nép sát bánh xe.',
      'near>shelter': 'Bạn chui lại vào cabin, khóa cửa và hạ thấp người xuống dưới cửa kính.',
      'near>outside': 'Bạn bò qua gầm các xe kẹt, men theo từng dãy xe để tiến sâu vào dòng xe chết.',
      'outside>near': 'Bạn bò ngược qua gầm xe về lại chỗ chiếc bán tải của mình.',
      'near>roof': 'Bạn trèo lên bậc thang sau xe container và nằm sấp trên nóc.',
      'roof>near': 'Bạn tụt xuống từ nóc container, trở lại sát xe mình.',
    },
  },
  metro_train_derailment: {
    id: 'metro_train_derailment',
    place: 'Ga Tàu Ngầm Cát Linh',
    labels: { shelter: 'toa tàu cuối', near: 'đường hầm sát toa tàu', outside: 'sân ga và đại sảnh ga', roof: 'nóc toa tàu' },
    neighbor: 'toa tàu kế bên',
    hasRoof: false,
    steps: {
      'shelter>near': 'Bạn đẩy cửa toa bị kẹt hé ra và nhảy xuống đường ray, đèn điện thoại tắt ngấm.',
      'near>shelter': 'Bạn trèo lại toa tàu cuối, kéo cửa và chặn bằng thanh sắt.',
      'near>outside': 'Bạn men theo vách đường hầm, vượt hai trăm mét tối đen để lên được sân ga rồi đại sảnh ga.',
      'outside>near': 'Bạn đi ngược lại qua sân ga rồi nhảy xuống đường ray, lần theo vách hầm quay về chỗ toa tàu.',
      'near>roof': 'Bạn trèo lên nóc toa tàu hẹp sát vòm hầm.',
      'roof>near': 'Bạn tụt từ nóc toa xuống đường ray.',
    },
  },
  clinic_containment: {
    id: 'clinic_containment',
    place: 'Trạm Y Tế Phường Cầu Giấy',
    labels: { shelter: 'phòng bệnh dã chiến', near: 'hành lang trạm y tế', outside: 'sân và đường phố ngoài trạm', roof: 'mái tôn trạm xá' },
    neighbor: 'phòng bệnh bên cạnh',
    hasRoof: true,
    steps: {
      'shelter>near': 'Bạn đẩy tấm rèm nhựa và đi ra hành lang trạm, nền gạch loang vệt nước mưa.',
      'near>shelter': 'Bạn quay về phòng bệnh dã chiến, kéo rèm và chặn cửa bằng giường gấp.',
      'near>outside': 'Bạn mở cổng sắt phụ của trạm và bước ra sân ướt mưa, rồi ra đường.',
      'outside>near': 'Bạn quay vào sân, đóng cổng sắt và trở lại hành lang.',
      'near>roof': 'Bạn trèo thang sắt phía sau trạm lên mái tôn trơn nước mưa.',
      'roof>near': 'Bạn trèo xuống thang sắt trở lại hành lang.',
    },
  },
};

SETTINGS.private_house = {
  id: 'private_house',
  place: 'Nhà riêng - Ngõ 12',
  labels: { shelter: 'trong nhà bạn', near: 'sân gạch và hàng rào', outside: 'con ngõ và các nhà quanh đó', roof: 'mái tum' },
  neighbor: 'nhà hàng xóm sát vách',
  hasRoof: true,
  steps: {
    'shelter>near': 'Bạn rút then cửa chính thật khẽ, bước ra sân gạch phủ rêu và nép sát bờ tường.',
    'near>shelter': 'Bạn quay vào nhà, cài then cửa và kéo bàn ghế chèn sau lưng.',
    'near>outside': 'Bạn mở cổng sắt rỉ chỉ vừa một người, rón rén ra con ngõ hẹp tối om.',
    'outside>near': 'Bạn lách vào cổng, kéo chốt và dựa lưng thở dốc.',
    'near>roof': 'Bạn leo thang sắt dựng sau nhà lên mái tum, nơi nhìn được cả dãy mái các nhà trong ngõ.',
    'roof>near': 'Bạn leo xuống thang sắt, trở lại sân.',
  },
};

export const DEFAULT_SETTING_ID = 'apartment_survivors';

export function getSetting(id?: string): Setting {
  return SETTINGS[id || ''] || SETTINGS[DEFAULT_SETTING_ID];
}

export function zoneLabel(s: Setting, z: Zone): string {
  return s.labels[z];
}

export function locationText(s: Setting, z: Zone): string {
  return `${s.place} - ${s.labels[z]}`;
}

// Câu mô tả đường đi từ vùng này sang vùng khác (luôn đi qua "near").
export function moveText(s: Setting, from: Zone, to: Zone): string {
  if (from === to) return '';
  const keys: string[] = [];
  if (from !== 'near') keys.push(`${from}>near`);
  if (to !== 'near') keys.push(`near>${to}`);
  return keys.map((k) => s.steps[k]).join(' ');
}

// Thay các ký hiệu {shelter} {near} {outside} {roof} {neighbor} {place} trong văn bản cảnh.
export function fill(text: string, s: Setting): string {
  return text
    .replace(/\{shelter\}/g, s.labels.shelter)
    .replace(/\{near\}/g, s.labels.near)
    .replace(/\{outside\}/g, s.labels.outside)
    .replace(/\{roof\}/g, s.labels.roof)
    .replace(/\{neighbor\}/g, s.neighbor)
    .replace(/\{place\}/g, s.place);
}
