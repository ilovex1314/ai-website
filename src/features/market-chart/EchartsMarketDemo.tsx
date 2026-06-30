import { useEffect, useMemo, useRef, useState } from 'react'
import { BarChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  MarkLineComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components'
import { init, use as echartsUse } from 'echarts/core'
import type { EChartsType } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import {
  buildVisibleSeries,
  createMarketData,
  formatTooltipRows,
  formatTime,
  getTrend,
  panWindow,
  rangeKeys,
  type MarketPoint,
  type RangeKey,
  type VisibleSeries,
} from './marketModel'
import './EchartsMarketDemo.css'

echartsUse([
  LineChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  TitleComponent,
  MarkLineComponent,
  CanvasRenderer,
])

export function EchartsMarketDemo() {
  const data = useMemo(() => createMarketData(), [])
  const [rangeKey, setRangeKey] = useState<RangeKey>('intraday')
  const [view, setView] = useState(() => buildVisibleSeries(data, 'intraday'))
  const [rebackView, setRebackView] = useState<VisibleSeries | null>(null)
  const [rebound, setRebound] = useState(false)
  const pointerStartX = useRef<number | null>(null)

  const trend = getTrend(view.visiblePoints)
  const latestPoint = view.visiblePoints.at(-1)!
  const firstPoint = view.visiblePoints[0] ?? latestPoint
  const rangeChange = latestPoint.price - firstPoint.price
  const rangeChangePercent = firstPoint.price === 0 ? 0 : (rangeChange / firstPoint.price) * 100

  function selectRange(nextRange: RangeKey) {
    setRangeKey(nextRange)
    setView(buildVisibleSeries(data, nextRange))
    setRebackView(null)
    setRebound(false)
  }

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    pointerStartX.current = event.clientX
    event.currentTarget.setPointerCapture?.(event.pointerId)
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (pointerStartX.current === null) {
      return
    }

    const delta = event.clientX - pointerStartX.current
    pointerStartX.current = null

    applyDragDelta(delta)
  }

  function handleMouseDown(event: React.MouseEvent<HTMLDivElement>) {
    pointerStartX.current = event.clientX
  }

  function handleMouseUp(event: React.MouseEvent<HTMLDivElement>) {
    if (pointerStartX.current === null) {
      return
    }

    const delta = event.clientX - pointerStartX.current
    pointerStartX.current = null
    applyDragDelta(delta)
  }

  function applyDragDelta(delta: number) {
    if (Math.abs(delta) < 24) {
      return
    }

    if (!view.range.draggable) {
      flashRebound()
      return
    }

    const direction = delta < 0 ? 'left' : 'right'
    const next = panWindow(data, view, direction)

    if (!rebackView && !next.rebounded) {
      setRebackView(view)
    }

    setView(next.view)

    if (next.rebounded) {
      flashRebound()
    }
  }

  function flashRebound() {
    setRebound(true)
    window.setTimeout(() => setRebound(false), 260)
  }

  return (
    <main className="market-page">
      <a className="market-back" href="/">
        Back to roadmap
      </a>

      <section className="market-summary">
        <div>
          <p className="market-crumb">美股市场 / 个股详情</p>
          <h1>纳斯达克综合指数 (.IXIC)</h1>
          <div className="market-price" style={{ color: trend.color }}>
            {latestPoint.price.toFixed(3)}
            <span>{rangeChange >= 0 ? '↑' : '↓'}</span>
          </div>
          <p className="market-change" style={{ color: trend.color }}>
            {signed(rangeChange, 3)} {signed(rangeChangePercent, 2)}%
            <span> 收盘价 {formatTime(latestPoint.timestamp)} (美东)</span>
          </p>
        </div>
        <dl>
          <div>
            <dt>最高价</dt>
            <dd style={{ color: trend.color }}>{maxPrice(view.rawPoints).toFixed(3)}</dd>
          </div>
          <div>
            <dt>最低价</dt>
            <dd>{minPrice(view.rawPoints).toFixed(3)}</dd>
          </div>
        </dl>
      </section>

      <section className="market-card">
        <header className="market-card-header">
          <div>
            <p className="market-crumb">ECharts Demo</p>
            <h2>纳斯达克综合指数 (.IXIC) 今日走势</h2>
          </div>
          {rebackView ? (
            <button
              className="reback-button"
              type="button"
              aria-label="恢复拖拽前视图"
              onClick={() => {
                setView(rebackView)
                setRebackView(null)
                setRebound(false)
              }}
            >
              ↺
            </button>
          ) : null}
        </header>

        <div className="range-tabs" aria-label="行情范围">
          {rangeKeys.map((key) => {
            const range = buildVisibleSeries(data, key).range
            return (
              <button
                key={key}
                type="button"
                aria-pressed={rangeKey === key}
                onClick={() => selectRange(key)}
              >
                {range.label}
              </button>
            )
          })}
        </div>

        <p className="drag-hint">
          {view.range.draggable
            ? '拖拽价格图与成交量图之间的区域：向右看更早，向左看更新。'
            : '分时图不支持拖拽，切换到 5日 / 日K / 周K 等范围后可拖拽。'}
        </p>

        <div className={`chart-shell ${rebound ? 'is-rebounding' : ''}`}>
          <MarketChart view={view} trendColor={trend.color} trendSoftColor={trend.softColor} />
          <div
            className="drag-surface"
            data-testid="drag-surface"
            role="presentation"
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
          />
        </div>
      </section>
    </main>
  )
}

function MarketChart({
  view,
  trendColor,
  trendSoftColor,
}: {
  view: VisibleSeries
  trendColor: string
  trendSoftColor: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<EChartsType | null>(null)

  useEffect(() => {
    if (!containerRef.current) {
      return
    }

    chartRef.current = init(containerRef.current)
    const chart = chartRef.current
    const resizeObserver =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            chart.resize()
          })

    if (resizeObserver) {
      resizeObserver.observe(containerRef.current)
    }

    return () => {
      resizeObserver?.disconnect()
      chart.dispose()
      chartRef.current = null
    }
  }, [])

  useEffect(() => {
    chartRef.current?.setOption(buildChartOption(view, trendColor, trendSoftColor), true)
  }, [view, trendColor, trendSoftColor])

  return <div className="market-chart" data-testid="market-chart" ref={containerRef} />
}

function buildChartOption(view: VisibleSeries, trendColor: string, trendSoftColor: string) {
  const lineData = view.visiblePoints.map((point) => [
    point.timestamp,
    point.price,
    point.volume,
    point.turnover,
    point.change ?? 0,
    point.changePercent ?? 0,
  ])
  const volumeData = view.visiblePoints.map((point) => [point.timestamp, point.volume])

  return {
    animation: true,
    grid: [
      { left: 42, right: 36, top: 18, height: 300 },
      { left: 42, right: 36, top: 342, height: 82 },
    ],
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross',
        lineStyle: { color: '#9ca3af', type: 'dashed' },
      },
      backgroundColor: 'rgba(37, 41, 47, 0.96)',
      borderWidth: 0,
      textStyle: { color: '#f4f6f8' },
      formatter(params: unknown) {
        const firstParam = Array.isArray(params) ? params[0] : params
        const value = (firstParam as { value: number[] }).value
        const point: MarketPoint = {
          timestamp: value[0],
          price: value[1],
          volume: value[2],
          turnover: value[3],
          change: value[4],
          changePercent: value[5],
        }
        return formatTooltipRows(point)
          .map((row) => `<div class="tooltip-row"><span>${row.label}</span><b>${row.value}</b></div>`)
          .join('')
      },
    },
    xAxis: [
      { type: 'time', gridIndex: 0, axisLabel: { hideOverlap: true }, axisLine: { show: false } },
      { type: 'time', gridIndex: 1, axisLabel: { hideOverlap: true }, axisLine: { show: false } },
    ],
    yAxis: [
      { type: 'value', scale: true, gridIndex: 0, splitLine: { lineStyle: { color: '#eef1f4' } } },
      { type: 'value', gridIndex: 1, splitLine: { show: false }, axisLabel: { formatter: volumeLabel } },
    ],
    series: [
      {
        name: '价格',
        type: 'line',
        xAxisIndex: 0,
        yAxisIndex: 0,
        smooth: true,
        symbol: 'none',
        data: lineData,
        lineStyle: { color: trendColor, width: 3 },
        areaStyle: { color: trendSoftColor },
      },
      {
        name: '成交量',
        type: 'bar',
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: volumeData,
        barWidth: 3,
        itemStyle: { color: trendColor },
      },
    ],
  }
}

function maxPrice(points: MarketPoint[]) {
  return Math.max(...points.map((point) => point.price))
}

function minPrice(points: MarketPoint[]) {
  return Math.min(...points.map((point) => point.price))
}

function signed(value: number, digits: number) {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}`
}

function volumeLabel(value: number) {
  if (value >= 100000000) {
    return `${(value / 100000000).toFixed(1)}亿`
  }
  return `${(value / 10000).toFixed(1)}万`
}
