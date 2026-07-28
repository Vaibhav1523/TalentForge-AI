"use client";

import { useState, useRef, useEffect } from "react";
import { useSession } from "next-auth/react";
import { signOutFromHookstep } from "@/lib/sign-out-hookstep";
import { LoginModal } from "@/components/LoginModal";
import { UserDropdown } from "@/components/UserDropdown";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SITE_LOGO_SRC } from "@/lib/site-brand";
import { User, LogOut } from "lucide-react";

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/founders", label: "Founders" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/faq", label: "FAQ" },
  { href: "/cases", label: "Cases" },
  { href: "/success-stories", label: "Success Stories" },
  { href: "/#domains", label: "Domains" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/ai-data-partners", label: "AI data partners" },
  { href: "/recruiter", label: "Contact" },
];

export function HeroNav() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<"recruiter" | "candidate" | null>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const userRole = session?.user?.role;

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  const handleLoginClick = async (role: "recruiter" | "candidate") => {
    if (status === "authenticated") {
      if (userRole === "recruiter") {
        const onboardingComplete = (session?.user as { onboardingComplete?: boolean })?.onboardingComplete;
        const companySlug = (session?.user as { companySlug?: string | null })?.companySlug;
        if (!onboardingComplete) {
          router.push("/onboarding");
        } else if (companySlug) {
          router.push(`/c/${companySlug}`);
        } else {
          router.push("/onboarding");
        }
      } else if (userRole === "candidate") {
        router.push("/dashboard/jobs");
      } else {
        router.push("/onboarding");
      }
      return;
    }

    if (status === "loading") return;

    const isProduction = process.env.NODE_ENV === 'production';
    document.cookie = `login_role=${role}; path=/; max-age=3600; SameSite=Lax${isProduction ? '; Secure' : ''}`;

    setSelectedRole(role);
    setIsLoginModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsLoginModalOpen(false);
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setSelectedRole(null);
      closeTimeoutRef.current = null;
    }, 300);
  };

  return (
    <>
      <header className="hero-nav" id="heroNav" role="banner">
        <div className="hero-nav-inner">
          <Link className="hn-brand" href="/" aria-label="Home">
            <img
              className="hn-logo"
              src={SITE_LOGO_SRC}
              alt=""
              width={44}
              height={44}
              decoding="async"
            />
          </Link>

          <nav className="hn-links" aria-label="Main navigation">
            {navLinks.map((link) =>
              link.href.startsWith("/") ? (
                <Link key={link.label} href={link.href}>
                  {link.label}
                </Link>
              ) : (
                <a key={link.label} href={link.href}>
                  {link.label}
                </a>
              )
            )}
          </nav>

          <div className="hn-actions">
            {status !== "authenticated" && status !== "loading" && (
              <>
                <button type="button" onClick={() => handleLoginClick("recruiter")} className="hn-btn ghost" aria-label="Hire talent as recruiter">
                  Hire a Talent
                </button>
                <button type="button" onClick={() => handleLoginClick("candidate")} className="hn-btn" aria-label="Find a job as candidate">
                  Find a Job
                </button>
              </>
            )}

            {status === "authenticated" && (
              <>
                {(!userRole || userRole === 'recruiter') && (
                  <button type="button" onClick={() => handleLoginClick("recruiter")} className="hn-btn ghost" aria-label="Hire talent as recruiter">
                    Hire a Talent
                  </button>
                )}
                {(!userRole || userRole === 'candidate') && (
                  <button type="button" onClick={() => handleLoginClick("candidate")} className="hn-btn" aria-label="Find a job as candidate">
                    Find a Job
                  </button>
                )}
                <UserDropdown />
              </>
            )}
          </div>

          <button
            className="hn-burger"
            id="hnBurger"
            aria-label="Menu"
            aria-expanded={drawerOpen}
            type="button"
            onClick={() => setDrawerOpen((o) => !o)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>

        <div className={`hn-drawer ${drawerOpen ? "open" : ""}`} id="hnDrawer">
          {navLinks.map((link) =>
            link.href.startsWith("/") ? (
              <Link key={link.label} href={link.href} onClick={() => setDrawerOpen(false)} className="hn-drawer-link">
                {link.label}
              </Link>
            ) : (
              <a key={link.label} href={link.href} onClick={() => setDrawerOpen(false)} className="hn-drawer-link">
                {link.label}
              </a>
            )
          )}

          {/* Mobile Auth Actions */}
          {status === "authenticated" ? (
            <>
              <Link href="/dashboard/profile" className="hn-drawer-link" onClick={() => setDrawerOpen(false)}>
                <User size={16} style={{ display: 'inline', marginRight: '8px' }} /> Profile
              </Link>
              <button
                type="button"
                onClick={() => signOutFromHookstep(session, "/sign-in")}
                className="hn-drawer-link"
                style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', fontSize: 'inherit', fontFamily: 'inherit', cursor: 'pointer' }}
              >
                <LogOut size={16} style={{ display: 'inline', marginRight: '8px' }} /> Logout
              </button>
              <div className="hn-drawer-actions">
                {(!userRole || userRole === 'recruiter') && (
                  <button
                    type="button"
                    onClick={() => {
                      handleLoginClick("recruiter");
                      setDrawerOpen(false);
                    }}
                    className="hn-btn ghost"
                  >
                    Hire a Talent
                  </button>
                )}
                {(!userRole || userRole === 'candidate') && (
                  <button
                    type="button"
                    onClick={() => {
                      handleLoginClick("candidate");
                      setDrawerOpen(false);
                    }}
                    className="hn-btn"
                  >
                    Find a Job
                  </button>
                )}
              </div>
            </>
          ) : (
            <div className="hn-drawer-actions">
              <button
                type="button"
                onClick={() => {
                  handleLoginClick("recruiter");
                  setDrawerOpen(false);
                }}
                className="hn-btn ghost"
              >
                Hire a Talent
              </button>
              <button
                type="button"
                onClick={() => {
                  handleLoginClick("candidate");
                  setDrawerOpen(false);
                }}
                className="hn-btn"
              >
                Find a Job
              </button>
            </div>
          )}
        </div>
      </header>

      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={handleCloseModal}
        role={selectedRole}
      />
    </>
  );
}
