import { type PointerEvent, type CSSProperties, useEffect, useRef, useState } from "react";
import { Copy, LogOut, Play, Scissors, Users, Wifi } from "lucide-react";
import type { Player, Room } from "../types";
import type { NetworkRole, NetworkStatus } from "../multiplayer/peer-room";
import { sanitizeRoomCode } from "../multiplayer/peer-room";
import { sound } from "../audio/sound-manager";
import { botPersonas } from "../data/constants";

type LobbyProps = {
  rooms: Room[];
  selectedRoom: Room;
  players: Player[];
  onSelect: (room: Room) => void;
  onStart: () => void;
  multiplayer: {
    role: NetworkRole;
    status: NetworkStatus;
    roomCode: string;
    shareUrl: string;
    error: string;
    localName: string;
    onCreate: (playerName: string, roomCode?: string) => void;
    onJoin: (roomCode: string, playerName: string) => void;
    onLeave: () => void;
  };
};

type Bubble = {
  id: string;
  label: string;
  sub?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  className: string;
  color: string;
};

const bubbleSeeds: Omit<Bubble, "x" | "y" | "vx" | "vy">[] = [
  { id: "title", label: "谁是大裁谜", sub: "软乎乎剪纸派对", r: 118, className: "title-bubble", color: "radial-gradient(circle at 30% 24%, #ffffff, #ffcfda 36%, #ff5b73 100%)" },
  { id: "fold", label: "折一折", r: 50, className: "tiny-bubble", color: "rgba(137, 200, 255, 0.54)" },
  { id: "cut", label: "剪一剪", r: 56, className: "tiny-bubble", color: "rgba(110, 226, 200, 0.52)" },
  { id: "guess", label: "猜一猜", r: 52, className: "tiny-bubble", color: "rgba(255, 214, 102, 0.62)" },
  { id: "open", label: "展开啦", r: 42, className: "tiny-bubble", color: "rgba(155, 140, 255, 0.42)" },
  { id: "gudu", label: "咕嘟", r: 44, className: "tiny-bubble", color: "rgba(255, 173, 143, 0.5)" },
];

function makeBubbles(width: number, height: number): Bubble[] {
  const compact = width < 540;
  const spots = compact ? [
    [0.26, 0.48],
    [0.76, 0.23],
    [0.79, 0.52],
    [0.57, 0.21],
    [0.54, 0.78],
    [0.82, 0.8],
  ] : [
    [0.2, 0.46],
    [0.43, 0.24],
    [0.78, 0.25],
    [0.5, 0.72],
    [0.26, 0.82],
    [0.82, 0.72],
  ];
  return bubbleSeeds.map((seed, index) => {
    const radius = seed.r * (compact ? (seed.id === "title" ? 0.76 : 0.68) : 1);
    return {
      ...seed,
      r: radius,
      x: Math.max(radius + 10, Math.min(width - radius - 10, width * spots[index][0])),
      y: Math.max(radius + 10, Math.min(height - radius - 10, height * spots[index][1])),
      vx: (index % 2 === 0 ? 0.42 : -0.38) * (index === 0 ? 0.45 : 1),
      vy: (index % 3 === 0 ? 0.3 : -0.34) * (index === 0 ? 0.45 : 1),
    };
  });
}

export function Lobby({
  rooms,
  selectedRoom,
  players,
  onSelect,
  onStart,
  multiplayer,
}: LobbyProps) {
  const [burstKey, setBurstKey] = useState(0);
  const [playerName, setPlayerName] = useState(multiplayer.localName || "你");
  const [joinCode, setJoinCode] = useState(
    () => new URLSearchParams(window.location.search).get("room") ?? ""
  );
  const [createCode, setCreateCode] = useState("");
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [burstPoint, setBurstPoint] = useState({ x: 0, y: 0 });
  const stageRef = useRef<HTMLDivElement | null>(null);
  const isOnlineRoom = multiplayer.role !== "demo";
  const isHostRoom = multiplayer.role === "host";
  const canHostStart = isHostRoom && multiplayer.status === "hosting";

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const reset = () => {
      const rect = stage.getBoundingClientRect();
      setBubbles(makeBubbles(rect.width, rect.height));
    };
    reset();
    window.addEventListener("resize", reset);
    return () => window.removeEventListener("resize", reset);
  }, []);

  useEffect(() => {
    let frame = 0;
    let lastTick = 0;
    const tick = (now: number) => {
      const stage = stageRef.current;
      if (!stage) {
        frame = window.requestAnimationFrame(tick);
        return;
      }
      if (now - lastTick < 33) {
        frame = window.requestAnimationFrame(tick);
        return;
      }
      lastTick = now;
      const rect = stage.getBoundingClientRect();
      setBubbles((current) => {
        const next = current.map((bubble) => {
          let x = bubble.x + bubble.vx;
          let y = bubble.y + bubble.vy;
          let vx = bubble.vx;
          let vy = bubble.vy;
          if (x < bubble.r + 8 || x > rect.width - bubble.r - 8) {
            vx *= -1;
            x = Math.max(bubble.r + 8, Math.min(rect.width - bubble.r - 8, x));
          }
          if (y < bubble.r + 8 || y > rect.height - bubble.r - 8) {
            vy *= -1;
            y = Math.max(bubble.r + 8, Math.min(rect.height - bubble.r - 8, y));
          }
          return { ...bubble, x, y, vx: vx * 0.999, vy: vy * 0.999 };
        });

        for (let i = 0; i < next.length; i += 1) {
          for (let j = i + 1; j < next.length; j += 1) {
            const a = next[i];
            const b = next[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distance = Math.hypot(dx, dy) || 1;
            const minDistance = a.r + b.r + 8;
            if (distance < minDistance) {
              const push = (minDistance - distance) / 2;
              const nx = dx / distance;
              const ny = dy / distance;
              a.x -= nx * push;
              a.y -= ny * push;
              b.x += nx * push;
              b.y += ny * push;
              const avx = a.vx;
              const avy = a.vy;
              a.vx = b.vx * 0.92;
              a.vy = b.vy * 0.92;
              b.vx = avx * 0.92;
              b.vy = avy * 0.92;
            }
          }
        }
        next.forEach((bubble) => {
          bubble.x = Math.max(bubble.r + 8, Math.min(rect.width - bubble.r - 8, bubble.x));
          bubble.y = Math.max(bubble.r + 8, Math.min(rect.height - bubble.r - 8, bubble.y));
        });
        return next;
      });
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const rippleBubbles = (event: PointerEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    sound.bubble();
    setBurstPoint({ x, y });
    setBurstKey((value) => value + 1);
    setBubbles((current) =>
      current.map((bubble) => {
        const dx = bubble.x - x;
        const dy = bubble.y - y;
        const distance = Math.max(36, Math.hypot(dx, dy));
        const force = Math.min(3.8, 210 / distance);
        return {
          ...bubble,
          vx: bubble.vx + (dx / distance) * force,
          vy: bubble.vy + (dy / distance) * force,
        };
      })
    );
  };

  return (
    <section className="lobby-grid">
      <div className="hero-panel">
        <div
          className="bubble-stage"
          aria-label="剪纸泡泡游乐场"
          ref={stageRef}
          onPointerDown={rippleBubbles}
        >
          {bubbles.map((bubble) => (
            <button
              className={`float-bubble ${bubble.className}`}
              key={bubble.id}
              style={{
                width: bubble.r * 2,
                height: bubble.r * 2,
                left: bubble.x,
                top: bubble.y,
                background: bubble.color,
              } as CSSProperties}
              type="button"
            >
              <span>{bubble.label}</span>
              {bubble.sub && <small>{bubble.sub}</small>}
            </button>
          ))}
          <div
            className="micro-bubbles"
            key={burstKey}
            aria-hidden="true"
            style={{ left: burstPoint.x, top: burstPoint.y } as CSSProperties}
          >
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
        <div className="hero-copy">
          <div className="eyebrow">
            <Scissors size={18} />
            折一小角，剪两三刀，展开一个大惊喜
          </div>
          <h1>展开开猜</h1>
          <p>
            选个房间，在折好的红纸上剪出你的题目。其他小伙伴可盯着展开的图案抢答，猜得越早得分越高～
          </p>
          {!isOnlineRoom ? (
            <div className="hero-start-row">
              <button
                className="primary-button hero-start-button"
                onClick={() => {
                  sound.click();
                  onStart();
                }}
              >
                <Play size={24} />
                <span>单机试玩</span>
                <small>{selectedRoom.name}</small>
              </button>
              <span className="room-pill">{selectedRoom.foldName} · {selectedRoom.feature}</span>
            </div>
          ) : (
            <div className="online-wait-banner">
              <span>{isHostRoom ? "你已经在房间里啦" : "已进入朋友的房间"}</span>
              <strong>{isHostRoom ? "等人到齐后，由房主开始本局" : "等房主点开始，本局就开剪"}</strong>
            </div>
          )}
          <div className="multiplayer-card">
            <div className="panel-title">
              <Wifi size={18} />
              {isOnlineRoom ? "房间等待区" : "联机小房间"}
            </div>
            {!isOnlineRoom ? (
              <div className="multiplayer-controls">
                <input
                  value={playerName}
                  onChange={(event) => setPlayerName(event.target.value)}
                  placeholder="你的昵称"
                  autoComplete="nickname"
                />
                <div className="room-code-row">
                  <input
                    value={joinCode}
                    onChange={(event) => setJoinCode(sanitizeRoomCode(event.target.value))}
                    placeholder="输入房间码"
                    inputMode="text"
                    maxLength={6}
                  />
                  <button
                    className="ghost-button"
                    onClick={() => multiplayer.onJoin(joinCode, playerName)}
                  >
                    加入
                  </button>
                </div>
                <div className="room-code-row create-code-row">
                  <input
                    value={createCode}
                    onChange={(event) => setCreateCode(sanitizeRoomCode(event.target.value))}
                    placeholder="自定房间码，可留空"
                    inputMode="text"
                    maxLength={6}
                  />
                  <span className="code-hint">留空自动生成</span>
                </div>
                <button
                  className="ghost-button multiplayer-create"
                  onClick={() => multiplayer.onCreate(playerName, createCode)}
                >
                  创建联机房
                </button>
              </div>
            ) : (
              <div className="room-lobby">
                <div className="room-share">
                  <span>
                    {multiplayer.status === "connecting"
                      ? "正在连接..."
                      : isHostRoom
                        ? `房间码 ${multiplayer.roomCode}`
                        : `已加入 ${multiplayer.roomCode}`}
                  </span>
                  {multiplayer.shareUrl && (
                    <button
                      className="icon-button small"
                      title="复制邀请链接"
                      onClick={() => navigator.clipboard?.writeText(multiplayer.shareUrl)}
                    >
                      <Copy size={15} />
                    </button>
                  )}
                  <button
                    className="icon-button small"
                    title="退出联机"
                    onClick={multiplayer.onLeave}
                  >
                    <LogOut size={15} />
                  </button>
                </div>
                <div className="room-lobby-summary">
                  <span>{selectedRoom.name}</span>
                  <strong>{selectedRoom.foldName}</strong>
                  <small>{selectedRoom.feature} · {players.length} 人已入座</small>
                </div>
                <div className="member-chips" aria-label="房间成员">
                  {players.map((player) => (
                    <span className="member-chip" key={player.id}>
                      <b>{player.avatar}</b>
                      {player.name}
                      {player.id === "me" && isHostRoom ? <em>房主</em> : null}
                    </span>
                  ))}
                </div>
                {isHostRoom ? (
                  <button
                    className="primary-button room-start-button"
                    disabled={!canHostStart}
                    onClick={() => {
                      sound.click();
                      onStart();
                    }}
                  >
                    <Play size={20} />
                    {canHostStart ? "开始本局" : "房间连接中"}
                  </button>
                ) : (
                  <div className="guest-waiting-card">
                    房主准备好后会开始本局，你只要盯紧剪纸抢答就行。
                  </div>
                )}
              </div>
            )}
            {multiplayer.error && <p className="multiplayer-error">{multiplayer.error}</p>}
          </div>
        </div>
      </div>

      <div className="room-list" aria-label="选择房间">
        {rooms.map((room) => (
          <button
            className={`room-card ${selectedRoom.id === room.id ? "active" : ""}`}
            key={room.id}
            onClick={() => {
              sound.select();
              onSelect(room);
            }}
            style={{ "--room-color": room.color } as React.CSSProperties}
          >
            <span>{room.name}</span>
            <strong>{room.foldName}</strong>
            <small>{room.difficulty} · {room.feature}</small>
            <p>{room.description}</p>
          </button>
        ))}
      </div>

      <aside className="score-panel">
        <div className="panel-title">
          <Users size={18} />
          同桌小纸团
        </div>
        {players.map((player) => {
          const persona = botPersonas[player.name];
          return (
            <div className="player-row" key={player.id}>
              <span className="avatar">{player.avatar}</span>
              <div className="player-info">
                <span>{player.name}</span>
                {persona && (
                  <small className="persona" title={persona.intro}>
                    {persona.title}
                  </small>
                )}
              </div>
              <strong>{player.score}</strong>
            </div>
          );
        })}
      </aside>
    </section>
  );
}
