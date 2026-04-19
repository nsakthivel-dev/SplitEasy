const path = require('path');
const cp = require('child_process');
const fs = require('fs');

// 1. Set up Expo's home directory in the project to avoid EPERM on Windows
const expoHome = path.join(process.cwd(), '.expo-home');
if (!fs.existsSync(expoHome)) {
  fs.mkdirSync(expoHome, { recursive: true });
}
process.env.__UNSAFE_EXPO_HOME_DIRECTORY = expoHome;

// 2. Parse arguments passed to the script
// We filter out 'node', the script name, and any pnpm separators '--'
const args = process.argv.slice(2).filter(a => a !== '--');

// 3. Determine the transport method (lan, tunnel, localhost)
const hasTransport = args.some(a => ['--tunnel', '--lan', '--localhost', '-m', '--host'].includes(a));
const transport = hasTransport ? '' : '--lan';

// 4. Determine the port
const hasPort = args.some(a => ['--port', '-p'].includes(a));
const port = hasPort ? '' : '--port 8085';

// 5. Construct the final command
const cmd = `npx expo start ${transport} ${port} --clear ${args.join(' ')}`;

console.log(`Starting Expo with: ${cmd}`);

// 6. Spawn the command
const r = cp.spawn(cmd, {
  stdio: 'inherit',
  env: process.env,
  shell: true
});

r.on('exit', (code) => {
  process.exit(code ?? 0);
});
