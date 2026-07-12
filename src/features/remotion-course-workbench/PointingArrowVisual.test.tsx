import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PointingArrowVisual } from './PointingArrowVisual'

afterEach(cleanup)

describe('PointingArrowVisual', () => {
  it.each([
    ['straight', 'M 8 84 L 92 16'],
    ['curve', 'M 8 84 Q 48 4 92 16'],
    ['elbow', 'M 8 84 L 56 84 L 56 16 L 92 16'],
  ] as const)('renders the %s arrow path', (shape, path) => {
    render(<PointingArrowVisual color="#ef4444" shape={shape} />)

    expect(screen.getByTestId('pointing-arrow-path')).toHaveAttribute('d', path)
    expect(screen.getByTestId('pointing-arrow-visual')).toHaveAttribute('data-arrow-shape', shape)
  })

  it('maps a calibrated custom image between its tail and tip anchors', () => {
    render(
      <PointingArrowVisual
        color="#2563eb"
        imageUrl="data:image/png;base64,AA=="
        shape="custom-image"
        sourceTail={{ x: 0.1, y: 0.5 }}
        sourceTip={{ x: 0.9, y: 0.5 }}
      />,
    )

    expect(screen.getByTestId('pointing-arrow-image')).toHaveAttribute('href', 'data:image/png;base64,AA==')
    expect(screen.getByTestId('pointing-arrow-image').getAttribute('transform')).toContain('matrix(')
  })
})
