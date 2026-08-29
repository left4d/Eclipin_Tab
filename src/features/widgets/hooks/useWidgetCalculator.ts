import { useState } from 'react';

const calculate = (left: number, right: number, operator: '+' | '-' | '×' | '÷') => {
  if (operator === '+') return left + right;
  if (operator === '-') return left - right;
  if (operator === '×') return left * right;
  return right === 0 ? NaN : left / right;
};

const formatCalculatorValue = (value: number) => {
  if (!Number.isFinite(value)) return '错误';
  const rounded = Math.round(value * 1_000_000_000) / 1_000_000_000;
  return String(rounded).slice(0, 12);
};

export const useWidgetCalculator = () => {
  const [calculatorDisplay, setCalculatorDisplay] = useState('0');
  const [calculatorStoredValue, setCalculatorStoredValue] = useState<number | null>(null);
  const [calculatorOperator, setCalculatorOperator] = useState<'+' | '-' | '×' | '÷' | null>(null);
  const [calculatorWaitingForValue, setCalculatorWaitingForValue] = useState(false);

  const handleCalculatorInput = (value: string) => {
    if (/^\d$/.test(value)) {
      setCalculatorDisplay((current) => (calculatorWaitingForValue || current === '0' || current === '错误' ? value : `${current}${value}`.slice(0, 12)));
      setCalculatorWaitingForValue(false);
      return;
    }

    if (value === '.') {
      setCalculatorDisplay((current) => {
        if (calculatorWaitingForValue || current === '错误') return '0.';
        return current.includes('.') ? current : `${current}.`;
      });
      setCalculatorWaitingForValue(false);
      return;
    }

    if (value === 'C') {
      setCalculatorDisplay('0');
      setCalculatorStoredValue(null);
      setCalculatorOperator(null);
      setCalculatorWaitingForValue(false);
      return;
    }

    if (value === '±') {
      setCalculatorDisplay((current) => (current === '0' || current === '错误' ? current : current.startsWith('-') ? current.slice(1) : `-${current}`));
      return;
    }

    if (value === '%') {
      setCalculatorDisplay((current) => formatCalculatorValue(Number(current) / 100));
      return;
    }

    if (['+', '-', '×', '÷'].includes(value)) {
      const nextValue = Number(calculatorDisplay);
      if (calculatorStoredValue !== null && calculatorOperator && !calculatorWaitingForValue) {
        const result = calculate(calculatorStoredValue, nextValue, calculatorOperator);
        setCalculatorStoredValue(result);
        setCalculatorDisplay(formatCalculatorValue(result));
      } else {
        setCalculatorStoredValue(nextValue);
      }
      setCalculatorOperator(value as '+' | '-' | '×' | '÷');
      setCalculatorWaitingForValue(true);
      return;
    }

    if (value === '=') {
      if (calculatorStoredValue === null || !calculatorOperator) return;
      const result = calculate(calculatorStoredValue, Number(calculatorDisplay), calculatorOperator);
      setCalculatorDisplay(formatCalculatorValue(result));
      setCalculatorStoredValue(null);
      setCalculatorOperator(null);
      setCalculatorWaitingForValue(true);
    }
  };

  return { calculatorDisplay, handleCalculatorInput };
};
