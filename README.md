# Aloud Text To Speech Obsidian Plugin

Highlight and speak text from your Obsidian notes. Converts text to audio using lifelike voices from OpenAI.

<video src="https://github.com/adrianlyjak/obsidian-aloud-tts/assets/2024018/6e673350-0cf2-4820-bca1-3f36cd3a24f6" ></video>

Just add your OpenAI API key. Choose from 6 voices. OpenAI charges Audio at [$0.015 per 1,000 characters](https://openai.com/pricing). That's around $12 for the ~800,000 character text of A Tale of Two Cities.

<img alt="Settings View" src="./docs/settings-example.png" width="400p" ></img>

### Features:

**Visual Feedback:** Active sentence is highlighted and updated as playback progresses.

**Listen immediately:** Audio is streamed sentence-by-sentence. Jump back and forth by skipping by sentence.

**Variable Speeds:** On device playback rate adjustor for improved audio quality.

<img src="docs/variable-speeds.png" width="200" ></img>

**Caching:** Audio is cached in your vault to reduce costs, and automatically removed. Cache duration is configurable. Audio may be cached device local or in a vault directory.

<img src="docs/cache-settings.png" width"400" ></img>

**Export and Embed Audio:** Quickly export to audio files: export audio files from selection, or embed audio by pasting text from your clipboard.

<img src="docs/right-click-menu.png" max="300" ></img>

**Play text from anywhere:** Lots of commands. Play text to speech directly from your clipboard.

<img src="docs/commands.png" width="300" ></img>

**OS Integration:** Integrates with your mobile phone to play while locked. Pause/Play with OS controls on desktop.

### Alternate TTS Models

You can also run alternate models if you have OpenAI compatible API server that has an `/v1/audio/speech` endpoint. For example [openedai-speech](https://github.com/matatonic/openedai-speech). Just configure the url in the plugin settings


## 项目结构说明

为了帮助开发者快速熟悉项目代码，以下是项目的主要结构和模块说明：

### 核心模块

1. **obsidian/** - Obsidian 插件集成层
   - `TTSPlugin.ts` - 插件主入口文件，负责初始化插件和注册各种功能
   - `ObsidianBridge.ts` - 连接 Obsidian 编辑器和音频播放系统的桥梁
   - `ObsidianPlayer.ts` - Obsidian 特定的音频缓存实现
   - `StreamingPlayer.ts` - 流式音频播放器实现

2. **player/** - 核心音频播放和管理模块
   - `AudioStore.ts` - 音频存储和管理核心类
   - `AudioSystem.ts` - 音频系统协调器
   - `ActiveAudioText.ts` - 活动音频文本的管理和控制
   - `AudioTextChunk.ts` - 音频文本块的定义和处理
   - `ChunkPlayer.ts` - 音频块播放器，负责逐块加载和播放音频
   - `ChunkLoader.ts` - 音频块加载器
   - `TTSModel.ts` - TTS 模型接口和实现
   - `AudioSink.ts` - 音频输出接口
   - `AudioCache.ts` - 音频缓存管理
   - `CancellablePromise.ts` - 可取消的 Promise 实现

3. **components/** - React 用户界面组件
   - `PlayerView.tsx` - 主播放器界面
   - `TTSPluginSettingsTab.tsx` - 插件设置界面
   - `AudioVisualizer.tsx` - 音频可视化组件
   - `IsPlaying.tsx` - 播放状态指示器
   - `IconButton.tsx` - 图标按钮组件
   - `DownloadProgress.tsx` - 下载进度显示组件

4. **codemirror/** - CodeMirror 编辑器集成
   - `TTSCodemirror.ts` - 在 Obsidian 编辑器中高亮当前播放文本的扩展

5. **util/** - 工具函数库
   - `cleanMarkdown.ts` - 清理 Markdown 格式
   - `splitSentences.ts` - 文本分割为句子
   - `misc.ts` - 杂项工具函数
   - `Minhash.ts` - 文本哈希算法

6. **web/** - Web 相关功能
   - `IndexedDBAudioStorage.ts` - 基于 IndexedDB 的音频存储实现
   - `app.tsx` - Web 应用界面

7. **types/** - TypeScript 类型定义
   - 包含项目中使用的各种类型定义

### 数据流和工作原理

1. 用户在 Obsidian 中选择文本并触发播放
2. [TTSPlugin] 接收到指令，通过 [ObsidianBridge] 获取选中的文本
3. [AudioStore] 创建 [ActiveAudioText] 对象，将文本分割成多个 [AudioTextChunk]
4. [ChunkPlayer]负责按需加载和播放音频块
5. [TTSModel] 调用 OpenAI 或兼容 API 生成音频
6. 音频通过 [AudioSink]输出到浏览器音频系统
7. `CodeMirror` 扩展在编辑器中高亮当前播放的文本
8. 用户界面组件显示播放状态和控制选项

### 开发入门

1. 克隆项目并安装依赖：`npm install`
2. 构建项目：`npm run build`
3. 在 Obsidian 中加载插件进行测试
4. 修改代码后需要重新构建才能看到效果

### 配置项说明

插件支持多种配置选项：
- TTS 模型选择（OpenAI 或兼容 API）
- 音色选择
- 文本分割方式
- 播放速度控制
- 缓存策略（本地或 vault 存储）
- 缓存时长设置