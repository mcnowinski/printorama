import { describe, it, expect } from 'vitest'

function cn(...inputs: any[]) {
  const classes = inputs.filter(Boolean)
  return classes.join(' ')
}

function pad(n: number) { return String(n).padStart(2, '0') }

function formatDate(d: string) {
  const date = new Date(d)
  return `${pad(date.getMonth() + 1)}/${pad(date.getDate())}/${date.getFullYear()} ${date.getHours() % 12 || 12}:${pad(date.getMinutes())}:${pad(date.getSeconds())} ${date.getHours() >= 12 ? 'PM' : 'AM'}`
}

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('filters falsy values', () => {
    expect(cn('a', false, 'b', undefined, 'c')).toBe('a b c')
  })
})

describe('formatDate', () => {
  it('formats a date string correctly', () => {
    const date = new Date('2026-06-16T14:30:00')
    const result = formatDate(date.toISOString())
    expect(result).toContain('06/16/2026')
    expect(result).toContain('2:30:00')
    expect(result).toContain('PM')
  })

  it('handles midnight correctly', () => {
    const result = formatDate('2026-01-01T00:05:00')
    expect(result).toContain('01/01/2026')
    expect(result).toContain('12:05:00')
    expect(result).toContain('AM')
  })

  it('handles noon correctly', () => {
    const result = formatDate('2026-07-04T12:00:00')
    expect(result).toContain('07/04/2026')
    expect(result).toContain('12:00:00')
    expect(result).toContain('PM')
  })
})
