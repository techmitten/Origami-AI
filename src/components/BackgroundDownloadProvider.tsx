import React, { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { BackgroundDownloadToast } from './BackgroundDownloadToast';
import { WebGPUInstructionsModal } from './WebGPUInstructionsModal';
import { BackgroundDownloadContext, type DownloadQueue } from '../context/BackgroundDownloadContext';
import { initTTS, ttsEvents } from '../services/ttsService';
import { getFFmpeg } from '../services/ffmpegLoader';
import { videoEvents } from '../services/BrowserVideoRenderer';
import {
  checkWebGPUSupport,
  getDefaultWebLlmModel,
  getWebLlmModelInfo,
  initWebLLM,
  webLlmEvents,
} from '../services/webLlmService';
import { loadGlobalSettings, saveGlobalSettings, type GlobalSettings } from '../services/storage';
import { setSyncedPreference } from '../services/preferences';

const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  isEnabled: true,
  voice: 'af_heart',
  delay: 0.5,
  transition: 'fade',
  introFadeInEnabled: true,
  introFadeInDurationSec: 1,
  previewMode: 'modal',
  aspectRatio: '16:9',
};

const waitForTTSInitialization = (quantization: 'q8' | 'q4'): Promise<void> =>
  new Promise<void>((resolve, reject) => {
    const handleInitComplete = () => {
      ttsEvents.removeEventListener('tts-init-complete', handleInitComplete);
      resolve();
    };
    ttsEvents.addEventListener('tts-init-complete', handleInitComplete);
    try {
      initTTS(quantization);
    } catch (error) {
      ttsEvents.removeEventListener('tts-init-complete', handleInitComplete);
      reject(error);
    }
  });

/**
 * Owns the background download state and renders the progress modal above the
 * router, so the modal survives navigation (e.g. opening /assistant while
 * resources are still downloading) instead of unmounting with the page.
 */
export const BackgroundDownloadProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isBackgroundDownloadActive, setIsBackgroundDownloadActive] = useState(false);
  const [activeDownloads, setActiveDownloads] = useState<DownloadQueue>({ tts: false, ffmpeg: false, webllm: false });
  const [isWebGPUModalOpen, setIsWebGPUModalOpen] = useState(false);

  useEffect(() => {
    const updateCacheStatus = (key: 'tts' | 'ffmpeg' | 'webllm') => {
      const current = JSON.parse(localStorage.getItem('resource_cache_status') || '{"tts":false,"ffmpeg":false,"webllm":false}');
      if (!current[key]) {
        current[key] = true;
        localStorage.setItem('resource_cache_status', JSON.stringify(current));
      }
    };

    const handleTTSInit = () => updateCacheStatus('tts');
    const handleVideoProgress = (e: Event) => {
      const detail = (e as CustomEvent<{ status: string }>).detail;
      if (detail.status === 'FFmpeg ready') {
        updateCacheStatus('ffmpeg');
      }
    };
    const handleWebLLMInit = () => updateCacheStatus('webllm');

    ttsEvents.addEventListener('tts-init-complete', handleTTSInit);
    videoEvents.addEventListener('video-progress', handleVideoProgress);
    webLlmEvents.addEventListener('webllm-init-complete', handleWebLLMInit);

    return () => {
      ttsEvents.removeEventListener('tts-init-complete', handleTTSInit);
      videoEvents.removeEventListener('video-progress', handleVideoProgress);
      webLlmEvents.removeEventListener('webllm-init-complete', handleWebLLMInit);
    };
  }, []);

  const startBackgroundDownloads = useCallback((queue: DownloadQueue) => {
    setActiveDownloads(queue);
    setIsBackgroundDownloadActive(true);
  }, []);

  const endBackgroundDownloads = useCallback(() => {
    setIsBackgroundDownloadActive(false);
  }, []);

  const runSetupDownloads = useCallback(
    async (mode: 'webllm' | 'byok') => {
      setSyncedPreference('hide_setup_modal', 'true');

      const persisted = (await loadGlobalSettings()) ?? DEFAULT_GLOBAL_SETTINGS;
      const quantization = persisted.ttsQuantization || 'q8';

      if (mode === 'byok') {
        if (persisted.useWebLLM) {
          await saveGlobalSettings({ ...persisted, useWebLLM: false });
          window.dispatchEvent(new CustomEvent('global-settings-updated'));
        }
      } else {
        const webgpuStatus = await checkWebGPUSupport();
        if (webgpuStatus.supported) {
          const configuredModel = getWebLlmModelInfo(persisted.webLlmModel);
          const isConfiguredModelCompatible =
            configuredModel && (webgpuStatus.hasF16 || configuredModel.precision === 'f32');
          const model = isConfiguredModelCompatible
            ? configuredModel.id
            : getDefaultWebLlmModel(webgpuStatus.hasF16);
          await saveGlobalSettings({ ...persisted, useWebLLM: true, webLlmModel: model });
          window.dispatchEvent(new CustomEvent('global-settings-updated'));
        }
      }

      const cached = JSON.parse(
        localStorage.getItem('resource_cache_status') || '{"tts":false,"ffmpeg":false,"webllm":false}',
      ) as DownloadQueue;
      const queue: DownloadQueue = {
        tts: !cached.tts,
        ffmpeg: !cached.ffmpeg,
        webllm: mode === 'webllm' && !cached.webllm,
      };

      if (!queue.tts && !queue.ffmpeg && !queue.webllm) {
        if (mode === 'webllm') {
          const webgpuStatus = await checkWebGPUSupport();
          if (!webgpuStatus.supported) {
            setIsWebGPUModalOpen(true);
          }
        }
        return;
      }

      startBackgroundDownloads(queue);

      try {
        // Downloads run strictly one at a time: TTS -> FFmpeg -> WebLLM.
        if (queue.tts) {
          await waitForTTSInitialization(quantization);
        }

        if (queue.ffmpeg) {
          await getFFmpeg();
        }

        if (queue.webllm) {
          const webgpuStatus = await checkWebGPUSupport();
          if (webgpuStatus.supported) {
            const latest = (await loadGlobalSettings()) ?? persisted;
            const configuredModel = getWebLlmModelInfo(latest.webLlmModel);
            const isConfiguredModelCompatible =
              configuredModel && (webgpuStatus.hasF16 || configuredModel.precision === 'f32');
            const model = isConfiguredModelCompatible
              ? configuredModel.id
              : getDefaultWebLlmModel(webgpuStatus.hasF16);
            if (!latest.useWebLLM || latest.webLlmModel !== model) {
              await saveGlobalSettings({ ...latest, useWebLLM: true, webLlmModel: model });
              window.dispatchEvent(new CustomEvent('global-settings-updated'));
            }
            await initWebLLM(model, () => {});
          } else {
            setIsWebGPUModalOpen(true);
          }
        }
      } catch (error) {
        console.error('Failed to complete background setup downloads:', error);
      } finally {
        endBackgroundDownloads();
      }
    },
    [startBackgroundDownloads, endBackgroundDownloads],
  );

  const value = useMemo(
    () => ({
      isBackgroundDownloadActive,
      activeDownloads,
      startBackgroundDownloads,
      endBackgroundDownloads,
      runSetupDownloads,
    }),
    [isBackgroundDownloadActive, activeDownloads, startBackgroundDownloads, endBackgroundDownloads, runSetupDownloads]
  );

  return (
    <BackgroundDownloadContext.Provider value={value}>
      {children}
      <BackgroundDownloadToast active={isBackgroundDownloadActive} queue={activeDownloads} />
      <WebGPUInstructionsModal isOpen={isWebGPUModalOpen} onClose={() => setIsWebGPUModalOpen(false)} />
    </BackgroundDownloadContext.Provider>
  );
};
