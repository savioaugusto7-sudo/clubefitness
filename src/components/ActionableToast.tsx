'use client';

import React from 'react';
import { ActionableErrorDetails } from '@/utils/actionableError';

interface ActionableToastProps {
  error: ActionableErrorDetails | null;
  onClose: () => void;
  onAction?: () => void;
}

export default function ActionableToast({ error, onClose, onAction }: ActionableToastProps) {
  if (!error) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 99999,
      maxWidth: '440px',
      background: 'rgba(15, 23, 42, 0.95)',
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(239, 68, 68, 0.4)',
      borderRadius: '16px',
      padding: '18px 20px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6), 0 0 25px rgba(239, 68, 68, 0.15)',
      color: '#f8fafc',
      fontFamily: 'var(--font-body, sans-serif)',
      animation: 'slideInUp 0.3s ease'
    }}>
      {/* Header with Close */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ color: '#ef4444', fontSize: '1.2rem' }}>
            <i className="fa-solid fa-circle-exclamation"></i>
          </span>
          <strong style={{ fontSize: '0.95rem', color: '#f8fafc', fontWeight: 700 }}>
            {error.title}
          </strong>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            cursor: 'pointer',
            fontSize: '1rem',
            padding: '2px 4px'
          }}
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
      </div>

      {/* Cause & Solution Body */}
      <div style={{ marginTop: '10px', fontSize: '0.82rem', color: '#cbd5e1', lineHeight: '1.45' }}>
        <div style={{ color: '#94a3b8', marginBottom: '6px' }}>
          {error.description}
        </div>
        <div style={{
          background: 'rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.05)',
          borderRadius: '8px',
          padding: '8px 10px',
          marginTop: '6px'
        }}>
          <strong style={{ color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <i className="fa-solid fa-lightbulb"></i> Solução:
          </strong>
          <span style={{ color: '#f1f5f9', fontSize: '0.8rem' }}>{error.solution}</span>
        </div>
      </div>

      {/* Action Button */}
      {error.actionText && (
        <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '6px 12px',
              borderRadius: '8px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#94a3b8',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Fechar
          </button>
          <button
            onClick={() => {
              if (onAction) onAction();
              onClose();
            }}
            style={{
              padding: '6px 16px',
              borderRadius: '8px',
              background: '#10b981',
              border: 'none',
              color: '#000',
              fontWeight: 700,
              fontSize: '0.82rem',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
            }}
          >
            {error.actionText}
          </button>
        </div>
      )}
    </div>
  );
}
