"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { LoginModal } from "@/components/LoginModal";

interface ApplyButtonProps {
  applyHref: string;
  variant?: "header" | "cta";
  ariaLabel?: string;
}

export function ApplyButton({ applyHref, variant = "cta", ariaLabel }: ApplyButtonProps) {
  const { status } = useSession();
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);

  const isLoading = status === "loading";

  const handleClick = () => {
    if (isLoading) return;
    if (status === "authenticated") {
      router.push(applyHref);
    } else {
      setModalOpen(true);
    }
  };

  const modal =
    modalOpen && typeof window !== "undefined"
      ? createPortal(
          <LoginModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            role="candidate"
            callbackUrl={applyHref}
          />,
          document.body
        )
      : null;

  if (variant === "header") {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          disabled={isLoading}
          aria-label={ariaLabel ?? 'Apply now'}
          style={{
            background: '#0d9488', color: '#fff', padding: '8px 18px',
            borderRadius: '8px', border: 'none',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '14px', fontWeight: 600,
            opacity: isLoading ? 0.6 : 1,
          }}
        >
          Apply Now
        </button>
        {modal}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        aria-label={ariaLabel ?? 'Apply for this job'}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: '#0d9488', color: '#fff', padding: '12px 26px',
          borderRadius: '10px', border: 'none',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontSize: '15px', fontWeight: 700, whiteSpace: 'nowrap',
          boxShadow: '0 0 24px rgba(13,148,136,0.4)',
          opacity: isLoading ? 0.6 : 1,
        }}
      >
        Apply Now <ExternalLink size={15} aria-hidden />
      </button>
      {modal}
    </>
  );
}
