import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Layers,
  Bot,
  Film,
  AudioLines,
  FileCog,
  LibraryBig,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  User as UserIcon,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Footer } from '../components/Footer';
import { TransitionLink } from '../components/TransitionLink';
import { usePageMeta } from '../hooks/usePageMeta';
import { useAuth } from '../context/AuthContext';
import Orb from '../components/Orb';
import Aurora from '../components/Aurora';

interface StudioEntry {
  to: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bg: string;
  border: string;
  /** Orb palette: two swirl colours, then the deep glow colour. */
  orb: string[];
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
    orb: ['#22d3ee', '#3b82f6', '#0c1e4a'],
  },
  {
    to: '/shorts',
    title: 'Shorts Generator',
    description: 'Create faceless AI shorts with generated visuals, captions, and local TTS.',
    icon: Film,
    color: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-400/30',
    orb: ['#fbbf24', '#f97316', '#3b1a05'],
  },
  {
    to: '/voice',
    title: 'Voice Studio',
    description: 'Type anything and hear it spoken by on-device voices, then download the MP3.',
    icon: AudioLines,
    color: 'text-violet-300',
    bg: 'bg-violet-500/10',
    border: 'border-violet-400/30',
    orb: ['#a78bfa', '#c026d3', '#1e0b4a'],
  },
  {
    to: '/convert',
    title: 'File Studio',
    description: 'Convert and compress images and audio right in your browser — no uploads.',
    icon: FileCog,
    color: 'text-fuchsia-300',
    bg: 'bg-fuchsia-500/10',
    border: 'border-fuchsia-400/30',
    orb: ['#e879f9', '#f472b6', '#3b0a35'],
  },
  {
    to: '/assistant',
    title: 'AI Assistant',
    description: 'Chat with a private, local LLM to draft scripts and restructure narration.',
    icon: Bot,
    color: 'text-emerald-300',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-400/30',
    orb: ['#34d399', '#22d3ee', '#052e22'],
  },
];

/** How long each studio stays on the orb's display before rotating. */
const ROTATE_MS = 4500;
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
          color: 'text-sky-300',
          bg: 'bg-sky-500/10',
          border: 'border-sky-400/30',
          orb: ['#38bdf8', '#818cf8', '#0b1f3a'],
        },
      ]
    : STUDIOS;

  const [index, setIndex] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [swiping, setSwiping] = useState(false);
  const swipeStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressSwipeClick = useRef(false);
  const [reduceMotion] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  const paused = hovered || focused || swiping;

  // The list grows by one when signing in/out; keep the index in range.
  const safeIndex = index % studios.length;
  const active = studios[safeIndex];
  const ActiveIcon = active.icon;

  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + studios.length) % studios.length),
    [studios.length],
  );

  // Keep auto-rotation independent of the navigation controls.
  useEffect(() => {
    if (paused || reduceMotion) return;
    const timer = window.setTimeout(() => go(1), ROTATE_MS);
    return () => window.clearTimeout(timer);
  }, [go, index, paused, reduceMotion]);

  return (
    <div className="isolate min-h-screen bg-[#121215] text-white pt-8 pb-2 flex flex-col px-4 sm:px-8">
      {/* Muted aurora adds a soft wash of colour over the dark base. */}
      <div className="fixed inset-0 -z-50 pointer-events-none overflow-hidden" aria-hidden="true">
        <Aurora
          className="opacity-30 blur-3xl"
          colorStops={['#155e75', '#1e3a8a', '#4c1d95']}
          amplitude={0.8}
          blend={0.8}
          speed={0.4}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#121215]/20 via-[#121215]/60 to-[#121215]" />
      </div>

      {/* This page is the app's landing screen, so the header offers no back
          button — the logo and menu links are the ways out. */}
      <PageHeader
        title="Pick a Studio"
        showHelp={false}
        showSettings={false}
      />

      {/* Main Content */}
      <main className="mx-auto max-w-5xl w-full mb-8 animate-slide-up flex-grow">
        <div className="text-center mb-4 sm:mb-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white tracking-tight">
            Choose a Studio
          </h1>
          {user?.email && (
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white/60">
              <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span className="max-w-[220px] truncate" title={user.email}>
                Signed in as {user.email}
              </span>
            </div>
          )}
        </div>

        <section
          role="region"
          aria-roledescription="carousel"
          aria-label="Studios"
          className="relative flex flex-col items-center"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => setFocused(true)}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') {
              e.preventDefault();
              go(1);
            } else if (e.key === 'ArrowLeft') {
              e.preventDefault();
              go(-1);
            }
          }}
        >
          <div
            className="studio-orb relative w-full max-w-[560px] aspect-square"
            style={{ touchAction: 'pan-y pinch-zoom' }}
            onPointerDown={(event) => {
              if (!event.isPrimary || event.button !== 0) return;
              suppressSwipeClick.current = false;
              swipeStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
              setSwiping(true);
            }}
            onPointerMove={(event) => {
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
              const start = swipeStart.current;
              if (!start || start.id !== event.pointerId) return;
              const dx = event.clientX - start.x;
              const dy = event.clientY - start.y;
              if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.3) {
                suppressSwipeClick.current = true;
                go(dx < 0 ? 1 : -1);
              }
              swipeStart.current = null;
              setSwiping(false);
            }}
            onPointerCancel={() => {
              swipeStart.current = null;
              setSwiping(false);
            }}
            onPointerLeave={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
                swipeStart.current = null;
                setSwiping(false);
              }
            }}
            onLostPointerCapture={(event) => {
              // A touch initially belongs to the tapped child; transferring
              // capture to the orb also bubbles that child's lost-capture event.
              if (event.target !== event.currentTarget) return;
              swipeStart.current = null;
              setSwiping(false);
            }}
            onClickCapture={(event) => {
              if (suppressSwipeClick.current && event.detail > 0) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
          >
            <Orb
              galaxyBackground
              colors={active.orb}
              hoverIntensity={0.2}
              trail={1}
              glow={0.7}
              highlight={0.5}
              opacity={0.75}
              rotateOnHover={false}
              followCursor={false}
            />

            {/* Centre "digital display". Clicking the disc advances to the next
                studio in place; the Open pill remains the navigation link. The
                content is re-keyed per studio so each change fades in fresh. */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              aria-live={paused ? 'polite' : 'off'}
            >
              <div className="group studio-orb-center relative pointer-events-auto w-1/2 aspect-square rounded-full flex items-center justify-center text-center transition-colors duration-300 hover:bg-white/[0.03]">
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label={`Show next studio: ${studios[(safeIndex + 1) % studios.length].title}`}
                  className="absolute inset-0 rounded-full cursor-pointer focus-ring"
                />
                <div
                  key={active.to}
                  className="studio-display-in pointer-events-none relative z-10 flex flex-col items-center w-full max-w-[300px]"
                >
                  <div
                    className={`studio-orb-icon rounded-2xl flex items-center justify-center border transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${active.bg} ${active.border}`}
                  >
                    <ActiveIcon className={`w-5 h-5 sm:w-7 sm:h-7 ${active.color}`} />
                  </div>
                  <h2 className="studio-orb-title font-mono font-bold text-white tracking-tight">
                    <ScrambleText key={active.title} text={active.title} />
                  </h2>
                  <TransitionLink
                    to={active.to}
                    aria-label={`Open ${active.title}: ${active.description}`}
                    className={`studio-orb-open pointer-events-auto inline-flex items-center justify-center gap-2 rounded-full border px-4 font-semibold bg-slate-950/85 backdrop-blur-md transition-colors hover:bg-slate-900 ${active.border} ${active.color}`}
                  >
                    Open Studio
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </TransitionLink>
                </div>
              </div>
            </div>


          </div>

          {/* Mobile: description sits under the orb where there is room for it. */}
          <p className="sm:hidden mt-2 min-h-[4.5rem] max-w-sm text-center text-sm text-white/60 leading-relaxed">
            {active.description}
          </p>

          <div className="mt-3 flex items-center justify-center gap-6" role="group" aria-label="Studio navigation">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous studio"
              className={`group/arrow h-14 sm:h-16 w-32 sm:w-40 gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/40 flex items-center justify-center shadow-[0_0_24px_rgba(56,189,248,0.15)] transition-colors duration-200 hover:bg-white/20 hover:border-white/70 active:bg-white/25 focus-ring ${active.color}`}
            >
              <ChevronLeft className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_0_6px_currentColor] transition-transform duration-300 group-hover/arrow:-translate-x-0.5" strokeWidth={3} />
              <span className="text-sm sm:text-base font-semibold text-white">Previous</span>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next studio"
              className={`group/arrow h-14 sm:h-16 w-32 sm:w-40 gap-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/40 flex items-center justify-center shadow-[0_0_24px_rgba(56,189,248,0.15)] transition-colors duration-200 hover:bg-white/20 hover:border-white/70 active:bg-white/25 focus-ring ${active.color}`}
            >
              <span className="text-sm sm:text-base font-semibold text-white">Next</span>
              <ChevronRight className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow-[0_0_6px_currentColor] transition-transform duration-300 group-hover/arrow:translate-x-0.5" strokeWidth={3} />
            </button>
          </div>
        </section>

        {user && (
          <p className="mt-8 text-center text-xs text-white/40">
            Managing your profile?{' '}
            <TransitionLink
              to="/account"
              className="text-white/60 hover:text-cyan-400 transition-colors underline underline-offset-2 focus-ring rounded"
            >
              Visit Account Overview
            </TransitionLink>
          </p>
        )}
      </main>

      <Footer />
    </div>
  );
};
