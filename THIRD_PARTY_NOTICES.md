# Third-party components

The MIT license in this project covers the original adapter code, character
definitions, original artwork, and documentation contributed to this project.
This includes the eleven virtual-person portrait examples generated and supplied
by the maintainer for public distribution; they are not real-person photographs.

Grok Bot is a separate third-party application. It is not included or licensed
by this project. Users install the official application themselves. The tool
reads version-checked resources from that installation at runtime, adapts them
in memory, and leaves the application bundle and signature unchanged. This
project is an independent community tool and does not claim official support.

The macOS arm64 user release includes the official Node.js runtime. Its original
license and third-party notices are preserved in `runtime-node/LICENSE`.
The distribution URL and archive checksum are pinned in
`runtime-bean/node-runtime.lock.json`; the extracted binary hash is recorded in
`runtime-node/runtime.json`.

The optional artwork rasterizer uses `@resvg/resvg-js`, installed separately by
developers. It is not required by the user launcher and is not vendored in the
source archive.
