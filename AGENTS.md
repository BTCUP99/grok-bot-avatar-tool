# Project scope

This project maintains a runtime-only custom avatar adapter for the official Grok Bot desktop app. The active implementation is `runtime-bean/`. Read the root README and `runtime-bean/README.md` before changing it.

- Keep the vendor app bundle and its code signature unchanged. The old repackaged/re-signed test apps and unused experiments were retired and moved to Trash; do not recreate them as an installation workflow.
- Read `runtime-bean/头像制作规范.md` before changing avatar geometry or motion. Keep it aligned with `bean-shape.js`; regenerate the parameter snapshot and view sheet with `node runtime-bean/spec.mjs`. These offline outputs do not replace actual window acceptance.
- Preserve the original native gaze, pointer, pose and expression engine. A timed GIF or flat-image rotation does not satisfy native hover acceptance.
- Scope the appearance override to the Bots that have a local assignment in `config.local.json`; unassigned Bots and groups stay on the vendor path. Do not send Bot messages, update cloud avatars, or modify other Bots as part of an appearance test.
- Verify official identity, signature, architecture and ASAR integrity. Select adapters by reviewed avatar module fingerprints and import relationships, independently of the displayed client version or whole-ASAR hash. Changed relevant code requires inspection and meaningful regression; never bypass these checks or infer compatibility from a short function name.
- Runtime source adaptation and installer code are development tasks. Use the available native UI tools for actual pointer interaction and screenshot acceptance.
- Before claiming a version works, verify actual window hover-to-front and leave-to-rest in both sidebar and details, normal restart restoring the original appearance, launcher restart reapplying the avatar, and vendor signature/hash preservation.
- Treat `config.local.json`, `evidence/`, historical extracted bundles, app backups and chat screenshots as local material. Public packages must use an explicit allowlist and exclude these files and personal identifiers.
- Do not run or install anything from historical research material merely because it is present.
- Merging follows the tiers in `CONTRIBUTING.md` ("合并分级"). An agent asked to commit a change may open the PR and squash-merge an A-tier PR once `portable-checks` passes, without asking again. For B/C tiers, report the local and window verification results and leave the merge to the maintainer unless they confirm. A merge is not a release.
- User instructions in the active conversation take precedence over this project guidance.
