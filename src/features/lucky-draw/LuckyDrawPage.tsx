import { useState } from 'react'
import {
  claimNextTicket,
  drawWinningTicket,
  emptyRaffleState,
  parseRaffleState,
  type RaffleState,
} from './raffleModel'
import './LuckyDrawPage.css'

const storageKey = 'ai-website:lucky-draw:v1'

function readSavedState(): RaffleState {
  try {
    return parseRaffleState(window.localStorage.getItem(storageKey))
  } catch {
    return emptyRaffleState
  }
}

function saveState(state: RaffleState): void {
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(state))
  } catch {
    // The raffle remains usable when browser storage is unavailable.
  }
}

function formatTicket(ticket: number | null): string {
  return ticket === null ? '--' : String(ticket).padStart(2, '0')
}

type LuckyDrawPageProps = {
  random?: () => number
}

export function LuckyDrawPage({ random = Math.random }: LuckyDrawPageProps) {
  const [raffle, setRaffle] = useState(readSavedState)

  const claimTicket = () => {
    const next = claimNextTicket(raffle)
    setRaffle(next)
    saveState(next)
  }

  const drawWinner = () => {
    const next = drawWinningTicket(raffle, random)
    setRaffle(next)
    saveState(next)
  }

  const resetRaffle = () => {
    setRaffle(emptyRaffleState)

    try {
      window.localStorage.removeItem(storageKey)
    } catch {
      // State is still reset for the current session.
    }
  }

  const participantLabel = raffle.issuedCount === 0
    ? '还没有人领取'
    : `${raffle.issuedCount} 人已领取`

  return (
    <main className="lucky-draw-page">
      <div className="lucky-draw-orb lucky-draw-orb-one" aria-hidden="true" />
      <div className="lucky-draw-orb lucky-draw-orb-two" aria-hidden="true" />

      <nav className="lucky-draw-nav" aria-label="页面导航">
        <a href="/" className="lucky-draw-back">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          返回案例目录
        </a>
        <span className="local-mode-badge">
          <span aria-hidden="true" />
          本机模式
        </span>
      </nav>

      <header className="lucky-draw-hero">
        <p className="lucky-draw-kicker">LUCKY NUMBER · LIVE DRAW</p>
        <h1>幸运号码抽奖</h1>
        <p className="lucky-draw-intro">
          先按顺序领取专属号码，再从所有已领取号码中随机抽出今天的幸运得主。
        </p>
        <div className="participant-status" role="status" aria-live="polite">
          <span aria-hidden="true" />
          {participantLabel}
        </div>
      </header>

      <div className="lucky-draw-grid">
        <section className="raffle-zone claim-zone" aria-label="领取号码牌功能区">
          <div className="zone-heading">
            <span className="zone-index">01</span>
            <div>
              <p>GET YOUR NUMBER</p>
              <h2>领取号码牌</h2>
            </div>
          </div>

          <p className="zone-description">
            每次点击自动发放下一个连续号码，号码不会重复。
          </p>

          <div className="ticket-card" aria-label="最近领取的号码">
            <span className="ticket-label">YOUR NUMBER</span>
            <strong>{formatTicket(raffle.lastTicket)}</strong>
            <span className="ticket-caption">
              {raffle.lastTicket === null ? '等待领取' : '请记住你的号码'}
            </span>
          </div>

          <button className="raffle-button claim-button" type="button" onClick={claimTicket}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7.5h16v9H4z" />
              <path d="M8 7.5v9M16 7.5v9M12 10v4" />
            </svg>
            领取下一个号码
          </button>
        </section>

        <section className="raffle-zone draw-zone" aria-label="随机开奖功能区">
          <div className="zone-heading">
            <span className="zone-index">02</span>
            <div>
              <p>DRAW A WINNER</p>
              <h2>随机开奖</h2>
            </div>
          </div>

          <p className="zone-description">
            从 1 到当前最大号码中公平随机抽取一个幸运号码。
          </p>

          <div className={`winner-stage${raffle.winner === null ? '' : ' has-winner'}`}>
            <svg className="winner-mark" viewBox="0 0 24 24" aria-hidden="true">
              <path d="m12 3 2.4 5.2 5.6.7-4.1 3.9 1.1 5.6-5-2.8-5 2.8 1.1-5.6L4 8.9l5.6-.7L12 3Z" />
            </svg>
            <span>{raffle.winner === null ? '等待开奖' : '中奖号码'}</span>
            <strong
              aria-label={raffle.winner === null ? '尚未开奖' : `中奖号码 ${formatTicket(raffle.winner)}`}
              aria-live="assertive"
            >
              {formatTicket(raffle.winner)}
            </strong>
            <small>
              {raffle.issuedCount === 0
                ? '领取号码后即可开始'
                : `抽取范围 1 — ${raffle.issuedCount}`}
            </small>
          </div>

          <button
            className="raffle-button draw-button"
            type="button"
            onClick={drawWinner}
            disabled={raffle.issuedCount === 0}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
              <circle cx="12" cy="12" r="3.5" />
            </svg>
            开始抽奖
          </button>
        </section>
      </div>

      <footer className="lucky-draw-footer">
        <p>号码池仅保存在当前浏览器，不会同步到其他设备。</p>
        <button
          type="button"
          className="reset-button"
          onClick={resetRaffle}
          disabled={raffle.issuedCount === 0}
        >
          重置号码池
        </button>
      </footer>
    </main>
  )
}
