'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { parseActionableError, ActionableErrorDetails } from '@/utils/actionableError';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showTechDetails: boolean;
}

export default class SmartErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showTechDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      showTechDetails: false
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[SmartErrorBoundary] Erro capturado:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const details: ActionableErrorDetails = parseActionableError(
        this.state.error,
        this.props.fallbackTitle || 'Exibição da Interface'
      );

      return (
        <div style={{
          minHeight: '380px',
          padding: '32px 24px',
          background: 'rgba(22, 29, 45, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '18px',
          margin: '20px auto',
          maxWidth: '750px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(239, 68, 68, 0.1)',
          color: '#f8fafc',
          fontFamily: 'var(--font-body, sans-serif)'
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
            <div style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ef4444',
              fontSize: '1.4rem'
            }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#f8fafc' }}>
                {details.title}
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                {details.description}
              </p>
            </div>
          </div>

          {/* Diagnostic Card */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ color: '#f59e0b', fontSize: '0.9rem', marginTop: '2px' }}>
                <i className="fa-solid fa-circle-question"></i>
              </span>
              <div>
                <strong style={{ fontSize: '0.82rem', color: '#f1f5f9' }}>Por que isso aconteceu?</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#cbd5e1', lineHeight: '1.4' }}>
                  {details.cause}
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
              <span style={{ color: '#10b981', fontSize: '0.9rem', marginTop: '2px' }}>
                <i className="fa-solid fa-lightbulb"></i>
              </span>
              <div>
                <strong style={{ fontSize: '0.82rem', color: '#10b981' }}>Como solucionar agora:</strong>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#f1f5f9', lineHeight: '1.4' }}>
                  {details.solution}
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={this.handleReload}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.3)'
              }}
            >
              <i className="fa-solid fa-rotate-right"></i>
              {details.actionText || 'Recarregar Tela com Segurança'}
            </button>

            <button
              onClick={this.handleReset}
              style={{
                padding: '10px 16px',
                borderRadius: '10px',
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#cbd5e1',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <i className="fa-solid fa-house"></i>
              Tentar Restaurar
            </button>

            <button
              onClick={() => this.setState({ showTechDetails: !this.state.showTechDetails })}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#64748b',
                fontSize: '0.78rem',
                cursor: 'pointer',
                marginLeft: 'auto',
                textDecoration: 'underline'
              }}
            >
              {this.state.showTechDetails ? 'Ocultar detalhes técnicos' : 'Ver detalhes técnicos'}
            </button>
          </div>

          {/* Collapsible Technical Details for Support */}
          {this.state.showTechDetails && (
            <div style={{
              marginTop: '16px',
              padding: '12px',
              background: '#040711',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              fontSize: '0.74rem',
              color: '#ef4444',
              fontFamily: 'monospace',
              overflowX: 'auto',
              maxHeight: '160px'
            }}>
              <strong>Mensagem do Sistema:</strong> {this.state.error?.toString()}
              {this.state.errorInfo?.componentStack && (
                <pre style={{ marginTop: '8px', color: '#94a3b8', fontSize: '0.7rem' }}>
                  {this.state.errorInfo.componentStack}
                </pre>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
