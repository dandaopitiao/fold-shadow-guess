import { useState } from "react";
import { Play, Scissors, Users } from "lucide-react";
import type { Player, Room } from "../types";
import { sound } from "../audio/sound-manager";
import { botPersonas } from "../data/constants";

type LobbyProps = {
  rooms: Room[];
  selectedRoom: Room;
  players: Player[];
  onSelect: (room: Room) => void;
  onStart: () => void;
};

export function Lobby({ rooms, selectedRoom, players, onSelect, onStart }: LobbyProps) {
  const [burstKey, setBurstKey] = useState(0);

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
          <button
            className="float-bubble start-bubble"
            onClick={() => {
              popBubble();
              onStart();
            }}
          >
            <Play size={28} />
            <span>开剪</span>
            <small>{selectedRoom.name}</small>
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
          <span className="room-pill">{selectedRoom.foldName} · {selectedRoom.feature}</span>
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
