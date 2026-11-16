import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { LuckyDrawPage } from './LuckyDrawPage'

const storageKey = 'ai-website:lucky-draw:v1'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  cleanup()
})

describe('LuckyDrawPage', () => {
  it('starts with two functional zones and drawing disabled', () => {
    render(<LuckyDrawPage />)

    expect(screen.getByRole('heading', { name: '领取号码牌' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '随机开奖' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '开始抽奖' })).toBeDisabled()
    expect(screen.getByText('还没有人领取')).toBeInTheDocument()
  })

  it('issues consecutive tickets and saves the current pool', async () => {
    const user = userEvent.setup()
    render(<LuckyDrawPage />)

    await user.click(screen.getByRole('button', { name: '领取下一个号码' }))
    await user.click(screen.getByRole('button', { name: '领取下一个号码' }))

    const claimZone = screen.getByLabelText('领取号码牌功能区')
    expect(within(claimZone).getByText('02')).toBeInTheDocument()
    expect(screen.getByText('2 人已领取')).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(storageKey) ?? '{}')).toEqual({
      issuedCount: 2,
      lastTicket: 2,
      winner: null,
    })
  })

  it('draws only from the issued range', async () => {
    const user = userEvent.setup()
    render(<LuckyDrawPage random={() => 0.5} />)

    const claimButton = screen.getByRole('button', { name: '领取下一个号码' })
    await user.click(claimButton)
    await user.click(claimButton)
    await user.click(claimButton)
    await user.click(screen.getByRole('button', { name: '开始抽奖' }))

    const drawZone = screen.getByLabelText('随机开奖功能区')
    expect(within(drawZone).getByLabelText('中奖号码 02')).toBeInTheDocument()
    expect(within(drawZone).getByText('中奖号码')).toBeInTheDocument()
  })

  it('restores a valid saved raffle on reload', () => {
    window.localStorage.setItem(
      storageKey,
      '{"issuedCount":80,"lastTicket":80,"winner":37}',
    )

    render(<LuckyDrawPage />)

    expect(screen.getByText('80 人已领取')).toBeInTheDocument()
    const drawZone = screen.getByLabelText('随机开奖功能区')
    expect(within(drawZone).getByText('37')).toBeInTheDocument()
  })

  it('resets the raffle and clears browser persistence', async () => {
    const user = userEvent.setup()
    render(<LuckyDrawPage />)

    await user.click(screen.getByRole('button', { name: '领取下一个号码' }))
    await user.click(screen.getByRole('button', { name: '重置号码池' }))

    expect(screen.getByText('还没有人领取')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '开始抽奖' })).toBeDisabled()
    expect(window.localStorage.getItem(storageKey)).toBeNull()
  })
})
