# Aloud Text To Speech Obsidian Plugin / Aloud 文本转语音 Obsidian 插件

Highlight and speak text from your Obsidian notes. Converts text to audio using lifelike voices from OpenAI.

从您的 Obsidian 笔记中高亮并朗读文本。使用 OpenAI 的逼真语音将文本转换为音频。

<video src="https://github.com/adrianlyjak/obsidian-aloud-tts/assets/2024018/6e673350-0cf2-4820-bca1-3f36cd3a24f6" ></video>

Just add your OpenAI API key. Choose from 6 voices. OpenAI charges Audio at [$0.015 per 1,000 characters](https://openai.com/pricing). That's around $12 for the ~800,000 character text of A Tale of Two Cities.

只需添加您的 OpenAI API 密钥。可从 6 种声音中选择。OpenAI 按 [$0.015 每 1000 个字符](https://openai.com/pricing) 收费。《双城记》约 80 万个字符的文本大约需要 12 美元。

<img alt="Settings View" src="./docs/settings-example.png" width="400p" ></img>

### Features / 功能特性:

**Visual Feedback:** Active sentence is highlighted and updated as playback progresses.

**视觉反馈：** 活动句子在播放过程中会高亮显示并更新。

**Listen immediately:** Audio is streamed sentence-by-sentence. Jump back and forth by skipping by sentence.

**立即收听：** 音频按句子逐句流式传输。可通过跳句来回跳转。

**Variable Speeds:** On device playback rate adjustor for improved audio quality.

**变速播放：** 设备上的播放速率调节器，提高音频质量。

<img src="docs/variable-speeds.png" width="200" ></img>

**Caching:** Audio is cached in your vault to reduce costs, and automatically removed. Cache duration is configurable. Audio may be cached device local or in a vault directory.

**缓存功能：** 音频缓存在您的仓库中以降低成本，并会自动删除。缓存时长可配置。音频可以缓存在设备本地或仓库目录中。

<img src="docs/cache-settings.png" width="400" ></img>

**Export and Embed Audio:** Quickly export to audio files: export audio files from selection, or embed audio by pasting text from your clipboard.

**导出和嵌入音频：** 快速导出到音频文件：从选择内容导出音频文件，或通过粘贴剪贴板中的文本来嵌入音频。

<img src="docs/right-click-menu.png" max="300" ></img>

**Play text from anywhere:** Lots of commands. Play text to speech directly from your clipboard.

**随处播放文本：** 多种命令。直接从剪贴板播放文本转语音。

<img src="docs/commands.png" width="300" ></img>

**OS Integration:** Integrates with your mobile phone to play while locked. Pause/Play with OS controls on desktop.

**系统集成：** 与您的手机集成，锁屏时也能播放。在桌面端使用系统控件暂停/播放。

### Alternate TTS Models / 替代 TTS 模型

You can also run alternate models if you have OpenAI compatible API server that has an `/v1/audio/speech` endpoint. For example [openedai-speech](https://github.com/matatonic/openedai-speech). Just configure the url in the plugin settings

如果您有兼容 OpenAI API 的服务器并具有 `/v1/audio/speech` 端点，也可以运行替代模型。例如 [openedai-speech](https://github.com/matatonic/openedai-speech)。只需在插件设置中配置 URL 即可

### Code Structure / 代码结构

The plugin code is organized into several modules for better maintainability and separation of concerns:

插件代码组织成多个模块，以提高可维护性和关注点分离：

#### Core Modules / 核心模块:

- **`obsidian/`** - Obsidian integration layer that handles the plugin lifecycle, settings, and Obsidian-specific functionality
- **`obsidian/`** - Obsidian 集成层，处理插件生命周期、设置和 Obsidian 特定功能
  - `TTSPlugin.ts` - Main plugin class that initializes all components
  - `TTSPlugin.ts` - 主插件类，初始化所有组件
  - `ObsidianBridge.ts` - Bridge between Obsidian editor and TTS functionality
  - `ObsidianBridge.ts` - 连接 Obsidian 编辑器和 TTS 功能的桥梁
  - `StreamingPlayer.ts` - Handles streaming audio playback
  - `StreamingPlayer.ts` - 处理流式音频播放
  - `ObsidianPlayer.ts` - Manages audio caching in Obsidian vault
  - `ObsidianPlayer.ts` - 管理 Obsidian 仓库中的音频缓存

- **`player/`** - Core TTS playback engine that manages audio generation, caching, and playback
- **`player/`** - 核心 TTS 播放引擎，管理音频生成、缓存和播放
  - `AudioStore.ts` - Main audio management system
  - `AudioStore.ts` - 主音频管理系统
  - `ActiveAudioText.ts` - Manages active text playback and chunking
  - `ActiveAudioText.ts` - 管理活动文本播放和分块
  - `AudioTextChunk.ts` - Handles text chunking for better streaming
  - `AudioTextChunk.ts` - 处理文本分块以实现更好的流式传输
  - `TTSModel.ts` - Interfaces with TTS API (OpenAI and compatible services)
  - `TTSModel.ts` - 与 TTS API 接口（OpenAI 和兼容服务）
  - `AudioCache.ts` - Manages audio file caching
  - `AudioCache.ts` - 管理音频文件缓存
  - `AudioSink.ts` - Handles actual audio playback
  - `AudioSink.ts` - 处理实际的音频播放
  - `ChunkPlayer.ts` - Manages playback of individual text chunks
  - `ChunkPlayer.ts` - 管理单个文本块的播放
  - `ChunkLoader.ts` - Loads and processes audio chunks
  - `ChunkLoader.ts` - 加载和处理音频块

- **`components/`** - React UI components for settings and player interface
- **`components/`** - React UI 组件，用于设置和播放器界面
  - `PlayerView.tsx` - Main player interface component
  - `PlayerView.tsx` - 主播放器界面组件
  - `TTSPluginSettingsTab.tsx` - Settings tab UI with all configuration options
  - `TTSPluginSettingsTab.tsx` - 设置选项卡 UI，包含所有配置选项
  - `AudioVisualizer.tsx` - Audio waveform visualization component
  - `AudioVisualizer.tsx` - 音频波形可视化组件

- **`util/`** - Utility functions for text processing and other helper functions
- **`util/`** - 文本处理和其他辅助函数的实用工具
  - `splitSentences.ts` - Text segmentation for better TTS streaming
  - `splitSentences.ts` - 文本分段，优化 TTS 流式传输
  - `cleanMarkdown.ts` - Cleans markdown formatting for TTS
  - `cleanMarkdown.ts` - 清理用于 TTS 的 markdown 格式
  - `Minhash.ts` - Text hashing for cache management
  - `Minhash.ts` - 用于缓存管理的文本哈希

- **`codemirror/`** - CodeMirror editor integration for highlighting active text
- **`codemirror/`** - CodeMirror 编辑器集成，用于高亮活动文本
  - `TTSCodemirror.ts` - Integration with CodeMirror editor for text highlighting
  - `TTSCodemirror.ts` - 与 CodeMirror 编辑器集成以实现文本高亮

#### Key Features Implementation / 关键功能实现:

- **Custom Voice Management** - Extended settings and UI components for managing custom TTS voices
- **自定义音色管理** - 扩展的设置和 UI 组件，用于管理自定义 TTS 音色
- **Chinese Text Support** - Enhanced text segmentation that supports Chinese punctuation and character limits
- **中文文本支持** - 增强的文本分段功能，支持中文标点符号和字符限制
- **OpenAI Compatible APIs** - Support for custom TTS services with OpenAI-compatible endpoints
- **OpenAI 兼容 API** - 支持具有 OpenAI 兼容端点的自定义 TTS 服务
- **Advanced Caching** - Configurable caching options with IndexedDB and vault storage
- **高级缓存** - 可配置的缓存选项，支持 IndexedDB 和仓库存储

This modular structure makes it easy for new developers to understand the codebase and contribute to specific features.

这种模块化结构使新开发者能够轻松理解代码库并为特定功能做出贡献。