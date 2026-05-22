import type { Guess, Player } from "../types";
import { ROUND_SECONDS } from "../data/constants";

export const scoreByOrder = (order: number) => {
  if (order === 1) return 1000;
  if (order === 2) return 800;
  if (order === 3) return 650;
  if (order === 4) return 500;
  return 350;
};

export function calcDrawerScore(correctGuesses: Guess[]) {
  if (correctGuesses.length === 0) return 0;
  const first = correctGuesses[0];
  const speedBonus =
    first.timeLeft > ROUND_SECONDS * 0.6 ? 300
    : first.timeLeft > ROUND_SECONDS * 0.3 ? 150
    : 50;
  return correctGuesses.length * 200 + speedBonus;
}

export function applyRoundScores(players: Player[], correctGuesses: Guess[], drawerScore: number): Player[] {
  const next = players.map((player) => ({ ...player }));
  for (const guess of correctGuesses) {
    const target = next.find((p) => p.id === guess.playerId);
    if (target && guess.order) target.score += scoreByOrder(guess.order);
  }
  const me = next.find((p) => p.id === "me");
  if (me) me.score += drawerScore;
  return next;
}
