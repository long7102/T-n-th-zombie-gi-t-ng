import { Companion, Item, SkillCategory } from '../types/game';

export interface StoryBranchMilestone {
  id: string;
  actNumber: number;
  title: string;
  description: string;
  triggerCondition: string; // VD: 'day >= 2', 'location === hospital'
  contextPrompt: string;
  majorChoices: {
    id: string;
    label: string;
    shortDescription: string;
    consequenceTag: string; // flag lưu vào ký ức game: 'saved_nhauyen', 'took_drugs_alone', etc.
    worldImpact: string;
    karmaChange: number;
  }[];
}

export interface StoryFlagMemory {
  savedDoctorNhãUyên?: boolean;
  betrayedNhãUyên?: boolean;
  bloodWolfStance?: 'hostile' | 'allied' | 'subversive'; // Băng cướp Huyết Lang
  bunker13Resolved?: 'rescued' | 'abandoned' | 'diverted_horde';
  infectedCompanionChoice?: 'cured_with_antidote' | 'amputated_saved' | 'quarantined_exiled';
  craftedUltimateWeapon?: string;
  recruitedCompanions: string[];
  lostCompanions: string[];
  totalZombiesKilled: number;
  moralAlignment: number; // âm là tàn nhẫn, dương là vị tha
  notableActions: string[];
}

export const STORY_MILESTONES: StoryBranchMilestone[] = [
  {
    id: 'milestone_1_hospital',
    actNumber: 1,
    title: 'Điểm Rẽ Nhánh 1: Biến Cố Bệnh Viện Bạch Mai (Ngày 1-2)',
    description: 'Tại khu cấp cứu đổ nát, tiếng còi báo động hỏng rú lên từng hồi. Bác sĩ quân y Nhã Uyên đang bị 4 con Zombie biến dị dồn vào phòng mẫu phẩm kháng sinh.',
    triggerCondition: 'day >= 1',
    contextPrompt: 'Người chơi đứng trước ngã rẽ sống còn đầu tiên: Cứu Nhã Uyên, Cướp hòm thuốc tháo chạy, hoặc Đốt phòng thí nghiệm.',
    majorChoices: [
      {
        id: 'm1_save_doctor',
        label: 'Xông vào liều mạng giải cứu Bác sĩ Nhã Uyên',
        shortDescription: 'Dùng vũ khí cận chiến và pháo sáng cứu cô ấy. Thu nạp một đồng đội quân y xuất sắc và dữ liệu huyết thanh.',
        consequenceTag: 'saved_nhauyen',
        worldImpact: 'Nhã Uyên gia nhập nhóm, chữa lành vết thương và giải mã các loại virus zombie sau này.',
        karmaChange: +15,
      },
      {
        id: 'm1_take_supplies_flee',
        label: 'Phá két thuốc quân dụng rồi âm thầm tháo chạy',
        shortDescription: 'Lấy toàn bộ morphine, thuốc kháng sinh và băng gạc. Mặc kệ tiếng kêu cứu tắt dần phía sau.',
        consequenceTag: 'abandoned_nhauyen_rich_loot',
        worldImpact: 'Bạn sở hữu kho vật tư y tế dồi dào, nhưng đánh mất lòng tin của những người sống sót và mang gánh nặng tội lỗi.',
        karmaChange: -20,
      },
      {
        id: 'm1_firebomb_containment',
        label: 'Ném chai cồn phóng hỏa thiêu rụi khu thí nghiệm',
        shortDescription: 'Ngăn chặn toàn bộ mầm mống đột biến lây lan, tiếng nổ lớn thiêu cháy phòng thí nghiệm.',
        consequenceTag: 'burned_containment_alpha_dead',
        worldImpact: 'Tiêu diệt được mẫu vật Alpha, giảm độ lây nhiễm khu vực nhưng tạo ra cột khói thu hút các thợ săn tàn dư.',
        karmaChange: -5,
      },
    ],
  },
  {
    id: 'milestone_2_bloodwolf_raiders',
    actNumber: 2,
    title: 'Điểm Rẽ Nhánh 2: Đối Đầu Băng Cướp Huyết Lang (Ngày 3-5)',
    description: 'Băng cướp Huyết Lang - những kẻ sống sót tàn bạo nhất khu Tây - chặn cầu vượt huyết mạch với súng săn và chó săn đói khát.',
    triggerCondition: 'day >= 3',
    contextPrompt: 'Băng Huyết Lang yêu cầu nộp toàn bộ vũ khí và một người phụ nữ trong nhóm để đổi lấy quyền qua cầu.',
    majorChoices: [
      {
        id: 'm2_fight_to_death',
        label: 'Phục kích tiêu diệt toán lính tiền tiêu của Huyết Lang',
        shortDescription: 'Bắn hạ tên thủ lĩnh gác cầu, tuyên chiến trực diện với tổ chức cướp bóc lớn nhất thành phố.',
        consequenceTag: 'bloodwolf_nemesis',
        worldImpact: 'Bạn trở thành mục tiêu săn tiền thưởng của băng cướp, nhưng mở khóa uy danh cho những người vô tội.',
        karmaChange: +10,
      },
      {
        id: 'm2_negotiate_tribute',
        label: 'Cắn răng cống nạp đạn dược và phế liệu để đi qua hòa bình',
        shortDescription: 'Thương lượng thông minh, che giấu đồng đội và chỉ nhượng bộ một phần tài nguyên.',
        consequenceTag: 'bloodwolf_neutral_tribute',
        worldImpact: 'Bảo toàn mạng sống cả đội, nhưng mất mát đáng kể trang bị dự trữ.',
        karmaChange: 0,
      },
      {
        id: 'm2_infiltrate_subvert',
        label: 'Giả vờ quy thuận để cài bẫy nổ phá hủy kho đạn của chúng',
        shortDescription: 'Dùng kỹ năng chế tạo và ám sát, tiếp cận căn cứ chúng rồi kích nổ bình gas dã chiến.',
        consequenceTag: 'bloodwolf_sabotaged',
        worldImpact: 'Băng cướp tan rã trong hỗn loạn, bạn cướp lại toàn bộ kho vũ khí hạng nặng.',
        karmaChange: +5,
      },
    ],
  },
  {
    id: 'milestone_3_bunker13_distress',
    actNumber: 3,
    title: 'Điểm Rẽ Nhánh 3: Tín Hiệu Cầu Cứu Bunker 13 (Ngày 6-8)',
    description: 'Từ chiếc máy bộ đàm nhặt được, tiếng rè rè phát ra: "Đây là Bunker 13 ngầm dưới sân vận động... lũ cào xé đang phá lớp cửa thép thứ hai... ai còn sống xin hãy nghe..."',
    triggerCondition: 'day >= 6',
    contextPrompt: 'Hầm trú ẩn quân sự chứa hàng chục người dân và nguồn điện độc lập đang đứng trước nguy cơ bị bầy zombie nuốt chửng.',
    majorChoices: [
      {
        id: 'm3_breach_and_rescue',
        label: 'Đột kích cống ngầm, hỗ trợ phòng thủ bảo vệ Bunker 13',
        shortDescription: 'Cùng đồng đội xả thân chiến đấu nơi đường hầm tối tăm ngập nước thải để cứu những người bên trong.',
        consequenceTag: 'bunker13_heroes',
        worldImpact: 'Giải cứu hơn 20 người sống sót, được cấp một phòng an toàn có điện và xưởng nâng cấp vũ khí hiện đại.',
        karmaChange: +25,
      },
      {
        id: 'm3_divert_horde',
        label: 'Dùng pháo sáng và xe bán tải phát loa dẫn dụ đàn zombie đi hướng khác',
        shortDescription: 'Kế hoạch đánh lạc hướng liều lĩnh trên mặt đất, đánh đổi bằng việc chịu rủi ro bầy zombie truy đuổi nhóm mình.',
        consequenceTag: 'bunker13_diverted_horde',
        worldImpact: 'Cứu được căn hầm từ xa mà không phải giao tranh ngầm, mở khóa kỹ năng "Chiến Thuật Nghi Binh".',
        karmaChange: +15,
      },
      {
        id: 'm3_ignore_and_fortify',
        label: 'Phớt lờ tín hiệu, tận dụng thời cơ đàn zombie bị hút về đó để cướp bóc các cửa hàng',
        shortDescription: 'Chủ nghĩa thực dụng tối đa: khi kẻ khác làm mồi nhử, bạn vét sạch kho lương thực và xăng dầu.',
        consequenceTag: 'bunker13_abandoned_looter',
        worldImpact: 'Căn cứ của bạn đầy ắp tài nguyên, nhưng lương tâm bị cắn rứt và đồng đội có thể mất niềm tin.',
        karmaChange: -25,
      },
    ],
  },
  {
    id: 'milestone_4_mutation_crisis',
    actNumber: 4,
    title: 'Điểm Rẽ Nhánh 4: Khủng Hoảng Nhiễm Khuẩn Đồng Đội (Ngày 9-12)',
    description: 'Sau trận kịch chiến với Zombie Gai biến dị, người bạn đồng hành thân cận nhất của bạn ngã gục, bả vai rách toạc với những đường gân đen tím đang lan dần.',
    triggerCondition: 'day >= 9',
    contextPrompt: 'Virus biến chủng thế hệ 2 phát tác cực nhanh trong 10 phút. Bạn chỉ có đúng một cơ hội quyết định số phận cô ấy.',
    majorChoices: [
      {
        id: 'm4_use_prototype_cure',
        label: 'Sử dụng ống kháng thể nguyên mẫu duy nhất vừa tìm được',
        shortDescription: 'Đánh cược tất cả vào liều thuốc chưa qua thử nghiệm lâm sàng, chấp nhận mất đi cơ hội cứu bản thân nếu bị cắn.',
        consequenceTag: 'companion_cured_super_immune',
        worldImpact: 'Cô ấy sống sót kỳ diệu và phát triển kháng thể biến dị, tăng cường giác quan phản xạ siêu phàm.',
        karmaChange: +20,
      },
      {
        id: 'm4_battlefield_amputation',
        label: 'Phẫu thuật dã chiến thiêu đốt miệng vết thương ngay lập tức',
        shortDescription: 'Dùng dao nung đỏ và cồn đặc để khử trùng mô hoại tử. Cực kỳ đau đớn nhưng giữ lại được mạng sống.',
        consequenceTag: 'companion_amputated_scarred',
        worldImpact: 'Đồng đội sống sót với vết sẹo vĩnh viễn, lòng trung thành đạt tuyệt đối vì sự quyết đoán của bạn.',
        karmaChange: +10,
      },
      {
        id: 'm4_exile_mercy_bullet',
        label: 'Cách ly cô ấy trong cabin hoặc trao cho cô ấy một khẩu súng với viên đạn cuối',
        shortDescription: 'Không mạo hiểm để virus bùng phát đe dọa sinh mạng cả nhóm. Đưa ra lựa chọn lạnh lùng nhất.',
        consequenceTag: 'companion_exiled_or_ended',
        worldImpact: 'Bạn bảo toàn được sự an toàn tuyệt đối, nhưng tinh thần toàn đội sụp đổ nghiêm trọng.',
        karmaChange: -30,
      },
    ],
  },
  {
    id: 'milestone_5_final_evacuation',
    actNumber: 5,
    title: 'Điểm Rẽ Nhánh 5: Tuyến Di Tản Cuối Cùng & Trận Chiến Sinh Tử (Ngày 14+)',
    description: 'Tín hiệu trực thăng quân sự phát trên nóc Tòa tháp Bitexco đổ nát. Đàn Zombie Horde khổng lồ hàng ngàn con từ khắp thành phố tràn về như sóng thần.',
    triggerCondition: 'day >= 14',
    contextPrompt: 'Giây phút phán xét cuối cùng của kỷ nguyên tận thế. Mọi lựa chọn từ Ngày 1 đến nay sẽ định đoạt kết cục của bạn.',
    majorChoices: [
      {
        id: 'm5_board_helo_with_cure',
        label: 'Mở đường máu lên nóc tháp cùng đồng đội và bàn giao mẫu huyết thanh',
        shortDescription: 'Bắn yểm trợ cho nhau, kích nổ thang máy chặn đường bầy quái vật và bước lên trực thăng cứu viện.',
        consequenceTag: 'ending_rebirth_of_hope',
        worldImpact: 'Kết Cục: "HI VỌNG TÁI SINH" - Cùng các bạn đồng hành kiến tạo căn cứ sinh tồn mới, tìm ra thuốc giải.',
        karmaChange: +30,
      },
      {
        id: 'm5_heroic_last_stand',
        label: 'Ở lại tử thủ tại chân tháp với súng máy để đồng đội và người dân kịp bay đi',
        shortDescription: 'Cầm cự đến viên đạn cuối cùng trên cây cầu sập, trở thành ngọn đuốc rực sáng giữa đêm đen tận thế.',
        consequenceTag: 'ending_heroic_legend',
        worldImpact: 'Kết Cục: "HUYỀN THOẠI BẤT TỬ" - Bạn hi sinh oanh liệt, tên tuổi bạn được khắc ghi trên đài tưởng niệm tân thế giới.',
        karmaChange: +40,
      },
      {
        id: 'm5_rule_the_wasteland',
        label: 'Từ chối di tản, kích nổ phá hủy trực thăng của quân đội và giữ lại căn cứ ngầm cho riêng mình',
        shortDescription: 'Không còn tin tưởng vào chính quyền cũ. Bạn và nhóm tự xây dựng đế chế pháo đài độc lập giữa vùng đất hoang.',
        consequenceTag: 'ending_wasteland_warlord',
        worldImpact: 'Kết Cục: "BÁ CHỦ HOANG TÀN" - Trở thành thủ lĩnh quyền lực tối cao của vùng đất chết.',
        karmaChange: 0,
      },
    ],
  },
];
