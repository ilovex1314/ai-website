import { createWorkbenchServer } from './app.js'
import { loadWorkbenchConfig } from './config.js'

const config = await loadWorkbenchConfig()
const server = createWorkbenchServer(config)

server.on('error', (error) => {
  console.error('Unable to start the Course Workbench Service:', error)
  process.exitCode = 1
})

server.listen(config.port, '127.0.0.1', () => {
  console.log(`Course Workbench Service listening on http://127.0.0.1:${config.port}`)
})
