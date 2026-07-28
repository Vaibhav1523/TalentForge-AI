"use client";

import { useRef, useCallback, useEffect } from "react";

const LETTERS = ["T", "a", "l", "e", "n", "t", "F", "o", "r", "g", "e", " ", "A", "I"];

export function HookStep() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const wordRef = useRef<HTMLDivElement>(null);
  const touchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearLetters = useCallback(() => {
    wordRef.current?.querySelectorAll(".hookstep-letter").forEach((el) => el.classList.remove("is-on"));
  }, []);

  const pickLetter = useCallback((clientX: number, clientY: number) => {
    if (typeof document === "undefined") return;
    const el = document.elementFromPoint(clientX, clientY);
    const letter = el?.closest?.(".hookstep-letter");
    if (!letter) return;
    clearLetters();
    letter.classList.add("is-on");
  }, [clearLetters]);

  const onPointerEnter = () => wrapRef.current?.classList.add("is-hot");
  const onPointerLeave = () => {
    wrapRef.current?.classList.remove("is-hot");
    clearLetters();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    wrapRef.current?.classList.add("is-hot");
    pickLetter(e.clientX, e.clientY);
  };

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches?.[0];
    if (!t) return;
    wrapRef.current?.classList.add("is-hot");
    pickLetter(t.clientX, t.clientY);
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      wrapRef.current?.classList.remove("is-hot");
      clearLetters();
    }, 900);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const t = e.touches?.[0];
    if (!t) return;
    wrapRef.current?.classList.add("is-hot");
    pickLetter(t.clientX, t.clientY);
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
  };

  const onTouchEnd = () => {
    if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    touchTimerRef.current = setTimeout(() => {
      wrapRef.current?.classList.remove("is-hot");
      clearLetters();
    }, 650);
  };

  useEffect(() => {
    return () => {
      if (touchTimerRef.current) clearTimeout(touchTimerRef.current);
    };
  }, []);

  return (
    <section className="hookstep-stage" id="hookstep">
      <div className="hookstep-wrap" id="hookstepWrap" ref={wrapRef}>
        <div className="social-row" aria-label="Social media links">
          <a href="https://twitter.com/hookstep" target="_blank" rel="noopener noreferrer" aria-label="Twitter / X" title="Twitter / X">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M18.9 2H22l-6.8 7.8L23 22h-6.5l-5.1-6.7L5.6 22H2.5l7.3-8.4L1 2h6.7l4.6 6.1L18.9 2Zm-1.1 18h1.7L6.8 3.9H5L17.8 20Z" />
            </svg>
          </a>
          <a href="https://facebook.com/hookstep" target="_blank" rel="noopener noreferrer" aria-label="Facebook" title="Facebook">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M13.5 22v-8.2h2.8l.4-3.2h-3.2V8.6c0-.9.3-1.6 1.7-1.6h1.8V4.1c-.3 0-1.4-.1-2.7-.1-2.7 0-4.6 1.6-4.6 4.6v2.6H7v3.2h2.7V22h3.8Z" />
            </svg>
          </a>
          <a href="https://linkedin.com/company/hookstep" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.9 6.7a2.2 2.2 0 1 1 0-4.4 2.2 2.2 0 0 1 0 4.4ZM4.9 21.5V9h4V21.5h-4Zm6.6 0V9h3.8v1.7h.1c.5-1 1.8-2 3.7-2 4 0 4.7 2.6 4.7 6v6.8h-4v-6c0-1.4 0-3.2-2-3.2s-2.3 1.5-2.3 3.1v6.1h-4Z" />
            </svg>
          </a>
        </div>

        <div className="hookstep-word" id="hookstepWord" aria-label="HookStep" ref={wordRef}
          onPointerEnter={onPointerEnter}
          onPointerLeave={onPointerLeave}
          onPointerMove={onPointerMove}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {LETTERS.map((ch, i) => (
            <span key={i} className="hookstep-letter" data-ch={ch}>
              {ch}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
