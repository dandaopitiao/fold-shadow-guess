import { useCallback, useEffect, useRef, useState } from "react";
import Peer, { type DataConnection } from "peerjs";
import type { CutPath, Guess, Phase, Player, Room } from "../types";

export type NetworkRole = "demo" | "host" | "guest";
export type NetworkStatus = "offline" | "connecting" | "hosting" | "joined" | "error";

export type PublicRoomSnapshot = {
  phase: Phase;
  roomId: Room["id"];
  answer?: string;
  timeLeft: number;
  paths: CutPath[];
  guesses: Guess[];
  players: Player[];
  roundIndex: number;
  notice: string;
};

type JoinMessage = { type: "join"; player: Player };
type GuessMessage = { type: "guess"; playerId: string; text: string };
type SnapshotMessage = { type: "snapshot"; snapshot: PublicRoomSnapshot };
type HostClosedMessage = { type: "host_closed" };
type RoomMessage = JoinMessage | GuessMessage | SnapshotMessage | HostClosedMessage;

type PeerRoomOptions = {
  onGuestJoin: (player: Player) => void;
  onGuestGuess: (playerId: string, text: string) => void;
  onSnapshot: (snapshot: PublicRoomSnapshot) => void;
  onHostDisconnect: () => void;
  getSnapshot: () => PublicRoomSnapshot;
};

const peerOptions = {
  host: "0.peerjs.com",
  port: 443,
  path: "/",
  secure: true,
};

const ROOM_PREFIX = "big-cut-riddle";

export function sanitizeRoomCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

function makeRoomCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase();
}

function roomPeerId(roomCode: string) {
  return `${ROOM_PREFIX}-${roomCode.toLowerCase()}`;
}

function guestPeerId() {
  return `${ROOM_PREFIX}-guest-${Math.random().toString(36).slice(2, 10)}`;
}

function shareUrlFor(roomCode: string) {
  const url = new URL(window.location.href);
  url.searchParams.set("room", roomCode);
  return url.toString();
}

function friendlyPeerError(message = "") {
  if (message.includes("Could not connect to peer")) {
    return "没有找到这个房间。请确认房主已经点了“创建联机房”，房间页还开着，房间码也没有输错。";
  }
  if (message.includes("is taken") || message.includes("unavailable-id")) {
    return "这个房间码正在被使用，换一个房间码再开房吧。";
  }
  if (message.includes("Lost connection") || message.includes("network")) {
    return "联机服务器连接不稳定，刷新页面后再试一次。";
  }
  return message || "联机失败了，检查一下房间码或网络后再试。";
}

export function usePeerRoom({
  onGuestJoin,
  onGuestGuess,
  onSnapshot,
  onHostDisconnect,
  getSnapshot,
}: PeerRoomOptions) {
  const [role, setRole] = useState<NetworkRole>("demo");
  const [status, setStatus] = useState<NetworkStatus>("offline");
  const [roomCode, setRoomCode] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [error, setError] = useState("");
  const [localPlayer, setLocalPlayer] = useState<Player>({
    id: "me",
    name: "你",
    score: 0,
    avatar: "^_^",
  });

  const peerRef = useRef<Peer | null>(null);
  const hostConnRef = useRef<DataConnection | null>(null);
  const guestConnsRef = useRef<DataConnection[]>([]);
  const handlersRef = useRef({
    onGuestJoin,
    onGuestGuess,
    onSnapshot,
    onHostDisconnect,
    getSnapshot,
  });

  useEffect(() => {
    handlersRef.current = {
      onGuestJoin,
      onGuestGuess,
      onSnapshot,
      onHostDisconnect,
      getSnapshot,
    };
  }, [onGuestJoin, onGuestGuess, onSnapshot, onHostDisconnect, getSnapshot]);

  const closeRoom = useCallback(() => {
    const hostConn = hostConnRef.current;
    const guestConns = guestConnsRef.current;
    const peer = peerRef.current;

    hostConn?.close();
    guestConns.forEach((conn) => {
      if (conn.open) conn.send({ type: "host_closed" } satisfies HostClosedMessage);
    });
    hostConnRef.current = null;
    guestConnsRef.current = [];
    peerRef.current = null;
    window.setTimeout(() => {
      guestConns.forEach((conn) => conn.close());
      peer?.destroy();
    }, 120);
    setRole("demo");
    setStatus("offline");
    setRoomCode("");
    setShareUrl("");
    setError("");
    window.history.replaceState(null, "", window.location.pathname);
  }, []);

  useEffect(() => closeRoom, [closeRoom]);

  const broadcastSnapshot = useCallback((snapshot: PublicRoomSnapshot) => {
    guestConnsRef.current.forEach((conn) => {
      if (conn.open) conn.send({ type: "snapshot", snapshot } satisfies SnapshotMessage);
    });
  }, []);

  const attachHostConnection = useCallback((conn: DataConnection) => {
    guestConnsRef.current = [...guestConnsRef.current, conn];
    conn.on("data", (raw) => {
      const message = raw as RoomMessage;
      if (message.type === "join") {
        handlersRef.current.onGuestJoin(message.player);
        const snapshot = handlersRef.current.getSnapshot();
        conn.send({
          type: "snapshot",
          snapshot: {
            ...snapshot,
            players: snapshot.players.some((player) => player.id === message.player.id)
              ? snapshot.players
              : [...snapshot.players, message.player],
            notice: `${message.player.name} 加入房间，准备抢答。`,
          },
        } satisfies SnapshotMessage);
      }
      if (message.type === "guess") {
        handlersRef.current.onGuestGuess(message.playerId, message.text);
      }
    });
    conn.on("close", () => {
      guestConnsRef.current = guestConnsRef.current.filter((item) => item !== conn);
    });
  }, []);

  const createRoom = useCallback((playerName: string, requestedCode = "") => {
    closeRoom();
    const nextCode = sanitizeRoomCode(requestedCode) || makeRoomCode();
    const player = { id: "me", name: playerName.trim() || "房主", score: 0, avatar: "^_^" };
    setLocalPlayer(player);
    setRole("host");
    setStatus("connecting");
    setRoomCode(nextCode);
    setShareUrl(shareUrlFor(nextCode));

    const peer = new Peer(roomPeerId(nextCode), peerOptions);
    peerRef.current = peer;
    peer.on("open", () => {
      setStatus("hosting");
      const url = new URL(window.location.href);
      url.searchParams.set("room", nextCode);
      window.history.replaceState(null, "", url.toString());
    });
    peer.on("connection", attachHostConnection);
    peer.on("error", (peerError) => {
      setStatus("error");
      setError(friendlyPeerError(peerError.message));
    });
  }, [attachHostConnection, closeRoom]);

  const joinRoom = useCallback((code: string, playerName: string) => {
    const cleanCode = sanitizeRoomCode(code);
    if (!cleanCode) return;
    closeRoom();
    const player = {
      id: guestPeerId(),
      name: playerName.trim() || "来猜的",
      score: 0,
      avatar: "o_o",
    };
    setLocalPlayer(player);
    setRole("guest");
    setStatus("connecting");
    setRoomCode(cleanCode);
    setShareUrl(shareUrlFor(cleanCode));

    const peer = new Peer(player.id, peerOptions);
    peerRef.current = peer;
    peer.on("open", () => {
      const conn = peer.connect(roomPeerId(cleanCode), { reliable: true });
      hostConnRef.current = conn;
      const connectTimer = window.setTimeout(() => {
        if (hostConnRef.current === conn && !conn.open) {
          setStatus("error");
          setError("连接超时了。请确认房主的房间页还开着，或者让房主重新创建一个房间码。");
          conn.close();
        }
      }, 9000);
      conn.on("open", () => {
        window.clearTimeout(connectTimer);
        setStatus("joined");
        setError("");
        conn.send({ type: "join", player } satisfies JoinMessage);
        const url = new URL(window.location.href);
        url.searchParams.set("room", cleanCode);
        window.history.replaceState(null, "", url.toString());
      });
      conn.on("data", (raw) => {
        const message = raw as RoomMessage;
        if (message.type === "snapshot") handlersRef.current.onSnapshot(message.snapshot);
        if (message.type === "host_closed") {
          setStatus("offline");
          setError("房主结束了房间。");
          handlersRef.current.onHostDisconnect();
        }
      });
      conn.on("error", (connError) => {
        window.clearTimeout(connectTimer);
        setStatus("error");
        setError(friendlyPeerError(connError.message));
      });
      conn.on("close", () => {
        window.clearTimeout(connectTimer);
        setStatus("offline");
        setError("房间连接断开了。");
        handlersRef.current.onHostDisconnect();
      });
    });
    peer.on("error", (peerError) => {
      setStatus("error");
      setError(friendlyPeerError(peerError.message));
    });
  }, [closeRoom]);

  const sendGuess = useCallback((text: string) => {
    const conn = hostConnRef.current;
    if (!conn?.open) return;
    conn.send({ type: "guess", playerId: localPlayer.id, text } satisfies GuessMessage);
  }, [localPlayer.id]);

  return {
    role,
    status,
    roomCode,
    shareUrl,
    error,
    localPlayer,
    createRoom,
    joinRoom,
    closeRoom,
    broadcastSnapshot,
    sendGuess,
  };
}
