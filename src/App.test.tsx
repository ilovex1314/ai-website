import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  window.history.pushState({}, '', '/')
})

describe('App', () => {
  it('renders the Chinese demo directory home with all planned topics', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /AI 网站案例实验室/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(8)
    expect(screen.getByRole('link', { name: /ECharts 互动图表/i })).toHaveAttribute(
      'href',
      '/topics/echarts',
    )
    expect(
      screen.getByRole('link', { name: /Matter\.js 物理实验室/i }),
    ).toBeInTheDocument()
  })

  it('renders a topic detail page from the URL slug', () => {
    window.history.pushState({}, '', '/topics/matterjs')

    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: /Matter\.js 物理实验室/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/自由落体/).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /返回目录/i })).toHaveAttribute(
      'href',
      '/',
    )
  })

  it('renders the Spline product showcase from the URL slug', () => {
    window.history.pushState({}, '', '/topics/spline')

    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: /Action 6 灵感 3D 产品展示/ }),
    ).toBeInTheDocument()
    expect(screen.getByText(/Action 6 灵感原创模型/)).toBeInTheDocument()
    expect(screen.getAllByText(/ORIGINAL DEMO MODEL/).length).toBeGreaterThan(0)
    expect(screen.getByText(/拖拽旋转，hover 部件查看详情/)).toBeInTheDocument()
    expect(screen.getByLabelText(/热点：可变光圈镜头模组/)).toBeInTheDocument()
  })
})
