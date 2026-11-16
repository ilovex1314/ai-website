import { describe, expect, it } from 'vitest'
import {
  claimNextTicket,
  drawWinningTicket,
  emptyRaffleState,
  parseRaffleState,
  type RaffleState,
} from './raffleModel'

describe('raffleModel', () => {
  it('issues consecutive ticket numbers from one', () => {
    const first = claimNextTicket(emptyRaffleState)
    const second = claimNextTicket(first)

    expect(first).toEqual({ issuedCount: 1, lastTicket: 1, winner: null })
    expect(second).toEqual({ issuedCount: 2, lastTicket: 2, winner: null })
  })

  it('maps the random boundaries to ticket one and ticket eighty', () => {
    const state: RaffleState = { issuedCount: 80, lastTicket: 80, winner: null }

    expect(drawWinningTicket(state, () => 0).winner).toBe(1)
    expect(drawWinningTicket(state, () => 0.999_999).winner).toBe(80)
  })

  it('does not create a winner before any ticket is issued', () => {
    expect(drawWinningTicket(emptyRaffleState, () => 0.5)).toEqual(emptyRaffleState)
  })

  it('clears a stale winner when the number pool changes', () => {
    const drawn: RaffleState = { issuedCount: 3, lastTicket: 3, winner: 2 }

    expect(claimNextTicket(drawn)).toEqual({
      issuedCount: 4,
      lastTicket: 4,
      winner: null,
    })
  })

  it.each([
    null,
    '',
    'not-json',
    '{"issuedCount":-1,"lastTicket":0,"winner":null}',
    '{"issuedCount":4,"lastTicket":5,"winner":null}',
    '{"issuedCount":4,"lastTicket":4,"winner":5}',
  ])('recovers malformed persisted state to an empty raffle: %s', (value) => {
    expect(parseRaffleState(value)).toEqual(emptyRaffleState)
  })

  it('restores a valid persisted raffle state', () => {
    expect(
      parseRaffleState('{"issuedCount":80,"lastTicket":80,"winner":37}'),
    ).toEqual({ issuedCount: 80, lastTicket: 80, winner: 37 })
  })
})
