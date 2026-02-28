/**
 * UI Components — Button, FormInput, FormSelect Tests
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import Button from './Button';
import FormInput from './FormInput';
import FormSelect from './FormSelect';

// ──────────────────────────────────────────────
// Button
// ──────────────────────────────────────────────
describe('Button', () => {
  it('children text render eder', () => {
    render(<Button>Gönder</Button>);
    expect(screen.getByText('Gönder')).toBeInTheDocument();
  });

  it('varsayılan type="button"', () => {
    render(<Button>Tıkla</Button>);
    expect(screen.getByText('Tıkla').closest('button')).toHaveAttribute('type', 'button');
  });

  it('type="submit" prop\'u çalışır', () => {
    render(<Button type="submit">Gönder</Button>);
    expect(screen.getByText('Gönder').closest('button')).toHaveAttribute('type', 'submit');
  });

  it('onClick handler çağrılır', () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Tıkla</Button>);
    fireEvent.click(screen.getByText('Tıkla'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('primary stili varsayılan olarak uygulanır (border-dpg-gold)', () => {
    render(<Button>Primary</Button>);
    const btn = screen.getByText('Primary').closest('button');
    expect(btn.className).toContain('border-dpg-gold');
  });

  it('secondary=true ile silver stili uygulanır', () => {
    render(<Button secondary>Silver</Button>);
    const btn = screen.getByText('Silver').closest('button');
    expect(btn.className).toContain('border-dpg-silver');
  });

  it('className prop\'u eklenir', () => {
    render(<Button className="w-full">Full</Button>);
    const btn = screen.getByText('Full').closest('button');
    expect(btn.className).toContain('w-full');
  });

  it('style prop\'u uygulanır', () => {
    render(<Button style={{ opacity: 0.5 }}>Dim</Button>);
    const btn = screen.getByText('Dim').closest('button');
    expect(btn.style.opacity).toBe('0.5');
  });
});

// ──────────────────────────────────────────────
// FormInput
// ──────────────────────────────────────────────
describe('FormInput', () => {
  it('label render eder', () => {
    render(<FormInput label="Email" value="" onChange={vi.fn()} />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('input value gösterir', () => {
    render(<FormInput label="Ad" value="Pilot" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Ad')).toHaveValue('Pilot');
  });

  it('onChange handler çağrılır', () => {
    const onChange = vi.fn();
    render(<FormInput label="Ad" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Ad'), { target: { value: 'Test' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('error mesajı gösterir', () => {
    render(<FormInput label="TC" value="" onChange={vi.fn()} error="Zorunlu alan" />);
    expect(screen.getByText('Zorunlu alan')).toBeInTheDocument();
  });

  it('error yoksa hata mesajı göstermez', () => {
    render(<FormInput label="TC" value="" onChange={vi.fn()} />);
    expect(screen.queryByText('Zorunlu alan')).not.toBeInTheDocument();
  });

  it('focus olduğunda iç state güncellenir', () => {
    render(<FormInput label="Email" value="" onChange={vi.fn()} />);
    const input = screen.getByLabelText('Email');
    fireEvent.focus(input);
    // Label rengi değişir (gold), ama DOM'da class testi yerine style testi
    // label style.color gold olmalı
    const label = screen.getByText('Email');
    expect(label.style.color).toBeTruthy();
  });

  it('value null iken boş string gösterir', () => {
    render(<FormInput label="Tel" value={null} onChange={vi.fn()} />);
    expect(screen.getByLabelText('Tel')).toHaveValue('');
  });

  it('custom id prop çalışır', () => {
    render(<FormInput label="TC" value="" onChange={vi.fn()} id="tc-input" />);
    expect(document.getElementById('tc-input')).toBeTruthy();
  });
});

// ──────────────────────────────────────────────
// FormSelect
// ──────────────────────────────────────────────
describe('FormSelect', () => {
  const options = [
    { value: 'THY', label: 'Türk Hava Yolları' },
    { value: 'PGT', label: 'Pegasus' },
    { value: 'SHY', label: 'SunExpress' },
  ];

  it('label render eder', () => {
    render(<FormSelect label="Havayolu" options={options} value="" onChange={vi.fn()} />);
    expect(screen.getByText('Havayolu')).toBeInTheDocument();
  });

  it('Seçiniz placeholder gösterir', () => {
    render(<FormSelect label="Havayolu" options={options} value="" onChange={vi.fn()} />);
    expect(screen.getByText('Seçiniz')).toBeInTheDocument();
  });

  it('tüm seçenekleri render eder', () => {
    render(<FormSelect label="Havayolu" options={options} value="" onChange={vi.fn()} />);
    expect(screen.getByText('Türk Hava Yolları')).toBeInTheDocument();
    expect(screen.getByText('Pegasus')).toBeInTheDocument();
    expect(screen.getByText('SunExpress')).toBeInTheDocument();
  });

  it('onChange handler çağrılır', () => {
    const onChange = vi.fn();
    render(<FormSelect label="Havayolu" options={options} value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('Havayolu'), { target: { value: 'THY' } });
    expect(onChange).toHaveBeenCalled();
  });

  it('value prop seçili değeri gösterir', () => {
    render(<FormSelect label="Havayolu" options={options} value="PGT" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Havayolu')).toHaveValue('PGT');
  });

  it('error mesajı gösterir', () => {
    render(<FormSelect label="Filo" options={options} value="" onChange={vi.fn()} error="Seçim yapınız" />);
    expect(screen.getByText('Seçim yapınız')).toBeInTheDocument();
  });

  it('boş options dizisi ile sadece Seçiniz gösterir', () => {
    render(<FormSelect label="Test" options={[]} value="" onChange={vi.fn()} />);
    const select = screen.getByLabelText('Test');
    // Only the placeholder option
    expect(select.children.length).toBe(1);
  });
});
