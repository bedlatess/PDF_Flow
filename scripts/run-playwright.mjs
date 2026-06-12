#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const playwrightCli = path.join(root, 'node_modules', 'playwright', 'cli.js')

const child = spawn(process.execPath, [playwrightCli, 'test', ...process.argv.slice(2)], {
  cwd: root,
  env: {
    ...process.env,
    PWTEST_CHILD_PROCESS_TIMEOUT: process.env.PWTEST_CHILD_PROCESS_TIMEOUT || '10000',
  },
  stdio: 'inherit',
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 1)
})
