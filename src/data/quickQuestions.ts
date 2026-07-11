import type { Question } from "./questionTypes";

export const quickQuestions: Question[] = [
  {
    id: "q01_station_focus",
    branch: "quick",
    title: "团队开始一个新计划时，你通常会先做什么？",
    options: [
      { id: "drawer", label: "先整理细节和可能被忽略的线索", scores: { alone: 1, mystery: 1, cat: 0.5, tiger: 0.5, frontier: 0.4 }, effects: { itemHints: ["带分类夹层的线索册"] } },
      { id: "sleeping_person", label: "先确认每个人状态，再分配任务", scores: { soft: 1, loyal: 0.8, social: 0.5, warm: 0.5, dog: 0.7, deer: 0.5, rabbit: 0.4 }, effects: { outfitHints: ["柔软便于活动的照护者服装"] } },
      { id: "camera", label: "先建立看板、流程和反馈机制", scores: { control: 0.8, academy: 0.5, cyber: 0.7, urban: 0.5, mech: 0.7, bear: 0.5, strong: 0.4 }, effects: { itemHints: ["可展开的任务看板终端"] } },
      { id: "open_door", label: "先提出一个跳出常规的切入点", scores: { mystery: 1.2, chaos: 0.6, frontier: 0.5, dragon: 0.5, serpent: 0.5 }, effects: { poseHints: ["迈步穿过刚开启的通道"] } },
    ],
  },
  {
    id: "q02_token",
    branch: "quick",
    title: "你更希望角色形成哪种做事习惯？",
    options: [
      { id: "badge", label: "先定规则和判断标准", scores: { control: 1, academy: 0.8, bear: 0.6, strong: 0.4, chubby: 0.3, pure_bias: 0.4 }, effects: { palette: "冷白银灰与冰蓝", motifHints: ["清晰对称的徽章纹样"] } },
      { id: "bell", label: "保留直觉和仪式感", scores: { calm: 0.4, chinese: 1, ritual: 0.5, mythic_bias: 0.8, feather: 0.3, qilin: 0.6 }, effects: { palette: "朱红、墨色与金色", itemHints: ["带有旧仪式痕迹的小铃"] } },
      { id: "blade", label: "轻装上阵，边做边调整", scores: { slim: 0.8, wild: 0.7, fox: 0.4, leopard: 0.7 }, effects: { palette: "沙金与岩灰", outfitHints: ["便于快速调整的轻量旅行装"] } },
      { id: "core", label: "用工具和数据提高效率", scores: { cyber: 0.9, urban: 0.5, mechanical_bias: 1.2, mech: 1, hybrid_bias: 0.8 }, effects: { palette: "高对比霓虹色", itemHints: ["模块化数据工具"] } },
    ],
  },
  {
    id: "q03_called_out",
    branch: "quick",
    title: "当你的判断被质疑时，你更可能怎么回应？",
    options: [
      { id: "pause", label: "先听完，不急着解释", scores: { alone: 1, mystery: 0.8, calm: 0.4, wolf: 0.6, fox: 0.4 } },
      { id: "proof", label: "拿出依据，一起核对", scores: { control: 1, academy: 0.6, bear: 0.6, strong: 0.4, dragon: 0.4, pure_bias: 0.3 } },
      { id: "under_light", label: "把问题摊开，直接沟通清楚", scores: { social: 0.8, loyal: 1, dog: 0.8, lion: 0.4 } },
      { id: "smile_leave", label: "换个角度，绕开无效争执", scores: { chaos: 1, slim: 0.6, fox: 0.5, tiger: 0.5 } },
    ],
  },
  {
    id: "q04_painting",
    branch: "quick",
    title: "面对四种计划风格，你更偏向哪一种？",
    options: [
      { id: "black_sea", label: "稳住节奏，给大家留缓冲", scores: { ocean: 1, dark: 0.4, calm: 0.5, heavy: 0.4, otter: 0.5, serpent: 0.5 }, effects: { sceneHints: ["潮汐栈桥与远海灯塔附近"] } },
      { id: "mist_root", label: "从长期关系和基础做起", scores: { forest: 1.2, soft: 0.5, warm: 0.4, chubby: 0.4, deer: 0.8, bear: 0.4, rabbit: 0.3 }, effects: { sceneHints: ["雾气森林与盘根石碑之间"] } },
      { id: "light_rail", label: "先搭一个可迭代原型", scores: { cyber: 0.7, urban: 0.5, wasteland: 0.5, bright: 0.4, mech: 0.6, tiger: 0.5 }, effects: { sceneHints: ["仍在运转的实验工坊中"] } },
      { id: "cloud_temple", label: "用愿景和原则统领全局", scores: { chinese: 1.2, ritual: 0.6, mythic_bias: 1, dragon: 0.6, qilin: 0.7 }, effects: { sceneHints: ["云海神殿的开阔石阶前"] } },
    ],
  },
  {
    id: "q05_route",
    branch: "quick",
    title: "时间有限时，你更倾向选择哪种推进方式？",
    options: [
      { id: "high_ground", label: "先拉开视角，确认全局再行动", scores: { alone: 0.8, slim: 0.8, leopard: 0.8, snow_leopard: 0.6 }, effects: { poseHints: ["站在高处观察远方路线"] } },
      { id: "shortest", label: "沿着最短路线快速通过", scores: { wild: 0.8, slim: 0.8, tense: 0.5, leopard: 0.8, wolf: 0.4 }, effects: { poseHints: ["快速穿过狭窄通道的动态步态"] } },
      { id: "old_map", label: "列出计划，把风险提前标出来", scores: { control: 1.2, academy: 0.8, ruins: 0.5, bear: 0.6, strong: 0.4, dragon: 0.4 }, effects: { poseHints: ["展开地图并标记风险点"] } },
      { id: "blend_in", label: "加入合作节奏，和大家一起推进", scores: { social: 1, soft: 0.4, dog: 0.7, cat: 0.4 }, effects: { poseHints: ["与同伴并肩搬运或整理物资"] } },
    ],
  },
  {
    id: "q06_letter",
    branch: "quick",
    title: "收到一份复杂资料时，你会先看哪部分？",
    options: [
      { id: "seal", label: "整体结构和来源", scores: { academy: 0.5, ruins: 0.6, ritual: 0.4, mythic_bias: 0.8, scale: 0.5, dragon: 0.4, qilin: 0.5 } },
      { id: "stain", label: "最不协调的细节", scores: { mystery: 0.8, alone: 0.5, wolf: 0.5, tiger: 0.5 } },
      { id: "signature", label: "相关人和责任关系", scores: { loyal: 0.8, social: 0.5, dog: 0.6, deer: 0.4 } },
      { id: "crossed_line", label: "被忽略的附加条件", scores: { chaos: 0.8, mystery: 0.8, ruins: 0.4, fox: 0.4, serpent: 0.4 } },
    ],
  },
  {
    id: "q07_signal",
    branch: "quick",
    title: "角色遇到压力时，更常用哪种方式表达状态？",
    options: [
      { id: "tail_shadow", label: "主动照顾气氛，让大家放松", scores: { fluffy: 1, slim: 0.4, social: 0.5, bright: 0.5, fox: 0.5, otter: 0.4, rabbit: 0.4 } },
      { id: "metal_sound", label: "用清单和工具把事情推进", scores: { cyber: 0.7, urban: 0.5, mechanical_bias: 1, mech: 0.9, hybrid_bias: 0.6 } },
      { id: "under_marks", label: "保持克制，等关键时刻表态", scores: { mystery: 0.5, scale: 0.8, dragon: 0.6, serpent: 0.5 } },
      { id: "shadow_cloak", label: "暂时后撤，给自己留安静空间", scores: { dark: 1, mystery: 0.7, wolf: 0.5, snow_leopard: 0.6 } },
    ],
  },
  {
    id: "q08_recognition",
    branch: "quick",
    title: "你希望角色被别人记住，主要因为哪种行为？",
    options: [
      { id: "silhouette", label: "做事稳定，标准清楚", scores: { academy: 0.4, pure_bias: 1, control: 0.4, clear_species_shape: 0.3, cat: 0.5, snow_leopard: 0.4 } },
      { id: "odd_feature", label: "解决问题时总有独特办法", scores: { hybrid_bias: 0.9, scale: 0.5, feather: 0.5, strong: 0.4, tiger: 0.5, leopard: 0.4 } },
      { id: "palette", label: "能把复杂信息讲得容易理解", scores: { cyber: 0.3, urban: 0.4, bright: 0.5, fluffy: 0.3, fox: 0.4, cat: 0.5 } },
      { id: "presence", label: "关键时刻敢站出来", scores: { wild: 0.8, tense: 0.4, strong: 0.4, heavy: 0.5, lion: 0.7, dragon: 0.4 } },
    ],
  },
  {
    id: "q09_help",
    branch: "quick",
    title: "有人请求你帮忙，但会拖慢你的任务。你会？",
    options: [
      { id: "assess", label: "判断对方是否真的需要帮助，再决定", scores: { control: 0.8, alone: 0.6, strong: 0.4, bear: 0.5, wolf: 0.4 } },
      { id: "complain_help", label: "嘴上嫌麻烦，还是伸手", scores: { loyal: 1, social: 0.4, otter: 0.5, dog: 0.5 } },
      { id: "anonymous", label: "直接帮，但不留下名字", scores: { soft: 1, warm: 0.5, small: 0.4, forest: 0.4, deer: 0.8, rabbit: 0.5, otter: 0.5 } },
      { id: "follow_me", label: "让对方跟上，跟不上就算了", scores: { wild: 0.8, chaos: 0.5, heavy: 0.4, wolf: 0.6, lion: 0.5 } },
    ],
  },
  {
    id: "q10_knock",
    branch: "quick",
    title: "团队意见突然分歧时，你会怎么处理？",
    options: [
      { id: "window", label: "先安静观察各方立场", scores: { alone: 0.8, dark: 0.7, wolf: 0.4, snow_leopard: 0.5 } },
      { id: "behind_door", label: "明确边界，再推进决定", scores: { control: 0.7, wild: 0.5, heavy: 0.4, lion: 0.5, serpent: 0.5 } },
      { id: "password", label: "先确认共同目标", scores: { loyal: 0.6, academy: 0.6, chubby: 0.3, dog: 0.5, rabbit: 0.5 } },
      { id: "side_exit", label: "换一种讨论方式打破僵局", scores: { chaos: 0.8, slim: 0.4, small: 0.4, fox: 0.4, cat: 0.5 } },
    ],
  },
  {
    id: "q11_mission",
    branch: "quick",
    title: "如果角色有一个长期目标，你更喜欢它是？",
    options: [
      { id: "memory", label: "修复一套失灵的记录系统", scores: { academy: 0.4, cyber: 0.6, ruins: 0.6, mech: 0.7 }, effects: { mission: "修复失灵的记录系统", itemHints: ["可随身展开的记录终端"] } },
      { id: "gate", label: "守护一个重要约定", scores: { loyal: 0.8, control: 0.8, qilin: 0.4 }, effects: { mission: "守护重要约定", itemHints: ["刻有约定纹样的护符盾牌"] } },
      { id: "lamp", label: "把一份希望送到更远处", scores: { soft: 0.8, warm: 0.6, ocean: 1, otter: 0.7 }, effects: { mission: "传递希望", itemHints: ["封存微光的旅行灯"] } },
      { id: "weapon", label: "回收一件失控的工具", scores: { wild: 0.7, dark: 0.7, tense: 0.5, frontier: 0.5, wasteland: 0.5, strong: 0.5, wolf: 0.4, tiger: 0.4 }, effects: { mission: "回收失控工具", itemHints: ["用于封存失控装置的回收器"] } },
    ],
  },
  {
    id: "q12_result_focus",
    branch: "quick",
    title: "最后遇到不可避免的冲突，你希望角色怎么行动？",
    options: [
      { id: "clear", label: "先把局面讲清楚，再做决定", scores: { pure_bias: 1.5, control: 0.4, calm: 0.4, clear_species_shape: 0.8, dominant_primary: 0.4, strong: 0.4, chubby: 0.3, bear: 0.5 }, effects: { motifHints: ["边界清楚的天然对称斑纹"] } },
      { id: "stable_complex", label: "保护核心目标，其余临场调整", scores: { hybrid_bias: 1, pure_bias: 0.5, dominant_primary: 0.6, heavy: 0.4 }, effects: { motifHints: ["围绕核心部位展开的不对称保护纹样"] } },
      { id: "abnormal", label: "主动打破惯例，找到新解法", scores: { hybrid_bias: 1.1, mythic_bias: 0.6, chaos: 0.4 }, effects: { motifHints: ["具有意外断点和方向变化的异化纹理"] } },
      { id: "modified", label: "借助工具或改造，把劣势转成优势", scores: { hybrid_bias: 0.8, mechanical_bias: 1.5, cyber: 0.5, urban: 0.4, frontier: 0.4 }, effects: { motifHints: ["与身体结构自然衔接的改造接缝"] } },
    ],
  },
];
