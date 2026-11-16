export type RaffleState = {
  issuedCount: number
  lastTicket: number | null
  winner: number | null
}

export const emptyRaffleState: RaffleState = {
  issuedCount: 0,
  lastTicket: null,
  winner: null,
}

export function claimNextTicket(state: RaffleState): RaffleState {
  const nextTicket = state.issuedCount + 1

  return {
    issuedCount: nextTicket,
    lastTicket: nextTicket,
    winner: null,
  }
}

export function drawWinningTicket(
  state: RaffleState,
  random: () => number = Math.random,
): RaffleState {
  if (state.issuedCount === 0) {
    return state
  }

  const sample = Math.min(Math.max(random(), 0), 0.999_999_999_999_999_9)

  return {
    ...state,
    winner: Math.floor(sample * state.issuedCount) + 1,
  }
}

export function parseRaffleState(value: string | null): RaffleState {
  if (!value) {
    return emptyRaffleState
  }

  try {
    const parsed: unknown = JSON.parse(value)

    if (typeof parsed !== 'object' || parsed === null) {
      return emptyRaffleState
    }

    const { issuedCount, lastTicket, winner } = parsed as Record<string, unknown>
    const hasValidCount = Number.isSafeInteger(issuedCount) && Number(issuedCount) >= 0
    const hasValidLastTicket = issuedCount === 0
      ? lastTicket === null
      : lastTicket === issuedCount
    const hasValidWinner = winner === null || (
      Number.isSafeInteger(winner)
      && Number(winner) >= 1
      && Number(winner) <= Number(issuedCount)
    )

    if (!hasValidCount || !hasValidLastTicket || !hasValidWinner) {
      return emptyRaffleState
    }

    return {
      issuedCount: Number(issuedCount),
      lastTicket: lastTicket === null ? null : Number(lastTicket),
      winner: winner === null ? null : Number(winner),
    }
  } catch {
    return emptyRaffleState
  }
}
