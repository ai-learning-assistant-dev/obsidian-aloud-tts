import { AudioStore } from "../player/AudioStore";
import { AudioSystem } from "../player/AudioSystem";
import { ObsidianBridge, ObsidianBridgeImpl } from "./ObsidianBridge";
import { ActiveAudioText, ActiveAudioTextImpl } from "../player/ActiveAudioText";
import { AudioTextChunk, AudioText } from "../player/AudioTextChunk";
import * as mobx from "mobx";
import { randomId, } from "../util/misc";
import { observable } from "mobx";


export class StreamingPlayer {
  private bridge: ObsidianBridge
  private audioStore: AudioStore;
  private system: AudioSystem;
  private accumulatedText: string = ""; // 累积的文本
  private textChunks: { index: number; text: string }[] = []; // 存储接收到的文本块
  private sentences: string[] = []; // 存储已完成的句子
  private isFinished: boolean = false; // 标记是否已完成流式播放
  private index = 0; // 当前文本块的索引
  private textLength = 0;

  constructor(bridge: ObsidianBridge, audioStore: AudioStore, system: AudioSystem) {
    this.bridge = bridge;
    this.audioStore = audioStore;
    this.system = system;
  }

  /**
   * 添加文本块到流式播放器
   * @param chunk 文本块 { index: number; length: number; text: string }
   */
  public addTextChunk(chunk: { index: number; length: number; text: string }): void {    
    // 将文本块添加到数组中
    this.textChunks.push({ index: chunk.index, text: chunk.text });
    
    // 处理文本缓冲区
    this.processStreamText();

    // 如果length为0，表示流结束
    if (chunk.length === 0) {
      this.finish();
      return;
    }
  }

  /**
   * 处理流式文本的方法
   */
  private processStreamText() {
    
    // 按照索引排序文本块
    this.textChunks.sort((a, b) => a.index - b.index);
    
    // 合并所有文本
    const fullText = this.textChunks.map(chunk => chunk.text).join("");
    this.accumulatedText += fullText;
    
    // 检查是否需要分割句子
    this.checkAndSplitSentences();

    // 清空已处理的块
    this.textChunks = [];
  }

  /**
   * 检查并分割句子
   */
  private checkAndSplitSentences() {
    const minChunkLength = this.system.settings.minChunkLength || 150; // 最小分割长度，默认为150字符

    // 如果累积文本长度大于minChunkLength 75，检查是否可以分割句子
    if (this.accumulatedText.length > minChunkLength) {
      // 查找最后一个句号或换行符的位置
      const lastPunctuationIndex = Math.max(
        this.accumulatedText.lastIndexOf('。'),
        this.accumulatedText.lastIndexOf('！'),
        this.accumulatedText.lastIndexOf('？'),
        this.accumulatedText.lastIndexOf('.'),
        this.accumulatedText.lastIndexOf('!'),
        this.accumulatedText.lastIndexOf('?'),
        this.accumulatedText.lastIndexOf('\n')
      );
      
      // 如果找到了句号或换行符，且位置在75之后
      if (lastPunctuationIndex >= minChunkLength) {
        // 提取完整的句子（包含句号或换行符）
        const sentence = this.accumulatedText.substring(0, lastPunctuationIndex + 1);
        // 保存句子到列表
        this.sentences.push(sentence);
        
        // 保留句号或换行符之后的文本
        this.accumulatedText = this.accumulatedText.substring(lastPunctuationIndex + 1);
        
        // 处理句子播放
        this.handleSentencePlayback();
      }
    }
  }

  async playDetached(text: string): Promise<ActiveAudioText> {
    (this.bridge as ObsidianBridgeImpl).isDetachedAudio = true;

    await this.system.audioSink.clearMedia();
    const audio: AudioText = buildTrack(text);
    this.audioStore.activeText?.destroy();
    mobx.runInAction(
        () => (this.audioStore.activeText = new ActiveAudioTextImpl(audio, this.system)),
    );
    this.audioStore.activeText!.play();
    return this.audioStore.activeText!;
  }

    /**
     * 处理句子播放的方法
     * 当有新句子时，第一个句子用于初始化播放，后续句子通过文本更新添加
     */
    private handleSentencePlayback(): void {
        if (this.sentences.length > 0 && this.index === 0) {
            // 如果还没有激活的音频播放器，则使用第一个句子初始化播放
            const firstSentence = this.sentences[0];
            this.playDetached(firstSentence);
            this.index++;
            this.textLength = firstSentence.length;
        }
        
        // 对于后续的句子，使用 onTextChanged 方法添加到当前播放中
        if (this.sentences.length > this.index) {     
             // 使用 mobx.runInAction 包装修改操作
            mobx.runInAction(() => {
                // 从当前索引开始添加未处理的句子
                for (let i = this.index; i < this.sentences.length; i++) {
                    const sentence = this.sentences[i];
                    // 直接创建新的chunk并添加到现有chunks中
                    const newChunk = new AudioTextChunk({
                        rawText: sentence,
                        start: this.textLength,
                        end: this.textLength + sentence.length,
                    });

                    // 添加新chunk到现有chunks数组
                    this.audioStore.activeText?.audio.chunks.push(newChunk);

                    this.textLength += sentence.length;
                    this.index++;
                }
            });
               
            // console.log("chunks:", this.audioStore.activeText?.audio.chunks.length);
        }
    }

  /**
   * 完成流式播放
   */
  public finish(): void {
    // 将剩余的文本也作为句子处理
    if (this.accumulatedText.trim().length > 0) {
      this.sentences.push(this.accumulatedText);
    }

    // 处理最后的句子播放
    this.handleSentencePlayback();

    // 清除累积的文本，为下次流式响应做准备
    this.accumulatedText = "";
    this.textChunks = [];
    this.sentences = [];
    this.isFinished = true;
    this.index = 0;
    this.textLength = 0;
  }

  /**
   * 销毁播放器
   */
  public destroy(): void {
    this.accumulatedText = "";
    this.textChunks = [];
    this.isFinished = false;
  }
}

function buildTrack(
  sentence : string,
): AudioText {

  const start = 0;
  const chunks = [];
  const end = start + sentence.length;
  const chunk: AudioTextChunk = new AudioTextChunk({
      rawText: sentence,
      start,
      end,
  });
  chunks.push(chunk);

  return observable({
    id: randomId(),
    filename: "LLM流式对话",
    friendlyName:
      "LLM流式对话" +
      ": " +
      (sentence.length > 30 ? sentence.substring(0, 27) + "..." : sentence),
    created: new Date().valueOf(),
    chunks: chunks,
  });
}