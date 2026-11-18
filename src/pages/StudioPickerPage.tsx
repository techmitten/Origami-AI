import React, { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  Layers,
  Bot,
  Film,
  AudioLines,
  FileCog,
  LibraryBig,
  ChevronLeft,
  ChevronRight,
  Cpu,
  KeyRound,
  ArrowRight,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Footer } from '../components/Footer';
import { useTransitionNavigate } from '../components/TransitionLink';
import { usePageMeta } from '../hooks/usePageMeta';
import { useAuth } from '../context/AuthContext';
import { useBackgroundDownload } from '../context/BackgroundDownloadContext';
import { setSyncedPreference } from '../services/preferences';
import CrystalizedBall from '../components/CrystalizedBall';
import ParticleText from '../components/ParticleText';

interface StudioEntry {
  to: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
  /** Tint for the crystal ball when this studio is selected. */
  crystalColor: string;
}

const STUDIOS: StudioEntry[] = [
  {
    to: '/?editor=1',
    title: 'Slide Studio',
    description: 'Turn PDF decks into fully narrated, animated video presentations in minutes.',
    icon: Layers,
    color: 'text-cyan-300',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-400/30',
    crystalColor: '#67E8F9',
  },
  {
    to: '/shorts',
    title: 'Shorts Generator',
    description: 'Create faceless AI shorts with generated visuals, captions, and local TTS.',
    icon: Film,
    color: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-400/30',
    crystalColor: '#FFB85C',
  },
  {
    to: '/voice',
    title: 'Voice Studio',
    description: 'Type anything and hear it spoken by on-device voices, then download the MP3.',
    icon: AudioLines,
    color: 'text-sky-300',
    bg: 'bg-sky-500/10',
    border: 'border-sky-400/30',
    crystalColor: '#8CCBFF',
  },
  {
    to: '/convert',
    title: 'File Studio',
    description: 'Convert and compress images and audio right in your browser — no uploads.',
    icon: FileCog,
    color: 'text-orange-300',
    bg: 'bg-orange-500/10',
    border: 'border-orange-400/30',
    crystalColor: '#FF8F7A',
  },
  {
    to: '/assistant',
    title: 'AI Assistant',
    description: 'Chat with a private, local LLM to draft scripts and restructure narration.',
    icon: Bot,
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-400/30',
    crystalColor: '#5CFFC8',
  },
];

const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/<>';

/** Resolves a string out of random glyphs, left to right, like a digital readout. */
const ScrambleText: React.FC<{ text: string }> = ({ text }) => {
  const [shown, setShown] = useState(text);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let frame = 0;
    const total = 14;
    const id = window.setInterval(() => {
      frame += 1;
      const settled = Math.floor((frame / total) * text.length);
      setShown(
        text
          .split('')
          .map((ch, i) =>
            i < settled || ch === ' ' ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)],
          )
          .join(''),
      );
      if (frame >= total) {
        window.clearInterval(id);
        setShown(text);
      }
    }, 35);
    return () => window.clearInterval(id);
  }, [text]);

  return (
    <span aria-label={text}>
      <span aria-hidden="true">{shown}</span>
    </span>
  );
};

export const StudioPickerPage: React.FC = () => {
  usePageMeta({
    title: 'Pick a Studio — Origami AI',
    description:
      'Choose where to create: slide videos, AI shorts, voiceovers, file conversion, or the local AI assistant. All studios run entirely in your browser.',
    path: '/studios',
  });

  const { user } = useAuth();
  const navigate = useTransitionNavigate();
  const { runSetupDownloads } = useBackgroundDownload();

  // The studios offered on this page.

  // The Library is account-bound, so only offer it when there is a session.
  const studios: StudioEntry[] = user
    ? [
        ...STUDIOS,
        {
          to: '/library',
          title: 'Library',
          description: 'Reopen your saved cloud projects on any device, anytime.',
          icon: LibraryBig,
          color: 'text-yellow-100',
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-200/30',
          crystalColor: '#FFF0B3',
        },
      ]
    : STUDIOS;

  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<'studio' | 'ai-engine'>('studio');
  const swipeStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressSwipeClick = useRef(false);
  // The list grows by one when signing in/out; keep the index in range.
  const safeIndex = index % studios.length;
  const active = studios[safeIndex];
  const ActiveIcon = active.icon;

  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + studios.length) % studios.length),
    [studios.length],
  );

  const handleOpenStudio = useCallback(() => {
    if (localStorage.getItem('hide_setup_modal') === 'true') {
      navigate(active.to);
      return;
    }
    setStep('ai-engine');
  }, [active.to, navigate]);

  const handleSelectWebLLM = useCallback(() => {
    void runSetupDownloads('webllm');
    navigate(active.to);
  }, [active.to, navigate, runSetupDownloads]);

  const handleSelectBYOK = useCallback(() => {
    sessionStorage.setItem('origami_open_settings_tab', 'api');
    void runSetupDownloads('byok');
    navigate(active.to);
  }, [active.to, navigate, runSetupDownloads]);

  const handleSkipAiChoice = useCallback(() => {
    setSyncedPreference('hide_setup_modal', 'true');
    navigate(active.to);
  }, [active.to, navigate]);

  return (
    <div className="studio-picker isolate min-h-[100svh] text-white pt-4 sm:pt-6 flex flex-col px-4 sm:px-8"
      style={{ '--studio-accent': active.crystalColor } as CSSProperties}>
      <div className="studio-picker-ambient fixed inset-0 -z-10 pointer-events-none" aria-hidden="true" />

      {/* This page is the app's landing screen, so the header offers no back
          button — the logo and menu links are the ways out. */}
      <PageHeader
        title="Pick a Studio"
        showHelp={false}
        showSettings={false}
      />

      {/* The whole picker is one screen-high stage: the title, side panels,
          and footer take what they need and the orb fills whatever is left,
          so nothing sits below the fold on any reasonable viewport. */}
      <main className="studio-main mx-auto max-w-6xl w-full flex-1 min-h-0 flex flex-col">
        <div className="text-center shrink-0">
          {step === 'ai-engine' && (
            <p className="text-xs sm:text-sm text-white/45 mt-1">Step 2 of 2</p>
          )}
          <h1 className="studio-title font-display text-white">
            <ParticleText
              text={step === 'ai-engine' ? 'Choose your AI text engine' : 'What will you create?'}
              particleSize={2}
              density={3}
              color="currentColor"
              highlightColor={active.crystalColor}
              highlightMode="motion"
              shape="circle"
              intro="gather"
              scatter={180}
              gatherDuration={1600}
              stagger={420}
              clickBurst
              burstStrength={1}
              pointerRepel={40}
              repelRadius={120}
              idleDrift={0.7}
              trigger="hover"
              fontSize="clamp(1.75rem, min(5.5vw, 7svh), 4rem)"
              fontWeight={800}
              fontFamily="inherit"
              glow
              style={{ height: '100%', minHeight: 0 }}
            />
          </h1>
          {step === 'ai-engine' && (
            <p className="studio-step-intro text-sm sm:text-base text-white/50 max-w-[60ch] mx-auto">
              Origami writes narration scripts and drives the assistant with AI. Pick where that generation happens.
            </p>
          )}
        </div>

        <section
          role="region"
          aria-roledescription="carousel"
          aria-label="Studios"
          className="studio-layout flex-1 min-h-0"
          onKeyDown={(e) => {
            if (step === 'ai-engine') {
              if (e.key === 'Escape') {
                e.preventDefault();
                setStep('studio');
              }
              return;
            }
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              go(1);
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              go(-1);
            }
          }}
        >
          {/* Wide screens: the studios as a rail to the orb's left. */}
          <div className="studio-rail" role="group" aria-label="Choose a studio">
            {studios.map((studio, i) => {
              const Icon = studio.icon;
              return (
                <button
                  key={studio.to}
                  type="button"
                  aria-pressed={i === safeIndex}
                  onClick={() => {
                    setIndex(i);
                    setStep('studio');
                  }}
                  className="studio-rail-item focus-ring"
                  style={{ '--option-accent': studio.crystalColor } as CSSProperties}
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  {studio.title}
                </button>
              );
            })}
          </div>

          <div className={`studio-stage ${step === 'ai-engine' ? 'studio-stage--panel' : ''}`}>
          <div
            className="studio-orb relative aspect-square"
            style={{ touchAction: 'pan-y pinch-zoom' }}
            onPointerDown={(event) => {
              if (step !== 'studio') return;
              if (!event.isPrimary || event.button !== 0) return;
              suppressSwipeClick.current = false;
              swipeStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
            }}
            onPointerMove={(event) => {
              if (step !== 'studio') return;
              const start = swipeStart.current;
              if (!start || start.id !== event.pointerId) return;
              const dx = event.clientX - start.x;
              const dy = event.clientY - start.y;
              if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.3) {
                // Capture only after a horizontal drag so taps still reach links.
                event.currentTarget.setPointerCapture(event.pointerId);
                suppressSwipeClick.current = true;
              }
            }}
            onPointerUp={(event) => {
              if (step !== 'studio') return;
              const start = swipeStart.current;
              if (!start || start.id !== event.pointerId) return;
              const dx = event.clientX - start.x;
              const dy = event.clientY - start.y;
              if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.3) {
                suppressSwipeClick.current = true;
                go(dx < 0 ? 1 : -1);
              }
              swipeStart.current = null;
            }}
            onPointerCancel={() => {
              swipeStart.current = null;
            }}
            onPointerLeave={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                swipeStart.current = null;
              }
            }}
            onLostPointerCapture={(event) => {
              // A touch initially belongs to the tapped child; transferring
              // capture to the orb also bubbles that child's lost-capture event.
              if (event.target !== event.currentTarget) return;
              swipeStart.current = null;
            }}
            onClickCapture={(event) => {
              if (suppressSwipeClick.current && event.detail > 0) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
          >
            <CrystalizedBall
              preset="plasma"
              color={active.crystalColor}
              size={0.7}
              crackle={0.85}
              fill={0.5}
              interactive
              hoverStrength={0.7}
              strands={6}
              flares={0.65}
              glow={0.9}
              sparks={0.6}
              particleCount={15000}
              motion="rise"
              particleShape="square"
              depth={0.6}
              sway={0.5}
              twinkle={0.5}
              haze={0.7}
              dustSpeed={1}
              speed={1}
              intro
              paused={false}
            />

            {/* Keep the primary link or 2nd-step AI engine cards inside the glass; navigation lives below. */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              aria-live="polite" aria-atomic="true"
            >
              {step === 'studio' ? (
                <div className="group studio-orb-center relative w-1/2 aspect-square rounded-full flex items-center justify-center text-center transition-colors duration-300 hover:bg-white/[0.03]">
                  <button
                    key={active.to}
                    type="button"
                    onClick={handleOpenStudio}
                    aria-label={`Open ${active.title}: ${active.description}`}
                    className="studio-display-in pointer-events-auto relative z-10 flex flex-col items-center justify-center w-full max-w-[300px] sm:max-w-[360px] min-h-32 rounded-2xl cursor-pointer focus-ring"
                  >
                    <div
                      className={`studio-orb-icon rounded-2xl flex items-center justify-center border transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${active.bg} ${active.border}`}
                    >
                      <ActiveIcon className={`w-5 h-5 sm:w-8 sm:h-8 ${active.color}`} />
                    </div>
                    <h2 className="studio-orb-title font-mono font-bold text-white tracking-tight">
                      <ScrambleText key={active.title} text={active.title} />
                    </h2>
                  </button>
                </div>
              ) : (
                <div
                  key="ai-engine-choice"
                  className="studio-display-in pointer-events-auto relative z-10 w-[84%] sm:w-[max(62%,400px)] max-w-[430px] rounded-[1.75rem] border border-white/12 bg-[#0b0f18]/75 backdrop-blur-xl shadow-[0_25px_70px_-25px_rgba(0,0,0,0.95),0_0_45px_rgba(34,211,238,0.07)] overflow-hidden flex"
                >
                  <button
                    type="button"
                    onClick={handleSelectWebLLM}
                    className="group relative flex-1 flex flex-col items-center justify-start gap-2.5 px-3 sm:px-5 pt-6 pb-7 text-center transition-colors duration-300 hover:bg-cyan-400/[0.07] focus-ring"
                  >
                    <span className="text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-wide text-emerald-300 bg-emerald-500/10 border border-emerald-400/25 rounded-full px-2 py-0.5">
                      No key required
                    </span>
                    <span className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-400/25 flex items-center justify-center text-cyan-300">
                      <Cpu className="w-5 h-5" />
                    </span>
                    <span className="text-[13px] sm:text-base font-semibold text-white flex items-center gap-1.5">
                      On-Device AI
                      <ArrowRight className="w-3.5 h-3.5 text-cyan-300 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </span>
                    <span className="text-[10px] sm:text-[11px] leading-relaxed text-white/50">
                      Runs a local model in your browser via WebGPU/WebLLM. Private, free, no account needed. Requires a reasonably modern GPU.
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSelectBYOK}
                    className="group relative flex-1 flex flex-col items-center justify-start gap-2.5 px-3 sm:px-5 pt-6 pb-7 text-center transition-colors duration-300 hover:bg-violet-400/[0.07] focus-ring"
                  >
                    <span className="invisible text-[8.5px] sm:text-[9.5px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5" aria-hidden="true">
                      No key required
                    </span>
                    <span className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-400/25 flex items-center justify-center text-violet-300">
                      <KeyRound className="w-5 h-5" />
                    </span>
                    <span className="text-[13px] sm:text-base font-semibold text-white flex items-center gap-1.5">
                      Bring Your Own Key
                      <ArrowRight className="w-3.5 h-3.5 text-violet-300 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                    </span>
                    <span className="text-[10px] sm:text-[11px] leading-relaxed text-white/50">
                      Use your own cloud LLM API key instead. Faster and works on any device, but requests leave your browser.
                    </span>
                  </button>

                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-y-[12%] left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-transparent via-white/25 to-transparent"
                  />
                </div>
              )}
            </div>
          </div>

          {step === 'studio' && (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous studio"
                className={`studio-orb-arrow studio-nav-button left-0 focus-ring ${active.color}`}
              >
                <ChevronLeft className="w-5 h-5" strokeWidth={3} />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next studio"
                className={`studio-orb-arrow studio-nav-button right-0 focus-ring ${active.color}`}
              >
                <ChevronRight className="w-5 h-5" strokeWidth={3} />
              </button>
            </>
          )}
          </div>

          <div className="studio-details">
            {step === 'studio' ? (
              <>
                <p className="studio-description text-white/75" aria-live="polite" aria-atomic="true">
                  {active.description}
                </p>
                <button
                  type="button"
                  onClick={handleOpenStudio}
                  className="studio-open focus-ring"
                  style={{ '--option-accent': active.crystalColor } as CSSProperties}
                >
                  <ActiveIcon className="w-5 h-5 shrink-0" />
                  Open {active.title}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-white/50">
                  Voice narration and video rendering download either way.
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 justify-center lg:justify-start">
                  <button
                    type="button"
                    onClick={() => setStep('studio')}
                    className={`studio-nav-button group/arrow h-11 px-5 gap-2 rounded-full border border-white/10 flex items-center justify-center transition-colors duration-200 hover:bg-white/5 hover:border-white/25 focus-ring ${active.color}`}
                  >
                    <ChevronLeft className="w-4 h-4 transition-transform duration-300 group-hover/arrow:-translate-x-0.5" strokeWidth={2.5} />
                    <span className="text-sm font-medium text-white/80">Back to studios</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSkipAiChoice}
                    className="text-sm text-white/45 hover:text-white/75 transition-colors cursor-pointer underline decoration-dotted underline-offset-4 focus-ring rounded px-2 py-1"
                  >
                    Decide later
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Narrow screens: the studios as a swipeable strip under the orb. */}
          {step === 'studio' && (
            <div className="studio-chips" role="group" aria-label="Choose a studio">
              {studios.map((studio, i) => {
                const Icon = studio.icon;
                return (
                  <button
                    key={studio.to}
                    type="button"
                    aria-pressed={i === safeIndex}
                    onClick={() => setIndex(i)}
                    className="studio-option studio-chip focus-ring"
                    style={{ '--option-accent': studio.crystalColor } as CSSProperties}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {studio.title}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer compact />
    </div>
  );
};
