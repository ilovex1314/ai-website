import { spawn } from 'node:child_process'

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const children = [
  spawn(npmCommand, ['run', 'dev:workbench'], { stdio: 'inherit' }),
  spawn(npmCommand, ['run', 'dev:web'], { stdio: 'inherit' }),
]

let shuttingDown = false

function stopChildren(signal) {
  if (shuttingDown) {
    return
  }

  shuttingDown = true
  children.forEach((child) => child.kill(signal))
}

process.on('SIGINT', () => stopChildren('SIGINT'))
process.on('SIGTERM', () => stopChildren('SIGTERM'))

const exitCodes = await Promise.all(
  children.map(
    (child) =>
      new Promise((resolve) => {
        child.on('exit', (code) => {
          if (!shuttingDown) {
            stopChildren('SIGTERM')
          }
          resolve(code ?? 1)
        })
      }),
  ),
)

process.exitCode = exitCodes.find((code) => code !== 0) ?? 0
