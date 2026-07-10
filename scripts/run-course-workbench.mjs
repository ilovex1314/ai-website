import { createCourseWorkbenchRunner } from './course-workbench-runner.mjs'

process.exitCode = await createCourseWorkbenchRunner().run()
