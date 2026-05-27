/**
 * 共享 SVG 图形组件
 * 供 CutPaperEditor、ResultScreen 等复用，避免重复定义。
 */
import type { CutPath, FoldMode, HalfFold } from "../types";

// ======== 折叠区域遮罩 ========

export function FoldedClipShape({
  mode,
  halfFold = "vertical",
}: {
  mode: FoldMode;
  halfFold?: HalfFold;
}) {
  if (mode === "half" && halfFold === "horizontal") {
    return <rect x="52" y="64" width="216" height="96" rx="18" />;
  }
  if (mode === "half") return <rect x="64" y="52" width="96" height="216" rx="18" />;
  if (mode === "quarter") return <rect x="64" y="64" width="96" height="96" rx="18" />;
  if (mode === "sixth") return <path d="M160 160 L160 38 A122 122 0 0 1 266 99 Z" />;
  return <path d="M160 160 L160 38 A122 122 0 0 1 246 74 Z" />;
}

// ======== 折叠红纸（含折痕虚线） ========

export function FoldedPaperShape({ mode, halfFold = "vertical" }: { mode: FoldMode; halfFold?: HalfFold }) {
  return (
    <>
      <g className="folded-paper">
        <FoldedClipShape mode={mode} halfFold={halfFold} />
      </g>
      <g className="fold-lines">
        {mode === "half" && halfFold === "vertical" && <line x1="160" y1="28" x2="160" y2="292" />}
        {mode === "half" && halfFold === "horizontal" && <line x1="28" y1="160" x2="292" y2="160" />}
        {mode === "quarter" && (
          <>
            <line x1="160" y1="42" x2="160" y2="184" />
            <line x1="42" y1="160" x2="184" y2="160" />
          </>
        )}
        {(mode === "sixth" || mode === "eighth") && (
          <>
            <line x1="160" y1="160" x2="160" y2="22" />
            <line
              x1="160"
              y1="160"
              x2={mode === "sixth" ? 282 : 258}
              y2={mode === "sixth" ? 90 : 61}
            />
          </>
        )}
      </g>
    </>
  );
}

// ======== 展开后的纸张轮廓 ========

export function UnfoldedPaperShape({ mode }: { mode: FoldMode }) {
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

// ======== 剪裁路径渲染 ========

export function CutPathGroup({ paths }: { paths: CutPath[] }) {
  const safePaths = Array.isArray(paths)
    ? paths.filter((path) => path && Array.isArray(path.points))
    : [];
  return (
    <g>
      {safePaths.map((path) => (
        <g key={path.id}>
          {(path.closed || path.edgeDrop) && (
            <polygon
              points={path.points.map((p) => `${p.x},${p.y}`).join(" ")}
              className="removed-piece"
            />
          )}
          <polyline
            points={path.points.map((p) => `${p.x},${p.y}`).join(" ")}
            className={path.closed || path.edgeDrop ? "cut-edge" : "cut-slit"}
            strokeWidth={path.width}
          />
        </g>
      ))}
    </g>
  );
}

// ======== 展开后的多份镜像裁切 ========

export function ExpandedCuts({
  mode,
  paths,
  halfFold = "vertical",
}: {
  mode: FoldMode;
  paths: CutPath[];
  halfFold?: HalfFold;
}) {
  const safePaths = Array.isArray(paths) ? paths : [];
  const transforms =
    mode === "half"
      ? halfFold === "horizontal"
        ? ["", "translate(0 320) scale(1 -1)"]
        : ["", "translate(320 0) scale(-1 1)"]
      : mode === "quarter"
        ? [
            "",
            "translate(320 0) scale(-1 1)",
            "translate(0 320) scale(1 -1)",
            "translate(320 320) scale(-1 -1)",
          ]
        : Array.from({ length: mode === "sixth" ? 6 : 8 }, (_, i) =>
            `rotate(${i * (mode === "sixth" ? 60 : 45)} 160 160)`
          );

  return (
    <g>
      {transforms.map((transform, index) => (
        <g key={index} transform={transform}>
          <CutPathGroup paths={safePaths} />
        </g>
      ))}
    </g>
  );
}
