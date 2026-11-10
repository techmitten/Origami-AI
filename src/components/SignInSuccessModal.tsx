import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

/** How long the success celebration lingers before auto-continuing to the studios. */
const AUTO_CONTINUE_MS = 3200;

interface SignInSuccessModalProps {
  isOpen: boolean;
  /** Email of the freshly signed-in account, shown back to the user. */
  email?: string | null;
  onContinue: () => void;
}

/**
 * Full-screen success dialog shown right after a successful sign-in.
 * Continues to the studio picker via the Continue button, the Escape key,
 * or automatically after a short delay (visualized by the progress bar).
 */
export const SignInSuccessModal: React.FC<SignInSuccessModalProps> = ({
  isOpen,
  email,
  onContinue,
}) => {
  // Animation lifecycle states matching app standards
  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  const continueButtonRef = useRef<HTMLButtonElement>(null);

  // Keep the latest callback without resetting the auto-continue timer on re-renders.
  const onContinueRef = useRef(onContinue);
  onContinueRef.current = onContinue;

  // Synchronize modal open/close transitions
  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      requestAnimationFrame(() => {
        setIsVisible(true);
        setTimeout(() => {
          continueButtonRef.current?.focus();
        }, 50);
      });
    } else {
      requestAnimationFrame(() => setIsVisible(false));
      const timer = setTimeout(() => setIsRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Auto-continue to the studio picker after a short celebration beat.
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => onContinueRef.current(), AUTO_CONTINUE_MS);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // Escape also continues, so keyboard users are never left stranded.
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onContinueRef.current();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isRendered) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sign-in-success-title"
    >
      {/* Dark Glass Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => onContinueRef.current()} />

      {/* Modal Dialog Container */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-md bg-[#121215]/95 border border-white/10 rounded-2xl shadow-[0_25px_60px_-15px_rgba(0,0,0,0.85),0_0_40px_rgba(16,185,129,0.08)] overflow-hidden flex flex-col transform transition-all duration-300 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-3'
        }`}
      >
        {/* Success accent line */}
        <div className="h-1 w-full bg-linear-to-r from-emerald-400 via-cyan-400 to-blue-500 shrink-0" />

        {/* Ambient Top Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-32 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative px-8 pt-8 pb-6 flex flex-col items-center text-center gap-4">
          {/* Animated Success Badge */}
          <div
            className={`w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-400/40 flex items-center justify-center shadow-inner shadow-emerald-500/20 transition-transform duration-500 ${
              isVisible ? 'scale-100' : 'scale-50'
            }`}
          >
            <CheckCircle2 className="w-9 h-9 text-emerald-400 animate-fade-in" />
          </div>

          <div className="flex flex-col gap-1.5">
            <h2
              id="sign-in-success-title"
              className="text-xl font-bold text-white tracking-tight"
            >
              You're signed in!
            </h2>
            <p className="text-sm text-white/60 leading-relaxed">
              {email ? (
                <>
                  Welcome back, <span className="text-white/90 font-medium break-all">{email}</span>.
                </>
              ) : (
                'Welcome back to Origami.'
              )}{' '}
              Your projects, voices, and AI settings are now in sync.
            </p>
          </div>

          {/* Continue Button */}
          <button
            ref={continueButtonRef}
            type="button"
            onClick={() => onContinueRef.current()}
            className="mt-1 w-full py-2.5 px-4 bg-linear-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:scale-[0.99] text-white font-bold text-sm rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 focus-ring cursor-pointer"
          >
            Continue to Studios
            <ArrowRight className="w-4 h-4" />
          </button>

          <p className="text-[11px] text-white/35">
            Taking you to the studio picker…
          </p>
        </div>

        {/* Auto-continue progress bar */}
        <div className="h-1 w-full bg-white/5 shrink-0">
          <div
            className="h-full w-full bg-linear-to-r from-emerald-400 to-cyan-500 origin-left"
            style={{
              transform: isVisible ? 'scaleX(0)' : 'scaleX(1)',
              transition: isVisible ? `transform ${AUTO_CONTINUE_MS}ms linear` : 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
};
