import type { Player } from "../types";

export const ROUND_SECONDS = 75;

export const botNames = ["阿年", "小满", "纸片人", "花刀", "窗边高手"];

export const playerFaces = ["^_^", "o_o", "n_n", ">_<", "*_*", "-_-"];

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
];

/** 角色卡片：萌系可爱风，每个 Bot 都有软萌人设 */
export const botPersonas: Record<string, { title: string; intro: string }> = {
  阿年: {
    title: "软乎乎纸灵团子",
    intro: "走路会掉纸屑的那种小可爱，但猜题意外很准。",
  },
  小满: {
    title: "剪纸狂热小能手",
    intro: "口袋里永远有一把小剪刀，见啥都想剪两下。",
  },
  纸片人: {
    title: "抽象派小迷糊",
    intro: "剪出来的东西连自己都认不得，但自信满分！",
  },
  花刀: {
    title: "窗花小匠",
    intro: "祖传三代剪窗花，四折难度是她的快乐老家。",
  },
  窗边高手: {
    title: "围观团子",
    intro: "从来不动手剪，但猜题一猜一个准，全场最淡定。",
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
