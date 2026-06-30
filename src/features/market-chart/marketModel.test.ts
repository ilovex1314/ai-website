import { describe, expect, it } from 'vitest'
import {
  buildVisibleSeries,
  createMarketData,
  downsampleAveragePoints,
  expandWindow,
  formatWindowRange,
  formatTooltipRows,
  getRange,
  getTrend,
  isPointInPriceArea,
  isPointInPriceWhitespace,
  rangeKeys,
  shrinkWindow,
} from './marketModel'

describe('marketModel', () => {
  it('defines the expected market ranges in display order', () => {
    expect(rangeKeys).toEqual(['intraday', 'fiveDay', 'day', 'week', 'month', 'quarter', 'year'])
    expect(getRange('intraday')).toMatchObject({ label: '分时', draggable: false })
    expect(getRange('fiveDay')).toMatchObject({ label: '5日', draggable: true })
  })

  it('creates deterministic ascending-time market data', () => {
    const data = createMarketData()

    expect(data.length).toBeGreaterThan(4000)
    expect(data[0].timestamp).toBeLessThan(data.at(-1)!.timestamp)
    expect(createMarketData().at(-1)).toEqual(data.at(-1))
  })

  it('downsamples by average price and midpoint timestamp', () => {
    const points = Array.from({ length: 10 }, (_, index) => ({
      timestamp: index,
      price: index + 1,
      volume: 100,
      turnover: 1000,
    }))

    const result = downsampleAveragePoints(points, 2)

    expect(result).toEqual([
      { timestamp: 2, price: 3, volume: 500, turnover: 5000 },
      { timestamp: 7, price: 8, volume: 500, turnover: 5000 },
    ])
  })

  it('builds a fixed-width visible series for the selected range', () => {
    const data = createMarketData()
    const fiveDay = buildVisibleSeries(data, 'fiveDay')
    const month = buildVisibleSeries(data, 'month')

    expect(fiveDay.visiblePoints.length).toBeLessThanOrEqual(getRange('fiveDay').targetPoints)
    expect(month.visiblePoints.length).toBeLessThanOrEqual(getRange('month').targetPoints)
    expect(fiveDay.windowStart).toBeGreaterThan(month.windowStart)
    expect(fiveDay.range.draggable).toBe(true)
  })

  it('calculates red for rising windows and green for falling windows', () => {
    expect(
      getTrend([
        { timestamp: 1, price: 10, volume: 1, turnover: 1 },
        { timestamp: 2, price: 12, volume: 1, turnover: 1 },
      ]),
    ).toMatchObject({ direction: 'up', color: '#f0445f' })

    expect(
      getTrend([
        { timestamp: 1, price: 12, volume: 1, turnover: 1 },
        { timestamp: 2, price: 10, volume: 1, turnover: 1 },
      ]),
    ).toMatchObject({ direction: 'down', color: '#16a779' })
  })

  it('expands draggable windows and reports boundary rebounds', () => {
    const data = createMarketData()
    const current = buildVisibleSeries(data, 'fiveDay')
    const older = expandWindow(data, current, 'right')
    const newer = expandWindow(data, current, 'left')
    const intraday = buildVisibleSeries(data, 'intraday')

    expect(older.view.windowStart).toBeLessThan(current.windowStart)
    expect(older.view.windowEnd).toBe(current.windowEnd)
    expect(newer.view.windowStart).toBe(current.windowStart)
    expect(newer).toMatchObject({ rebounded: true })
    expect(expandWindow(data, intraday, 'right')).toMatchObject({ rebounded: true })
  })

  it('expands the daily window back by one trading day while keeping the latest edge', () => {
    const data = createMarketData()
    const current = buildVisibleSeries(data, 'day')
    const older = expandWindow(data, current, 'right', 78)

    expect(formatWindowRange(current)).toBe('05/31 21:30 - 06/30 03:55')
    expect(formatWindowRange(older.view)).toBe('05/30 21:30 - 06/30 03:55')
    expect(older.view.rawPoints.length).toBeGreaterThan(current.rawPoints.length)
    expect(older.view.visiblePoints.length).toBeLessThanOrEqual(getRange('day').targetPoints)
  })

  it('expands by raw point count so short drags can still reveal more data', () => {
    const data = createMarketData()
    const current = buildVisibleSeries(data, 'fiveDay')
    const older = expandWindow(data, current, 'right', 6)

    expect(older.view.windowStart).toBe(current.windowStart - 6)
    expect(older.view.windowEnd).toBe(current.windowEnd)
    expect(older.view.rawPoints.length).toBe(current.rawPoints.length + 6)
  })

  it('detects drag starts inside the filled area below the curved price line', () => {
    const points = [
      { timestamp: 1, price: 10, volume: 1, turnover: 1 },
      { timestamp: 2, price: 15, volume: 1, turnover: 1 },
      { timestamp: 3, price: 20, volume: 1, turnover: 1 },
    ]
    const geometry = { left: 0, right: 200, top: 0, bottom: 100, minPrice: 10, maxPrice: 20 }

    expect(isPointInPriceArea({ x: 100, y: 80 }, points, geometry)).toBe(true)
    expect(isPointInPriceArea({ x: 100, y: 20 }, points, geometry)).toBe(false)
    expect(isPointInPriceArea({ x: 250, y: 80 }, points, geometry)).toBe(false)
  })

  it('detects drag starts inside the whitespace above the curved price line', () => {
    const points = [
      { timestamp: 1, price: 10, volume: 1, turnover: 1 },
      { timestamp: 2, price: 15, volume: 1, turnover: 1 },
      { timestamp: 3, price: 20, volume: 1, turnover: 1 },
    ]
    const geometry = { left: 0, right: 200, top: 0, bottom: 100, minPrice: 10, maxPrice: 20 }

    expect(isPointInPriceWhitespace({ x: 100, y: 20 }, points, geometry)).toBe(true)
    expect(isPointInPriceWhitespace({ x: 100, y: 80 }, points, geometry)).toBe(false)
    expect(isPointInPriceWhitespace({ x: 250, y: 20 }, points, geometry)).toBe(false)
  })

  it('shrinks draggable windows from the opposite edge', () => {
    const data = createMarketData()
    const current = buildVisibleSeries(data, 'fiveDay')
    const trimLeft = shrinkWindow(data, current, 'right', 6)
    const trimRight = shrinkWindow(data, current, 'left', 6)

    expect(trimLeft.view.windowStart).toBe(current.windowStart + 6)
    expect(trimLeft.view.windowEnd).toBe(current.windowEnd)
    expect(trimRight.view.windowStart).toBe(current.windowStart)
    expect(trimRight.view.windowEnd).toBe(current.windowEnd - 6)
  })

  it('formats tooltip rows with trading fields', () => {
    const rows = formatTooltipRows({
      timestamp: Date.UTC(2026, 5, 29, 13, 24),
      price: 25727.843,
      volume: 11816300,
      turnover: 0,
      change: 430.225,
      changePercent: 1.7,
    })

    expect(rows.map((row) => row.label)).toEqual(['时间', '价格', '涨跌额', '涨跌幅', '成交量', '成交额'])
    expect(rows[1].value).toBe('25727.843')
    expect(rows[4].value).toContain('万股')
  })
})
