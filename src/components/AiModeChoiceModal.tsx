import { Cpu, KeyRound, ArrowRight } from 'lucide-react';
import Orb from './Orb';
import Aurora from './Aurora';

export interface AiModeChoiceModalProps {
  isOpen: boolean;
  onSelectWebLLM: () => void;
  onSelectBYOK: () => void;
  onSkip: () => void;
}

export function AiModeChoiceModal({ isOpen, onSelectWebLLM, onSelectBYOK, onSkip }: AiModeChoiceModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-mode-choice-title"
      aria-describedby="ai-mode-choice-description"
      className="fixed inset-0 z-50 overflow-y-auto animate-fade-in"
    >
      {/* Same aurora/orb language as the studio picker. */}
      <div className="fixed inset-0 bg-[#0b0d12]/92 backdrop-blur-2xl" />
      <div className="fixed inset-0 pointer-events-none opacity-45" aria-hidden="true">
        <Aurora colorStops={['#22d3ee', '#3b82f6', '#8b5cf6']} amplitude={1.1} blend={0.6} speed={0.8} />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#0b0d12]/20 to-[#0b0d12]" />
      </div>

      <div className="relative min-h-full flex flex-col items-center justify-center px-4 py-8 sm:py-10">
        <header className="text-center max-w-xl mb-6 sm:mb-8">
          <p className="font-mono text-[10px] sm:text-xs tracking-[0.3em] text-cyan-300/70 uppercase mb-3">
            AI setup
          </p>
          <h2
            id="ai-mode-choice-title"
            className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight"
          >
            Choose your AI text engine
          </h2>
          <p id="ai-mode-choice-description" className="text-sm text-white/55 mt-2 max-w-md mx-auto leading-relaxed">
            Origami writes narration scripts and drives the assistant with AI. Pick where that generation happens.
          </p>
        </header>

        <div className="relative w-[min(90vw,560px)] aspect-square">
          <Orb
            colors={['#22d3ee', '#8b5cf6', '#0b1030']}
            hoverIntensity={1}
            trail={1}
            glow={1.2}
            rotateOnHover
            followCursor
          />

          {/* Two choices inside the ring, split down the middle. */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-[76%] max-w-[430px] rounded-[1.75rem] border border-white/12 bg-[#0b0f18]/70 backdrop-blur-xl shadow-[0_25px_70px_-25px_rgba(0,0,0,0.95),0_0_45px_rgba(34,211,238,0.07)] overflow-hidden flex">
              <button
                type="button"
                onClick={onSelectWebLLM}
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
                onClick={onSelectBYOK}
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
          </div>
        </div>

        <div className="mt-6 sm:mt-8 flex flex-col items-center gap-2 text-center">
          <p className="text-[11px] text-white/35">Voice narration and video rendering download either way.</p>
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-white/30 hover:text-white/55 transition-colors cursor-pointer underline decoration-dotted underline-offset-2 focus-ring rounded"
          >
            Decide later
          </button>
        </div>
      </div>
    </div>
  );
}
