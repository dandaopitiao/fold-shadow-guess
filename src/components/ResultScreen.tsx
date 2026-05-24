import { Play, Trophy } from "lucide-react";
import type { CutPath, Guess, Player, Room } from "../types";
import { sound } from "../audio/sound-manager";
import { UnfoldedPaperShape, ExpandedCuts } from "./PaperShapes";

type ResultScreenProps = {
  room: Room;
  answer: string;
  paths: CutPath[];
  guesses: Guess[];
  players: Player[];
  drawerScore: number;
  onNext: () => void;
  onLobby: () => void;
};

export function ResultScreen({
  room,
  answer,
  paths,
  guesses,
  players,
  drawerScore,
  onNext,
  onLobby,
}: ResultScreenProps) {
  const correct = guesses.filter((g) => g.correct);
  const ranked = [...players].sort((a, b) => b.score - a.score);

  return (
    <section className="result-layout">
      <div className="result-art">
        <span className="eyebrow">
          <Trophy size={18} />
          嗒嗒——开奖时刻
        </span>
        <h1>{answer}</h1>
        <svg
          className="result-paper"
          viewBox="0 0 320 320"
          role="img"
          aria-label="本轮剪纸成果"
        >
          <UnfoldedPaperShape mode={room.id} />
          <ExpandedCuts mode={room.id} paths={paths} />
        </svg>
      </div>
      <div className="result-info">
        <div className="stat-card">
          <small>剪子手加分</small>
          <strong>+{drawerScore}</strong>
          <span>
            {correct.length ? `${correct.length} 人猜中啦` : "大家都被难住啦"}
          </span>
        </div>
        <div className="stat-card">
          <small>第一个猜中的</small>
          <strong>{correct[0]?.playerName ?? "——"}</strong>
          <span>
            {correct[0]
              ? `还剩 ${correct[0].timeLeft} 秒就猜出来啦`
              : "这张纸把所有人都绕晕了…"}
          </span>
        </div>
        <div className="ranking">
          <div className="panel-title">
            <Trophy size={18} />
            积分排行榜
          </div>
          {ranked.map((player, index) => (
            <div className="player-row" key={player.id}>
              <span className="avatar">{index + 1}</span>
              <span>{player.name}</span>
              <strong>{player.score}</strong>
            </div>
          ))}
        </div>
        <div className="result-actions">
          <button
            className="ghost-button"
            onClick={() => {
              sound.click();
              onLobby();
            }}
          >
            回大厅
          </button>
          <button
            className="primary-button"
            onClick={() => {
              sound.click();
              onNext();
            }}
          >
            <Play size={20} />
            下一轮
          </button>
        </div>
      </div>
    </section>
  );
}
