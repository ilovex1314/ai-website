import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'

vi.mock('echarts/core', () => ({
  init: vi.fn(() => ({
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  })),
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

  it('switches ranges and shows reback after a drag gesture', () => {
    window.history.pushState({}, '', '/topics/echarts')

    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: '5日' }))
    expect(screen.getByRole('button', { name: '5日' })).toHaveAttribute('aria-pressed', 'true')

    const dragSurface = screen.getByTestId('drag-surface')
    fireEvent.pointerDown(dragSurface, { clientX: 320, pointerId: 1 })
    fireEvent.pointerUp(dragSurface, { clientX: 420, pointerId: 1 })

    expect(screen.getByRole('button', { name: /恢复拖拽前视图/i })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /恢复拖拽前视图/i }))
    expect(screen.queryByRole('button', { name: /恢复拖拽前视图/i })).not.toBeInTheDocument()
  })
})
