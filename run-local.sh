#!/bin/sh
set -eu
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  runtime="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin"
  export PATH="$runtime:$PATH"
fi
if ! command -v node >/dev/null 2>&1 || [ ! -f node_modules/vite/bin/vite.js ]; then
  printf '%s\n' '请安装 Node.js 24 与 npm，然后在项目目录运行 npm ci。' >&2
  exit 1
fi
exec node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 "$@"
