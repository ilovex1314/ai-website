import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'

afterEach(() => {
  cleanup()
  window.history.pushState({}, '', '/')
})

describe('App', () => {
  it('renders the demo gallery home with all planned topics', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { name: /AI Website Demo Lab/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(8)
    expect(screen.getByRole('link', { name: /ECharts/i })).toHaveAttribute(
      'href',
      '/topics/echarts',
    )
    expect(
      screen.getByRole('link', { name: /Matter\.js Physics Lab/i }),
    ).toBeInTheDocument()
  })

  it('renders a topic detail page from the URL slug', () => {
    window.history.pushState({}, '', '/topics/matterjs')

    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: /Matter\.js Physics Lab/i }),
    ).toBeInTheDocument()
    expect(screen.getAllByText(/free fall/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /Back to roadmap/i })).toHaveAttribute(
      'href',
      '/',
    )
  })
})
