import type { Room } from "../types";

export const rooms: Room[] = [
  {
    id: "half",
    name: "小剪刀局",
    foldName: "二折",
    difficulty: "热身一下",
    description: "左右镜像，像照镜子一样好懂。",
    color: "#d83a31",
    questions: ["鱼", "猫", "狗", "兔子", "树", "房子", "月亮", "太阳", "花", "伞", "船", "杯子", "剪刀"],
  },
  {
    id: "quarter",
    name: "花花四折局",
    foldName: "四折",
    difficulty: "开始脑补",
    description: "上下左右一展开，画风马上变热闹。",
    color: "#ff7a59",
    questions: ["灯笼", "风筝", "粽子", "烟花", "桥", "扇子", "铜钱", "桃子", "蝴蝶", "火锅", "窗户", "帽子"],
  },
  {
    id: "sixth",
    name: "旋转翻车局",
    foldName: "六折",
    difficulty: "越剪越怪",
    description: "一刀转六份，猜题区会开始慌。",
    color: "#28bca3",
    questions: ["龙舟", "舞狮", "喜鹊", "凤凰", "婚礼", "年夜饭", "集市", "庙会", "团圆饭", "牌坊", "石狮子"],
  },
  {
    id: "eighth",
    name: "脑洞爆炸局",
    foldName: "八折",
    difficulty: "高手也会歪",
    description: "八方向展开，认真和离谱只有一线之隔。",
    color: "#7b6cff",
    questions: ["九龙壁", "清明上河图", "八仙过海", "嫦娥奔月", "哪吒", "财神", "门神", "状元游街"],
  },
];
