# 实时发型试戴

这是一个浏览器端实时摄像头发型试戴原型：通过人脸关键点检测定位额头、太阳穴、脸宽和头部倾斜角，先擦除原始头发，再用 Three.js 加载 `.glb` 发型资产并合成到摄像头画布。当前内置「3D 空气短卷」「3D 侧扫层次」「3D 齐刘海短发」「3D 长卷披肩」四种目标发型，并支持拟人动物隐私贴图和转头透视渲染。

## 运行

```bash
npm install
npm run dev
```

打开终端输出的本地地址后，点击「开启摄像头」并允许浏览器访问摄像头。

## 技术方案

- `@mediapipe/tasks-vision`：实时检测 478 个人脸关键点，比纯 OpenCV Haar 检测更适合发型贴合和头部姿态估计。
- `Three.js + GLTFLoader`：加载 `public/models/hairstyles/*.glb` 发型模型，并按脸宽、额头位置、眼角连线角度和头部 yaw 投影到透明 WebGL 画布。
- `Canvas 2D`：绘制镜像摄像头画面、擦除原始头发、隐私贴图，并把 Three.js 透明画布合成到同一预览画布。
- 平滑跟踪：对位置、尺寸和旋转角做插值，减少摄像头抖动造成的发型闪烁。
- 真实感合成：发型图层来自 `.glb` 资产中的发帽和发束网格；发色选择器只做材质混色，保留高光和暗部层次。
- 隐私贴图：默认开启小狐脸遮挡，贴图会跟随头部旋转、眨眼和张嘴变化；侧边栏可调整贴图大小或关闭。
- 擦除原始头发：先基于人脸关键点推估发际线附近的原始头发区域，再采样脸部肤色生成低透明度擦除层，最后叠加所选 3D 发型。
- 3D 发束透视：根据鼻尖和太阳穴深度估计头部 yaw，把 `.glb` 发型模型绕 Y 轴旋转，而不是整张 2D PNG 贴图。
- 性能优化：默认请求 960×540 / 24fps 摄像头画面，Canvas 渲染限制到 30fps，人脸检测限制到约 18fps，并缓存擦除原始头发时的肤色采样。

## 代码结构

- `src/main.js`：只负责查询 DOM 并挂载应用。
- `src/app/createHairTryOnApp.js`：统一协调摄像头、人脸检测、渲染循环和控件状态。
- `src/components/HairStyleSelector.js`：发型选择器 UI 组件。
- `src/core/`：摄像头、人脸模型和姿态计算等核心能力。
- `src/renderers/`：视频画布、擦除原始头发、Three.js 发型和隐私动物贴图的渲染模块。
- `src/data/hairStyles.js`：`.glb` 发型资产路径、材质与贴合参数配置。
- `src/config/mediaPipe.js`：MediaPipe wasm 和模型配置。
- `src/utils/math.js`：通用数学工具。
- `scripts/generate-hairstyle-glbs.mjs`：本地生成示例 `.glb` 发型资产。

## GLB 发型素材

发型模型放在 `public/models/hairstyles/`，当前内置 4 个轻量 `.glb` 示例资产。它们由 `scripts/generate-hairstyle-glbs.mjs` 根据 `src/data/hairStyles.js` 中的参数生成。

如需重新生成：

```bash
npm run generate:hair-glb
```

后续可以把同名 `.glb` 替换为外部建模软件导出的发型模型，只要保持 `src/data/hairStyles.js` 里的 `glbUrl` 指向正确路径即可。

## 当前限制

- 擦除原始头发是基于人脸关键点和肤色采样的实时近似，不是逐像素头发语义分割；长发、帽子或复杂背景下可能需要手动降低擦除强度。
- 隐私贴图是本地 Canvas 覆盖层，不会上传摄像头画面，但关闭后画布仍会显示原始面部。
- 首次加载需要联网下载 MediaPipe wasm 和人脸关键点模型。
- 如果要做到更接近完整 3D 换发，下一步可以接入头发分割模型、更精细的外部 `.glb` 发型网格或 WebGL 毛发材质。
