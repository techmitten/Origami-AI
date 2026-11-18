import React from 'react';
import { Github } from 'lucide-react';
import { TransitionLink } from './TransitionLink';

interface FooterProps {
  /** A single slim row, for screen-high pages that must not scroll. */
  compact?: boolean;
}

export const Footer: React.FC<FooterProps> = ({ compact = false }) => {
  return (
    <footer className={`max-w-7xl mx-auto mt-auto border-t border-white/5 ${compact ? 'w-full py-2.5' : 'py-6'}`}>
      <div className={compact
        ? 'flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-2'
        : 'flex flex-col sm:flex-row items-center justify-between gap-4 px-4'}>
        <div className={compact ? 'contents' : 'flex items-center gap-4'}>
          <a
            href="https://techmitten.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-[0.2em]"
          >
            &copy; {new Date().getFullYear()} TechMitten LLC
          </a>
          <a
            href="https://github.com/TechMitten/Origami-AI"
            target="_blank"
            rel="noopener noreferrer"
            className="text-white/40 hover:text-white transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.2em]"
            title="View on GitHub"
          >
            <Github className="w-3.5 h-3.5" />
            GitHub
          </a>
        </div>
        <div className={compact ? 'contents' : 'flex flex-wrap items-center gap-4'}>
          <TransitionLink
            to="/license"
            className="text-white/40 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-[0.2em]"
          >
            MIT License
          </TransitionLink>
          <TransitionLink
            to="/privacy"
            className="text-white/40 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-[0.2em]"
          >
            Privacy Policy
          </TransitionLink>
          <TransitionLink
            to="/terms"
            className="text-white/40 hover:text-white transition-colors text-[10px] font-bold uppercase tracking-[0.2em]"
          >
            Terms of Service
          </TransitionLink>
        </div>
      </div>
    </footer>
  );
};
