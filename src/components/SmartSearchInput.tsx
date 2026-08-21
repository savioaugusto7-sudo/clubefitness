'use client';

import React from 'react';

interface SmartSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  resultCount?: number;
  totalCount?: number;
  style?: React.CSSProperties;
  className?: string;
}

export default function SmartSearchInput({
  value,
  onChange,
  placeholder = 'Buscar...',
  resultCount,
  totalCount,
  style,
  className = ''
}: SmartSearchInputProps) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', ...style }} className={className}>
      <div className="smart-search-container">
        <i className="fa-solid fa-magnifying-glass smart-search-icon"></i>
        <input
          type="text"
          className="smart-search-input"
          placeholder={placeholder}
          value={value}
          onChange={e => onChange(e.target.value)}
          enterKeyHint="search"
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck="false"
        />
        {value ? (
          <button
            type="button"
            className="smart-search-clear"
            title="Limpar busca"
            onClick={() => onChange('')}
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        ) : null}
      </div>

      {value && resultCount !== undefined && (
        <span className="smart-search-count-badge" title="Registros encontrados">
          {resultCount} {resultCount === 1 ? 'encontrado' : 'encontrados'}
        </span>
      )}
    </div>
  );
}
