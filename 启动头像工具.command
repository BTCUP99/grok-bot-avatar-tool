#!/bin/zsh
set -e
cd -- "${0:A:h}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if [[ -x "$PWD/runtime-node/bin/node" ]]; then
  AVATAR_NODE="$PWD/runtime-node/bin/node"
elif command -v node >/dev/null 2>&1; then
  AVATAR_NODE="$(command -v node)"
else
  print '未找到运行环境。请下载包含运行环境的 macOS Apple Silicon 完整版。'
  read 'AVATAR_CLOSE?按回车关闭。'
  exit 1
fi
if ! "$AVATAR_NODE" -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 22 ? 0 : 1)'; then
  print '需要 Node.js 22 或更新版本。使用完整分享包即可，无需另行安装。'
  read 'AVATAR_CLOSE?按回车关闭。'
  exit 1
fi
if ! "$AVATAR_NODE" runtime-bean/tool.mjs "$@"; then
  read 'AVATAR_CLOSE?启动遇到问题，请查看上方说明；按回车关闭。'
  exit 1
fi
