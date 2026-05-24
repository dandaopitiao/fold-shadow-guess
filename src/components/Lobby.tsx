import { useState } from "react";
import { Copy, LogOut, Play, Scissors, Users, Wifi } from "lucide-react";
import type { Player, Room } from "../types";
import type { NetworkRole, NetworkStatus } from "../multiplayer/peer-room";
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
    onCreate: (playerName: string) => void;
    onJoin: (roomCode: string, playerName: string) => void;
    onLeave: () => void;
  };
};

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

  const popBubble = () => {
    sound.bubble();
    setBurstKey((value) => value + 1);
  };

  return (
    <section className="lobby-grid">
      <div className="hero-panel">
        <div className="bubble-stage" aria-label="剪纸泡泡游乐场">
          <button className="float-bubble title-bubble" onClick={popBubble}>
            <span>折影猜意</span>
            <small>软乎乎剪纸派对</small>
          </button>
          <button className="float-bubble tiny-bubble bubble-a" onClick={popBubble}>
            折一折
          </button>
          <button className="float-bubble tiny-bubble bubble-b" onClick={popBubble}>
            剪一剪
          </button>
          <button className="float-bubble tiny-bubble bubble-c" onClick={popBubble}>
            猜一猜
          </button>
          <button className="float-bubble tiny-bubble bubble-d" onClick={popBubble}>
            展开啦
          </button>
          <button className="float-bubble tiny-bubble bubble-e" onClick={popBubble}>
            咕嘟
          </button>
          <div className="micro-bubbles" key={burstKey} aria-hidden="true">
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
          <h1>折影之中，藏着答案</h1>
          <p>
            选个房间，在折好的红纸上剪出你的题目。Bot 小伙伴会盯着展开的图案抢答，猜得越早得分越高～
          </p>
          <div className="hero-start-row">
            <button
              className="primary-button hero-start-button"
              onClick={() => {
                sound.click();
                onStart();
              }}
            >
              <Play size={24} />
              <span>开始游戏</span>
              <small>{selectedRoom.name}</small>
            </button>
            <span className="room-pill">{selectedRoom.foldName} · {selectedRoom.feature}</span>
          </div>
          <div className="multiplayer-card">
            <div className="panel-title">
              <Wifi size={18} />
              联机小房间
            </div>
            <div className="multiplayer-controls">
              <input
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                placeholder="你的昵称"
              />
              <div className="room-code-row">
                <input
                  value={joinCode}
                  onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
                  placeholder="输入房间码"
                />
                <button
                  className="ghost-button"
                  onClick={() => multiplayer.onJoin(joinCode, playerName)}
                >
                  加入
                </button>
              </div>
              <button
                className="ghost-button multiplayer-create"
                onClick={() => multiplayer.onCreate(playerName)}
              >
                创建联机房
              </button>
            </div>
            {multiplayer.role !== "demo" && (
              <div className="room-share">
                <span>
                  {multiplayer.status === "connecting"
                    ? "正在连接..."
                    : multiplayer.role === "host"
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
