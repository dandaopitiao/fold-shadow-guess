import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Game render failed", error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="app">
        <section className="sync-error-card">
          <span className="brand-mark">咔</span>
          <h1>房间同步卡住了</h1>
          <p>刚才收到了一帧不完整的联机状态。刷新页面或重新加入房间，就能继续开剪。</p>
          <button className="primary-button" onClick={() => window.location.reload()}>
            重新进入
          </button>
        </section>
      </main>
    );
  }
}
