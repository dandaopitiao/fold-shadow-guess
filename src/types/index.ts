export type FoldMode = "half" | "quarter" | "sixth" | "eighth";
export type HalfFold = "vertical" | "horizontal";
export type Phase = "lobby" | "tutorial" | "draw" | "result";

export type Point = { x: number; y: number };

export type CutPath = {
  id: string;
  points: Point[];
  width: number;
  closed: boolean;
  edgeDrop: boolean;
};

export type Player = {
  id: string;
  name: string;
  score: number;
  avatar: string;
};

export type Guess = {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  correct: boolean;
  timeLeft: number;
  order?: number;
};

export type Room = {
  id: FoldMode;
  name: string;
  foldName: string;
  difficulty: string;
  description: string;
  color: string;
  feature: string;
  questions: string[];
};
