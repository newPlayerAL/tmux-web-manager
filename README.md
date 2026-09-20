# tmux web manager

一个轻量、无第三方依赖的 tmux Web 控制台。它可以：

- 列出本机全部 tmux 会话、窗口和窗格
- 在会话列表中标出最近仍有终端输出的会话
- 显著标出正在等待用户授权或拒绝操作的 Codex 会话
- 在页面中新建 tmux 会话，并重命名现有会话
- 定时刷新当前窗格内容，并查看最多 5000 行历史
- 向窗格粘贴文本或“粘贴并回车”
- 发送 `Ctrl+C`、方向键、Tab 等常用按键
- 在页面上切换简体中文或 English、浅色或深色主题、调整界面字号，并记住选择
- 默认启用 Bearer Token 鉴权

## 运行

需要 Node.js 18+ 和 tmux：

```bash
npm start
```

默认只允许本机访问。需要监听所有 IPv4 网络接口时，可以使用参数或快捷命令：

```bash
npm start -- --public
# 等价的快捷命令
npm run start:public
```

服务会在启动时生成一个 256 位随机访问令牌，并打印到控制台：

```text
tmux web manager listening on http://127.0.0.1:7681 (token protection enabled)
generated access token: 这里是每次启动时新生成的令牌
```

打开 <http://127.0.0.1:7681>，输入控制台显示的令牌。如果当前还没有会话，可以先运行：

```bash
tmux new -s demo
```

## 配置

环境变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `AWM_HOST` | `127.0.0.1` | HTTP 监听地址 |
| `AWM_PORT` | `7681` | HTTP 监听端口 |
| `AWM_TOKEN` | 启动时随机生成 | 固定的 API 访问令牌；设置后不会在控制台打印 |
| `AWM_TMUX_BIN` | `tmux` | tmux 可执行文件路径 |

`--public` 的优先级高于 `AWM_HOST`，会将监听地址设置为 `0.0.0.0`。例如，通过局域网提供服务并使用固定令牌：

```bash
AWM_TOKEN='请替换为足够长的随机值' npm run start:public
```

不设置 `AWM_TOKEN` 时，每次重启都会生成新令牌，旧令牌随即失效。需要固定令牌时，使用环境变量传入，不要把真实令牌写入源码、`.env` 示例或提交到 Git。

页面只在当前浏览器标签页的 `sessionStorage` 中保存令牌。控制台日志可能包含自动生成的令牌，应当限制日志的读取权限。生产或公网环境还应使用 HTTPS 反向代理、主机防火墙或 VPN。这个程序能够向 tmux 中正在运行的进程输入内容，因此请把它当作终端访问权限来保护。

## 测试

```bash
npm test
```

## 许可证

本项目采用 [PolyForm Noncommercial License 1.0.0](LICENSE)：

- 允许个人学习、研究、实验、娱乐和其他非商业用途
- 允许许可证列明的非商业组织使用
- 商业用途不在本许可证的授权范围内，需要另行取得商业授权

如果计划代表企业使用本项目，或者不确定具体用途是否属于许可证允许的范围，请在本仓库提交 GitHub Issue 联系作者。除非另有书面约定，商业使用均未获得授权。

## HTTP API

- `GET /api/sessions`：会话、窗口和窗格列表
- `POST /api/sessions`：创建新会话
- `PATCH /api/sessions/%24N`：重命名现有会话
- `GET /api/panes/%25N/capture?history=200`：读取窗格内容
- `POST /api/panes/%25N/input`：粘贴文本，可带 `enter: true`
- `POST /api/panes/%25N/keys`：发送受限的特殊按键

除 `/api/config` 外的 API 都需要 `Authorization: Bearer <token>`。令牌来自 `AWM_TOKEN`，未设置时则使用本次启动自动生成的令牌。
