import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import RoiCalculator from '../RoiCalculator';

describe('RoiCalculator Component', () => {
  it('renders calculator inputs with defaults', () => {
    render(<RoiCalculator />);

    expect(screen.getByText(/Estimate your Customer Retention ROI/i)).toBeTruthy();

    const mrrInput = document.getElementById('mrr-range') as HTMLInputElement;
    const churnInput = document.getElementById('churn-range') as HTMLInputElement;
    const reductionInput = document.getElementById('reduction-range') as HTMLInputElement;

    expect(mrrInput).toBeTruthy();
    expect(Number(mrrInput.value)).toBe(120000);

    expect(churnInput).toBeTruthy();
    expect(Number(churnInput.value)).toBe(6.5);

    expect(reductionInput).toBeTruthy();
    expect(Number(reductionInput.value)).toBe(35);
  });

  it('updates calculation when inputs change', () => {
    render(<RoiCalculator />);

    const mrrInput = document.getElementById('mrr-range') as HTMLInputElement;
    fireEvent.change(mrrInput, { target: { value: '200000' } });
    expect(Number(mrrInput.value)).toBe(200000);

    const churnInput = document.getElementById('churn-range') as HTMLInputElement;
    fireEvent.change(churnInput, { target: { value: '10' } });
    expect(Number(churnInput.value)).toBe(10);
  });

  it('responds to window custom events for ROI update', () => {
    render(<RoiCalculator />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent('retentiq-update-roi', {
          detail: { mrr: 300000, churnRate: 5.0, reduction: 40 },
        }),
      );
    });

    const mrrInput = document.getElementById('mrr-range') as HTMLInputElement;
    const churnInput = document.getElementById('churn-range') as HTMLInputElement;
    const reductionInput = document.getElementById('reduction-range') as HTMLInputElement;

    expect(Number(mrrInput.value)).toBe(300000);
    expect(Number(churnInput.value)).toBe(5.0);
    expect(Number(reductionInput.value)).toBe(40);
  });
});
