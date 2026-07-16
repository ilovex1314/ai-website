import { describe, expect, it } from 'vitest'
import { parseShaderLog } from './shaderDiagnostics'

describe('parseShaderLog', () => {
  it.each([
    ["ERROR: 0:18: 'x' : undeclared identifier", 18],
    ['0:18(7): error: syntax error', 18],
    ['WARNING: 0:18: implicit truncation', 18],
  ])('maps vendor log %s to the user source', (raw, compiledLine) => {
    const [diagnostic] = parseShaderLog(raw, 'fragment', 'webgl1', 12)
    expect(compiledLine).toBe(18)
    expect(diagnostic.line).toBe(6)
    expect(diagnostic.raw).toBe(raw)
  })
})
