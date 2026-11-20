// Verify TypeScript compilation
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, 'frontend');

console.log('=== TypeScript Compilation Check ===');
console.log('Working directory:', frontendDir);
console.log('');

// Check if tsc exists
const tscPath = path.join(frontendDir, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
const fallbackTscPath = path.join(frontendDir, 'node_modules', '.bin', 'tsc');
const resolvedTsc = fs.existsSync(tscPath) ? tscPath : (fs.existsSync(fallbackTscPath) ? fallbackTscPath : null);

if (!resolvedTsc) {
  console.error('TypeScript compiler executable not found at:', tscPath);
  process.exit(1);
}

console.log('TypeScript path:', resolvedTsc);

try {
  // Run tsc
  const result = execSync(`"${resolvedTsc}" --noEmit --pretty`, {
    cwd: frontendDir,
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
    timeout: 120000
  });

  if (result) {
    console.log(result);
  }
  console.log('TypeScript compilation: SUCCESS (no errors)');
  process.exit(0);
} catch (err) {
  console.error('TypeScript compilation error: Compilation failed');
  if (err.stdout) console.error(err.stdout);
  if (err.stderr) console.error(err.stderr);
  process.exit(err.status || 1);
}
