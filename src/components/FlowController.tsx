"use client";

import { useEffect } from "react";

type Refs = {
  heroRef: React.RefObject<HTMLDivElement | null>;
  storyRef: React.RefObject<HTMLDivElement | null>;
  msg2Ref: React.RefObject<HTMLDivElement | null>;
  domainsRef: React.RefObject<HTMLDivElement | null>;
};

export function FlowController({ heroRef, storyRef, msg2Ref, domainsRef }: Refs) {
  useEffect(() => {
    const hero = heroRef?.current;
    const story = storyRef.current;
    const msg2 = msg2Ref.current;
    const domains = domainsRef.current;

    if (!hero || !story) return;

    const unsubHero = new IntersectionObserver(
      (entries) => {
        document.body.classList.toggle("hero-out", !entries[0].isIntersecting);
      },
      { threshold: 0.15 }
    );
    unsubHero.observe(hero);

    let inStory = false;
    let brightTree = false;
    let suppressTree = false;

    const syncTreeClasses = () => {
      document.body.classList.toggle("tree-on", inStory && !suppressTree);
      document.body.classList.toggle("tree-bright", inStory && brightTree && !suppressTree);
      document.body.classList.toggle("tree-exit", suppressTree);
    };

    const unsubStory = new IntersectionObserver(
      (entries) => {
        inStory = entries[0].isIntersecting;
        syncTreeClasses();
      },
      { threshold: 0.01 }
    );
    unsubStory.observe(story);

    let unsubMsg2: IntersectionObserver | null = null;
    if (msg2) {
      unsubMsg2 = new IntersectionObserver(
        (entries) => {
          brightTree = entries[0].isIntersecting;
          syncTreeClasses();
        },
        { threshold: 0.55 }
      );
      unsubMsg2.observe(msg2);
    }

    let unsubDomains: IntersectionObserver | null = null;
    if (domains) {
      unsubDomains = new IntersectionObserver(
        (entries) => {
          const e = entries[0];
          const thresholdY = window.innerHeight * 0.7;
          suppressTree = e.isIntersecting || e.boundingClientRect.top <= thresholdY;
          syncTreeClasses();
        },
        { threshold: 0.15 }
      );
      unsubDomains.observe(domains);
    }

    return () => {
      unsubHero.disconnect();
      unsubStory.disconnect();
      unsubMsg2?.disconnect();
      unsubDomains?.disconnect();
    };
  }, []);

  return null;
}
