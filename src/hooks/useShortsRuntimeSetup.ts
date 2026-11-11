import { useEffect, useState } from 'react';
import { initTTS } from '../services/ttsService';
import { listImageModels, POLLINATIONS_IMAGE_MODELS } from '../services/pollinationsService';
import { listVideoModels, POLLINATIONS_VIDEO_MODELS } from '../services/pollinationsVideoService';
import { fromPersistedProject, type ShortsProject } from '../services/shortsProject';
import { loadGlobalSettings, loadShortsProject, type GlobalSettings } from '../services/storage';

type Stage = 'compose' | 'storyboard';

/**
 * One-time page bootstrap: restores the saved draft/settings, kicks off TTS
 * preloading, and fetches the live Pollinations model catalogues.
 */
export function useShortsRuntimeSetup(params: {
  defaultGlobalSettings: GlobalSettings;
  setGlobalSettings: React.Dispatch<React.SetStateAction<GlobalSettings>>;
  setProject: React.Dispatch<React.SetStateAction<ShortsProject>>;
  setStage: React.Dispatch<React.SetStateAction<Stage>>;
  setIsSettingsOpen: (open: boolean) => void;
  generationAbortRef: React.RefObject<AbortController | null>;
  renderAbortRef: React.RefObject<AbortController | null>;
}) {
  const {
    defaultGlobalSettings,
    setGlobalSettings,
    setProject,
    setStage,
    setIsSettingsOpen,
    generationAbortRef,
    renderAbortRef,
  } = params;

  const [imageModels, setImageModels] = useState(POLLINATIONS_IMAGE_MODELS);
  const [videoModels, setVideoModels] = useState(POLLINATIONS_VIDEO_MODELS);

  useEffect(() => {
    const handleGlobalSettingsUpdated = () => {
      loadGlobalSettings()
        .then((settings) => {
          if (settings) {
            setGlobalSettings((prev) => ({ ...prev, ...settings }));
          }
        })
        .catch(() => {});
    };
    window.addEventListener('global-settings-updated', handleGlobalSettingsUpdated);
    return () => window.removeEventListener('global-settings-updated', handleGlobalSettingsUpdated);
  }, [setGlobalSettings]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const [settings, draft] = await Promise.all([loadGlobalSettings(), loadShortsProject()]);
      if (!mounted) return;

      const merged = { ...defaultGlobalSettings, ...(settings ?? {}) };
      setGlobalSettings(merged);

      if (draft?.scenes?.length) {
        const restored = fromPersistedProject(draft);
        setProject(restored);
        setStage('storyboard');
      } else {
        setProject((prev) => ({
          ...prev,
          voice: merged.shortsVoice || merged.voice || prev.voice,
          imageModel: merged.pollinationsImageModel || prev.imageModel,
          captionStyle: merged.shortsCaptionStyle || prev.captionStyle,
          captionSize: merged.shortsCaptionSize || prev.captionSize,
          captionPosition: merged.shortsCaptionPosition || prev.captionPosition,
        }));
      }

      // The TTS worker downloads ~80MB on first use; start it while the user types.
      try {
        initTTS(merged.ttsQuantization || 'q8');
      } catch (e) {
        console.warn('[Shorts] TTS init could not be started:', e);
      }

      if (sessionStorage.getItem('origami_open_settings_tab') === 'api') {
        sessionStorage.removeItem('origami_open_settings_tab');
        setIsSettingsOpen(true);
      }
    })();

    // listImageModels/listVideoModels never reject; they resolve the static
    // fallback on failure.
    void listImageModels().then((models) => {
      if (mounted) setImageModels(models);
    });
    void listVideoModels().then((models) => {
      if (mounted) setVideoModels(models);
    });

    return () => {
      mounted = false;
      // Intentionally read at cleanup time, not a stale mount-time snapshot:
      // this aborts whatever render is in flight when the page unmounts, not
      // whatever (if anything) was in flight when it mounted. Not a DOM ref,
      // so the "copy to a variable" suggestion doesn't apply here.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generationAbortRef.current?.abort();
      // eslint-disable-next-line react-hooks/exhaustive-deps
      renderAbortRef.current?.abort();
    };
  }, [defaultGlobalSettings, generationAbortRef, renderAbortRef, setGlobalSettings, setIsSettingsOpen, setProject, setStage]);

  return {
    imageModels,
    videoModels,
  };
}
