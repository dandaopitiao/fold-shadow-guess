import { Check, Clock3, Medal, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import type { CutPath, Guess, Player, Room } from "../types";
import type { NetworkRole } from "../multiplayer/peer-room";
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
  isDrawer: boolean;
  networkRole: NetworkRole;
  onGuessSubmit: (text: string) => void;
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
  isDrawer,
  networkRole,
  onGuessSubmit,
}: GameTableProps) {
  const [guessText, setGuessText] = useState("");
  const isGuest = networkRole === "guest";

  const submitGuess = () => {
    const text = guessText.trim();
    if (!text) return;
    onGuessSubmit(text);
    setGuessText("");
  };

  return (
    <section className="game-layout">
      <div className="round-header">
        <span className="round-badge">第 {roundIndex} 剪</span>
        <div>
          <small>{isDrawer ? "你要剪的是" : "你正在猜"}</small>
          <strong>{isDrawer ? answer : "看图抢答"}</strong>
        </div>
        <div className={`timer${timeLeft <= 5 ? " critical" : timeLeft <= 10 ? " urgent" : ""}`}>
          <Clock3 size={18} />
          {timeLeft}s
        </div>
      </div>

      <CutPaperEditor
        room={room}
        paths={paths}
        onPathsChange={onPathsChange}
        onFinish={onFinish}
        readOnly={!isDrawer}
      />

      <aside className="game-side">
        <div className="notice">{notice}</div>
        <div className="guess-box">
          <div className="panel-title">
            <Sparkles size={18} />
            他们猜的是…
          </div>
          <div className="guess-list">
            {guesses.length === 0 && <p className="empty">小伙伴们歪着脑袋，盯着纸面努力脑补中…</p>}
            {guesses.map((guess) => (
              <div className={`guess ${guess.correct ? "correct" : ""}`} key={guess.id}>
                <span>{guess.playerName}</span>
                <strong>{guess.correct ? "✨ 猜中啦" : guess.text}</strong>
              </div>
            ))}
          </div>
          {isGuest && (
            <form
              className="guess-form"
              onSubmit={(event) => {
                event.preventDefault();
                submitGuess();
              }}
            >
              <input
                value={guessText}
                onChange={(event) => setGuessText(event.target.value)}
                placeholder="输入你猜的东西"
              />
              <button className="icon-button small active" type="submit" title="发送答案">
                <Send size={16} />
              </button>
            </form>
          )}
        </div>
        <div className="score-panel compact">
          <div className="panel-title">
            <Medal size={18} />
            小手气榜
          </div>
          {players.map((player) => (
            <div className="player-row" key={player.id}>
              <span className="avatar">{player.avatar}</span>
              <span>{player.name}</span>
              <strong>{player.score}</strong>
            </div>
          ))}
        </div>
        {isDrawer && (
          <button
            className="primary-button full"
            onClick={() => {
              sound.unfold();
              onFinish();
            }}
            >
              <Check size={20} />
            完成了
          </button>
        )}
      </aside>
    </section>
  );
}
