# Web 手指个数与数字手势检测

一个纯前端摄像头视觉检测项目，使用 MediaPipe Tasks Vision 的 HandLandmarker 模型识别 21 个手部关键点，并通过几何角度与距离规则判断左右手、每只手伸出的手指数、张开 / 收起状态和单手数字手势。

## 功能

- 浏览器调用摄像头实时检测，无需后端服务。
- 支持双手同时识别，并按画面左侧 / 右侧稳定显示检测结果。
- 单手支持常见中文数字手势 1–10，包括 6、7、8、9、10。
- 支持人脸表情检测，并使用 emoji 实时显示当前表情。
- 显示双手伸指合计、单手数字、左右手、置信度。
- 根据手指数判断“张开”“半张开”“收起 / 握拳”。
- 使用 Three.js 粒子层为每个数字触发不同动效，数字 10 会触发满屏烟花。
- Canvas 叠加显示手部关键点与骨架。

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

## 代码结构

- `src/main.js`：应用入口，只负责摄像头、模型、识别循环和模块编排。
- `src/vision/`：手势识别、人脸表情识别和 MediaPipe 模型初始化。
- `src/vision/handSmoother.js`：双手同屏时进行跨帧平滑、短暂丢帧保持和左右侧稳定分配。
- `src/ui/`：Canvas 叠加层、手势结果和表情结果渲染。
- `src/effects.js`、`src/gestureEffectController.js`：Three.js 粒子动效与稳定触发控制。
- `src/config.js`、`src/dom.js`、`src/utils/`：配置、DOM 查询和通用工具函数。
- `public/models/`、`public/vendor/mediapipe/wasm/`：随应用部署的 MediaPipe 模型与 Wasm 运行文件，避免线上首次访问依赖外部 CDN。

## 注意事项

- 摄像头接口要求页面运行在 `localhost` 或 HTTPS 环境。
- 模型和 Wasm 已放入 `public/`，构建后会随 `dist/` 一起发布；如果部署在子路径，请用 Vite 的 `--base=/你的路径/` 构建，确保资源地址正确。
- 数字 10 在单手模式下按常见握拳手势识别，同时仍会显示伸出手指数为 0。
- 识别结果依赖光线、遮挡、手指伸直程度和手掌角度；如需更高精度，可基于实际场景继续校准 `src/main.js` 中的角度与距离阈值。
