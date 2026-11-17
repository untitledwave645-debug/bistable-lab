#!/bin/sh
set -eu
cd "$(dirname "$0")"
url='http://127.0.0.1:5173/'
if curl --fail --silent --max-time 2 "$url" >/dev/null 2>&1; then
  open "$url"
  exit 0
fi
printf '%s\n' '正在启动 3D 电路实验台……' '浏览器将自动打开。使用期间请保留这个终端窗口；按 Control+C 可以停止服务。'
(
  attempt=0
  while [ "$attempt" -lt 30 ]; do
    if curl --fail --silent --max-time 1 "$url" >/dev/null 2>&1; then
      open "$url"
      exit 0
    fi
    attempt=$((attempt + 1))
    sleep 1
  done
) &
./run-local.sh --strictPort
