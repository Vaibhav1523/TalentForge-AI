"use client";

import { useEffect } from "react";

export function CaseTreeMode() {
  useEffect(() => {
    document.body.classList.add("tree-on", "tree-bright", "case-tree-mode");
    return () => {
      document.body.classList.remove("tree-on", "tree-bright", "case-tree-mode");
    };
  }, []);

  return null;
}

