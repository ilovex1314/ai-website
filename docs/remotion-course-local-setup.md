# Remotion 课程动画制作台本地运行指南

这份文档面向 Fork 本仓库、希望在自己的电脑上运行完整课程动画制作台的用户。公网部署只展示静态管理端；扫描 HyperFrames 项目、读取本地视频、保存工程和渲染 MP4 都需要本地 Workbench Service。

## 环境要求

- Git
- Node.js `^20.19.0` 或 `>=22.12.0`
- npm
- macOS、Linux 或 Windows
- 执行 Remotion 视频导出时，需要系统具备可用的 Chromium/Remotion 渲染环境
- 使用本地 Codex 协作能力时，需要单独安装并登录 Codex CLI；基础管理台和 mock 流程不依赖 API Key

## Fork 后首次启动

```bash
git clone <your-fork-url>
cd ai-website
./start-course-workbench.sh
```

脚本在缺少 `node_modules/` 时会先执行 `npm ci`，然后同时启动：

- 管理台：<http://127.0.0.1:5173/topics/remotion-course>
- 动作库：<http://127.0.0.1:5173/topics/remotion-course/actions>
- Workbench Service：<http://127.0.0.1:4319>

以后再次使用只需要：

```bash
./start-course-workbench.sh
```

也可以使用 npm 别名：

```bash
npm run start:course
```

## Windows

Windows 不执行 Bash 快捷脚本时，可以使用等价命令：

```powershell
npm ci
npm run dev:course
```

`dev:course` 使用同一个 Node runner 管理 Vite 和 Workbench Service，并在退出时清理两个子进程。

## 停止服务

在启动服务的终端按 `Ctrl+C`。不要只关闭浏览器标签页；浏览器不是服务进程。

runner 会向前端与 Workbench Service 的进程组发送退出信号。若终端被强制关闭，可检查 `5173` 和 `4319` 端口是否仍被占用。

## 本地素材目录

默认允许导入仓库目录及其相邻工作目录内的 HyperFrames 项目。项目必须是一个文件夹，并推荐包含：

```text
hyperframes-project/
  index.html
  hyperframes.json
  element-map.json
  animation-manifest.json
  assets/
  renders/
```

若素材位于其他磁盘或目录，启动前显式配置允许读取的根目录：

```bash
WORKBENCH_ALLOWED_SOURCE_ROOTS="/path/to/projects:/another/path" ./start-course-workbench.sh
```

macOS/Linux 使用冒号分隔多个目录；Windows 环境变量使用分号分隔。

## 可选环境变量

| 变量 | 默认值 | 用途 |
| --- | --- | --- |
| `WORKBENCH_PORT` | `4319` | Workbench Service 端口 |
| `WORKBENCH_PROJECT_ROOT` | `.course-workbench/projects` | 本地工程状态和渲染结果目录 |
| `WORKBENCH_ALLOWED_SOURCE_ROOTS` | 仓库及相邻工作目录 | 允许读取的素材根目录列表 |
| `WORKBENCH_AGENT_PROVIDER` | `mock` | Agent Provider 选择；当前稳定路径使用 `mock`，`codex` 为后续本地桥接预留 |

示例：

```bash
WORKBENCH_PORT=4320 \
WORKBENCH_PROJECT_ROOT="$HOME/course-workbench-projects" \
./start-course-workbench.sh
```

修改 `WORKBENCH_PORT` 后，前端调用地址也需要使用对应的本地服务配置；一般建议保持默认端口。

## 常见问题

### 端口已被占用

先停止已有实例，再重新运行脚本：

```bash
lsof -nP -iTCP:5173 -sTCP:LISTEN
lsof -nP -iTCP:4319 -sTCP:LISTEN
```

确认 PID 属于本项目后再结束进程。快捷脚本不会自动终止其他应用。

### 页面能打开，但无法导入本地文件夹

检查 Workbench Service 是否已在 `4319` 端口启动，并确认目标文件夹位于 `WORKBENCH_ALLOWED_SOURCE_ROOTS` 内。

### Fork 中没有测试案例的 MP4

仓库不会提交 `videos/**/renders/` 下的生成视频和音频。HyperFrames 源文件、manifest 和截图会保留；需要视频时请在本地重新渲染，或导入自己的 HyperFrames 项目。

### 只想预览公网样式

```bash
npm ci
npm run dev:web
```

这种方式只启动 Vite，不提供本地文件扫描、工程保存和视频渲染能力。

## 开发检查

提交修改前建议运行：

```bash
npm run lint
npm test -- --run
npm run build
```
