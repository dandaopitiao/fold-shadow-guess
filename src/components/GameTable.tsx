import { Check, Clock3, Medal, Sparkles } from "lucide-react";
import type { CutPath, Guess, Player, Room } from "../types";
import { sound } from "../audio/sound-manager";
import { CutPaperEditor } from "./CutPaperEditor";

type GameTableProps = {
  room: Room;
  answer: string;
  timeLeft: number;
  paths: CutPath[];
  guesses: Guess[];
  notice: string;
  players: Player[];
  roundIndex: number;
  onPathsChange: (paths: CutPath[]) => void;
  onFinish: () => void;
};

export function GameTable({
  room,
  answer,
  timeLeft,
  paths,
  guesses,
  notice,
  players,
  roundIndex,
  onPathsChange,
  onFinish,
}: GameTableProps) {
  return (
    <section className="game-layout">
      <div className="round-header">
        <span className="round-badge">第 {roundIndex} 刀</span>
        <div>
          <small>你的题目</small>
          <strong>{answer}</strong>
        </div>
        <div className={`timer${timeLeft <= 5 ? " critical" : timeLeft <= 10 ? " urgent" : ""}`}>
          <Clock3 size={18} />
          {timeLeft}s
        </div>
      </div>

      <CutPaperEditor room={room} paths={paths} onPathsChange={onPathsChange} />

      <aside className="game-side">
        <div className="notice">{notice}</div>
        <div className="guess-box">
          <div className="panel-title">
            <Sparkles size={18} />
            大家在猜
          </div>
          <div className="guess-list">
            {guesses.length === 0 && <p className="empty">大家盯着这张纸，脑袋正在转圈。</p>}
            {guesses.map((guess) => (
              <div className={`guess ${guess.correct ? "correct" : ""}`} key={guess.id}>
                <span>{guess.playerName}</span>
                <strong>{guess.correct ? "猜中了" : guess.text}</strong>
              </div>
            ))}
          </div>
        </div>
        <div className="score-panel compact">
          <div className="panel-title">
            <Medal size={18} />
            今日手气
          </div>
          {players.map((player) => (
            <div className="player-row" key={player.id}>
              <span className="avatar">{player.avatar}</span>
              <span>{player.name}</span>
              <strong>{player.score}</strong>
            </div>
          ))}
        </div>
        <button
          className="primary-button full"
          onClick={() => {
            sound.unfold();
            onFinish();
          }}
        >
          <Check size={20} />
          展开奖
        </button>
      </aside>
    </section>
  );
}
