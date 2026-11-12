# Security boundaries

- This is a local community runtime adapter for reviewed official avatar modules.
- Verify official identity/signature, architecture and ASAR integrity before
  examining compatibility. Client version labels do not grant or deny access.
  Pin the reviewed avatar modules and their JavaScript dependency closure,
  check active import relationships, then validate patch anchors and syntax.
  Legacy adapters without a dependency manifest retain their reviewed whole
  archive fingerprint as a conservative fallback. Unknown code is not loaded.
- The application bundle and signature are never modified or re-signed.
- Only Bots with a local avatar assignment are visually overridden; groups and
  unassigned Bots remain on the official path. No Bot messages are sent.
- Setup listens on a random loopback port with an unguessable URL and a
  separate form token. Host and foreign-Origin requests are checked. It closes
  after successful setup. No credentials or conversation text are read.
- The app's developer port is bound to `127.0.0.1:19223`. It has no client
  authentication; other local processes may access the renderer while active.
  Never expose or forward it. Full app exit and an ordinary official restart
  close the port and restore the original display.
- Release packages include a pinned official Node.js runtime and its license.
  Download hashes and generated file hashes are checked before packaging.
- An unsigned community download can trigger macOS review. Do not disable
  Gatekeeper or global protections to run it.

Report reproducible issues with the app version, architecture, and sanitized
error message. Do not post raw config, personal Bot IDs, chat screenshots,
roster caches, credentials, or CDP logs publicly.
