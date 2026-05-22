import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Brush,
  Check,
  Clock3,
  Eraser,
  Medal,
  MousePointer2,
  Play,
  RotateCcw,
  Scissors,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";

type FoldMode = "half" | "quarter" | "sixth" | "eighth";
type Phase = "lobby" | "tutorial" | "draw" | "result";

type Point = { x: number; y: number };
type CutPath = { id: string; points: Point[]; width: number; closed: boolean; edgeDrop: boolean };
type Player = { id: string; name: string; score: number; avatar: string };
type Guess = {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  correct: boolean;
  timeLeft: number;
  order?: number;
};

type Room = {
  id: FoldMode;
  name: string;
  foldName: string;
  difficulty: string;
  description: string;
  color: string;
  questions: string[];
};

const ROUND_SECONDS = 75;

const rooms: Room[] = [
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

const botNames = ["阿年", "小满", "纸片人", "花刀", "窗边高手"];
const playerFaces = ["^_^", "o_o", "n_n", ">_<", "*_*", "-_-"];
const wrongGuessPool = [
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

const makePlayers = (): Player[] => [
  { id: "me", name: "你", score: 0, avatar: playerFaces[0] },
  ...botNames.map((name, index) => ({
    id: `bot-${index}`,
    name,
    score: 0,
    avatar: playerFaces[index + 1] ?? "^_^",
  })),
];

const scoreByOrder = (order: number) => {
  if (order === 1) return 1000;
  if (order === 2) return 800;
  if (order === 3) return 650;
  if (order === 4) return 500;
  return 350;
};

const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

function uniqueWrong(answer: string, used: string[]) {
  const available = wrongGuessPool.filter((item) => item !== answer && !used.includes(item));
  return pick(available.length ? available : wrongGuessPool);
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
  const [notice, setNotice] = useState("开剪！剪出题目本体，别让大家猜成拖鞋。");
  const lastBotGuessSecond = useRef<number | null>(null);

  const correctGuesses = guesses.filter((guess) => guess.correct);
  const drawerScore = useMemo(() => {
    if (correctGuesses.length === 0) return 0;
    const first = correctGuesses[0];
    const speedBonus = first.timeLeft > ROUND_SECONDS * 0.6 ? 300 : first.timeLeft > ROUND_SECONDS * 0.3 ? 150 : 50;
    return correctGuesses.length * 200 + speedBonus;
  }, [correctGuesses]);

  const startRound = (room = selectedRoom) => {
    setSelectedRoom(room);
    setAnswer(pick(room.questions));
    setPaths([]);
    setGuesses([]);
    setTimeLeft(ROUND_SECONDS);
    lastBotGuessSecond.current = null;
    setNotice("开剪！其他人会实时乱猜。");
    setPhase("draw");
  };

  const finishRound = () => {
    setPlayers((current) => {
      const next = current.map((player) => ({ ...player }));
      for (const guess of correctGuesses) {
        const target = next.find((player) => player.id === guess.playerId);
        if (target && guess.order) target.score += scoreByOrder(guess.order);
      }
      const me = next.find((player) => player.id === "me");
      if (me) me.score += drawerScore;
      return next;
    });
    setPhase("result");
  };

  const resetGame = () => {
    setPlayers(makePlayers());
    setRoundIndex(1);
    setPhase("lobby");
  };

  const nextRound = () => {
    setRoundIndex((value) => value + 1);
    startRound(selectedRoom);
  };

  useEffect(() => {
    if (phase !== "draw") return;
    if (timeLeft <= 0) {
      finishRound();
      return;
    }
    const timer = window.setInterval(() => setTimeLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [phase, timeLeft]);

  useEffect(() => {
    if (phase !== "draw") return;
    if (timeLeft >= ROUND_SECONDS - 3 || timeLeft % 5 !== 0) return;
    if (lastBotGuessSecond.current === timeLeft) return;
    lastBotGuessSecond.current = timeLeft;

    setGuesses((current) => {
      if (current.length >= 10) return current;
      const usedTexts = current.map((guess) => guess.text);
      const hasCorrect = current.some((guess) => guess.correct);
      const shouldCorrect = !hasCorrect && timeLeft < ROUND_SECONDS - 18 && (paths.length >= 3 || timeLeft < 20);
      const playerIndex = current.length % botNames.length;
      const playerName = botNames[playerIndex];
      const correct = shouldCorrect && Math.random() > 0.35;
      const nextOrder = current.filter((guess) => guess.correct).length + 1;
      const guess: Guess = {
        id: `${Date.now()}-${current.length}`,
        playerId: `bot-${playerIndex}`,
        playerName,
        text: correct ? answer : uniqueWrong(answer, usedTexts),
        correct,
        timeLeft,
        order: correct ? nextOrder : undefined,
      };
      if (correct) setNotice(`${playerName} 猜中了，但答案先不公布。`);
      return [...current, guess];
    });
  }, [phase, timeLeft, answer, paths.length]);

  return (
    <main className="app">
      <PaperTexture />
      <header className="topbar">
        <button className="brand" onClick={() => setPhase("lobby")} aria-label="返回大厅">
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

function Lobby({
  rooms,
  selectedRoom,
  players,
  onSelect,
  onStart,
}: {
  rooms: Room[];
  selectedRoom: Room;
  players: Player[];
  onSelect: (room: Room) => void;
  onStart: () => void;
}) {
  return (
    <section className="lobby-grid">
      <div className="hero-panel">
        <div className="eyebrow">
          <Scissors size={18} />
          折叠、剪裁、展开，然后全场乱猜
        </div>
        <div className="mascot-card" aria-hidden="true">
          <span className="mascot-face">^_^</span>
          <span className="mascot-cut">咔嚓</span>
        </div>
        <h1>咔嚓！来剪一局</h1>
        <p>
          你只在折起来的一小块红纸上动刀，系统把它展开成完整图案。大家猜的是“剪了个什么”，猜得越快分越高。
        </p>
        <div className="hero-tags" aria-label="玩法标签">
          <span>剪纸派对</span>
          <span>实时乱猜</span>
          <span>展开翻车</span>
        </div>
        <div className="hero-actions">
          <button className="primary-button" onClick={onStart}>
            <Play size={20} />
            开始{selectedRoom.name}
          </button>
          <span className="room-pill">{selectedRoom.foldName}</span>
        </div>
      </div>

      <div className="room-list" aria-label="选择房间">
        {rooms.map((room) => (
          <button
            className={`room-card ${selectedRoom.id === room.id ? "active" : ""}`}
            key={room.id}
            onClick={() => onSelect(room)}
            style={{ "--room-color": room.color } as React.CSSProperties}
          >
            <span>{room.name}</span>
            <strong>{room.foldName}</strong>
            <small>{room.difficulty}</small>
            <p>{room.description}</p>
          </button>
        ))}
      </div>

      <aside className="score-panel">
        <div className="panel-title">
          <Users size={18} />
          今天这桌
        </div>
        {players.map((player) => (
          <div className="player-row" key={player.id}>
            <span className="avatar">{player.avatar}</span>
            <span>{player.name}</span>
            <strong>{player.score}</strong>
          </div>
        ))}
      </aside>
    </section>
  );
}

function Tutorial({ onBack }: { onBack: () => void }) {
  return (
    <section className="tutorial">
      <button className="ghost-button back-button" onClick={onBack}>
        <ArrowLeft size={18} />
        回到大厅
      </button>
      <div className="tutorial-copy">
        <span className="eyebrow">
          <Brush size={18} />
          30 秒会玩
        </span>
        <h1>剪一小块，展开成大场面。</h1>
      </div>
      <div className="tutorial-steps">
        <div>
          <span>1</span>
          <h3>先选折法</h3>
          <p>二折像镜子，四折像窗花，六折和八折会把每一刀变成更离谱的重复结构。</p>
        </div>
        <div>
          <span>2</span>
          <h3>只剪局部</h3>
          <p>在折叠纸面上划线，线条会变成镂空剪口。剪得越简洁，别人越可能猜出来。</p>
        </div>
        <div>
          <span>3</span>
          <h3>展开开盲盒</h3>
          <p>提交后系统展开红纸。它可能像题目，也可能像一场事故。两种都好玩。</p>
        </div>
      </div>
      <button className="primary-button" onClick={onBack}>
        <Check size={20} />
        开剪开剪
      </button>
    </section>
  );
}

function GameTable({
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
}: {
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
}) {
  return (
    <section className="game-layout">
      <div className="round-header">
        <span className="round-badge">第 {roundIndex} 刀</span>
        <div>
          <small>你的题目</small>
          <strong>{answer}</strong>
        </div>
        <div className="timer">
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
        <button className="primary-button full" onClick={onFinish}>
          <Check size={20} />
          展开奖
        </button>
      </aside>
    </section>
  );
}

function CutPaperEditor({
  room,
  paths,
  onPathsChange,
}: {
  room: Room;
  paths: CutPath[];
  onPathsChange: (paths: CutPath[]) => void;
}) {
  const [draft, setDraft] = useState<Point[]>([]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drawing = useRef(false);

  const getPoint = (event: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const point = {
      x: ((event.clientX - rect.left) / rect.width) * 320,
      y: ((event.clientY - rect.top) / rect.height) * 320,
    };
    return clampToFoldedArea(room.id, point);
  };

  const pointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    drawing.current = true;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraft([getPoint(event)]);
  };

  const pointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drawing.current) return;
    setDraft((current) => [...current, getPoint(event)]);
  };

  const pointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (draft.length > 1) {
      const closed = isClosedPath(draft);
      onPathsChange([
        ...paths,
        {
          id: crypto.randomUUID(),
          points: closed ? closePathPoints(draft) : draft,
          width: 10,
          closed,
          edgeDrop: !closed && isEdgeDropPath(room.id, draft),
        },
      ]);
    }
    setDraft([]);
  };

  const draftClosed = draft.length > 1 && isClosedPath(draft);
  const previewPaths =
    draft.length > 1
      ? [
          ...paths,
          {
            id: "draft",
            points: draftClosed ? closePathPoints(draft) : draft,
            width: 10,
            closed: draftClosed,
            edgeDrop: !draftClosed && isEdgeDropPath(room.id, draft),
          },
        ]
      : paths;
  const clipId = `fold-clip-${room.id}`;

  return (
    <div className="editor-shell">
      <div className="canvas-card">
        <div className="canvas-label">
          <Scissors size={18} />
          小纸片
        </div>
        <svg
          ref={svgRef}
          className="paper-svg draw-surface"
          viewBox="0 0 320 320"
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerLeave={pointerUp}
          role="img"
          aria-label="剪纸绘制区域"
        >
          <defs>
            <clipPath id={clipId}>
              <FoldedClipShape mode={room.id} />
            </clipPath>
          </defs>
          <FoldedPaperShape mode={room.id} />
          <g clipPath={`url(#${clipId})`}>
            <CutPaths paths={previewPaths} />
          </g>
        </svg>
        <div className="tool-row">
          <button className="icon-button" title="撤销" onClick={() => onPathsChange(paths.slice(0, -1))}>
            <RotateCcw size={18} />
          </button>
          <button className="icon-button" title="清空" onClick={() => onPathsChange([])}>
            <Eraser size={18} />
          </button>
          <span>{paths.length} 刀</span>
        </div>
      </div>

      <div className="canvas-card preview">
        <div className="canvas-label">
          <Sparkles size={18} />
          偷看展开 · {room.foldName}
        </div>
        <svg className="paper-svg" viewBox="0 0 320 320" role="img" aria-label="剪纸展开预览">
          <UnfoldedPaperShape mode={room.id} />
          <ExpandedCuts mode={room.id} paths={previewPaths} />
        </svg>
      </div>
    </div>
  );
}

const rectFoldBounds = {
  half: { x1: 64, y1: 52, x2: 160, y2: 268 },
  quarter: { x1: 64, y1: 64, x2: 160, y2: 160 },
};

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isClosedPath(points: Point[]) {
  return points.length > 8 && distance(points[0], points[points.length - 1]) < 22;
}

function closePathPoints(points: Point[]) {
  return [...points, points[0]];
}

function clampToFoldedArea(mode: FoldMode, point: Point): Point {
  if (mode === "half" || mode === "quarter") {
    const bounds = rectFoldBounds[mode];
    return {
      x: Math.min(bounds.x2, Math.max(bounds.x1, point.x)),
      y: Math.min(bounds.y2, Math.max(bounds.y1, point.y)),
    };
  }
  return point;
}

function touchedRectEdge(mode: FoldMode, point: Point) {
  if (mode !== "half" && mode !== "quarter") return null;
  const bounds = rectFoldBounds[mode];
  const threshold = 14;
  if (Math.abs(point.x - bounds.x1) < threshold) return "left";
  if (Math.abs(point.x - bounds.x2) < threshold) return "fold";
  if (Math.abs(point.y - bounds.y1) < threshold) return "top";
  if (Math.abs(point.y - bounds.y2) < threshold) return "bottom";
  return null;
}

function isEdgeDropPath(mode: FoldMode, points: Point[]) {
  if (points.length < 4) return false;
  const firstEdge = touchedRectEdge(mode, points[0]);
  const lastEdge = touchedRectEdge(mode, points[points.length - 1]);
  return firstEdge !== null && firstEdge === lastEdge && distance(points[0], points[points.length - 1]) > 28;
}

function FoldedClipShape({ mode }: { mode: FoldMode }) {
  if (mode === "half") return <rect x="64" y="52" width="96" height="216" rx="18" />;
  if (mode === "quarter") return <rect x="64" y="64" width="96" height="96" rx="18" />;
  if (mode === "sixth") return <path d="M160 160 L160 38 A122 122 0 0 1 266 99 Z" />;
  return <path d="M160 160 L160 38 A122 122 0 0 1 246 74 Z" />;
}

function FoldedPaperShape({ mode }: { mode: FoldMode }) {
  return (
    <>
      <g className="folded-paper">
        <FoldedClipShape mode={mode} />
      </g>
      <g className="fold-lines">
        {mode === "half" && <line x1="160" y1="52" x2="160" y2="268" />}
        {mode === "quarter" && (
          <>
            <line x1="160" y1="64" x2="160" y2="160" />
            <line x1="64" y1="160" x2="160" y2="160" />
          </>
        )}
        {(mode === "sixth" || mode === "eighth") && (
          <>
            <line x1="160" y1="160" x2="160" y2="38" />
            <line x1="160" y1="160" x2={mode === "sixth" ? 266 : 246} y2={mode === "sixth" ? 99 : 74} />
          </>
        )}
      </g>
    </>
  );
}

function UnfoldedPaperShape({ mode }: { mode: FoldMode }) {
  const radial = mode === "sixth" || mode === "eighth";
  if (radial) {
    return (
      <>
        <circle cx="160" cy="160" r="138" className="paper-fill" />
        <circle cx="160" cy="160" r="138" className="paper-edge" />
      </>
    );
  }
  return (
    <>
      <rect x="52" y="52" width="216" height="216" rx="22" className="paper-fill" />
      <rect x="52" y="52" width="216" height="216" rx="22" className="paper-edge" />
    </>
  );
}

function CutPaths({ paths }: { paths: CutPath[] }) {
  return (
    <g>
      {paths.map((path) => (
        <g key={path.id}>
          {(path.closed || path.edgeDrop) && (
            <polygon points={path.points.map((point) => `${point.x},${point.y}`).join(" ")} className="removed-piece" />
          )}
          <polyline
            points={path.points.map((point) => `${point.x},${point.y}`).join(" ")}
            className={path.closed || path.edgeDrop ? "cut-edge" : "cut-slit"}
            strokeWidth={path.width}
          />
        </g>
      ))}
    </g>
  );
}

function ExpandedCuts({ mode, paths }: { mode: FoldMode; paths: CutPath[] }) {
  const transforms =
    mode === "half"
      ? ["", "translate(320 0) scale(-1 1)"]
      : mode === "quarter"
        ? ["", "translate(320 0) scale(-1 1)", "translate(0 320) scale(1 -1)", "translate(320 320) scale(-1 -1)"]
        : Array.from({ length: mode === "sixth" ? 6 : 8 }, (_, index) => `rotate(${index * (mode === "sixth" ? 60 : 45)} 160 160)`);

  return (
    <g>
      {transforms.map((transform, index) => (
        <g key={index} transform={transform}>
          <CutPaths paths={paths} />
        </g>
      ))}
    </g>
  );
}

function ResultScreen({
  room,
  answer,
  paths,
  guesses,
  players,
  drawerScore,
  onNext,
  onLobby,
}: {
  room: Room;
  answer: string;
  paths: CutPath[];
  guesses: Guess[];
  players: Player[];
  drawerScore: number;
  onNext: () => void;
  onLobby: () => void;
}) {
  const correct = guesses.filter((guess) => guess.correct);
  const ranked = [...players].sort((a, b) => b.score - a.score);

  return (
    <section className="result-layout">
      <div className="result-art">
        <span className="eyebrow">
          <Trophy size={18} />
          展开奖啦
        </span>
        <h1>{answer}</h1>
        <svg className="result-paper" viewBox="0 0 320 320" role="img" aria-label="本轮剪纸结果">
          <UnfoldedPaperShape mode={room.id} />
          <ExpandedCuts mode={room.id} paths={paths} />
        </svg>
      </div>
      <div className="result-info">
        <div className="stat-card">
          <small>剪纸者加分</small>
          <strong>+{drawerScore}</strong>
          <span>{correct.length ? `${correct.length} 人猜中` : "无人猜中"}</span>
        </div>
        <div className="stat-card">
          <small>最快脑补</small>
          <strong>{correct[0]?.playerName ?? "无"}</strong>
          <span>{correct[0] ? `剩余 ${correct[0].timeLeft}s` : "这张纸把大家难住了"}</span>
        </div>
        <div className="ranking">
          <div className="panel-title">
            <Trophy size={18} />
            今日榜单
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
          <button className="ghost-button" onClick={onLobby}>
            回大厅
          </button>
          <button className="primary-button" onClick={onNext}>
            <Play size={20} />
            下一轮
          </button>
        </div>
      </div>
    </section>
  );
}

function PaperTexture() {
  return (
    <svg className="texture-defs" aria-hidden="true">
      <defs>
        <filter id="paperNoise">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="3" seed="11" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="table" tableValues="0 0.08" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  );
}
