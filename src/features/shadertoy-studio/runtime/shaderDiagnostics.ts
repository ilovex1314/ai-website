import type { ShaderDiagnostic, ShaderProfile, ShaderStage } from './shaderTypes'

const patterns = [
  /^(ERROR|WARNING):\s*\d+:(\d+):\s*(.*)$/u,
  /^\d+:(\d+)\(\d+\):\s*(error|warning):\s*(.*)$/u,
]

export function parseShaderLog(
  raw: string,
  stage: ShaderStage,
  profile: ShaderProfile,
  userLineOffset: number,
): ShaderDiagnostic[] {
  return raw.split('\n').filter(Boolean).map((entry) => {
    const angle = entry.match(patterns[0])
    const mesa = entry.match(patterns[1])
    const compiledLine = Number(angle?.[2] ?? mesa?.[1] ?? 0)
    const level = (angle?.[1] ?? mesa?.[2] ?? 'ERROR').toLowerCase()
    const message = angle?.[3] ?? mesa?.[3] ?? entry
    const mapped = compiledLine > userLineOffset ? compiledLine - userLineOffset : undefined
    return {
      severity: level === 'warning' ? 'warning' : 'error',
      stage,
      profile,
      ...(mapped ? { line: mapped } : {}),
      message,
      raw: entry,
    }
  })
}
