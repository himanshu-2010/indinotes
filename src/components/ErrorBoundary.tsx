import { Component } from 'react'
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          padding: 40,
          color: 'var(--muted)',
          textAlign: 'center',
          gap: 16,
        }}>
          <div style={{ fontSize: 32, color: 'var(--red)' }}>!</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Something went wrong</div>
          <div style={{ fontSize: 13, maxWidth: 400, color: 'var(--muted)' }}>
            {this.state.error?.message || 'An unexpected error occurred'}
          </div>
          <button
            onClick={this.handleReset}
            style={{
              marginTop: 8,
              padding: '8px 20px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--accent)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Try Again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
