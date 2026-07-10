import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { WorkbenchServiceError } from './projectRepository.js'

const execFileAsync = promisify(execFile)

type FfprobeStream = {
  codec_name?: string
  codec_type?: string
  width?: number
  height?: number
  avg_frame_rate?: string
  r_frame_rate?: string
  duration?: string
  nb_frames?: string
}

type FfprobeOutput = {
  streams?: FfprobeStream[]
  format?: {
    duration?: string
  }
}

export type MediaMetadata = {
  width: number
  height: number
  durationSeconds: number
  durationFrames: number
  fps: number
  hasAudio: boolean
  codec: string
}

function rational(value: string | undefined): number {
  if (value === undefined) {
    return 0
  }

  const [numerator, denominator = 1] = value.split('/').map(Number)
  return denominator === 0 ? 0 : numerator / denominator
}

function undecodable(path: string, detail?: string): WorkbenchServiceError {
  return new WorkbenchServiceError({
    code: 'MEDIA_UNDECODABLE',
    stage: 'import',
    message: `FFprobe could not decode media metadata${detail ? `: ${detail}` : ''}`,
    subject: path,
    recovery: 'Re-encode the file with FFmpeg to a supported video format, then upload it again.',
  })
}

export async function probeMedia(path: string): Promise<MediaMetadata> {
  let output: FfprobeOutput

  try {
    const { stdout } = await execFileAsync(
      'ffprobe',
      ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path],
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
    )
    output = JSON.parse(stdout) as FfprobeOutput
  } catch (error) {
    throw undecodable(path, error instanceof Error ? error.message : String(error))
  }

  const streams = output.streams ?? []
  const video = streams.find((stream) => stream.codec_type === 'video')

  if (video === undefined || !video.width || !video.height || !video.codec_name) {
    throw undecodable(path, 'no decodable video stream was found')
  }

  const fps = rational(video.avg_frame_rate) || rational(video.r_frame_rate)
  const durationSeconds = Number(video.duration ?? output.format?.duration)
  const declaredFrames = Number(video.nb_frames)

  if (!Number.isFinite(fps) || fps <= 0 || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw undecodable(path, 'duration or frame rate metadata is missing')
  }

  return {
    width: video.width,
    height: video.height,
    durationSeconds,
    durationFrames:
      Number.isInteger(declaredFrames) && declaredFrames > 0
        ? declaredFrames
        : Math.round(durationSeconds * fps),
    fps,
    hasAudio: streams.some((stream) => stream.codec_type === 'audio'),
    codec: video.codec_name,
  }
}
