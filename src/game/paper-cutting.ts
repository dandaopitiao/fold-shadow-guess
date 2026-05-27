import type { FoldMode, HalfFold, Point } from "../types";

// ========== 区域定义 ==========

export const rectFoldBounds: Record<string, { x1: number; y1: number; x2: number; y2: number }> = {
  half: { x1: 64, y1: 52, x2: 160, y2: 268 },
  "half-horizontal": { x1: 52, y1: 64, x2: 268, y2: 160 },
  quarter: { x1: 64, y1: 64, x2: 160, y2: 160 },
};

function rectKey(mode: FoldMode, halfFold: HalfFold) {
  return mode === "half" && halfFold === "horizontal" ? "half-horizontal" : mode;
}

// sixth 扇形区域（60° wedge，用于交互 clamp）
const SIXTH_WEDGE = {
  cx: 160, cy: 160,
  innerR: 44,  // 内半径
  outerR: 142, // 外半径
  startAngle: -90,               // 顶部开始（度）
  endAngle: -90 + 60,            // 60° wedge
};

// eighth 扇形区域（45° wedge）
const EIGHTH_WEDGE = {
  cx: 160, cy: 160,
  innerR: 44,
  outerR: 142,
  startAngle: -90,
  endAngle: -90 + 45,
};

// ========== 基础几何工具 ==========

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function angleDeg(cx: number, cy: number, px: number, py: number): number {
  return (Math.atan2(py - cy, px - cx) * 180) / Math.PI;
}

/** 判断点是否在扇形 wedge 内 */
function pointInWedge(
  p: Point,
  cx: number, cy: number,
  innerR: number, outerR: number,
  startDeg: number, endDeg: number
): boolean {
  const r = distance({ x: cx, y: cy }, p);
  if (r < innerR || r > outerR) return false;
  let ang = angleDeg(cx, cy, p.x, p.y);
  // 归一化角度差
  let diff = ((ang - startDeg) % 360 + 360) % 360;
  let span = ((endDeg - startDeg) % 360 + 360) % 360;
  return diff <= span + 0.5; // 小宽容
}

/** 点到扇形最近点的投影（用于 clamp 进 wedge） */
function clampToWedge(mode: Extract<FoldMode, "sixth" | "eighth">, p: Point): Point {
  const { cx, cy, innerR, outerR, startAngle, endAngle } =
    mode === "sixth" ? SIXTH_WEDGE : EIGHTH_WEDGE;
  let r = distance({ x: cx, y: cy }, p);
  r = Math.min(outerR, Math.max(innerR, r));
  let ang = angleDeg(cx, cy, p.x, p.y);
  // clamp angle
  const span = endAngle - startAngle;
  let offset = ((ang - startAngle) % 360 + 360) % 360;
  if (offset > span) {
    // snap to nearest bound
    const toStart = offset;
    const toEnd = 360 - offset + span;
    ang = toStart < toEnd ? startAngle : endAngle;
  }
  const rad = (ang * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

// ========== 闭合检测 ==========

export function isClosedPath(points: Point[]) {
  if (points.length < 6) return false;
  // 取首尾各3个点的平均位置，避免手抖误判
  const firstAvg = avgPoint(points.slice(0, Math.min(3, points.length)));
  const lastAvg = avgPoint(points.slice(-Math.min(3, points.length)));
  return distance(firstAvg, lastAvg) < 18;
}

function avgPoint(pts: Point[]): Point {
  if (pts.length === 0) return { x: 0, y: 0 };
  return {
    x: pts.reduce((s, p) => s + p.x, 0) / pts.length,
    y: pts.reduce((s, p) => s + p.y, 0) / pts.length,
  };
}

export function closePathPoints(points: Point[]) {
  // 首尾之间的 gap 用线性插值补齐，避免出现大缺口
  return [...points, points[0]];
}

// ========== 可绘制区域 clamp ==========

export function clampToFoldedArea(mode: FoldMode, point: Point, halfFold: HalfFold = "vertical"): Point {
  if (mode === "half" || mode === "quarter") {
    const bounds = rectFoldBounds[rectKey(mode, halfFold)];
    return {
      x: Math.min(bounds.x2, Math.max(bounds.x1, point.x)),
      y: Math.min(bounds.y2, Math.max(bounds.y1, point.y)),
    };
  }
  // sixth / eighth: clamp 到扇形 wedge
  if (mode === "sixth" || mode === "eighth") {
    const wedge = mode === "sixth" ? SIXTH_WEDGE : EIGHTH_WEDGE;
    if (
      pointInWedge(point, wedge.cx, wedge.cy, wedge.innerR, wedge.outerR, wedge.startAngle, wedge.endAngle)
    ) {
      return point;
    }
    return clampToWedge(mode, point);
  }
  return point;
}

// ========== 边缘掉片检测 ==========

function touchedRectEdge(mode: FoldMode, point: Point, halfFold: HalfFold = "vertical"): string | null {
  if (mode !== "half" && mode !== "quarter") return null;
  const bounds = rectFoldBounds[rectKey(mode, halfFold)];
  const threshold = 28;
  if (Math.abs(point.x - bounds.x1) < threshold) return "left";
  if (Math.abs(point.y - bounds.y1) < threshold) return "top";
  if (mode === "half" && halfFold === "horizontal" && Math.abs(point.y - bounds.y2) < threshold) return "fold";
  if (Math.abs(point.x - bounds.x2) < threshold) return "fold";
  if (Math.abs(point.y - bounds.y2) < threshold) return "bottom";
  return null;
}

function snapPointToRectEdge(mode: FoldMode, point: Point, halfFold: HalfFold = "vertical"): Point {
  if (mode !== "half" && mode !== "quarter") return point;
  const bounds = rectFoldBounds[rectKey(mode, halfFold)];
  const edge = touchedRectEdge(mode, point, halfFold);
  if (!edge) return point;
  if (edge === "left") return { ...point, x: bounds.x1 };
  if (edge === "fold") {
    return mode === "half" && halfFold === "horizontal"
      ? { ...point, y: bounds.y2 }
      : { ...point, x: bounds.x2 };
  }
  if (edge === "top") return { ...point, y: bounds.y1 };
  return { ...point, y: bounds.y2 };
}

export function snapPathEdgeEndpoints(mode: FoldMode, points: Point[], halfFold: HalfFold = "vertical") {
  if (points.length < 2) return points;
  const snapped = [...points];
  snapped[0] = snapPointToRectEdge(mode, snapped[0], halfFold);
  snapped[snapped.length - 1] = snapPointToRectEdge(mode, snapped[snapped.length - 1], halfFold);
  return snapped;
}

export function isEdgeDropPath(mode: FoldMode, points: Point[], halfFold: HalfFold = "vertical") {
  if (points.length < 4) return false;
  const firstEdge = touchedRectEdge(mode, points[0], halfFold);
  const lastEdge = touchedRectEdge(mode, points[points.length - 1], halfFold);
  // 同一边 + 距离足够远 → 真正割下一片
  return (
    firstEdge !== null &&
    firstEdge === lastEdge &&
    distance(points[0], points[points.length - 1]) > 28
  );
}

// ========== 轨迹平滑（移动平均降抖） ==========

/**
 * 对原始点序列做移动平均平滑，减少手抖带来的锯齿。
 * windowSize 越大越平滑，等级：1=轻(3), 2=中(5), 3=重(7)
 */
export function smoothPoints(points: Point[], smoothLevel: number): Point[] {
  if (points.length < 3 || smoothLevel <= 0) return points;
  const windowSize = smoothLevel === 1 ? 3 : smoothLevel === 2 ? 5 : 7;
  const half = Math.floor(windowSize / 2);
  const result: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    if (i === 0 || i === points.length - 1) {
      result.push(points[i]);
      continue;
    }
    const start = Math.max(0, i - half);
    const end = Math.min(points.length - 1, i + half);
    result.push(avgPoint(points.slice(start, end + 1)));
  }
  return result;
}

/**
 * 简化轨迹：Ramer–Douglas–Peucker 算法
 * 在保持形状的前提下减少点数量，epsilon 越大越简化
 */
export function simplifyPoints(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;
  let maxDist = 0;
  let maxIndex = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDist(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIndex = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyPoints(points.slice(0, maxIndex + 1), epsilon);
    const right = simplifyPoints(points.slice(maxIndex), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [first, last];
}

function perpendicularDist(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return distance(p, a);
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return distance(p, proj);
}

// ========== 吸附辅助 ==========

/**
 * 检测起点附近是否有可吸附的已完成路径端点（帮助闭合）
 * 返回吸附后的点，或原样返回
 */
export function snapToPathEnd(
  currentPoint: Point,
  existingPaths: { points: Point[] }[],
  threshold: number
): Point {
  for (const path of existingPaths) {
    if (path.points.length === 0) continue;
    const first = path.points[0];
    const last = path.points[path.points.length - 1];
    if (distance(currentPoint, first) < threshold) return { ...first };
    if (distance(currentPoint, last) < threshold) return { ...last };
  }
  return currentPoint;
}

/**
 * 检测当前轨迹是否可以被"自动闭合"，即末端靠近起点时
 */
export function autoCloseAssist(points: Point[], threshold: number): Point[] | null {
  if (points.length < 6) return null;
  if (distance(points[0], points[points.length - 1]) < threshold) {
    return closePathPoints(points);
  }
  return null;
}
