const { spawn } = require('child_process');

const PORT = process.env.SMOKE_PORT || '3900';
const BASE_URL = `http://localhost:${PORT}`;

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServerReady(child, timeoutMs = 20000) {
    const start = Date.now();

    return new Promise((resolve, reject) => {
        let settled = false;

        const onData = (chunk) => {
            const text = chunk.toString();
            if (text.includes('Server đang chạy tại')) {
                settled = true;
                cleanup();
                resolve();
            }
        };

        const onExit = (code) => {
            if (!settled) {
                settled = true;
                cleanup();
                reject(new Error(`Server exited early with code ${code}`));
            }
        };

        const timer = setInterval(() => {
            if (Date.now() - start > timeoutMs && !settled) {
                settled = true;
                cleanup();
                reject(new Error('Timed out waiting for server to start'));
            }
        }, 200);

        function cleanup() {
            clearInterval(timer);
            child.stdout.off('data', onData);
            child.off('exit', onExit);
        }

        child.stdout.on('data', onData);
        child.on('exit', onExit);
    });
}

async function runSmokeTests() {
    const server = spawn('node', ['server.js'], {
        cwd: require('path').join(__dirname, '..'),
        env: {
            ...process.env,
            PORT,
            GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
            GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
            GOOGLE_CALLBACK_URL:
                process.env.GOOGLE_CALLBACK_URL || `${BASE_URL}/api/auth/google/callback`
        },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    server.stderr.on('data', (chunk) => {
        process.stderr.write(chunk.toString());
    });

    try {
        await waitForServerReady(server);

        const health = await fetch(`${BASE_URL}/api/status`);
        if (!health.ok) {
            throw new Error(`Health check failed with status ${health.status}`);
        }

        const healthJson = await health.json();
        if (healthJson.status !== 'success') {
            throw new Error('Health check payload missing expected status=success');
        }

        const login = await fetch(`${BASE_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({})
        });

        if (login.status !== 400) {
            throw new Error(`Expected /api/auth/login empty payload status 400, got ${login.status}`);
        }

        console.log('Smoke test passed: health endpoint + auth validation');
    } finally {
        if (!server.killed) {
            server.kill('SIGTERM');
            await sleep(700);
            if (!server.killed) {
                server.kill('SIGKILL');
            }
        }
    }
}

runSmokeTests()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Smoke test failed:', err.message);
        process.exit(1);
    });
