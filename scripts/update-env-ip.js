/**
 * update-env-ip.js
 * ─────────────────────────────────────────────────────────────
 * Runs automatically as the "prestart" hook from both:
 *   • Backend/package.json   (npm start)
 *   • mobile/package.json    (npm start)
 *
 * What it does:
 *  1. Detects the current WiFi / LAN IP using Node's os module
 *  2. Rewrites the IP-bearing lines in  mobile/.env
 *  3. Starts the Python FastAPI server (port 8000) if not running
 * ─────────────────────────────────────────────────────────────
 */

const os     = require('os');
const fs     = require('fs');
const path   = require('path');
const { spawn, execSync } = require('child_process');

// ── 1. Find the .env file (always in  <root>/mobile/.env) ────
const ROOT    = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, 'mobile', '.env');

// ── 2. Detect current LAN/WiFi IP ────────────────────────────
function getLanIp() {
  const ifaces = os.networkInterfaces();
  const candidates = [];

  for (const name of Object.keys(ifaces)) {
    // Skip virtual / loopback adapters
    if (/loopback|lo|vmware|virtualbox|hyper.?v|wsl|vethernet|bluetooth/i.test(name)) {
      continue;
    }
    for (const iface of ifaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        // Skip APIPA (169.254.x.x) and localhost
        if (!iface.address.startsWith('169.254.') && iface.address !== '127.0.0.1') {
          candidates.push(iface.address);
        }
      }
    }
  }

  // Prefer 10.x, 192.168.x, 172.16-31.x (standard RFC-1918 LAN ranges)
  const lan = candidates.find(ip =>
    /^10\./.test(ip) ||
    /^192\.168\./.test(ip) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip)
  );
  return lan || candidates[0] || 'localhost';
}

// ── 3. Read existing .env (or create empty) ──────────────────
function readEnv(filePath) {
  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath, 'utf8');
  }
  return '';
}

// ── 4. Update (or add) a KEY=value line in the env content ───
function setEnvLine(content, key, value) {
  const regex = new RegExp(`^(${key}=.*)$`, 'm');
  const line  = `${key}=${value}`;
  if (regex.test(content)) {
    return content.replace(regex, line);
  }
  // Key doesn't exist yet – append it
  return content.trimEnd() + '\n' + line + '\n';
}

// ── Main ─────────────────────────────────────────────────────
const ip = getLanIp();

let envContent = readEnv(ENV_PATH);

envContent = setEnvLine(envContent, 'EXPO_PUBLIC_API_KEY',             `http://${ip}:3000`);
envContent = setEnvLine(envContent, 'EXPO_PUBLIC_PREDICTION_API_URL',  `http://${ip}:8000`);
envContent = setEnvLine(envContent, 'EXPO_PUBLIC_NODE_STORAGE_URL',    `http://${ip}:3000/uploads`);

fs.writeFileSync(ENV_PATH, envContent, 'utf8');

console.log(`\x1b[36m[env-ip]\x1b[0m IP auto-set → \x1b[32m${ip}\x1b[0m  (mobile/.env updated)`);

// ── Open firewall ports so the phone can reach the dev PC ────
ensureFirewallRule(8000, 'Fish Price API (8000)');
ensureFirewallRule(3000, 'Fish Price Backend (3000)');

// ── Ensure Windows Firewall allows inbound on a port ─────────
function ensureFirewallRule(port, name) {
  try {
    // Check if rule already exists
    const check = execSync(
      `netsh advfirewall firewall show rule name="${name}"`,
      { encoding: 'utf8', timeout: 5000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    if (check.includes('Rule Name')) {
      // Rule exists – nothing to do
      return;
    }
  } catch {
    // Rule doesn't exist – create it
  }
  try {
    execSync(
      `netsh advfirewall firewall add rule name="${name}" dir=in action=allow protocol=TCP localport=${port}`,
      { encoding: 'utf8', timeout: 5000 }
    );
    console.log(`\x1b[36m[firewall]\x1b[0m \x1b[32m✓ Opened port ${port}\x1b[0m for inbound connections`);
  } catch (e) {
    console.log(`\x1b[36m[firewall]\x1b[0m \x1b[33m⚠ Could not open port ${port} (run as admin to fix)\x1b[0m`);
  }
}

// ── Check if port is already listening (Windows netstat) ──────
function isPortInUse(port) {
  try {
    const out = execSync('netstat -ano', { encoding: 'utf8', timeout: 3000 });
    return out.split('\n').some(l => l.includes(`:${port}`) && l.includes('LISTENING'));
  } catch {
    return false;
  }
}

// ── Kill any process currently using a port ───────────────────
function killPort(port) {
  try {
    const out = execSync('netstat -ano', { encoding: 'utf8', timeout: 3000 });
    const pids = new Set();
    out.split('\n').forEach(line => {
      if (line.includes(`:${port}`) && line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (pid && pid !== '0') pids.add(pid);
      }
    });
    pids.forEach(pid => {
      try { execSync(`taskkill /PID ${pid} /F`, { timeout: 3000 }); } catch {}
    });
    return pids.size > 0;
  } catch {
    return false;
  }
}

// ── Start Python FastAPI server (kill old → fresh spawn) ──────
async function startPythonApi() {
  const modelDir  = path.join(ROOT, 'model');
  const venvPython = path.join(ROOT, '.venv', 'Scripts', 'python.exe');
  const pythonExe  = fs.existsSync(venvPython) ? venvPython : 'python';

  // Kill existing process on port 8000 (prevents stale/zombie servers)
  if (isPortInUse(8000)) {
    console.log('\x1b[36m[python-api]\x1b[0m Stopping existing server on port 8000...');
    killPort(8000);
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\x1b[36m[python-api]\x1b[0m Starting FastAPI on \x1b[32mhttp://${ip}:8000\x1b[0m ...`);

  // PowerShell Start-Process is the only 100% reliable way to launch
  // a truly detached background process on Windows
  const psCmd =
    `Start-Process` +
    ` -FilePath '${pythonExe}'` +
    ` -ArgumentList @('-m','uvicorn','api_server:app','--host','0.0.0.0','--port','8000')` +
    ` -WorkingDirectory '${modelDir}'` +
    ` -WindowStyle Hidden`;

  try {
    execSync(`powershell.exe -NoProfile -NonInteractive -Command "${psCmd}"`,
      { encoding: 'utf8', timeout: 10000 });
  } catch (e) {
    console.log('\x1b[36m[python-api]\x1b[0m \x1b[33m⚠ Could not start server:\x1b[0m', e.message);
  }

  // Wait for server to bind
  await new Promise(r => setTimeout(r, 4000));

  if (isPortInUse(8000)) {
    console.log(`\x1b[36m[python-api]\x1b[0m \x1b[32m✓ FastAPI ready\x1b[0m → http://${ip}:8000/docs`);
  } else {
    console.log('\x1b[36m[python-api]\x1b[0m \x1b[33m⚠ Server still starting (will be ready in a few seconds)\x1b[0m');
  }
}

startPythonApi().catch(err => {
  console.error('\x1b[36m[python-api]\x1b[0m \x1b[31mFailed to start Python API:\x1b[0m', err.message);
});
