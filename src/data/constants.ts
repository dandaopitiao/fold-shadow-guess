import type { Player } from "../types";

export const ROUND_SECONDS = 75;

export const botNames = ["阿年", "小满", "纸片人", "花刀", "窗边高手"];

export const playerFaces = ["^_^", "o_o", "n_n", ">_<", "*_*", "-_-"];

export function cleanPlayerName(value: string, fallback: string) {
  const compact = value.trim().replace(/\s+/g, "");
  return compact.slice(0, 10) || fallback;
}

export const wrongGuessPool = [
  "拖鞋",
  "鱼骨头",
  "云朵",
  "外星飞船",
  "大饼",
  "火锅盖",
  "海带",
  "钥匙",
  "蝴蝶结",
  "奇怪的门",
  "风扇",
  "面条",
  "雪花",
  "帽子",
  "树杈",
  "手套",
  "泡面碗",
  "毛巾架",
  "纸飞机",
  "西兰花",
  "棒棒糖",
  "猫耳朵",
  "仙人掌",
  "小台灯",
  "潜水艇",
  "巧克力",
  "冰淇淋",
  "呼啦圈",
  "水母",
  "龙卷风",
];

/** Bot 猜中通知池 — 萌系感叹语 */
export const botGuessNotices = [
  "{name} 眼睛一亮，好像看出来了！但答案先不公布哦～",
  "{name} 嘿嘿一笑，心中已有答案。",
  "{name} 举手了！ta 猜对了，不过先保密～",
  "{name} 歪头看了看，突然灵感迸发！",
  "{name} 从纸屑里找到了答案！厉害厉害。",
  "{name} 小声嘀咕了一句……咦，猜对了？",
];

/** 角色卡片：萌系可爱风，每个 Bot 都有软萌人设 */
export const botPersonas: Record<string, { title: string; intro: string }> = {
  阿年: {
    title: "软乎乎纸灵团子",
    intro: "走起路来会簌簌掉纸屑，但猜题第六感意外地准！",
  },
  小满: {
    title: "剪纸永动机",
    intro: "口袋里永远揣着一把小剪刀，看见啥都想咔嚓两下。",
  },
  纸片人: {
    title: "抽象派艺术家",
    intro: "剪出来的东西连自己都认不出，但自信永远满格！",
  },
  花刀: {
    title: "窗花小传人",
    intro: "祖传三代剪窗花，四折难度是她的快乐老窝。",
  },
  窗边高手: {
    title: "吃瓜观战团子",
    intro: "从来不动剪刀，但猜题又快又准，全场最淡定的存在。",
  },
};

export const makePlayers = (): Player[] => [
  { id: "me", name: "你", score: 0, avatar: playerFaces[0] },
  ...botNames.map((name, index) => ({
    id: `bot-${index}`,
    name,
    score: 0,
    avatar: playerFaces[index + 1] ?? "^_^",
  })),
];

export const pick = <T,>(items: T[]) =>
  items[Math.floor(Math.random() * items.length)];

export function uniqueWrong(answer: string, used: string[]) {
  const available = wrongGuessPool.filter(
    (item) => item !== answer && !used.includes(item)
  );
  return pick(available.length ? available : wrongGuessPool);
}
