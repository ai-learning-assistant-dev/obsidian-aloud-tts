import * as mobx from "mobx";
import { AudioSystem } from "./AudioSystem";
import { TTSErrorInfo, TTSModelOptions } from "./TTSModel";

/** manages loading and caching of tracks */
export class ChunkLoader {
  private MAX_BACKGROUND_REQUESTS = 3;
  private MAX_LOCAL_TTL_MILLIS = 60 * 1000;

  private system: AudioSystem;
  private backgroundQueue: BackgroundRequest[] = [];
  private backgroundActiveCount = 0;
  private localCache: CachedAudio[] = [];
  private backgroundRequestProcessor: IntervalDaemon;
  private garbageCollector: IntervalDaemon;

  constructor({ system }: { system: AudioSystem }) {
    this.system = system;

    this.backgroundRequestProcessor = IntervalDaemon(
      this.processBackgroundQueue.bind(this),
      { interval: system.config.backgroundLoaderIntervalMillis },
    );
    this.garbageCollector = IntervalDaemon(this.processGarbage.bind(this), {
      interval: this.MAX_LOCAL_TTL_MILLIS / 2,
    }).startIfNot();
  }

  expireBefore = (
    position: number = this.system.audioStore?.activeText?.position ?? 0,
  ): void => {
    this.backgroundQueue = this.backgroundQueue.filter(
      (x) => !(x.position < position),
    );
  };

  /**
   * When you remove an ArrayBuffer from the audio, it dereferences the ArrayBuffer, rendering it
   * as a useless pointer that can no longer be used. This method removes the cached audio for that same
   * text, such that it can be re-loaded from the disk cache.
   */
  uncache(text: string): void {
    this.localCache = this.localCache.filter((x) => x.text !== text);
  }

  preload(text: string, options: TTSModelOptions, position: number): void {
    const found = this.backgroundQueue.find(
      (x) => x.text === text && mobx.comparer.structural(x.options, options),
    );
    if (found) {
      return;
    }
    const loaded = this.localCache.find(
      (x) => x.text === text && mobx.comparer.structural(x.options, options),
    );
    if (loaded) {
      return;
    }
    this.backgroundQueue.push({
      text,
      options,
      requestedTime: Date.now(),
      position,
    });
    this.backgroundRequestProcessor.startIfNot();
  }

  load(text: string, options: TTSModelOptions): Promise<ArrayBuffer> {
    const existing = this.localCache.find(
      (x) =>
        x.text === text &&
        JSON.stringify(x.options) === JSON.stringify(options),
    );
    if (existing) {
      existing.requestedTime = Date.now();
      return existing.result;
    } else {
      const audio = this.createCachedAudio(text, options);
      this.localCache.push(audio);
      return audio.result;
    }
  }

  destroy(): void {
    this.backgroundRequestProcessor.stop();
    this.garbageCollector.stop();
  }

  private createCachedAudio(
    text: string,
    options: TTSModelOptions,
  ): CachedAudio {
    const audio = {
      text,
      options,
      requestedTime: Date.now(),
      result: this.tryLoadTrack(text, options, 0, 3).catch((e) => {
        this.destroyCachedAudio(audio);
        throw e;
      }),
    };
    return audio;
  }

  private destroyCachedAudio(audio: CachedAudio): void {
    const index = this.localCache.indexOf(audio);
    if (index !== -1) {
      this.localCache.splice(index, 1);
    }
  }

  // combined with the IntervalDaemon, this has the behavior of adding a request
  // ever interval, up until it saturates at the MAX_BACKGROUND_REQUESTS
  private processBackgroundQueue(): boolean {
    if (this.backgroundActiveCount >= this.MAX_BACKGROUND_REQUESTS) {
      return true;
    } else if (this.backgroundQueue.length === 0) {
      return false;
    } else {
      const item = this.backgroundQueue.shift()!;
      this.backgroundActiveCount += 1;
      this.load(item.text, item.options).finally(() => {
        this.backgroundActiveCount -= 1;
        this.processBackgroundQueue();
      });
      return true;
    }
  }

  private processGarbage(): boolean {
    this.localCache = this.localCache.filter(
      (req) => Date.now() - req.requestedTime < this.MAX_LOCAL_TTL_MILLIS,
    );
    return true;
  }

  private async tryLoadTrack(
    track: string,
    options: TTSModelOptions,
    attempt: number = 0,
    maxAttempts: number = 3,
  ): Promise<ArrayBuffer> {
    try {
      console.log(`尝试加载音频块 (第${attempt + 1}次): "${track.substring(0, 50)}..."`);
      return await this.loadTrack(track, options);
    } catch (ex) {
      const errorInfo = ex instanceof TTSErrorInfo ? ex : undefined;
      const canRetry =
        attempt < maxAttempts && (errorInfo ? errorInfo.isRetryable : true);
      
      console.error(`音频块加载失败 (第${attempt + 1}次):`, ex);
      
      if (!canRetry) {
        console.error(`音频块加载最终失败，已尝试 ${attempt + 1} 次`);
        throw ex;
      } else {
        const delay = 250 * Math.pow(2, attempt);
        console.warn(`音频块加载失败，${delay}ms后重试 (第${attempt + 2}次)`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return await this.tryLoadTrack(
          track,
          options,
          attempt + 1,
          maxAttempts,
        );
      }
    }
  }

  /** non-stateful function (barring layers of caching and API calls) */
  private async loadTrack(
    text: string,
    options: TTSModelOptions,
  ): Promise<ArrayBuffer> {
    // copy the settings to make sure audio isn't stored under under the wrong key
    // if the settings are changed while request is in flight
    const stored: ArrayBuffer | null = await this.system.storage.getAudio(
      text,
      options,
    );
    if (stored) {
      return stored;
    } else {
      const buff = await this.system.ttsModel(text, options);
      await this.system.storage.saveAudio(text, options, buff);
      return buff;
    }
  }
}

interface IntervalDaemon {
  stop: () => IntervalDaemon;
  startIfNot: () => IntervalDaemon;
}

type ShouldContinue = boolean;

/** runs the work function every interval, until the work function returns false. Can be stopped and started. */
export function IntervalDaemon(
  doWork: () => ShouldContinue,
  opts: {
    interval: number;
  },
): IntervalDaemon {
  let timer: undefined | ReturnType<typeof setInterval>;
  const processor: IntervalDaemon = {
    stop: () => {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
      return processor;
    },
    startIfNot: () => {
      if (timer !== undefined) {
        return processor;
      }
      let shouldContinue = true;
      try {
        shouldContinue = doWork();
      } catch (ex) {
        // ignore it, will retry
      }
      if (shouldContinue) {
        timer = setInterval(() => {
          let shouldContinue = true;
          try {
            shouldContinue = doWork();
          } catch (ex) {
            // ignore it, will retry
          }
          if (!shouldContinue) {
            processor.stop();
          }
        }, opts.interval);
      }
      return processor;
    },
  };
  return processor;
}

interface BackgroundRequest {
  /** the text that was requested */
  text: string;
  /** the options used to generate this audio */
  options: TTSModelOptions;
  /** the time the request was made. Milliseconds since Unix Epoch */
  requestedTime: number;
  /** the track number that was requested */
  position: number;
}

interface CachedAudio {
  /** the text that was requested */
  readonly text: string;
  /** the options used to generate this audio */
  readonly options: TTSModelOptions;
  /** the final result of the request across retries */
  readonly result: Promise<ArrayBuffer>;
  /** the time the request was made. Milliseconds since Unix Epoch. May be updated to prevent deletion */
  requestedTime: number;
}
