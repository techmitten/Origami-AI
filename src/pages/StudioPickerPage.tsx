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
  User as UserIcon,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { Footer } from '../components/Footer';
import { TransitionLink } from '../components/TransitionLink';
import { usePageMeta } from '../hooks/usePageMeta';
import { useAuth } from '../context/AuthContext';
import CrystalizedBall from '../components/CrystalizedBall';

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

  return (
    <div className="studio-picker isolate min-h-screen text-white pt-6 pb-2 flex flex-col px-4 sm:px-8"
      style={{ '--studio-accent': active.crystalColor } as CSSProperties}>
      <div className="studio-picker-ambient fixed inset-0 -z-10 pointer-events-none" aria-hidden="true" />

      {/* This page is the app's landing screen, so the header offers no back
          button — the logo and menu links are the ways out. */}
      <PageHeader
        title="Pick a Studio"
        showHelp={false}
        showSettings={false}
      />

      {/* Main Content */}
      <main className="mx-auto max-w-5xl w-full mb-8 flex-grow">
        <div className="text-center mt-5 sm:mt-8">
          <p className="text-[10px] sm:text-xs font-mono uppercase tracking-[0.3em] text-white/45 mb-4">Your ideas, taking shape</p>
          <h1 className="font-display text-3xl sm:text-5xl font-semibold text-white tracking-tight leading-tight">
            What will you create?
          </h1>
          <p className="mt-4 text-sm sm:text-base text-white/50">Pick your tools. Make something yours.</p>
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
          className="relative flex flex-col items-center mt-2 sm:mt-0"
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
            className="studio-orb relative w-full max-w-[560px] sm:max-w-[700px] lg:max-w-[760px] sm:-my-4 aspect-square"
            style={{ touchAction: 'pan-y pinch-zoom' }}
            onPointerDown={(event) => {
              if (!event.isPrimary || event.button !== 0) return;
              suppressSwipeClick.current = false;
              swipeStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
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

            {/* Keep the primary link inside the glass; navigation lives below. */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              aria-live="polite" aria-atomic="true"
            >
              <div className="group studio-orb-center relative w-1/2 aspect-square rounded-full flex items-center justify-center text-center transition-colors duration-300 hover:bg-white/[0.03]">
                <TransitionLink
                  key={active.to}
                  to={active.to}
                  draggable={false}
                  aria-label={`Open ${active.title}: ${active.description}`}
                  className="studio-display-in pointer-events-auto relative z-10 flex flex-col items-center justify-center w-full max-w-[300px] sm:max-w-[360px] min-h-32 rounded-2xl focus-ring"
                >
                  <div
                    className={`studio-orb-icon rounded-2xl flex items-center justify-center border transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${active.bg} ${active.border}`}
                  >
                    <ActiveIcon className={`w-5 h-5 sm:w-8 sm:h-8 ${active.color}`} />
                  </div>
                  <h2 className="studio-orb-title font-mono font-bold text-white tracking-tight">
                    <ScrambleText key={active.title} text={active.title} />
                  </h2>
                </TransitionLink>
              </div>
            </div>


          </div>

          <p className="-mt-4 sm:-mt-10 min-h-[6rem] sm:min-h-[4rem] max-w-xl px-3 text-center text-lg sm:text-xl text-white/75 leading-relaxed" aria-live="polite" aria-atomic="true">
            {active.description}
          </p>

          <div className="studio-options mt-6 flex flex-wrap justify-center gap-3 w-full max-w-3xl" role="group" aria-label="Choose a studio">
            {studios.map((studio, i) => {
              const Icon = studio.icon;
              return (
                <button
                  key={studio.to}
                  type="button"
                  aria-pressed={i === safeIndex}
                  onClick={() => setIndex(i)}
                  className="studio-option inline-flex items-center justify-center gap-3 rounded-2xl min-h-[84px] px-3 sm:px-5 py-4 text-base sm:text-lg font-medium focus-ring"
                  style={{ '--option-accent': studio.crystalColor } as CSSProperties}
                >
                  <Icon className="w-5 h-5 sm:w-6 sm:h-6 shrink-0" />
                  {studio.title}
                </button>
              );
            })}
          </div>

          <div className="mt-7 flex items-center justify-center gap-4 sm:gap-6" role="group" aria-label="Studio navigation">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous studio"
              className={`studio-nav-button group/arrow h-14 sm:h-16 min-w-32 sm:min-w-40 px-5 gap-3 rounded-full border border-white/10 flex items-center justify-center transition-colors duration-200 hover:bg-white/5 hover:border-white/25 focus-ring ${active.color}`}
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover/arrow:-translate-x-0.5" strokeWidth={3} />
              <span className="text-base sm:text-lg font-medium text-white/80">Previous</span>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next studio"
              className={`studio-nav-button group/arrow h-14 sm:h-16 min-w-32 sm:min-w-40 px-5 gap-3 rounded-full border border-white/10 flex items-center justify-center transition-colors duration-200 hover:bg-white/5 hover:border-white/25 focus-ring ${active.color}`}
            >
              <span className="text-base sm:text-lg font-medium text-white/80">Next</span>
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 transition-transform duration-300 group-hover/arrow:translate-x-0.5" strokeWidth={3} />
            </button>
          </div>
          <p className="mt-5 text-sm sm:text-base text-center text-white/55">Tap the studio name to open · Swipe or use arrows to explore</p>
        </section>

        {user && (
          <p className="mt-10 text-center text-base text-white/60">
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
