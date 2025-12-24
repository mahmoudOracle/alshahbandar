import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import DateInput from '../../components/ui/DateInput';
import { describe, it, expect, vi } from 'vitest';

describe('DateInput', () => {
  it('parses pasted dd/mm/yyyy and calls onChange with ISO', async () => {
    const handle = vi.fn();
    const { getByPlaceholderText } = render(<DateInput name="date" onChange={handle} />);
    const day = getByPlaceholderText('DD') as HTMLInputElement;

    // simulate paste
    fireEvent.paste(day, { clipboardData: { getData: () => '12/03/2025' } } as any);

    // trigger blur to force commit and allow microtask
    fireEvent.blur(day);
    await Promise.resolve();

    expect(handle).toHaveBeenCalled();
    const calls = handle.mock.calls as any[];
    const last = calls[calls.length - 1][0];
    expect(last.target.value).toBe('2025-03-12');
  });

  it('commits on blur after typing parts', async () => {
    const handle = vi.fn();
    const { getByPlaceholderText } = render(<DateInput name="d" onChange={handle} />);
    const day = getByPlaceholderText('DD') as HTMLInputElement;
    const month = getByPlaceholderText('MM') as HTMLInputElement;
    const year = getByPlaceholderText('YYYY') as HTMLInputElement;

    fireEvent.change(day, { target: { value: '05' } });
    fireEvent.change(month, { target: { value: '11' } });
    fireEvent.change(year, { target: { value: '2023' } });

    fireEvent.blur(year);

    await Promise.resolve();

    expect(handle).toHaveBeenCalled();
    const calls = handle.mock.calls as any[];
    const last = calls[calls.length - 1][0];
    expect(last.target.value).toBe('2023-11-05');
  });
});
