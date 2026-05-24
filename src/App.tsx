import { useEffect, useMemo, useRef, useState } from "react";
import {
  MousePointer2,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { CutPath, Guess, Phase, Player, Room } from "./types";
import { rooms } from "./data/rooms";
import {
  pick,
  makePlayers,
  uniqueWrong,
  ROUND_SECONDS,
  botNames,
  botGuessNotices,
} from "./data/constants";
import { calcDrawerScore, applyRoundScores } from "./game/scoring";
import { sound } from "./audio/sound-manager";
import { PaperTexture } from "./components/PaperTexture";
import { Lobby } from "./components/Lobby";
import { Tutorial } from "./components/Tutorial";
import { GameTable } from "./components/GameTable";
import { ResultScreen } from "./components/ResultScreen";

export function App() {
  const [phase, setPhase] = useState<Phase>("lobby");
  const [selectedRoom, setSelectedRoom] = useState<Room>(rooms[0]);
  const [players, setPlayers] = useState<Player[]>(makePlayers);
  const [answer, setAnswer] = useState(() => pick(rooms[0].questions));
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [paths, setPaths] = useState<CutPath[]>([]);
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [roundIndex, setRoundIndex] = useState(1);
  const [notice, setNotice] = useState(
    "沙沙沙… 拿起小剪刀开剪吧！记得让人看出你剪的是什么～"
  );
  const [muted, setMuted] = useState(false);
  const lastBotGuessSecond = useRef<number | null>(null);
  const prevTimeRef = useRef(ROUND_SECONDS);

  const correctGuesses = guesses.filter((g) => g.correct);
  const drawerScore = useMemo(
    () => calcDrawerScore(correctGuesses),
    [correctGuesses]
  );

  // 静音切换
  useEffect(() => {
    sound.setEnabled(!muted);
  }, [muted]);

  // 用户首次交互解锁 AudioContext
  const unlockAudio = () => sound.unlock();

  const startRound = (room = selectedRoom) => {
    setSelectedRoom(room);
    setAnswer(pick(room.questions));
    setPaths([]);
    setGuesses([]);
    setTimeLeft(ROUND_SECONDS);
    prevTimeRef.current = ROUND_SECONDS;
    lastBotGuessSecond.current = null;
    setNotice("簌簌—— 纸已折好，快快下刀！");
    sound.start();
    setPhase("draw");
  };

  const finishRound = () => {
    sound.result();
    setPlayers((current) =>
      applyRoundScores(current, correctGuesses, drawerScore)
    );
    setPhase("result");
  };

  const resetGame = () => {
    setPlayers(makePlayers());
    setRoundIndex(1);
    setPhase("lobby");
  };

  const nextRound = () => {
    setRoundIndex((v) => v + 1);
    startRound(selectedRoom);
  };

  // 倒计时：接近 10s 时逐秒加速（间隔递减），产生紧迫感
  useEffect(() => {
    if (phase !== "draw") return;
    if (timeLeft <= 0) {
      finishRound();
      return;
    }
    // 加速曲线：>=11s 固定 1s；≤10s 从 700ms 逐渐减到 300ms
    const delay =
      timeLeft <= 10 ? Math.max(280, timeLeft * 68) : 1000;
    const timer = window.setTimeout(
      () => setTimeLeft((v) => Math.max(0, v - 1)),
      delay
    );
    return () => window.clearTimeout(timer);
  }, [phase, timeLeft]);

  // 每次 timeLeft 变化时触发 tick 音效（仅在 draw 阶段）
  useEffect(() => {
    if (phase !== "draw" || muted) return;
    if (timeLeft < prevTimeRef.current) {
      sound.tick(timeLeft);
    }
    prevTimeRef.current = timeLeft;
  }, [phase, timeLeft, muted]);

  // Bot 猜题模拟
  useEffect(() => {
    if (phase !== "draw") return;
    if (timeLeft >= ROUND_SECONDS - 3 || timeLeft % 5 !== 0) return;
    if (lastBotGuessSecond.current === timeLeft) return;
    lastBotGuessSecond.current = timeLeft;

    setGuesses((current) => {
      if (current.length >= 10) return current;
      const usedTexts = current.map((g) => g.text);
      const hasCorrect = current.some((g) => g.correct);
      const shouldCorrect =
        !hasCorrect &&
        timeLeft < ROUND_SECONDS - 18 &&
        (paths.length >= 3 || timeLeft < 20);
      const playerIndex = current.length % botNames.length;
      const playerName = botNames[playerIndex];
      const correct = shouldCorrect && Math.random() > 0.35;
      const nextOrder = current.filter((g) => g.correct).length + 1;
      const text = correct ? answer : uniqueWrong(answer, usedTexts);

      if (correct) {
        sound.correct();
        setNotice(`${pick(botGuessNotices).replace("{name}", playerName)}`);
      } else {
        sound.wrong();
      }

      const guess: Guess = {
        id: `${Date.now()}-${current.length}`,
        playerId: `bot-${playerIndex}`,
        playerName,
        text,
        correct,
        timeLeft,
        order: correct ? nextOrder : undefined,
      };
      return [...current, guess];
    });
  }, [phase, timeLeft, answer, paths.length]);

  return (
    <main className="app" onClick={unlockAudio}>
      <PaperTexture />
      <header className="topbar">
        <button
          className="brand"
          onClick={() => setPhase("lobby")}
          aria-label="返回大厅"
        >
          <span className="brand-mark">咔</span>
          <span>
            <strong>折影猜意</strong>
            <small>软乎乎剪纸派对</small>
          </span>
        </button>
        <div className="topbar-actions">
          <button className="ghost-button" onClick={() => setPhase("tutorial")}>
            <MousePointer2 size={18} />
            怎么玩
          </button>
          <button
            className="ghost-button"
            onClick={() => setMuted(!muted)}
            title={muted ? "开声音" : "静音"}
          >
            {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button className="ghost-button" onClick={resetGame}>
            <RotateCcw size={18} />
            刷新一局
          </button>
        </div>
      </header>

      {phase === "lobby" && (
        <Lobby
          rooms={rooms}
          selectedRoom={selectedRoom}
          onSelect={setSelectedRoom}
          onStart={() => startRound(selectedRoom)}
          players={players}
        />
      )}

      {phase === "tutorial" && <Tutorial onBack={() => setPhase("lobby")} />}

      {phase === "draw" && (
        <GameTable
          room={selectedRoom}
          answer={answer}
          timeLeft={timeLeft}
          paths={paths}
          guesses={guesses}
          notice={notice}
          players={players}
          roundIndex={roundIndex}
          onPathsChange={setPaths}
          onFinish={finishRound}
        />
      )}

      {phase === "result" && (
        <ResultScreen
          room={selectedRoom}
          answer={answer}
          paths={paths}
          guesses={guesses}
          players={players}
          drawerScore={drawerScore}
          onNext={nextRound}
          onLobby={() => setPhase("lobby")}
        />
      )}
    </main>
  );
}
