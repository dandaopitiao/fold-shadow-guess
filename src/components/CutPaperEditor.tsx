import { useCallback, useRef, useState } from "react";
import {
  Check,
  Eraser,
  RotateCcw,
  Scissors,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Magnet,
  Maximize2,
} from "lucide-react";
import type { CutPath, FoldMode, Point, Room } from "../types";
import { sound } from "../audio/sound-manager";
import {
  clampToFoldedArea,
  closePathPoints,
  distance,
  isClosedPath,
  isEdgeDropPath,
  snapPathEdgeEndpoints,
  smoothPoints,
  simplifyPoints,
} from "../game/paper-cutting";
import {
  FoldedClipShape,
  FoldedPaperShape,
  UnfoldedPaperShape,
  CutPathGroup,
  ExpandedCuts,
} from "./PaperShapes";

type CutPaperEditorProps = {
  room: Room;
  paths: CutPath[];
  onPathsChange: (paths: CutPath[]) => void;
  onFinish: () => void;
};

/** 根据难度获取平滑等级（越低越抖，越高越平滑带吸附） */
function smoothLevelForRoom(room: Room): number {
  if (room.id === "half") return 1;
  if (room.id === "quarter") return 1;
  return 1;
}

export function CutPaperEditor({ room, paths, onPathsChange, onFinish }: CutPaperEditorProps) {
  const [draft, setDraft] = useState<Point[]>([]);
  const [zoomLevel, setZoomLevel] = useState(1); // 1x, 1.5x, 2x
  const [snapOn, setSnapOn] = useState(true);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drawing = useRef(false);
  const rawDraft = useRef<Point[]>([]); // 原始轨迹（未平滑）
  const frameRef = useRef<number | null>(null);

  // 根据 room 难度决定平滑参数
  const smoothLv = smoothLevelForRoom(room);
  const simplifyEps = 1.2;

  /** 屏幕坐标 → SVG 画布坐标（考虑 zoom level） */
  const getPoint = useCallback(
    (event: React.PointerEvent<SVGSVGElement>): Point => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      const raw = {
        x: ((event.clientX - rect.left) / rect.width) * 320,
        y: ((event.clientY - rect.top) / rect.height) * 320,
      };
      return clampToFoldedArea(room.id, raw);
    },
    [room.id]
  );

  const refreshDraftOnFrame = () => {
    frameRef.current = null;
    setDraft(smoothPoints(rawDraft.current, smoothLv));
  };

  const scheduleDraftRefresh = () => {
    if (frameRef.current !== null) return;
    frameRef.current = window.requestAnimationFrame(refreshDraftOnFrame);
  };

  const pointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    drawing.current = true;
    rawDraft.current = [];
    event.currentTarget.setPointerCapture(event.pointerId);
    const pt = getPoint(event);
    rawDraft.current.push(pt);
    setDraft([pt]);
  };

  const pointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drawing.current) return;

    const pt = getPoint(event);
    rawDraft.current.push(pt);

    scheduleDraftRefresh();
  };

  const pointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    if (rawDraft.current.length > 1) {
      // 完成一笔：平滑 + 简化（RDP）
      let finalPoints = smoothPoints(rawDraft.current, smoothLv);
      finalPoints = snapPathEdgeEndpoints(room.id, finalPoints);
      finalPoints = simplifyPoints(finalPoints, simplifyEps);
      finalPoints = snapPathEdgeEndpoints(room.id, finalPoints);

      // 吸附模式：加宽闭合检测阈值，帮助手抖用户自动闭合
      const closed =
        snapOn
          ? isClosedPath(finalPoints) ||
            (finalPoints.length > 6 &&
              distance(finalPoints[0], finalPoints[finalPoints.length - 1]) < 28)
          : isClosedPath(finalPoints);

      onPathsChange([
        ...paths,
        {
          id: crypto.randomUUID(),
          points: closed ? closePathPoints(finalPoints) : finalPoints,
          width: 10,
          closed,
          edgeDrop: !closed && isEdgeDropPath(room.id, finalPoints),
        },
      ]);
    }
    setDraft([]);
    rawDraft.current = [];
  };

  // 预览状态（含当前草稿）。绘制中不提前切换成镂空面，避免闭合瞬间卡顿和视觉跳变。
  const previewPaths =
    draft.length > 1
      ? [
          ...paths,
          {
            id: "draft",
            points: draft,
            width: 10,
            closed: false,
            edgeDrop: false,
          },
        ]
      : paths;

  const clipId = `fold-clip-${room.id}`;

  // 缩放 viewBox：中心缩放
  const baseSize = 320;
  const zoomedSize = baseSize / zoomLevel;
  const offset = (baseSize - zoomedSize) / 2;
  const viewBox =
    zoomLevel > 1
      ? `${offset} ${offset} ${zoomedSize} ${zoomedSize}`
      : `0 0 ${baseSize} ${baseSize}`;

  // 缩放循环
  const cycleZoom = () => {
    sound.click();
    setZoomLevel((z) => {
      if (z === 1) return 1.5;
      if (z === 1.5) return 2;
      return 1;
    });
  };

  const undoLast = () => {
    sound.click();
    onPathsChange(paths.slice(0, -1));
  };

  const clearAll = () => {
    sound.click();
    onPathsChange([]);
  };

  return (
    <div className="editor-shell">
      {/* 剪裁画布 */}
      <div className="canvas-card">
        <div className="canvas-label">
          <Scissors size={18} />
          折好的小纸片
        </div>

        {/* 缩放 & 吸附工具栏 */}
        <div className="zoom-toolbar">
          <button
            className="icon-button small"
            title="放大镜：精修剪纸细节"
            onClick={cycleZoom}
          >
            {zoomLevel === 1 ? (
              <ZoomIn size={16} />
            ) : zoomLevel === 1.5 ? (
              <Maximize2 size={16} />
            ) : (
              <ZoomOut size={16} />
            )}
          </button>
          <span className="zoom-label">
            {zoomLevel}x {zoomLevel > 1 ? "精修模式" : ""}
          </span>
          {snapOn ? (
            <button
              className="icon-button small active"
              title="吸附已开启：帮你自动闭合剪口"
              onClick={() => {
                sound.click();
                setSnapOn(false);
              }}
            >
              <Magnet size={16} />
            </button>
          ) : (
            <button
              className="icon-button small dim"
              title="吸附已关闭：点一下开启"
              onClick={() => {
                sound.click();
                setSnapOn(true);
              }}
            >
              <Magnet size={16} />
            </button>
          )}
        </div>

        <svg
          ref={svgRef}
          className={`paper-svg draw-surface${zoomLevel > 1 ? " zoomed" : ""}`}
          viewBox={viewBox}
          onPointerDown={pointerDown}
          onPointerMove={pointerMove}
          onPointerUp={pointerUp}
          onPointerLeave={pointerUp}
          role="img"
          aria-label="在折纸上画出剪纸花纹"
        >
          <defs>
            <clipPath id={clipId}>
              <FoldedClipShape mode={room.id} />
            </clipPath>
          </defs>
          <FoldedPaperShape mode={room.id} />
          <g clipPath={`url(#${clipId})`}>
            <CutPathGroup paths={previewPaths} />
          </g>
        </svg>

        <div className="tool-row">
          <button className="icon-button" title="撤回上一刀" onClick={undoLast}>
            <RotateCcw size={18} />
          </button>
          <button className="icon-button" title="全部擦掉" onClick={clearAll}>
            <Eraser size={18} />
          </button>
          <span>已剪 {paths.length} 刀</span>
          <button
            className="primary-button finish-cut-button"
            onClick={() => {
              sound.unfold();
              onFinish();
            }}
          >
            <Check size={18} />
            完成了
          </button>
        </div>
      </div>

      {/* 展开预览 */}
      <div className="canvas-card preview">
        <div className="canvas-label">
          <Sparkles size={18} />
          展开预览 · {room.foldName}
        </div>
        <svg
          className="paper-svg"
          viewBox="0 0 320 320"
          role="img"
          aria-label="展开后的剪纸效果预览"
        >
          <UnfoldedPaperShape mode={room.id} />
          <ExpandedCuts mode={room.id} paths={previewPaths} />
        </svg>
      </div>
    </div>
  );
}
