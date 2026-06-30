import { describe, expect, it } from 'vitest'
import {
  buildVisibleSeries,
  createMarketData,
  downsampleAveragePoints,
  formatTooltipRows,
  getRange,
  getTrend,
  panWindow,
  rangeKeys,
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

  it('pans draggable windows and reports boundary rebounds', () => {
    const data = createMarketData()
    const current = buildVisibleSeries(data, 'fiveDay')
    const older = panWindow(data, current, 'right')
    const newer = panWindow(data, older.view, 'left')
    const intraday = buildVisibleSeries(data, 'intraday')

    expect(older.view.windowStart).toBeLessThan(current.windowStart)
    expect(newer.view.windowStart).toBe(current.windowStart)
    expect(panWindow(data, intraday, 'right')).toMatchObject({ rebounded: true })
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
