export const profile = {
  name: "Fubuki",
  handle: "Fubuki007",
  university: "广东技术师范大学",
  major: "电气工程及其自动化",
  grade: "本科生 · 2024.09—2028.06（预计）",
  status: "学生",
  github: "https://github.com/Fubuki007",
  email: "hejiawei1021@163.com",
  phone: "15976193039",
  description:
    "",
};

export const education = [
  {
    period: "2024.09—2028.06（预计）",
    school: "广东技术师范大学",
    major: "电气工程及其自动化 · 本科",
    details: "",
  },
];

export const researchInterests = [
  "6G 通感一体化（ISAC）",
  "全双工 MIMO-OFDM",
  "自干扰消除",
  "雷达定位与参数估计",
  "单比特雷达",
];

export const researchRecords = [
  {
    id: "full-duplex-isac",
    period: "2025.09—2026.11 · 进行中",
    type: "科研项目 / 第一作者",
    title: "全双工 MIMO-OFDM ISAC 系统参数估计研究",
    affiliation: "深圳大学射频异质异构集成全国重点实验室 · 与中兴微电子联合科研",
    description:
      "围绕自干扰消除与参数估计完成文献调研、系统建模、MATLAB 算法实现和多方案对比验证。独立配置仿真参数、迭代代码结构并核验结果，形成可复现、对比清晰的仿真结果。",
    result: "英文论文以第一作者发表于 AIPIP EI 2026。",
  },
  {
    id: "aipip-single-bit",
    period: "AIPIP 2026",
    type: "合作论文 / 第二作者",
    title: "单比特雷达参数估计合作研究",
    affiliation: "第二届空天信息感知与智能处理国际学术会议（AIPIP 2026）",
    description:
      "承担不同信道条件下的仿真验证，核对数据正确性、鲁棒性与边界条件，并协助整理对比图表，为合作论文提供多维度数据支撑。",
    result: "作为第二作者在 AIPIP 2026 发表论文 1 篇。",
  },
];

export const publications = [
  {
    year: "2026",
    authorship: "第一作者",
    title:
      "Parameter Estimation for Full-Duplex MIMO-OFDM ISAC Systems with Self-Interference Cancellation",
    venue: "Proceedings of AIPIP EI",
  },
  {
    year: "2026",
    authorship: "第二作者",
    title: "One-Bit Parabolic-Interpolation Angle Localization for Integrated Sensing and Communication",
    venue: "Proceedings of AIPIP EI",
  },
];

export const achievements = [
  { year: "2026.07", title: "第十八届“中国电机工程学会杯”全国大学生电工数学建模竞赛", award: "国家级三等奖" },
  { year: "2026.06", title: "人工智能综合能力提升培训（国家高等教育智慧教育平台）", award: "培训证书" },
  { year: "2025.09", title: "“大湾区杯”粤港澳金融数学建模竞赛", award: "省级三等奖" },
  { year: "2025.06", title: "粤港澳学生信息科技创新大赛", award: "校级三等奖" },
  { year: "2025.06", title: "大学生创新创业训练计划：数智赋能电气《专业概论》智慧课程建设方案设计", award: "校级优秀结项" },
  { year: "2026.12", title: "其他专项奖学金", award: "对应竞赛获奖" },
  { year: "2027.06", title: "大学生创新创业训练计划：基于单比特量化的低空轻量化通感融合参数估计方法研究", award: "省级优秀结项" },
];

export const skills = [
  { label: "MATLAB / Python", detail: "通信物理层建模、算法实现与性能对比仿真" },
  { label: "编程", detail: "C语言二级/Vibe coding享受者" },
  { label: "学术写作", detail: "英文摘要、论文初稿、排版与图表整理" },
  { label: "英语能力", detail: "CET-4/CET-6" },
];
