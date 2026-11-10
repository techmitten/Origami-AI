import React, { useCallback, useEffect, useState } from 'react';
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
  const [reduceMotion] = useState(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  );
  const paused = hovered || focused;

  // The list grows by one when signing in/out; keep the index in range.
  const safeIndex = index % studios.length;
  const active = studios[safeIndex];
  const ActiveIcon = active.icon;

  const go = useCallback(
    (delta: number) => setIndex((i) => (i + delta + studios.length) % studios.length),
    [studios.length],
  );

  return (
    <div className="isolate min-h-screen bg-[#121215] text-white pt-8 pb-2 flex flex-col px-4 sm:px-8">
      {/* Aurora background: a brand-gradient curtain of light over the dark base. */}
      <div className="fixed inset-0 -z-50 pointer-events-none" aria-hidden="true">
        <Aurora colorStops={['#22d3ee', '#3b82f6', '#8b5cf6']} amplitude={1.1} blend={0.6} speed={0.8} />
        {/* Fade toward the bottom so the footer and dots stay legible. */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#121215]/30 to-[#121215]" />
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
        <div className="text-center mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-3">
            Choose a{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400">
              Studio
            </span>
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto leading-relaxed">
            Everything runs entirely in your browser for maximum privacy and performance.
            Pick a workspace from the orb to get started.
          </p>
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
          <div className="relative w-[min(92vw,560px)] aspect-square">
            <Orb
              galaxyBackground
              colors={active.orb}
              hoverIntensity={1}
              trail={1}
              glow={1.2}
              rotateOnHover
              followCursor
            />

            {/* Centre "digital display". Clicking the disc advances to the next
                studio in place; the Open pill remains the navigation link. The
                content is re-keyed per studio so each change fades in fresh. */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
              aria-live={paused ? 'polite' : 'off'}
            >
              <div className="group relative pointer-events-auto w-[64%] aspect-square rounded-full flex items-center justify-center text-center transition-colors duration-300 hover:bg-white/[0.03]">
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label={`Show next studio: ${studios[(safeIndex + 1) % studios.length].title}`}
                  className="absolute inset-0 rounded-full cursor-pointer focus-ring"
                />
                <div
                  key={active.to}
                  className="studio-display-in pointer-events-none relative z-10 flex flex-col items-center w-[86%] max-w-[300px]"
                >
                  <span className="font-mono text-[10px] sm:text-xs tracking-[0.3em] text-white/45 mb-3 tabular-nums">
                    {String(safeIndex + 1).padStart(2, '0')} / {String(studios.length).padStart(2, '0')}
                  </span>
                  <div
                    className={`w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center border mb-3 transition-transform duration-300 group-hover:scale-110 group-hover:-rotate-3 ${active.bg} ${active.border}`}
                  >
                    <ActiveIcon className={`w-5 h-5 sm:w-7 sm:h-7 ${active.color}`} />
                  </div>
                  <h2 className="font-mono text-lg sm:text-2xl font-bold text-white tracking-tight mb-1.5">
                    <ScrambleText key={active.title} text={active.title} />
                  </h2>
                  <TransitionLink
                    to={active.to}
                    aria-label={`Open ${active.title}: ${active.description}`}
                    className={`pointer-events-auto mt-2 sm:mt-0 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs sm:text-sm font-semibold bg-black/30 backdrop-blur-md transition-colors hover:bg-white/10 ${active.border} ${active.color}`}
                  >
                    Open {active.title}
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </TransitionLink>
                </div>
              </div>
            </div>

            {/* Prev/next arrows are embedded in the orb's body: recessed
                frosted dials sitting in the dark interior just inside the
                glowing rim, tinted with the active studio's accent so they
                feel wired into the palette. The interior band between the
                rim and the centre display is narrow, so they are sized to
                fit it without touching either. */}
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous studio"
              className={`group/arrow absolute left-[12%] top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center transition-all duration-300 hover:bg-black/55 hover:border-white/25 hover:shadow-[inset_0_3px_14px_rgba(0,0,0,0.65),inset_0_-2px_6px_rgba(255,255,255,0.1)] active:scale-95 focus-ring shadow-[inset_0_2px_10px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.08)] ${active.color}`}
            >
              <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-[0_0_6px_currentColor] transition-transform duration-300 group-hover/arrow:-translate-x-0.5" strokeWidth={3} />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next studio"
              className={`group/arrow absolute right-[12%] top-1/2 -translate-y-1/2 z-20 w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-black/40 backdrop-blur-sm border border-white/10 flex items-center justify-center transition-all duration-300 hover:bg-black/55 hover:border-white/25 hover:shadow-[inset_0_3px_14px_rgba(0,0,0,0.65),inset_0_-2px_6px_rgba(255,255,255,0.1)] active:scale-95 focus-ring shadow-[inset_0_2px_10px_rgba(0,0,0,0.6),inset_0_-2px_6px_rgba(255,255,255,0.08)] ${active.color}`}
            >
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 drop-shadow-[0_0_6px_currentColor] transition-transform duration-300 group-hover/arrow:translate-x-0.5" strokeWidth={3} />
            </button>
          </div>

          {/* Mobile: description sits under the orb where there is room for it. */}
          <p className="sm:hidden mt-2 max-w-sm text-center text-sm text-white/60 leading-relaxed">
            {active.description}
          </p>

          {/* Indicators double as a progress bar for the auto-rotation. */}
          <div className="mt-4 flex items-center gap-2">
            {studios.map((studio, i) => (
              <button
                key={studio.to}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show ${studio.title}`}
                aria-current={i === safeIndex}
                className={`relative h-1.5 rounded-full overflow-hidden transition-all duration-300 focus-ring ${
                  i === safeIndex ? 'w-10 bg-white/15' : 'w-1.5 bg-white/25 hover:bg-white/50'
                }`}
              >
                {i === safeIndex && (
                  <span
                    key={studio.to}
                    className="absolute inset-0 origin-left bg-white/80 rounded-full"
                    style={
                      reduceMotion
                        ? undefined
                        : {
                            animation: `studio-display-progress ${ROTATE_MS}ms linear forwards`,
                            animationPlayState: paused ? 'paused' : 'running',
                          }
                    }
                    onAnimationEnd={() => go(1)}
                  />
                )}
              </button>
            ))}
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
