export type AnimationChannel = 'overlay' | 'translate' | 'scale' | 'rotate'

export type AnimationConflictEntry = {
  id: string
  elementId: string
  fromFrame: number
  durationFrames: number
  channels: readonly AnimationChannel[]
}

export type AnimationConflict = {
  candidateId: string
  conflictingId: string
  channel: Exclude<AnimationChannel, 'overlay'>
  fromFrame: number
  toFrame: number
}

const exclusiveChannels = new Set<AnimationChannel>(['translate', 'scale', 'rotate'])

export function findAnimationConflicts(
  candidate: AnimationConflictEntry,
  existing: AnimationConflictEntry[],
): AnimationConflict[] {
  const candidateEnd = candidate.fromFrame + candidate.durationFrames

  return existing.flatMap((entry) => {
    if (entry.id === candidate.id || entry.elementId !== candidate.elementId) {
      return []
    }

    const overlapFrom = Math.max(candidate.fromFrame, entry.fromFrame)
    const overlapTo = Math.min(candidateEnd, entry.fromFrame + entry.durationFrames)

    if (overlapFrom >= overlapTo) {
      return []
    }

    return candidate.channels.flatMap((channel) =>
      exclusiveChannels.has(channel) && entry.channels.includes(channel)
        ? [{
            candidateId: candidate.id,
            conflictingId: entry.id,
            channel: channel as Exclude<AnimationChannel, 'overlay'>,
            fromFrame: overlapFrom,
            toFrame: overlapTo,
          }]
        : [],
    )
  })
}
