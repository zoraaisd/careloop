#!/usr/bin/env node

const { execSync } = require('node:child_process');
const path = require('node:path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const argPort = Number(process.argv[2]);
const envPort = Number(process.env.PORT);
const port = Number.isInteger(argPort) && argPort > 0 ? argPort : Number.isInteger(envPort) && envPort > 0 ? envPort : 4001;

const isWindows = process.platform === 'win32';

const getPidsOnPort = (targetPort) => {
  if (isWindows) {
    let output = '';
    try {
      output = execSync('netstat -ano -p tcp', { encoding: 'utf8' });
    } catch (error) {
      const code = error && typeof error === 'object' && 'code' in error ? error.code : 'UNKNOWN';
      console.warn(`[free-port] Skipping port scan (permission issue: ${code}).`);
      return [];
    }
    const lines = output.split(/\r?\n/);
    const pids = new Set();

    for (const line of lines) {
      if (!line.includes('LISTENING')) continue;
      const cols = line.trim().split(/\s+/);
      if (cols.length < 5) continue;
      const localAddress = cols[1];
      const pid = Number(cols[4]);
      if (!Number.isInteger(pid)) continue;
      if (localAddress.endsWith(`:${targetPort}`)) {
        pids.add(pid);
      }
    }

    return [...pids];
  }

  try {
    const output = execSync(`lsof -ti tcp:${targetPort} -sTCP:LISTEN`, { encoding: 'utf8' }).trim();
    if (!output) return [];
    return output
      .split(/\r?\n/)
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value));
  } catch {
    return [];
  }
};

const pids = getPidsOnPort(port).filter((pid) => pid !== process.pid);

if (pids.length === 0) {
  console.log(`[free-port] Port ${port} is available.`);
  process.exit(0);
}

for (const pid of pids) {
  try {
    process.kill(pid, 'SIGTERM');
    console.log(`[free-port] Stopped process ${pid} on port ${port}.`);
  } catch (error) {
    const message = error && typeof error === 'object' && 'message' in error ? error.message : String(error);
    console.error(`[free-port] Failed to stop process ${pid}: ${message}`);
    process.exitCode = 1;
  }
}
