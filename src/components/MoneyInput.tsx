'use client';

import React from 'react';
import { formatMoneyBRL } from '@/utils/currencyMask';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | undefined | null;
  onChange: (value: number) => void;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}

export default function MoneyInput({
  value,
  onChange,
  className = 'form-control',
  style,
  placeholder = 'R$ 0,00',
  disabled,
  ...rest
}: MoneyInputProps) {
  const displayVal = value !== undefined && value !== null ? formatMoneyBRL(value) : '';

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const cleanDigits = raw.replace(/\D/g, '');
    if (!cleanDigits) {
      onChange(0);
      return;
    }
    const cents = parseInt(cleanDigits, 10);
    const num = cents / 100;
    onChange(num);
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    try {
      e.target.select();
    } catch {}
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      className={className}
      style={{
        fontWeight: 700,
        ...style
      }}
      value={displayVal}
      onChange={handleChange}
      onFocus={handleFocus}
      placeholder={placeholder}
      disabled={disabled}
      {...rest}
    />
  );
}
