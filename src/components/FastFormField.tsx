'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface FastTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
}

export const FastTextarea: React.FC<FastTextareaProps> = React.memo(({
  value,
  onChange,
  debounceMs = 150,
  className,
  style,
  placeholder,
  rows = 3,
  disabled,
  ...props
}) => {
  const [localVal, setLocalVal] = useState<string>(value || '');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Sincroniza estado local quando o valor externo mudar (ex: troca de aluno ou carregamento de rascunho)
  useEffect(() => {
    setLocalVal(value || '');
  }, [value]);

  const flush = useCallback((val: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onChangeRef.current(val);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    setLocalVal(nextVal); // Atualização local instantânea (0ms delay)

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      onChangeRef.current(nextVal);
    }, debounceMs);
  };

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    flush(e.target.value);
    if (props.onBlur) props.onBlur(e);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <textarea
      {...props}
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
      style={style}
      placeholder={placeholder}
      rows={rows}
      disabled={disabled}
    />
  );
});

FastTextarea.displayName = 'FastTextarea';

interface FastInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string | number;
  onChange: (value: string) => void;
  debounceMs?: number;
}

export const FastInput: React.FC<FastInputProps> = React.memo(({
  value,
  onChange,
  debounceMs = 150,
  type = 'text',
  className,
  style,
  placeholder,
  disabled,
  ...props
}) => {
  const [localVal, setLocalVal] = useState<string>(value !== undefined && value !== null ? String(value) : '');
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    setLocalVal(value !== undefined && value !== null ? String(value) : '');
  }, [value]);

  const flush = useCallback((val: string) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    onChangeRef.current(val);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = e.target.value;
    setLocalVal(nextVal);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      onChangeRef.current(nextVal);
    }, debounceMs);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    flush(e.target.value);
    if (props.onBlur) props.onBlur(e);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return (
    <input
      {...props}
      type={type}
      value={localVal}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
      style={style}
      placeholder={placeholder}
      disabled={disabled}
    />
  );
});

FastInput.displayName = 'FastInput';
