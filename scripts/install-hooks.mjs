// Points git at the hooks in .githooks, so `git push` runs the same checks as CI first.
// `npm install` runs this through the `prepare` script. It does nothing in CI, which runs the checks
// itself, or outside a git checkout (an unpacked source archive).
import { execFileSync } from 'node:child_process';

const git = (...args) => execFileSync('git', args, { stdio: 'ignore' });

if (!process.env.CI) {
  try {
    git('rev-parse', '--git-dir');
  } catch {
    process.exit(0);
  }
  git('config', 'core.hooksPath', '.githooks');
}
