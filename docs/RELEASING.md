# 发布检查

## 发布内容与版本

- 保留现有 `runtime-bean/`、`avatar-designs/` 结构。
- `runtime-bean/public-files.mjs` 是公开文件白名单；只从其导出的干净源码目录创建或更新公开仓库。
- 源码、完整用户包、校验和放同一 GitHub Release。完整用户包必须包含 Node.js 运行时与原许可；用户不需要开发工具。
- `package.json`、启动帮助、设置页、README 下载链接、CHANGELOG 和 `v*` 标签保持同一版本。
- 说明客户端支持范围与测试范围。仅有隔离界面/离线结果时使用社区预览版，不冒充原生窗口或真实任务端到端验收。

## 本机检查顺序

以下命令依次运行；portable 与完整测试会使用相同的私有测试输出目录，避免同时运行。

```sh
npm run test:portable
npm test
npm run prepare:runtime
npm run package
npm run test:package
```

`npm test` 与打包需要 macOS Apple Silicon、签名、完整性与头像模块均通过兼容检查的官方 Grok Bot；其他机器可以运行 portable 检查。不可为让测试通过而放宽客户端验证。`prepare:runtime` 只下载固定版本的官方 Node.js 并校验；打包脚本再次核对二进制与许可。

检查：

- 公开源码与解压后的完整包测试均通过，启动文件可执行，帮助显示正确版本。
- ZIP CRC、逐文件 SHA-256、包内文件路径和唯一启动入口通过校验。
- 无 `config.local.json`、`evidence/`、聊天截图、私人路径、真实 Bot ID、凭证、官方 App 或厂商提取包。
- 素材来源与许可、README 下载说明、升级迁移、恢复方式、兼容性提醒与文末非官方声明准确。
- 若本次修改官方接口、动作或启动行为，完成对应实机验证；不能完成的项目列入 Release 的已知限制，并使用 prerelease。

## Git 与 CI

1. 从白名单源码目录整理候选内容。首次发布创建干净 Git 历史；后续通过 PR 更新现有仓库，不提交维护目录历史文件或调试数据。
2. `npm run test:portable`、`git diff --check` 通过，确认 `git ls-files` 只有预期公开内容。ZIP 内的 `SHA256SUMS.txt` 属于发行包清单，不提交为源码维护文件。
3. 合入 `main` 后等待该提交的 GitHub `portable-checks` 成功。云 CI 不包含签名官方 App 或完整本机引擎验收。
4. 为同一提交建立不可移动的 `v<version>` 标签；标签 CI 核对 `package.json` 版本并运行 portable 检查。
5. 只有候选源码与本机已验证发布包一致时才上传；不从一个提交的源码发布另一个提交的二进制包。

`main` 通过 PR 和 CI 合并，禁止强推/删除；`v*` 标签禁止修改/删除。首次空仓库的初始化提交完成后开启相应保护。

## GitHub Release

将 Release 说明写入本地文本文件后通过 `--notes-file` 提交，保留实际换行。上传这三个产物：

- `GrokBotAvatarTool-<version>-macOS-arm64.zip`：用户下载，含 Node.js。
- `GrokBotAvatarTool-<version>-source.zip`：干净源码，不含 Node.js。
- `SHA256SUMS.txt`：上述两个 ZIP 的 SHA-256。

先创建 draft，核对标签指向、说明和附件，再发布。预览版添加 `--prerelease`。预览版首页下载链接使用具体 Release 或 `/releases`，不要依赖 `/releases/latest`。

发布后重新下载 GitHub 附件并与本地 SHA-256 对比，确认仓库公开、Release 可见、下载包完整。不得将本机配置放入附件。

## 兼容性维护

客户端升级可能改变文件名、私有函数或头像状态路径，包括小版本更新。版本号和整包哈希仅记录，不独立决定兼容；实际头像模块、导入关系与唯一接入点通过才加载。收到报告后先区分签名/完整性失败、相关模块变更与单纯版本变化，再检查接口、补适配并重新验证，随后发修复版。维护者会尽量及时跟进，但不承诺未来所有版本持续兼容或固定修复时限。

本项目与 Grok Bot 官方无关，仅供社区测试、交流与研究使用。
