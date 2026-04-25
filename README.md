# 手语渐进学习助手

一个基于浏览器摄像头和 MediaPipe Tasks Vision 的手语学习辅助原型。项目会实时识别手部 21 个关键点，通过几何规则判断手型、左右手和 1–10 数字手势，再把识别结果接入课程状态机：从单个词语开始练习，正确后自动进入下一个词语，逐步提升到词组、短句和完整句表达。

> 说明：当前版本使用“可检测手型 + 双手组合 + 顺序保持”的方式做教学原型，不替代专业手语教师、地区手语标准教材或真实语料训练模型。

## 功能

- 浏览器调用摄像头实时检测，无需后端服务。
- 使用 MediaPipe HandLandmarker 识别手部关键点，并判断左右手、伸出手指数和数字手势 1–10。
- 内置渐进课程：词语 → 词组 → 短句 → 完整句。
- 每个动作需要稳定保持约 1 秒，识别正确后自动进入下一步或下一课。
- 支持双手同屏训练，并按画面左侧 / 右侧稳定分配，减少左右跳动。
- 提供实时反馈：当前课程、目标动作、步骤列表、整体进度条、识别结果和错误提示。
- 支持本课重练、跳过课程和清空本地学习进度。
- 支持人脸表情检测，并使用 emoji 实时显示当前表情。
- 使用 Three.js 粒子层为数字手势触发动效，数字 10 会触发满屏烟花。
- Canvas 叠加显示手部关键点与骨架。

## 课程设计

当前内置 10 个渐进关卡：

1. `我`：数字 1 手型。
2. `你`：数字 2 手型。
3. `好`：数字 5 手型。
4. `谢谢`：数字 10 / 握拳手型。
5. `我好`：数字 1 → 数字 5。
6. `你好`：数字 2 → 数字 5。
7. `谢谢你`：数字 10 → 数字 2。
8. `我会手语`：数字 1 → 数字 5 → 双手数字 5。
9. `我想学习手语`：数字 1 → 数字 10 → 数字 3 → 双手数字 5。
10. `你可以帮我吗`：数字 2 → 数字 5 → 左侧数字 5 + 右侧数字 10 → 数字 1 → 数字 10。

课程定义在 `src/learning/curriculum.js`，判定和进度逻辑在 `src/learning/signTutor.js`。

## 运行

```bash
npm install
npm run dev
```

打开终端输出的本地地址，点击“启动摄像头”并授权浏览器摄像头权限。

首次点击启动时才会加载 MediaPipe 识别核心。手势模型会优先初始化，表情模型在后台继续加载，因此页面打开后不会长时间停留在“初始化中”。

## 构建

```bash
npm run build
npm run preview
```

构建时出现的 Vite chunk-size 提示通常只是依赖体积警告，不代表应用不可用。

## 部署

项目提供了一个基于 SSH + rsync 的部署脚本，会先执行生产构建，再把 `dist/` 同步到服务器目录。

首次部署前先创建本地部署配置：

```bash
cp .env.deploy.example .env.deploy.local
```

然后编辑 `.env.deploy.local`：

```env
DEPLOY_SSH_HOST=你的服务器地址
DEPLOY_SSH_USER=你的 SSH 用户
DEPLOY_SSH_PORT=22
DEPLOY_REMOTE_DIR=/服务器上的部署目录
DEPLOY_SSH_KEY=~/.ssh/id_rsa
```

确认 SSH 登录可用后执行：

```bash
npm run deploy
```

如果希望每次本地 `git commit` 后自动部署，先执行一次：

```bash
npm run setup:git-hooks
```

其中 `.env.deploy.local` 已加入 `.gitignore`，不要提交真实服务器地址、用户名或私钥路径。

## 代码结构

- `src/main.js`：应用入口，负责摄像头、模型、识别循环和模块编排。
- `src/learning/curriculum.js`：手语学习课程、词语、步骤和目标手型定义。
- `src/learning/signTutor.js`：课程状态机、手型匹配、保持计时、自动进入下一课和本地进度存储。
- `src/vision/`：手势识别、人脸表情识别和 MediaPipe 模型初始化。
- `src/vision/handSmoother.js`：双手同屏时进行跨帧平滑、短暂丢帧保持和左右侧稳定分配。
- `src/ui/`：Canvas 叠加层、手势结果和表情结果渲染。
- `src/effects.js`、`src/gestureEffectController.js`：Three.js 粒子动效与稳定触发控制。
- `src/config.js`、`src/dom.js`、`src/utils/`：配置、DOM 查询和通用工具函数。
- `public/models/`、`public/vendor/mediapipe/wasm/`：随应用部署的 MediaPipe 模型与 Wasm 运行文件，避免线上首次访问依赖外部 CDN。

## 注意事项

- 摄像头接口要求页面运行在 `localhost` 或 HTTPS 环境。
- 模型和 Wasm 已放入 `public/`，构建后会随 `dist/` 一起发布；如果部署在子路径，请用 Vite 的 `--base=/你的路径/` 构建，确保资源地址正确。
- 识别结果依赖光线、遮挡、手指伸直程度、手掌角度和摄像头帧率。
- 目前课程以规则识别为主，适合做教学流程原型；如需识别真实中国手语词汇，建议继续接入带标注的手语数据集、时序模型和专业校验规则。
