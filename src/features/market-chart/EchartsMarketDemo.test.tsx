import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'

const echartsMock = vi.hoisted(() => {
  const handlers = new Map<string, (event: unknown) => void>()

  return {
    handlers,
    chart: {
      setOption: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
      getWidth: vi.fn(() => 933),
      getZr: vi.fn(() => ({
        on: vi.fn((eventName: string, handler: (event: unknown) => void) => {
          handlers.set(eventName, handler)
        }),
        off: vi.fn((eventName: string) => {
          handlers.delete(eventName)
        }),
      })),
    },
  }
})

vi.mock('echarts/core', () => ({
  init: vi.fn(() => echartsMock.chart),
  use: vi.fn(),
}))

vi.mock('echarts/charts', () => ({
  BarChart: {},
  LineChart: {},
}))

vi.mock('echarts/components', () => ({
  GridComponent: {},
  LegendComponent: {},
  MarkLineComponent: {},
  TitleComponent: {},
  TooltipComponent: {},
}))

vi.mock('echarts/renderers', () => ({
  CanvasRenderer: {},
}))

afterEach(() => {
  cleanup()
  echartsMock.handlers.clear()
  echartsMock.chart.setOption.mockClear()
  echartsMock.chart.resize.mockClear()
  echartsMock.chart.dispose.mockClear()
  dragStartClientX = 0
  window.history.pushState({}, '', '/')
})

describe('EchartsMarketDemo', () => {
  it('renders the ECharts market demo on the echarts topic route', () => {
    window.history.pushState({}, '', '/topics/echarts')

    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: /纳斯达克综合指数/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '分时' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTestId('market-chart')).toBeInTheDocument()
    expect(screen.getByText(/分时图不支持拖拽/i)).toBeInTheDocument()
  })

  it('switches ranges and shows reback after a drag gesture inside the filled price area', () => {
    window.history.pushState({}, '', '/topics/echarts')

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '5日' }))
    expect(screen.getByRole('button', { name: '5日' })).toHaveAttribute('aria-pressed', 'true')

    dragInPriceArea(320, 420)

    expect(screen.getByRole('button', { name: /恢复拖拽前视图/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /恢复拖拽前视图/i }))
    expect(screen.queryByRole('button', { name: /恢复拖拽前视图/i })).not.toBeInTheDocument()
  })

  it('expands the daily window to older data when dragging the filled price area right', () => {
    window.history.pushState({}, '', '/topics/echarts')

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '日K' }))
    expect(screen.getByTestId('window-range')).toHaveTextContent('05/31')

    startDragInPriceArea(320)
    moveDragInPriceArea(420)

    expect(screen.getByTestId('window-range')).toHaveTextContent('05/30')
    expect(screen.getByTestId('window-range')).toHaveTextContent('06/30')
    expect(echartsMock.chart.setOption.mock.calls.some(([option]) => option.animation === false)).toBe(true)

    endDragInPriceArea(420)
  })

  it('ignores drags above the filled price area', () => {
    window.history.pushState({}, '', '/topics/echarts')

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '日K' }))
    dragInChart({ startClientX: 320, endClientX: 420, offsetX: 320, offsetY: 20 })

    expect(screen.getByTestId('window-range')).toHaveTextContent('05/31')
    expect(screen.queryByRole('button', { name: /恢复拖拽前视图/i })).not.toBeInTheDocument()
  })
})

function dragInPriceArea(startClientX: number, endClientX: number) {
  startDragInPriceArea(startClientX)
  moveDragInPriceArea(endClientX)
  endDragInPriceArea(endClientX)
}

let dragStartClientX = 0

function startDragInPriceArea(startClientX: number) {
  dragStartClientX = startClientX

  act(() => {
    echartsMock.handlers.get('mousedown')?.({
      offsetX: 780,
      offsetY: 280,
      event: { clientX: startClientX },
    })
  })
}

function moveDragInPriceArea(clientX: number) {
  act(() => {
    echartsMock.handlers.get('mousemove')?.({
      offsetX: 780 + clientX - dragStartClientX,
      offsetY: 280,
      event: { clientX },
    })
  })
}

function endDragInPriceArea(clientX: number) {
  act(() => {
    echartsMock.handlers.get('mouseup')?.({
      offsetX: 780 + clientX - dragStartClientX,
      offsetY: 280,
      event: { clientX },
    })
  })
}

function dragInChart({
  startClientX,
  endClientX,
  offsetX,
  offsetY,
}: {
  startClientX: number
  endClientX: number
  offsetX: number
  offsetY: number
}) {
  act(() => {
    echartsMock.handlers.get('mousedown')?.({
      offsetX,
      offsetY,
      event: { clientX: startClientX },
    })
    echartsMock.handlers.get('mousemove')?.({
      offsetX: offsetX + endClientX - startClientX,
      offsetY,
      event: { clientX: endClientX },
    })
    echartsMock.handlers.get('mouseup')?.({
      offsetX: offsetX + endClientX - startClientX,
      offsetY,
      event: { clientX: endClientX },
    })
  })
}
