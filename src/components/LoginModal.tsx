"use client";

import { signIn } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { clearLinkedinAccountHint, readLinkedinAccountHint } from "@/lib/sign-out-hookstep";
import { SITE_LOGO_SRC } from "@/lib/site-brand";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: "recruiter" | "candidate" | null;
  callbackUrl?: string;
}

export function LoginModal({ isOpen, onClose, role, callbackUrl }: LoginModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [showLinkedinAccountNote, setShowLinkedinAccountNote] = useState(false);
  const prevIsOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      document.body.style.overflow = "hidden";
    } else {
      const timer = setTimeout(() => {
        setIsVisible(false);
        document.body.style.overflow = "";
      }, 300);
      return () => {
        clearTimeout(timer);
        // Only restore overflow immediately on unmount (when modal was closed),
        // not on the open→closed transition so the delayed reset above takes effect.
        if (!prevIsOpenRef.current) {
          document.body.style.overflow = "";
        }
      };
    }

    prevIsOpenRef.current = isOpen;

    return () => {
      // Cleanup when transitioning away from the open state (e.g. unmount while open).
      if (prevIsOpenRef.current) {
        document.body.style.overflow = "";
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setShowLinkedinAccountNote(readLinkedinAccountHint());
    }
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;

  // Use provided callbackUrl or fall back to role-based default
  const resolvedCallbackUrl = callbackUrl ?? (role === "recruiter" ? "/dashboard" : "/dashboard/jobs");

  const handleOAuth = async (provider: string) => {
    clearLinkedinAccountHint();
    setShowLinkedinAccountNote(false);
    await signIn(provider, { callbackUrl: resolvedCallbackUrl });
  };

  return (
    <div
      className={`login-modal-overlay ${isOpen ? "open" : ""}`}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="auth-card"
        onClick={(e) => e.stopPropagation()}
        style={{ position: 'relative' }} // Ensure close button positioning context
      >
        <button type="button" className="login-modal-close" onClick={onClose} aria-label="Close">
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="auth-header">
          <div className="auth-logo">
            <img
              className="auth-logo-icon"
              src={SITE_LOGO_SRC}
              alt=""
              width={48}
              height={48}
              decoding="async"
            />
          </div>
          <h1 className="auth-title">
            {role === "recruiter" ? "Hire Top Talent" : "Find Your Next Job"}
          </h1>
          <p className="auth-subtitle">
            Sign in or create an account to continue.
          </p>
          {role === "recruiter" && (
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "8px",
              background: "rgba(245,158,11,0.08)",
              border: "1px solid rgba(245,158,11,0.28)",
              borderRadius: "10px",
              padding: "10px 12px",
              marginTop: "4px",
              textAlign: "left",
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="rgba(245,158,11,0.9)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "1px" }} aria-hidden>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p style={{ margin: 0, fontSize: "12px", lineHeight: "1.5", color: "#7a5200" }}>
                Use your <strong>company / work email</strong> to sign up as a hiring company. Personal emails (Gmail, Yahoo, etc.) will be rejected.
              </p>
            </div>
          )}
        </div>

        <div className="auth-providers">
          <button
            type="button"
            className="auth-provider-btn google"
            onClick={() => handleOAuth("google")}
          >
            <svg className="auth-provider-icon" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <button
            type="button"
            className="auth-provider-btn linkedin"
            onClick={() => void handleOAuth("linkedin")}
          >
            <svg className="auth-provider-icon" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#0A66C2"
                d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
              />
            </svg>
            Continue with LinkedIn
          </button>
          {showLinkedinAccountNote && (
            <div className="auth-li-account-callout auth-li-account-callout--modal" role="note">
              <p className="auth-li-account-callout-title">Different LinkedIn account?</p>
              <p className="auth-li-account-callout-text">
                This browser may still be signed in at LinkedIn.{" "}
                <a href="https://www.linkedin.com/m/logout" target="_blank" rel="noopener noreferrer">
                  Sign out on LinkedIn
                </a>
                , then continue above.
              </p>
            </div>
          )}

          <button
            type="button"
            className="auth-provider-btn github"
            onClick={() => handleOAuth("github")}
          >
            <svg className="auth-provider-icon" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="currentColor"
                d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
              />
            </svg>
            Continue with GitHub
          </button>
        </div>

        <p className="auth-footer">
          By continuing, you agree to our{" "}
          <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
