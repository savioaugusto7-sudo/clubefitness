'use client';

import React, { useState, useRef, useEffect } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  required = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Find the currently selected option
  const selectedOption = options.find(opt => opt.value === value);

  // Filter options based on search query (ignoring case and accents)
  const filteredOptions = options.filter(opt => {
    const labelNorm = opt.label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const searchNorm = search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return labelNorm.includes(searchNorm);
  });

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync state if value is invalid/not in options (select first by default if required)
  useEffect(() => {
    if (required && !value && options.length > 0) {
      onChange(options[0].value);
    }
  }, [value, options, required, onChange]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearch('');
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div ref={containerRef} className="searchable-select-container" style={{ position: 'relative', width: '100%' }}>
      {/* Trigger */}
      <div
        className="select-custom searchable-select-trigger"
        onClick={toggleDropdown}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
          padding: '10px 14px',
          minHeight: '42px'
        }}
      >
        <span style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          color: selectedOption ? 'var(--text-main)' : 'var(--text-dim)'
        }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <i
          className={`fa-solid fa-chevron-${isOpen ? 'up' : 'down'}`}
          style={{
            fontSize: '0.8rem',
            color: 'var(--text-dim)',
            transition: 'transform 0.2s',
            marginLeft: '8px'
          }}
        ></i>
      </div>

      {/* Hidden input to support native form validation/required */}
      <input
        type="text"
        value={value}
        onChange={() => {}}
        required={required}
        style={{
          opacity: 0,
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: -1
        }}
      />

      {/* Dropdown menu */}
      {isOpen && (
        <div
          className="searchable-select-dropdown"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 0,
            zIndex: 1000,
            background: '#121824',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-sm, 8px)',
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
            maxHeight: '260px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* Search bar */}
          <div style={{
            padding: '8px',
            borderBottom: '1px solid var(--border-color)',
            background: 'rgba(255, 255, 255, 0.02)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <i className="fa-solid fa-magnifying-glass" style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginLeft: '6px' }}></i>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '6px 8px',
                fontSize: '0.85rem',
                border: 'none',
                background: 'transparent',
                color: 'var(--text-main)',
                outline: 'none',
                boxShadow: 'none'
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            )}
          </div>

          {/* Options List */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '4px 0' }}>
            {filteredOptions.length > 0 ? (
              filteredOptions.map(opt => {
                const isSelected = opt.value === value;
                return (
                  <div
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    style={{
                      padding: '10px 14px',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      color: isSelected ? 'var(--color-primary, #10b981)' : 'var(--text-main)',
                      background: isSelected ? 'var(--color-primary-glow, rgba(16, 185, 129, 0.15))' : 'transparent',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    {opt.label}
                  </div>
                );
              })
            ) : (
              <div style={{ padding: '16px 12px', fontSize: '0.85rem', color: 'var(--text-dim)', textAlign: 'center' }}>
                Nenhum resultado encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
