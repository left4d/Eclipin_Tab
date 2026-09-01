import React from 'react';
import styles from './ErrorBoundary.module.css';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[Eclipin] Unhandled render error', error, info);
  }

  private reload = () => window.location.reload();

  private resetLocalView = () => {
    try {
      sessionStorage.clear();
    } finally {
      window.location.reload();
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className={styles.page}>
        <section className={`card ${styles.card}`} role="alert">
          <div className={styles.badge}>!</div>
          <h1>页面暂时无法显示</h1>
          <p>你的本地数据没有被删除。可以先重新加载；若仍失败，再重置本次会话状态。</p>
          <div className={styles.actions}>
            <button type="button" onClick={this.reload}>重新加载</button>
            <button type="button" className={styles.secondary} onClick={this.resetLocalView}>重置会话</button>
          </div>
        </section>
      </main>
    );
  }
}
