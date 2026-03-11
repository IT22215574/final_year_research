#!/usr/bin/env node
/**
 * Cross-platform port killer (no external dependencies).
 * Usage: node kill-port.js <port>
 */
const { execSync } = require('child_process');

const port = process.argv[2];
if (!port) {
  console.error('Usage: node kill-port.js <port>');
  process.exit(1);
}

try {
  if (process.platform === 'win32') {
    const result = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const lines = result.trim().split('\n');
    const pids = new Set();
    for (const line of lines) {
      // Match lines where the local address ends with :<port> (exact match)
      if (new RegExp(`[:\\s]${port}\\s`).test(line)) {
        const pid = line.trim().split(/\s+/).pop();
        if (pid && /^\d+$/.test(pid) && pid !== '0') pids.add(pid);
      }
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`[kill-port] Killed PID ${pid} on port ${port}`);
      } catch (_) { /* already gone */ }
    }
  } else {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, { shell: true });
    console.log(`[kill-port] Released port ${port}`);
  }
} catch (_) {
  // Nothing was using the port — that's fine
}
