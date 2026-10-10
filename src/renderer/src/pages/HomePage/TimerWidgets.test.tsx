import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetAllTimers } from '../../lib/timer'
import ClockWidget from './ClockWidget'

describe('Clock widget timer and stopwatch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-10T09:05:00'))
    vi.stubGlobal(
      'Notification',
      class {
        static permission = 'denied'
      }
    )
    resetAllTimers()
  })

  afterEach(() => {
    resetAllTimers()
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('opens on the clock and switches between the three views', () => {
    render(<ClockWidget />)
    expect(screen.getByTestId('clock-time')).toBeTruthy()

    fireEvent.click(screen.getByRole('tab', { name: 'Timer' }))
    expect(screen.getByTestId('countdown-time').textContent).toBe('05:00')

    fireEvent.click(screen.getByRole('tab', { name: 'Stopwatch' }))
    expect(screen.getByTestId('stopwatch-time').textContent).toBe('00:00')

    fireEvent.click(screen.getByRole('tab', { name: 'Clock' }))
    expect(screen.getByTestId('clock-time')).toBeTruthy()
  })

  it('counts down in minutes and seconds and shows "Time\'s up" at the end', () => {
    render(<ClockWidget />)
    fireEvent.click(screen.getByRole('tab', { name: 'Timer' }))
    fireEvent.click(screen.getByRole('button', { name: '10 min' }))
    expect(screen.getByTestId('countdown-time').textContent).toBe('10:00')

    fireEvent.change(screen.getByLabelText('Countdown minutes'), { target: { value: '1' } })
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    act(() => {
      vi.advanceTimersByTime(15_000)
    })
    expect(screen.getByTestId('countdown-time').textContent).toBe('00:45')

    act(() => {
      vi.advanceTimersByTime(45_000)
    })
    expect(screen.getByTestId('countdown-time').textContent).toBe('00:00')
    expect(screen.getByRole('status').textContent).toBe("Time's up")
    expect(screen.getByRole('button', { name: 'Restart' })).toBeTruthy()
  })

  it('locks the length while counting down and can pause and resume', () => {
    render(<ClockWidget />)
    fireEvent.click(screen.getByRole('tab', { name: 'Timer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))

    expect((screen.getByLabelText('Countdown minutes') as HTMLInputElement).disabled).toBe(true)
    act(() => {
      vi.advanceTimersByTime(10_000)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(screen.getByTestId('countdown-time').textContent).toBe('04:50')
    expect(screen.getByRole('button', { name: 'Resume' })).toBeTruthy()
  })

  it('keeps a running timer visible on its tab and running after switching views', () => {
    render(<ClockWidget />)
    fireEvent.click(screen.getByRole('tab', { name: 'Timer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    fireEvent.click(screen.getByRole('tab', { name: /Clock/ }))

    act(() => {
      vi.advanceTimersByTime(60_000)
    })
    expect(screen.getByTestId('timer-badge').textContent).toBe('04:00')
  })

  it('stopwatch runs, pauses and resets, and its ring thins over each minute', () => {
    render(<ClockWidget />)
    fireEvent.click(screen.getByRole('tab', { name: 'Stopwatch' }))
    const ringWidth = (): number =>
      Number(screen.getByTestId('timer-ring').getAttribute('data-stroke-width'))
    const full = ringWidth()

    fireEvent.click(screen.getByRole('button', { name: 'Start' }))
    act(() => {
      vi.advanceTimersByTime(30_000)
    })
    expect(screen.getByTestId('stopwatch-time').textContent).toBe('00:30')
    expect(ringWidth()).toBeLessThan(full)

    act(() => {
      vi.advanceTimersByTime(29_000)
    })
    const almostThin = ringWidth()
    expect(almostThin).toBeLessThan(ringWidth() + 1)
    expect(almostThin).toBeLessThan(3)

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    fireEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByTestId('stopwatch-time').textContent).toBe('00:00')
    expect(ringWidth()).toBe(full)
  })
})
