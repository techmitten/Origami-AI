import React, { useEffect, useState } from 'react';
import { X, Sparkles, Loader2, Minus, Plus, Settings as SettingsIcon, AlertTriangle, ArrowLeft, RefreshCw, Check, Image as ImageIcon } from 'lucide-react';
import { useAISlideGeneration } from '../hooks/useAISlideGeneration';
import type { SlideTone, SlidesScript } from '../services/slidesScriptService';
import type { GlobalSettings } from '../services/storage';
import type { SlideData } from '../types/slides';

interface AISlideGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerated: (slides: SlideData[]) => void;
  globalSettings?: GlobalSettings | null;
  onOpenSettings?: () => void;
}

const TONE_OPTIONS: { id: SlideTone; label: string }[] = [
  { id: 'professional', label: 'Professional' },
  { id: 'casual', label: 'Casual' },
  { id: 'educational', label: 'Educational' },
  { id: 'persuasive', label: 'Persuasive' },
  { id: 'storytelling', label: 'Storytelling' },
];

const MIN_SLIDES = 3;
const MAX_SLIDES = 15;
const DEFAULT_SLIDES = 7;

export const AISlideGeneratorModal: React.FC<AISlideGeneratorModalProps> = ({
  isOpen,
  onClose,
  onGenerated,
  globalSettings,
  onOpenSettings,
}) => {
  const [topic, setTopic] = useState('');
  const [slideCount, setSlideCount] = useState(DEFAULT_SLIDES);
  const [tone, setTone] = useState<SlideTone>('professional');
  const [error, setError] = useState<string | null>(null);
  const [outline, setOutline] = useState<SlidesScript | null>(null);

  const { generateOutline, generateFromOutline, cancel, isBusy, busyLabel } = useAISlideGeneration(globalSettings);

  const useOpenAI = !!globalSettings?.useOpenAIForSlideGen;
  const isConfigured = useOpenAI
    ? !!(globalSettings?.openaiEndpoint && globalSettings?.openaiModel && globalSettings?.openaiApiKey)
    : !!globalSettings?.webLlmModel;

  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Escape closes, matching every other dismissal path
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isBusy) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, isBusy]);

  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setOutline(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGenerateOutline = async () => {
    if (!topic.trim() || isBusy) return;
    setError(null);
    try {
      const script = await generateOutline({ topic: topic.trim(), slideCount, tone });
      setOutline(script);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Failed to generate the outline. Please try again.');
    }
  };

  const handleApprove = async () => {
    if (!outline || isBusy) return;
    setError(null);
    // Trim and drop bullets the user cleared out before this becomes the deck's actual content.
    const sanitized: SlidesScript = {
      title: outline.title.trim() || 'Untitled Deck',
      slides: outline.slides.map((slide, i) => ({
        ...slide,
        title: slide.title.trim() || `Slide ${i + 1}`,
        bullets: slide.bullets.map((b) => b.trim()).filter(Boolean),
        narration: slide.narration.trim(),
        imagePrompt: slide.imagePrompt.trim() || `background illustration representing ${slide.title.trim() || outline.title}, soft natural lighting, modern composition, no text, no words, no letters, no numbers, no typography, no captions, no signage, no logos, no watermarks, textless image`,
      })),
    };
    try {
      const slides = await generateFromOutline(sanitized);
      onGenerated(slides);
      onClose();
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setError(e instanceof Error ? e.message : 'Failed to generate slides. Please try again.');
    }
  };

  const handleBackToForm = () => {
    if (isBusy) return;
    setError(null);
    setOutline(null);
  };

  const updateDeckTitle = (value: string) => {
    setOutline((prev) => (prev ? { ...prev, title: value } : prev));
  };

  const updateSlideTitle = (slideIndex: number, value: string) => {
    setOutline((prev) => {
      if (!prev) return prev;
      const slides = prev.slides.map((s, i) => (i === slideIndex ? { ...s, title: value } : s));
      return { ...prev, slides };
    });
  };

  const updateSlideNarration = (slideIndex: number, value: string) => {
    setOutline((prev) => {
      if (!prev) return prev;
      const slides = prev.slides.map((s, i) => (i === slideIndex ? { ...s, narration: value } : s));
      return { ...prev, slides };
    });
  };

  const updateBullet = (slideIndex: number, bulletIndex: number, value: string) => {
    setOutline((prev) => {
      if (!prev) return prev;
      const slides = prev.slides.map((s, i) => {
        if (i !== slideIndex) return s;
        return { ...s, bullets: s.bullets.map((b, bi) => (bi === bulletIndex ? value : b)) };
      });
      return { ...prev, slides };
    });
  };

  const addBullet = (slideIndex: number) => {
    setOutline((prev) => {
      if (!prev) return prev;
      const slides = prev.slides.map((s, i) => (i === slideIndex ? { ...s, bullets: [...s.bullets, ''] } : s));
      return { ...prev, slides };
    });
  };

  const removeBullet = (slideIndex: number, bulletIndex: number) => {
    setOutline((prev) => {
      if (!prev) return prev;
      const slides = prev.slides.map((s, i) => {
        if (i !== slideIndex) return s;
        return { ...s, bullets: s.bullets.filter((_, bi) => bi !== bulletIndex) };
      });
      return { ...prev, slides };
    });
  };

  const updateImagePrompt = (slideIndex: number, value: string) => {
    setOutline((prev) => {
      if (!prev) return prev;
      const slides = prev.slides.map((s, i) => (i === slideIndex ? { ...s, imagePrompt: value } : s));
      return { ...prev, slides };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Create slides"
        className={`relative w-full ${outline ? 'max-w-3xl' : 'max-w-xl'} bg-[#14161B] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[90vh] origami-unfold transition-[max-width] duration-200`}
      >
        {/* Header */}
        <div className="px-6 sm:px-8 pt-6 sm:pt-7 pb-5 border-b border-white/5 flex items-start justify-between gap-4">
          <div>
            <span className="block text-[11px] font-mono uppercase tracking-[0.2em] text-white/35 mb-2">
              AI slide generator
            </span>
            <h2 className="font-display text-2xl font-bold text-white mb-2 tracking-tight">
              Create slides
            </h2>
            <p className="text-sm text-white/55 max-w-md">
              {outline
                ? 'Review the outline below, then approve it to generate images and narration for every slide.'
                : 'Describe a topic and get a full deck — narration and all — without leaving the app.'}
            </p>
          </div>
          <button
            onClick={() => !isBusy && onClose()}
            aria-label="Close"
            disabled={isBusy}
            className="shrink-0 p-2 -mr-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content — a non-scrolling column; when an outline is present, only the slide
            list below scrolls (nested scroll), so the header and footer/action buttons
            never require scrolling the modal itself to reach. */}
        <div className="px-6 sm:px-8 py-5 sm:py-6 flex-1 min-h-0 flex flex-col gap-5 overflow-y-auto custom-scrollbar">
          {!isConfigured && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/25">
              <AlertTriangle className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
              <div className="space-y-2 flex-1 min-w-0">
                <p className="text-xs text-amber-100/90 leading-relaxed">
                  {useOpenAI
                    ? 'Your OpenAI-compatible endpoint isn’t fully set up yet — add an endpoint, model, and API key in Settings.'
                    : 'No local model is selected. Choose a WebLLM model, or switch on "Use for Slide Generation" with an OpenAI-compatible endpoint in Settings.'}
                </p>
                {onOpenSettings && (
                  <button
                    onClick={onOpenSettings}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-200 hover:text-amber-100"
                  >
                    <SettingsIcon className="w-3.5 h-3.5" />
                    Open Settings
                  </button>
                )}
              </div>
            </div>
          )}

          {!outline && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Topic</label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  disabled={isBusy}
                  placeholder="e.g. Quarterly sales results for the Northeast region"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white placeholder-white/30 focus:border-branding-primary focus:ring-1 focus:ring-branding-primary outline-none transition-all resize-none disabled:opacity-50"
                />
              </div>

              <div className="flex gap-4">
                <div className="space-y-1 flex-1">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Slides</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSlideCount((c) => Math.max(MIN_SLIDES, c - 1))}
                      disabled={isBusy || slideCount <= MIN_SLIDES}
                      className="p-2.5 rounded-lg bg-black/20 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-10 text-center text-sm font-bold text-white">{slideCount}</span>
                    <button
                      onClick={() => setSlideCount((c) => Math.min(MAX_SLIDES, c + 1))}
                      disabled={isBusy || slideCount >= MAX_SLIDES}
                      className="p-2.5 rounded-lg bg-black/20 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 flex-2">
                  <label className="text-xs font-bold text-white/40 uppercase tracking-widest">Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as SlideTone)}
                    disabled={isBusy}
                    className="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 text-white focus:border-branding-primary focus:ring-1 focus:ring-branding-primary outline-none transition-all disabled:opacity-50"
                  >
                    {TONE_OPTIONS.map((t) => (
                      <option key={t.id} value={t.id} className="bg-[#14161B]">{t.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}

          {outline && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <input
                  value={outline.title}
                  onChange={(e) => updateDeckTitle(e.target.value)}
                  disabled={isBusy}
                  placeholder="Deck title"
                  className="flex-1 min-w-0 bg-transparent text-xs font-bold text-white/70 uppercase tracking-widest outline-none border-b border-transparent focus:border-branding-primary/50 disabled:opacity-50"
                />
                <span className="text-xs font-bold text-white/40 uppercase tracking-widest shrink-0">
                  {outline.slides.length} slides
                </span>
              </div>
              <p className="text-[11px] text-white/35">Edit any field below — your changes are what gets narrated and rendered.</p>
              {/* Fixed, moderate cap (not flex-1) so the list — not the whole dialog — is what
                  grows with slide count, keeping the dialog itself short and the footer close by. */}
              <ol className="max-h-[38vh] sm:max-h-[42vh] overflow-y-auto custom-scrollbar space-y-3 pr-1 -mr-1 mt-2">
                {outline.slides.map((slide, i) => (
                  <li key={i} className="p-4 rounded-xl bg-black/20 border border-white/10">
                    <div className="flex items-baseline gap-2">
                      <span className="text-xs font-mono text-white/30 shrink-0">{i + 1}</span>
                      <input
                        value={slide.title}
                        onChange={(e) => updateSlideTitle(i, e.target.value)}
                        disabled={isBusy}
                        placeholder="Slide title"
                        className="flex-1 min-w-0 bg-transparent text-sm font-bold text-white outline-none border-b border-transparent focus:border-branding-primary/50 disabled:opacity-50"
                      />
                    </div>

                    <div className="mt-2 ml-5 space-y-1">
                      {slide.bullets.map((bullet, bi) => (
                        <div key={bi} className="flex items-center gap-1.5">
                          <span className="text-white/30 text-xs shrink-0">•</span>
                          <input
                            value={bullet}
                            onChange={(e) => updateBullet(i, bi, e.target.value)}
                            disabled={isBusy}
                            placeholder="Bullet point"
                            className="flex-1 min-w-0 bg-transparent text-xs text-white/65 outline-none border-b border-transparent focus:border-branding-primary/50 disabled:opacity-50"
                          />
                          <button
                            onClick={() => removeBullet(i, bi)}
                            disabled={isBusy}
                            aria-label="Remove bullet"
                            className="shrink-0 p-0.5 rounded text-white/25 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addBullet(i)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-1 text-xs text-white/35 hover:text-white/70 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                        Add bullet
                      </button>
                    </div>

                    <textarea
                      value={slide.narration}
                      onChange={(e) => updateSlideNarration(i, e.target.value)}
                      disabled={isBusy}
                      placeholder="Narration"
                      rows={2}
                      className="mt-2 ml-5 block w-[calc(100%-1.25rem)] bg-transparent text-xs text-white/45 italic leading-relaxed outline-none resize-none border-b border-transparent focus:border-branding-primary/50 disabled:opacity-50"
                    />

                    <details className="mt-2 ml-5">
                      <summary className="cursor-pointer list-none select-none inline-flex items-center gap-1.5 text-[11px] font-bold text-white/30 uppercase tracking-widest hover:text-white/60 transition-colors">
                        <ImageIcon className="w-3 h-3" />
                        Background image prompt
                      </summary>
                      <textarea
                        value={slide.imagePrompt}
                        onChange={(e) => updateImagePrompt(i, e.target.value)}
                        disabled={isBusy}
                        placeholder="Background image prompt"
                        rows={2}
                        className="mt-1.5 w-full px-3 py-2 rounded-lg bg-black/30 border border-white/10 text-[11px] text-white/55 outline-none resize-none focus:border-branding-primary/50 disabled:opacity-50"
                      />
                    </details>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {isBusy && (
            <div role="status" className="flex items-center gap-3 rounded-xl border border-cyan-400/25 bg-cyan-400/8 px-4 py-3 text-sm text-cyan-100">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              {busyLabel || 'Working...'}
            </div>
          )}

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/25 text-xs text-red-200 leading-relaxed">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-8 py-4 border-t border-white/5 flex items-center justify-end gap-3">
          {isBusy ? (
            <button
              onClick={cancel}
              className="px-5 py-2.5 rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/5 text-sm font-bold transition-colors"
            >
              Cancel
            </button>
          ) : outline ? (
            <>
              <button
                onClick={handleBackToForm}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/5 text-sm font-bold transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back
              </button>
              <button
                onClick={handleGenerateOutline}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-white/15 text-white/70 hover:text-white hover:bg-white/5 text-sm font-bold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Regenerate
              </button>
              <button
                onClick={handleApprove}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-branding-primary text-white font-extrabold text-sm shadow-lg shadow-branding-primary/30 hover:bg-branding-primary/90 transition-all"
              >
                <Check className="w-4 h-4" />
                Approve & Generate
              </button>
            </>
          ) : (
            <button
              onClick={handleGenerateOutline}
              disabled={!topic.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-branding-primary text-white font-extrabold text-sm shadow-lg shadow-branding-primary/30 hover:bg-branding-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              <Sparkles className="w-4 h-4" />
              Generate Outline
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
