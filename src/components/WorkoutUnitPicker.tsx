'use client';

import React, { useState, useRef, useEffect } from 'react';

export const UNIDADE_OPTIONS = [
  { id: 'kg', label: 'kg', desc: 'Quilogramas' },
  { id: 'lbs', label: 'lbs', desc: 'Libras' },
  { id: 'placas', label: 'placas', desc: 'Placas de máquina' },
  { id: 'Livre', label: 'Livre', desc: 'Peso corporal' },
  { id: 'barra', label: 'barra', desc: 'Apenas a barra' },
  { id: '%', label: '%', desc: 'Porcentagem de 1RM' },
  { id: 'elástico', label: 'elástico', desc: 'Resistência elástica' }
];

interface WorkoutUnitPickerProps {
  value: string;
  onChange: (newUnit: string) => void;
  disabled?: boolean;
}

export const WorkoutUnitPicker: React.FC<WorkoutUnitPickerProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [customText, setCustomText] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentUnit = value || 'kg';

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowCustomInput(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        title="Alterar unidade de medida da carga (kg, lbs, placas, Livre, etc.)"
        style={{
          width: '42px',
          height: '34px',
          background: '#070b14',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#cbd5e1',
          borderRadius: '7px',
          fontWeight: 700,
          fontSize: '0.72rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '2px',
          cursor: 'pointer',
          padding: '0 1px',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.borderColor = 'rgba(56, 189, 248, 0.4)';
          e.currentTarget.style.color = '#38bdf8';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
          e.currentTarget.style.color = '#cbd5e1';
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {currentUnit}
        </span>
        <i className="fa-solid fa-caret-down" style={{ fontSize: '0.62rem', opacity: 0.7 }}></i>
      </button>

      {isOpen && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute',
            top: '40px',
            right: 0,
            zIndex: 999999,
            width: '185px',
            background: '#0a0f1d',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            boxShadow: '0 16px 36px rgba(0, 0, 0, 0.95), 0 0 15px rgba(56, 189, 248, 0.1)',
            borderRadius: '9px',
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '3px'
          }}
        >
          <div style={{ fontSize: '0.62rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', padding: '2px 6px', borderBottom: '1px solid rgba(255,255,255,0.06)', marginBottom: '2px' }}>
            Unidade de Medida
          </div>

          {UNIDADE_OPTIONS.map(opt => {
            const isSelected = currentUnit.toLowerCase() === opt.label.toLowerCase();
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.label);
                  setIsOpen(false);
                }}
                style={{
                  textAlign: 'left',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  background: isSelected ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                  border: isSelected ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'all 0.1s ease'
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: isSelected ? '#38bdf8' : '#f8fafc' }}>
                    {opt.label}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#64748b' }}>
                    {opt.desc}
                  </div>
                </div>
                {isSelected && (
                  <i className="fa-solid fa-check" style={{ color: '#38bdf8', fontSize: '0.70rem' }}></i>
                )}
              </button>
            );
          })}

          {/* Opção para digitar livremente se desejar */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '4px', marginTop: '2px' }}>
            {!showCustomInput ? (
              <button
                type="button"
                onClick={() => setShowCustomInput(true)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '5px 8px',
                  borderRadius: '5px',
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.70rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <i className="fa-solid fa-pen" style={{ fontSize: '0.60rem' }}></i>
                <span>Outra unidade...</span>
              </button>
            ) : (
              <div style={{ display: 'flex', gap: '4px', padding: '2px' }}>
                <input
                  type="text"
                  value={customText}
                  onChange={e => setCustomText(e.target.value)}
                  placeholder="Ex: rep, min..."
                  autoFocus
                  style={{
                    flex: 1,
                    minWidth: 0,
                    height: '26px',
                    padding: '0 6px',
                    background: '#070b14',
                    border: '1px solid rgba(56, 189, 248, 0.4)',
                    color: '#fff',
                    borderRadius: '4px',
                    fontSize: '0.72rem'
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && customText.trim()) {
                      onChange(customText.trim());
                      setIsOpen(false);
                      setShowCustomInput(false);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customText.trim()) {
                      onChange(customText.trim());
                      setIsOpen(false);
                      setShowCustomInput(false);
                    }
                  }}
                  style={{
                    height: '26px',
                    padding: '0 8px',
                    background: '#10b981',
                    border: 'none',
                    color: '#fff',
                    borderRadius: '4px',
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  OK
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkoutUnitPicker;
