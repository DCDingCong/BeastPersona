import type { Question } from "./questionTypes";

export const quickQuestions: Question[] = [
  {
    id: "q01_station_focus",
    branch: "quick",
    title: "团队开始一个新计划时，你通常会先做什么？",
    options: [
      { id: "drawer", label: "先整理细节和可能被忽略的线索", scores: { alone: 1, mystery: 1, fox: 0.8, raven: 0.5 } },
      { id: "sleeping_person", label: "先确认每个人状态，再分配任务", scores: { soft: 1, loyal: 0.8, dog: 0.7, deer: 0.5 } },
      { id: "camera", label: "先建立看板、流程和反馈机制", scores: { control: 0.8, cyber: 1, mech: 0.8, owl: 0.4 } },
      { id: "open_door", label: "先提出一个跳出常规的切入点", scores: { mystery: 1.2, chaos: 0.6, dragon: 0.5, serpent: 0.5 } },
    ],
  },
  {
    id: "q02_token",
    branch: "quick",
    title: "你更希望角色形成哪种做事习惯？",
    options: [
      { id: "badge", label: "先定规则和判断标准", scores: { control: 1, academy: 0.8, owl: 0.8, pure_bias: 0.4 } },
      { id: "bell", label: "保留直觉和仪式感", scores: { mystery: 0.8, chinese: 1, mythic_bias: 0.8, qilin: 0.6 } },
      { id: "blade", label: "轻装上阵，边做边调整", scores: { slim: 1, wild: 0.7, fox: 0.7, leopard: 0.7 } },
      { id: "core", label: "用工具和数据提高效率", scores: { cyber: 1.2, mechanical_bias: 1.2, mech: 1, hybrid_bias: 0.8 } },
    ],
  },
  {
    id: "q03_called_out",
    branch: "quick",
    title: "当你的判断被质疑时，你更可能怎么回应？",
    options: [
      { id: "pause", label: "先听完，不急着解释", scores: { alone: 1, mystery: 0.8, wolf: 0.6, fox: 0.6 } },
      { id: "proof", label: "拿出依据，一起核对", scores: { control: 1, owl: 0.7, dragon: 0.5, pure_bias: 0.3 } },
      { id: "under_light", label: "把问题摊开，直接沟通清楚", scores: { social: 0.8, loyal: 1, dog: 0.8, lion: 0.4 } },
      { id: "smile_leave", label: "换个角度，绕开无效争执", scores: { chaos: 1, slim: 0.7, fox: 0.8, raven: 0.5 } },
    ],
  },
  {
    id: "q04_painting",
    branch: "quick",
    title: "面对四种计划风格，你更偏向哪一种？",
    options: [
      { id: "black_sea", label: "稳住节奏，给大家留缓冲", scores: { ocean: 1, mystery: 0.8, otter: 0.5, serpent: 0.5 } },
      { id: "mist_root", label: "从长期关系和基础做起", scores: { forest: 1.2, soft: 0.5, deer: 0.8, fox: 0.4 } },
      { id: "light_rail", label: "先搭一个可迭代原型", scores: { cyber: 1.2, wasteland: 0.5, mech: 0.7, raven: 0.4 } },
      { id: "cloud_temple", label: "用愿景和原则统领全局", scores: { chinese: 1.2, mythic_bias: 1, dragon: 0.9, qilin: 0.7 } },
    ],
  },
  {
    id: "q05_route",
    branch: "quick",
    title: "时间有限时，你更倾向选择哪种推进方式？",
    options: [
      { id: "high_ground", label: "先拉开视角，确认全局再行动", scores: { alone: 0.8, slim: 1, fox: 0.7, owl: 0.5 } },
      { id: "shortest", label: "沿着最短路线快速通过", scores: { wild: 0.8, slim: 0.8, leopard: 0.8, wolf: 0.4 } },
      { id: "old_map", label: "列出计划，把风险提前标出来", scores: { control: 1.2, academy: 0.8, owl: 0.8, dragon: 0.4 } },
      { id: "blend_in", label: "加入合作节奏，和大家一起推进", scores: { social: 1, soft: 0.4, dog: 0.7, cat: 0.4 } },
    ],
  },
  {
    id: "q06_letter",
    branch: "quick",
    title: "收到一份复杂资料时，你会先看哪部分？",
    options: [
      { id: "seal", label: "整体结构和来源", scores: { mythic_bias: 0.8, scale: 0.6, dragon: 0.6, qilin: 0.5 } },
      { id: "stain", label: "最不协调的细节", scores: { mystery: 0.8, alone: 0.5, wolf: 0.5, raven: 0.5 } },
      { id: "signature", label: "相关人和责任关系", scores: { loyal: 0.8, social: 0.5, dog: 0.6, deer: 0.4 } },
      { id: "crossed_line", label: "被忽略的附加条件", scores: { chaos: 0.8, mystery: 0.8, fox: 0.6, serpent: 0.4 } },
    ],
  },
  {
    id: "q07_signal",
    branch: "quick",
    title: "角色遇到压力时，更常用哪种方式表达状态？",
    options: [
      { id: "tail_shadow", label: "主动照顾气氛，让大家放松", scores: { fluffy: 1, slim: 0.6, fox: 0.8, dog: 0.4 } },
      { id: "metal_sound", label: "用清单和工具把事情推进", scores: { cyber: 1, mechanical_bias: 1, mech: 0.9, hybrid_bias: 0.6 } },
      { id: "under_marks", label: "保持克制，等关键时刻表态", scores: { mystery: 0.5, scale: 1, dragon: 0.8, serpent: 0.5 } },
      { id: "shadow_cloak", label: "暂时后撤，给自己留安静空间", scores: { dark: 1, mystery: 0.7, wolf: 0.6, raven: 0.7 } },
    ],
  },
  {
    id: "q08_recognition",
    branch: "quick",
    title: "你希望角色被别人记住，主要因为哪种行为？",
    options: [
      { id: "silhouette", label: "做事稳定，标准清楚", scores: { pure_bias: 1, control: 0.4, wolf: 0.4, snow_leopard: 0.4 } },
      { id: "odd_feature", label: "解决问题时总有独特办法", scores: { hybrid_bias: 1, scale: 0.5, feather: 0.5, dragon: 0.4 } },
      { id: "palette", label: "能把复杂信息讲得容易理解", scores: { cyber: 0.5, fluffy: 0.3, fox: 0.4, cat: 0.4 } },
      { id: "presence", label: "关键时刻敢站出来", scores: { wild: 0.8, control: 0.6, lion: 0.7, dragon: 0.5 } },
    ],
  },
  {
    id: "q09_help",
    branch: "quick",
    title: "有人请求你帮忙，但会拖慢你的任务。你会？",
    options: [
      { id: "assess", label: "判断对方是否真的需要帮助，再决定", scores: { control: 0.8, alone: 0.6, owl: 0.5, wolf: 0.4 } },
      { id: "complain_help", label: "嘴上嫌麻烦，还是伸手", scores: { loyal: 1, mystery: 0.4, fox: 0.7, dog: 0.5 } },
      { id: "anonymous", label: "直接帮，但不留下名字", scores: { soft: 1, deer: 0.8, rabbit: 0.5, otter: 0.5 } },
      { id: "follow_me", label: "让对方跟上，跟不上就算了", scores: { wild: 0.8, chaos: 0.5, wolf: 0.6, lion: 0.5 } },
    ],
  },
  {
    id: "q10_knock",
    branch: "quick",
    title: "团队意见突然分歧时，你会怎么处理？",
    options: [
      { id: "window", label: "先安静观察各方立场", scores: { alone: 0.8, dark: 0.7, wolf: 0.5, raven: 0.5 } },
      { id: "behind_door", label: "明确边界，再推进决定", scores: { control: 0.7, wild: 0.5, lion: 0.5, dragon: 0.5 } },
      { id: "password", label: "先确认共同目标", scores: { loyal: 0.6, academy: 0.6, dog: 0.5, owl: 0.5 } },
      { id: "side_exit", label: "换一种讨论方式打破僵局", scores: { chaos: 0.8, slim: 0.7, fox: 0.7, cat: 0.4 } },
    ],
  },
  {
    id: "q11_mission",
    branch: "quick",
    title: "如果角色有一个长期目标，你更喜欢它是？",
    options: [
      { id: "memory", label: "修复一套失灵的记录系统", scores: { cyber: 1, mystery: 0.6, mech: 0.7 }, effects: { mission: "修复失灵的记录系统" } },
      { id: "gate", label: "守护一个重要约定", scores: { loyal: 0.8, control: 0.8, dragon: 0.5 }, effects: { mission: "守护重要约定" } },
      { id: "lamp", label: "把一份希望送到更远处", scores: { soft: 0.8, ocean: 1, otter: 0.7 }, effects: { mission: "传递希望" } },
      { id: "weapon", label: "回收一件失控的工具", scores: { wild: 0.7, dark: 0.7, wolf: 0.5 }, effects: { mission: "回收失控工具" } },
    ],
  },
  {
    id: "q12_result_focus",
    branch: "quick",
    title: "最后遇到不可避免的冲突，你希望角色怎么行动？",
    options: [
      { id: "clear", label: "先把局面讲清楚，再做决定", scores: { pure_bias: 1.5, control: 0.4, clear_species_shape: 0.8 } },
      { id: "stable_complex", label: "保护核心目标，其余临场调整", scores: { hybrid_bias: 1, pure_bias: 0.5, dominant_primary: 0.6 } },
      { id: "abnormal", label: "主动打破惯例，找到新解法", scores: { hybrid_bias: 1.5, mythic_bias: 0.6, chaos: 0.4 } },
      { id: "modified", label: "借助工具或改造，把劣势转成优势", scores: { hybrid_bias: 1, mechanical_bias: 1.5, cyber: 0.8 } },
    ],
  },
];
