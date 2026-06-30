export type RangeKey = 'intraday' | 'fiveDay' | 'day' | 'week' | 'month' | 'quarter' | 'year'

export type MarketPoint = {
  timestamp: number
  price: number
  volume: number
  turnover: number
  change?: number
  changePercent?: number
}

export type MarketRange = {
  key: RangeKey
  label: string
  days: number
  targetPoints: number
  draggable: boolean
  panStepDays: number
}

export type VisibleSeries = {
  range: MarketRange
  rawPoints: MarketPoint[]
  visiblePoints: MarketPoint[]
  windowStart: number
  windowEnd: number
}

export type PanDirection = 'left' | 'right'

export type PriceAreaGeometry = {
  left: number
  right: number
  top: number
  bottom: number
  minPrice: number
  maxPrice: number
}

export const rangeKeys: RangeKey[] = [
  'intraday',
  'fiveDay',
  'day',
  'week',
  'month',
  'quarter',
  'year',
]

const ranges: Record<RangeKey, MarketRange> = {
  intraday: {
    key: 'intraday',
    label: '分时',
    days: 1,
    targetPoints: 240,
    draggable: false,
    panStepDays: 0,
  },
  fiveDay: {
    key: 'fiveDay',
    label: '5日',
    days: 5,
    targetPoints: 390,
    draggable: true,
    panStepDays: 1,
  },
  day: {
    key: 'day',
    label: '日K',
    days: 30,
    targetPoints: 240,
    draggable: true,
    panStepDays: 1,
  },
  week: {
    key: 'week',
    label: '周K',
    days: 120,
    targetPoints: 220,
    draggable: true,
    panStepDays: 5,
  },
  month: {
    key: 'month',
    label: '月K',
    days: 365,
    targetPoints: 220,
    draggable: true,
    panStepDays: 20,
  },
  quarter: {
    key: 'quarter',
    label: '季K',
    days: 730,
    targetPoints: 200,
    draggable: true,
    panStepDays: 60,
  },
  year: {
    key: 'year',
    label: '年K',
    days: 1825,
    targetPoints: 200,
    draggable: true,
    panStepDays: 120,
  },
}

const minute = 60 * 1000
const sampleIntervalMinutes = 5
const tradingDayMinutes = 78
const dayMs = 24 * 60 * minute
const latestTradingClose = Date.UTC(2026, 5, 29, 16, 0)

export function getRange(key: RangeKey) {
  return ranges[key]
}

export function createMarketData(): MarketPoint[] {
  const points: MarketPoint[] = []
  const firstTradingDayOpen = latestTradingClose - 1899 * dayMs + 9.5 * 60 * minute
  let previousClose = 25240

  for (let day = 0; day < 1900; day += 1) {
    const dayOpen = firstTradingDayOpen + day * dayMs
    const base = 25240 + day * 0.28 + Math.sin(day / 23) * 260 + Math.cos(day / 71) * 120
    let price = base

    for (let minuteIndex = 0; minuteIndex < tradingDayMinutes; minuteIndex += 1) {
      const timestamp = dayOpen + minuteIndex * sampleIntervalMinutes * minute
      const wave = Math.sin((day * 17 + minuteIndex) / 13) * 7
      const pulse = Math.cos((day * 11 + minuteIndex) / 29) * 4
      const lateSessionLift = minuteIndex > 260 ? (minuteIndex - 260) * 0.018 : 0
      price = base + wave + pulse + lateSessionLift + Math.sin(minuteIndex / 57) * 18
      const volume = Math.round(18000 + Math.abs(Math.sin(timestamp / 8_640_000)) * 62000)
      const turnover = volume * price
      const change = price - previousClose

      points.push({
        timestamp,
        price: round(price, 3),
        volume,
        turnover: round(turnover, 2),
        change: round(change, 3),
        changePercent: round((change / previousClose) * 100, 2),
      })
    }

    previousClose = price
  }

  return points
}

export function downsampleAveragePoints(points: MarketPoint[], targetPoints: number) {
  if (points.length <= targetPoints) {
    return points
  }

  const bucketSize = Math.ceil(points.length / targetPoints)
  const result: MarketPoint[] = []

  for (let index = 0; index < points.length; index += bucketSize) {
    const bucket = points.slice(index, index + bucketSize)
    const midpoint = bucket[Math.floor(bucket.length / 2)]
    const price = average(bucket.map((point) => point.price))
    const volume = sum(bucket.map((point) => point.volume))
    const turnover = sum(bucket.map((point) => point.turnover))
    const averaged: MarketPoint = {
      timestamp: midpoint.timestamp,
      price: round(price, 3),
      volume,
      turnover: round(turnover, 2),
    }

    if (bucket.some((point) => point.change !== undefined)) {
      averaged.change = round(average(bucket.map((point) => point.change ?? 0)), 3)
    }

    if (bucket.some((point) => point.changePercent !== undefined)) {
      averaged.changePercent = round(average(bucket.map((point) => point.changePercent ?? 0)), 2)
    }

    result.push(averaged)
  }

  return result
}

export function buildVisibleSeries(
  data: MarketPoint[],
  rangeKey: RangeKey,
  requestedStart?: number,
  requestedEnd?: number,
): VisibleSeries {
  const range = getRange(rangeKey)
  const defaultWindowSize = range.days * tradingDayMinutes
  const defaultStart = Math.max(0, data.length - defaultWindowSize)
  const start = clamp(requestedStart ?? defaultStart, 0, data.length - 1)
  const end = clamp(requestedEnd ?? data.length, start + 1, data.length)
  const rawPoints = data.slice(start, end)
  const visiblePoints = downsampleAveragePoints(rawPoints, range.targetPoints)

  return {
    range,
    rawPoints,
    visiblePoints,
    windowStart: start,
    windowEnd: end,
  }
}

export function expandWindow(
  data: MarketPoint[],
  current: VisibleSeries,
  direction: PanDirection,
  pointCount = 1,
) {
  if (!current.range.draggable) {
    return { view: current, rebounded: true }
  }

  const step = Math.max(1, Math.round(pointCount))
  const nextStart = direction === 'right' ? current.windowStart - step : current.windowStart
  const nextEnd = direction === 'left' ? current.windowEnd + step : current.windowEnd
  const clampedStart = clamp(nextStart, 0, current.windowEnd - 1)
  const clampedEnd = clamp(nextEnd, clampedStart + 1, data.length)
  const rebounded = nextStart !== clampedStart || nextEnd !== clampedEnd

  return {
    view: buildVisibleSeries(data, current.range.key, clampedStart, clampedEnd),
    rebounded,
  }
}

export function isPointInPriceArea(
  point: { x: number; y: number },
  visiblePoints: MarketPoint[],
  geometry: PriceAreaGeometry,
) {
  if (
    visiblePoints.length < 2 ||
    point.x < geometry.left ||
    point.x > geometry.right ||
    point.y < geometry.top ||
    point.y > geometry.bottom
  ) {
    return false
  }

  const xRatio = (point.x - geometry.left) / (geometry.right - geometry.left)
  const pointIndex = clamp(Math.round(xRatio * (visiblePoints.length - 1)), 0, visiblePoints.length - 1)
  const lineY = priceToY(visiblePoints[pointIndex].price, geometry)

  return point.y >= lineY && point.y <= geometry.bottom
}

export function formatWindowRange(view: VisibleSeries) {
  const first = view.rawPoints[0]
  const last = view.rawPoints.at(-1)

  if (!first || !last) {
    return ''
  }

  return `${formatDate(first.timestamp)} - ${formatDate(last.timestamp)}`
}

export function getTrend(points: MarketPoint[]) {
  const first = points[0]?.price ?? 0
  const last = points.at(-1)?.price ?? first
  const direction = last >= first ? 'up' : 'down'

  return {
    direction,
    color: direction === 'up' ? '#f0445f' : '#16a779',
    softColor: direction === 'up' ? 'rgba(240, 68, 95, 0.18)' : 'rgba(22, 167, 121, 0.18)',
  }
}

export function formatTooltipRows(point: MarketPoint) {
  return [
    { label: '时间', value: formatTime(point.timestamp) },
    { label: '价格', value: point.price.toFixed(3) },
    { label: '涨跌额', value: signed(point.change ?? 0, 3) },
    { label: '涨跌幅', value: `${signed(point.changePercent ?? 0, 2)}%` },
    { label: '成交量', value: `${(point.volume / 10000).toFixed(2)}万股` },
    { label: '成交额', value: point.turnover > 0 ? `${(point.turnover / 100000000).toFixed(2)}亿` : '0.00' },
  ]
}

export function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/New_York',
  }).format(timestamp)
}

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/New_York',
  }).format(timestamp)
}

function average(values: number[]) {
  return sum(values) / values.length
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0)
}

function round(value: number, digits: number) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function priceToY(price: number, geometry: PriceAreaGeometry) {
  if (geometry.maxPrice === geometry.minPrice) {
    return geometry.bottom
  }

  const priceRatio = (price - geometry.minPrice) / (geometry.maxPrice - geometry.minPrice)
  return geometry.bottom - priceRatio * (geometry.bottom - geometry.top)
}

function signed(value: number, digits: number) {
  const prefix = value > 0 ? '+' : ''
  return `${prefix}${value.toFixed(digits)}`
}
