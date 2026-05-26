import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { usePeerRoom, type PublicRoomSnapshot } from "./multiplayer/peer-room";

function normalizeAnswer(value: string) {
  return value
    .trim()
    .replace(/[，。！？、,.!?\s]/g, "")
    .replace(/^小(?=房子|亭子|船|猫|兔子)/, "");
}

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
  const answerRef = useRef(answer);
  const timeLeftRef = useRef(timeLeft);
  const playersRef = useRef(players);
  const recentAnswersRef = useRef<Record<Room["id"], string[]>>({
    half: [],
    quarter: [],
    sixth: [],
    eighth: [],
  });

  const correctGuesses = guesses.filter((g) => g.correct);
  const drawerScore = useMemo(
    () => calcDrawerScore(correctGuesses),
    [correctGuesses]
  );

  useEffect(() => {
    answerRef.current = answer;
    timeLeftRef.current = timeLeft;
    playersRef.current = players;
  }, [answer, timeLeft, players]);

  const handleGuestJoin = useCallback((player: Player) => {
    setPlayers((current) =>
      current.some((item) => item.id === player.id) ? current : [...current, player]
    );
    setNotice(`${player.name} 加入房间，准备抢答。`);
  }, []);

  const submitHostGuess = useCallback((playerId: string, text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;
    const player = playersRef.current.find((item) => item.id === playerId);
    const playerName = player?.name ?? "来猜的";
    const correct = normalizeAnswer(cleanText) === normalizeAnswer(answerRef.current);

    setGuesses((current) => {
      if (correct && current.some((guess) => guess.playerId === playerId && guess.correct)) {
        return current;
      }
      const nextOrder = current.filter((guess) => guess.correct).length + 1;
      const guess: Guess = {
        id: `${Date.now()}-${playerId}`,
        playerId,
        playerName,
        text: cleanText,
        correct,
        timeLeft: timeLeftRef.current,
        order: correct ? nextOrder : undefined,
      };
      if (correct) {
        sound.correct();
        setNotice(`${playerName} 猜中了，答案先藏一下。`);
      } else {
        sound.wrong();
      }
      return [...current, guess];
    });
  }, []);

  const applySnapshot = useCallback((snapshot: PublicRoomSnapshot) => {
    const room = rooms.find((item) => item.id === snapshot.roomId) ?? rooms[0];
    setSelectedRoom(room);
    setPhase(snapshot.phase);
    setAnswer(snapshot.answer ?? "");
    setTimeLeft(snapshot.timeLeft);
    setPaths(snapshot.paths);
    setGuesses(snapshot.guesses);
    setPlayers(snapshot.players);
    setRoundIndex(snapshot.roundIndex);
    setNotice(snapshot.notice);
  }, []);

  const handleHostDisconnect = useCallback(() => {
    setPhase("lobby");
    setPaths([]);
    setGuesses([]);
    setPlayers(makePlayers());
    setTimeLeft(ROUND_SECONDS);
    setNotice("房间断开了，可以重新加入或自己开一局。");
  }, []);

  const getSnapshot = useCallback<() => PublicRoomSnapshot>(() => ({
    phase,
    roomId: selectedRoom.id,
    answer: phase === "result" ? answer : undefined,
    timeLeft,
    paths,
    guesses,
    players,
    roundIndex,
    notice,
  }), [answer, guesses, notice, paths, phase, players, roundIndex, selectedRoom.id, timeLeft]);

  const peerRoom = usePeerRoom({
    onGuestJoin: handleGuestJoin,
    onGuestGuess: submitHostGuess,
    onSnapshot: applySnapshot,
    onHostDisconnect: handleHostDisconnect,
    getSnapshot,
  });

  useEffect(() => {
    if (peerRoom.role !== "host" || peerRoom.status !== "hosting") return;
    peerRoom.broadcastSnapshot(getSnapshot());
  }, [getSnapshot, peerRoom.role, peerRoom.status, peerRoom.broadcastSnapshot]);

  // 静音切换
  useEffect(() => {
    sound.setEnabled(!muted);
  }, [muted]);

  // 用户首次交互解锁 AudioContext
  const unlockAudio = () => sound.unlock();

  const pickQuestion = (room: Room) => {
    const recent = recentAnswersRef.current[room.id] ?? [];
    const candidatePool = room.questions.filter((item) => !recent.includes(item));
    const next = pick(candidatePool.length ? candidatePool : room.questions);
    recentAnswersRef.current[room.id] = [next, ...recent].slice(0, Math.min(10, room.questions.length - 1));
    return next;
  };

  const startRound = (room = selectedRoom) => {
    if (peerRoom.role === "guest") return;
    setSelectedRoom(room);
    setAnswer(pickQuestion(room));
    setPaths([]);
    setGuesses([]);
    setTimeLeft(ROUND_SECONDS);
    prevTimeRef.current = ROUND_SECONDS;
    lastBotGuessSecond.current = null;
    setNotice("纸已经折好啦，剪完就点“完成了”展开给大家猜！");
    sound.start();
    setPhase("draw");
  };

  const finishRound = () => {
    if (peerRoom.role === "guest") return;
    sound.result();
    setPlayers((current) =>
      applyRoundScores(current, correctGuesses, drawerScore)
    );
    setPhase("result");
  };

  const resetGame = () => {
    if (peerRoom.role !== "demo") peerRoom.closeRoom();
    setPlayers(makePlayers());
    setRoundIndex(1);
    setPhase("lobby");
    setNotice("回到大厅啦，选个难度继续开剪。");
  };

  const nextRound = () => {
    setRoundIndex((v) => v + 1);
    startRound(selectedRoom);
  };

  // 倒计时：接近 10s 时逐秒加速（间隔递减），产生紧迫感
  useEffect(() => {
    if (peerRoom.role === "guest") return;
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
  }, [phase, timeLeft, peerRoom.role]);

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
    if (peerRoom.role !== "demo") return;
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
  }, [phase, timeLeft, answer, paths.length, peerRoom.role]);

  const createOnlineRoom = (playerName: string, roomCode?: string) => {
    const hostPlayer: Player = {
      id: "me",
      name: playerName.trim() || "房主",
      score: 0,
      avatar: "^_^",
    };
    setPlayers([hostPlayer]);
    setPhase("lobby");
    setNotice("联机房开好后，把房间码发给朋友，点开始游戏就能开剪。");
    peerRoom.createRoom(hostPlayer.name, roomCode);
  };

  const joinOnlineRoom = (roomCode: string, playerName: string) => {
    setPhase("lobby");
    setNotice("正在加入朋友的剪纸房间。");
    peerRoom.joinRoom(roomCode, playerName);
  };

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
            <strong>谁是大裁谜</strong>
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
          multiplayer={{
            role: peerRoom.role,
            status: peerRoom.status,
            roomCode: peerRoom.roomCode,
            shareUrl: peerRoom.shareUrl,
            error: peerRoom.error,
            localName: peerRoom.localPlayer.name,
            onCreate: createOnlineRoom,
            onJoin: joinOnlineRoom,
            onLeave: peerRoom.closeRoom,
          }}
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
          isDrawer={peerRoom.role !== "guest"}
          networkRole={peerRoom.role}
          onGuessSubmit={peerRoom.sendGuess}
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
          onLobby={resetGame}
          canStartNext={peerRoom.role !== "guest"}
        />
      )}
    </main>
  );
}
