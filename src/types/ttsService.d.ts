// 在src/types/ttsService.d.ts新增文件
export interface TTSService {
  playText(text: string): Promise<void>;
  isAvailable(): boolean;
  // 添加流式文本处理方法
  playStreamText?(chunk: { index: number; length: number; text: string }): Promise<void>;
  finishStreamText?(): Promise<void>;
}