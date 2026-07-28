"use client";

import { useRef, useEffect, useState, useCallback } from "react";

const HUGGING_FACE_LOGO = "https://huggingface.co/front/assets/huggingface_logo-noborder.svg";
const ICON = (slug: string) =>
  slug === "huggingface"
    ? HUGGING_FACE_LOGO
    : `https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/${slug}.svg`;

const DATA: Record<
  string,
  { wall: string[]; tiles: [string, string][] }
> = {
  aiml: {
    wall: ["python", "pytorch", "huggingface", "openai", "fastapi", "googlecloud"],
    tiles: [
      ["Python", ICON("python")],
      ["PyTorch", ICON("pytorch")],
      ["Hugging Face", ICON("huggingface")],
      ["OpenAI", ICON("openai")],
      ["FastAPI", ICON("fastapi")],
      ["GCP", ICON("googlecloud")],
    ],
  },
  fullstack: {
    wall: ["react", "nextdotjs", "nodedotjs", "postgresql", "docker", "amazonaws"],
    tiles: [
      ["React", ICON("react")],
      ["Next.js", ICON("nextdotjs")],
      ["Node.js", ICON("nodedotjs")],
      ["PostgreSQL", ICON("postgresql")],
      ["Docker", ICON("docker")],
      ["AWS", ICON("amazonaws")],
    ],
  },
  datascience: {
    wall: ["pandas", "numpy", "scikitlearn", "jupyter", "apachehadoop", "apachekafka"],
    tiles: [
      ["Pandas", ICON("pandas")],
      ["NumPy", ICON("numpy")],
      ["Scikit-learn", ICON("scikitlearn")],
      ["Jupyter", ICON("jupyter")],
      ["Hadoop", ICON("apachehadoop")],
      ["Kafka", ICON("apachekafka")],
    ],
  },
  devops: {
    wall: ["docker", "kubernetes", "terraform", "githubactions", "prometheus", "grafana"],
    tiles: [
      ["Docker", ICON("docker")],
      ["Kubernetes", ICON("kubernetes")],
      ["Terraform", ICON("terraform")],
      ["GitHub Actions", ICON("githubactions")],
      ["Prometheus", ICON("prometheus")],
      ["Grafana", ICON("grafana")],
    ],
  },
  qa: {
    wall: ["selenium", "cypress", "playwright", "postman", "jest", "linux"],
    tiles: [
      ["Selenium", ICON("selenium")],
      ["Cypress", ICON("cypress")],
      ["Playwright", ICON("playwright")],
      ["Postman", ICON("postman")],
      ["Jest", ICON("jest")],
      ["Linux", ICON("linux")],
    ],
  },
};

const TABS = [
  { key: "aiml", label: "AI/ML Engineers" },
  { key: "fullstack", label: "Full Stack" },
  { key: "datascience", label: "Data Scientist" },
  { key: "devops", label: "DevOps" },
  { key: "qa", label: "QA Engineer" },
];

function escapeAttr(s: string): string {
  const map: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
  return String(s).replace(/[&<>"']/g, (c) => map[c] ?? c);
}

export function Domains() {
  const [active, setActive] = useState("aiml");
  const tabsRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const wallRef = useRef<HTMLDivElement>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setActiveKey = useCallback((key: string) => {
    setActive(key);
    const dom = DATA[key] ?? DATA.aiml;
    if (!wallRef.current || !gridRef.current) return;

    wallRef.current.innerHTML = dom.wall
      .map(
        (slug) => {
          const safe = escapeAttr(slug);
          return `<div class="logo" title="${safe}"><img src="${escapeAttr(ICON(slug))}" alt="${safe}"></div>`;
        }
      )
      .join("");

    gridRef.current.innerHTML = dom.tiles
      .map(
        ([name, imgUrl]) => {
          const safeName = escapeAttr(name);
          const safeUrl = escapeAttr(imgUrl);
          return `<div class="dom-tile" tabindex="0" aria-label="${safeName}"><img src="${safeUrl}" alt="${safeName}"><div class="dom-label">${safeName} <small>tech</small></div></div>`;
        }
      )
      .join("");

    // Style images after render
    requestAnimationFrame(() => {
      gridRef.current?.querySelectorAll("img").forEach((img) => {
        const alt = (img as HTMLImageElement).alt.toLowerCase();
        const isHuggingFace = alt.includes("hugging face");
        (img as HTMLImageElement).style.padding = "34px";
        (img as HTMLImageElement).style.objectFit = "contain";
        (img as HTMLImageElement).style.background =
          "radial-gradient(120% 80% at 30% 20%, rgba(0,255,230,0.10), rgba(0,0,0,0) 58%), radial-gradient(120% 90% at 80% 70%, rgba(140,170,255,0.10), rgba(0,0,0,0) 60%), rgba(255,255,255,0.03)";
        (img as HTMLImageElement).style.filter = isHuggingFace
          ? "grayscale(1) brightness(1.18) contrast(1.35) saturate(0) drop-shadow(0 0 12px rgba(0,255,230,0.14))"
          : "invert(1) brightness(1.2) contrast(1.1) drop-shadow(0 0 18px rgba(0,255,230,0.20))";
        if (isHuggingFace) {
          (img as HTMLImageElement).style.padding = "30px";
        }
      });
      wallRef.current?.querySelectorAll("img").forEach((img) => {
        const alt = (img as HTMLImageElement).alt.toLowerCase();
        const isHuggingFace = alt.includes("huggingface");
        (img as HTMLImageElement).style.filter = isHuggingFace
          ? "grayscale(1) brightness(1.12) contrast(1.3) saturate(0) drop-shadow(0 0 10px rgba(0,255,230,0.12))"
          : "invert(1) brightness(1.25) drop-shadow(0 0 14px rgba(0,255,230,0.18))";
      });
    });
  }, []);

  useEffect(() => {
    setActiveKey("aiml");
  }, [setActiveKey]);

  useEffect(() => {
    const tabs = tabsRef.current;
    if (!tabs) return;

    const onPointerOver = (e: PointerEvent) => {
      const btn = (e.target as HTMLElement).closest(".dom-tab");
      if (!btn) return;
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = setTimeout(
        () => setActiveKey((btn as HTMLButtonElement).dataset.dom || "aiml"),
        30
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const btn = (e.target as HTMLElement).closest(".dom-tab");
      if (!btn) return;
      const list = Array.from(tabs.querySelectorAll<HTMLButtonElement>(".dom-tab"));
      const idx = list.indexOf(btn as HTMLButtonElement);
      if (e.key === "ArrowLeft" && idx > 0) {
        e.preventDefault();
        const key = list[idx - 1].dataset.dom || "aiml";
        setActiveKey(key);
        list[idx - 1].focus();
      }
      if (e.key === "ArrowRight" && idx < list.length - 1) {
        e.preventDefault();
        const key = list[idx + 1].dataset.dom || "aiml";
        setActiveKey(key);
        list[idx + 1].focus();
      }
    };

    tabs.addEventListener("pointerover", onPointerOver);
    tabs.addEventListener("keydown", onKeyDown);
    return () => {
      tabs.removeEventListener("pointerover", onPointerOver);
      tabs.removeEventListener("keydown", onKeyDown);
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, [setActiveKey]);

  const scrollTabs = (dir: number) => {
    tabsRef.current?.scrollBy({ left: dir * 300, behavior: "smooth" });
  };

  return (
    <section className="domains" id="domains">
      <div className="domains-shell">
        <div className="domains-glow" />

        <div className="stats-row">
          <div className="stat-pill">
            <span className="dot" /> 3 Million+ <small>Talent Network</small>
          </div>
          <div className="stat-pill">
            <span className="dot" /> 1 Million+ <small>Followers</small>
          </div>
          <div className="stat-pill">
            <span className="dot" /> 126+ <small>Reviews</small>
          </div>
        </div>

        <div className="dom-top">
          <div className="dom-title">
            <h3>Explore Domains</h3>
          </div>
          <div className="dom-arrows">
            <button
              className="dom-arrow"
              type="button"
              aria-label="Scroll left"
              onClick={() => scrollTabs(-1)}
            >
              ‹
            </button>
            <button
              className="dom-arrow"
              type="button"
              aria-label="Scroll right"
              onClick={() => scrollTabs(1)}
            >
              ›
            </button>
          </div>
        </div>

        <div
          className="dom-tabs"
          id="domTabs"
          aria-label="Domains"
          ref={tabsRef}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`dom-tab ${active === tab.key ? "active" : ""}`}
              data-dom={tab.key}
              onClick={() => setActiveKey(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="logo-wall" id="logoWall" aria-label="Popular tools row" ref={wallRef} />
        <div className="dom-grid" id="domGrid" aria-label="Tech tiles grid" ref={gridRef} />
      </div>
    </section>
  );
}
