"use client";

import Link from "next/link";
import { HeroNav } from "@/components/HeroNav";
import { Briefcase, BookOpen, Sparkles, ArrowRight } from "lucide-react";

const quickLinks = [
  { href: "/cases", label: "Case Studies", desc: "See how we've placed top talent", icon: BookOpen },
  { href: "/success-stories", label: "Success Stories", desc: "Real results from real clients", icon: Sparkles },
  { href: "/recruiter", label: "Hire Talent", desc: "Post a job and find experts fast", icon: Briefcase },
];

export default function NotFound() {
  return (
    <>
      <HeroNav />

      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#05070c",
          color: "#fff",
          fontFamily: "'Plus Jakarta Sans', Inter, system-ui, -apple-system, sans-serif",
          textAlign: "center",
          padding: "7rem 1.5rem 4rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: "38%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "700px",
            height: "700px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,255,230,0.05) 0%, transparent 65%)",
            pointerEvents: "none",
          }}
        />

        <p
          style={{
            fontSize: "clamp(8rem, 18vw, 12rem)",
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: "-0.05em",
            background: "linear-gradient(135deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "0.25rem",
            position: "relative",
            userSelect: "none",
          }}
        >
          404
        </p>

        <h1
          style={{
            fontSize: "clamp(1.35rem, 3vw, 2rem)",
            fontWeight: 700,
            color: "rgba(255,255,255,0.92)",
            marginBottom: "0.6rem",
            position: "relative",
          }}
        >
          Page not found
        </h1>

        <p
          style={{
            fontSize: "clamp(0.9rem, 2vw, 1.05rem)",
            color: "rgba(255,255,255,0.42)",
            maxWidth: "440px",
            lineHeight: 1.65,
            marginBottom: "2rem",
            position: "relative",
          }}
        >
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Here are some helpful links instead.
        </p>

        <Link
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 30px",
            borderRadius: "10px",
            fontSize: "14px",
            fontWeight: 650,
            fontFamily: "inherit",
            color: "#05070c",
            background: "#00ffe6",
            textDecoration: "none",
            boxShadow: "0 0 28px rgba(0,255,230,0.22)",
            marginBottom: "3.5rem",
            position: "relative",
          }}
        >
          Back to Home
        </Link>

        {/* Quick links */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "16px",
            width: "100%",
            maxWidth: "720px",
            position: "relative",
          }}
        >
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  padding: "22px 20px",
                  borderRadius: "14px",
                  border: "1px solid rgba(255,255,255,0.07)",
                  background: "rgba(255,255,255,0.02)",
                  textDecoration: "none",
                  textAlign: "left",
                  transition: "border-color 0.2s, background 0.2s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(0,255,230,0.25)";
                  e.currentTarget.style.background = "rgba(0,255,230,0.04)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Icon size={20} style={{ color: "#00ffe6", opacity: 0.8 }} />
                  <ArrowRight size={14} style={{ color: "rgba(255,255,255,0.25)" }} />
                </div>
                <span style={{ fontSize: "14px", fontWeight: 650, color: "rgba(255,255,255,0.88)" }}>
                  {link.label}
                </span>
                <span style={{ fontSize: "12.5px", color: "rgba(255,255,255,0.38)", lineHeight: 1.5 }}>
                  {link.desc}
                </span>
              </Link>
            );
          })}
        </div>
      </main>
    </>
  );
}
