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
  return (
    <section className="lobby-grid">
      <div className="hero-panel">
        <div className="eyebrow">
          <Scissors size={18} />
          咔嚓咔嚓，快乐剪纸派对！
        </div>
        <div className="mascot-card" aria-hidden="true">
          <span className="mascot-face">^_^</span>
          <span className="mascot-cut">咔嚓</span>
        </div>
        <h1>咔嚓！来剪一局</h1>
        <p>
          折一折、剪一剪，展开看看剪出了啥？让小伙伴们猜猜看，猜得越快分越高～
        </p>
        <p className="lore-line">
          你是一只软乎乎的剪纸团子，有一把可爱的小剪刀。今天和小伙伴们比一比，看谁剪出来的东西最让人猜不着，或者最让人一秒猜中！
        </p>
        <div className="hero-tags" aria-label="玩法标签">
          <span>剪纸派对</span>
          <span>实时乱猜</span>
          <span>展开翻车</span>
        </div>
        <div className="hero-actions">
          <button
            className="primary-button"
            onClick={() => {
              sound.click();
              onStart();
            }}
          >
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
            onClick={() => {
              sound.select();
              onSelect(room);
            }}
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
