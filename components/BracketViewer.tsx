"use client";
import React, { useEffect, useRef } from "react";

declare global {
  interface Window {
    bracketsViewer?: {
      render: (options: any) => void;
    };
  }
}

interface BracketViewerProps {
  bracketId: number;
}

const BracketViewer: React.FC<BracketViewerProps> = ({ bracketId }) => {
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadBracket() {
      const res = await fetch(`/api/brackets/${bracketId}/data`);
      const data = await res.json();
      if (window.bracketsViewer && viewerRef.current) {
        window.bracketsViewer.render({
          stages: data.stage,
          matches: data.match,
          matchGames: data.match_game,
          participants: data.participant,
          container: viewerRef.current,
        });
      }
    }
    if (!window.bracketsViewer) {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/brackets-viewer@latest/dist/brackets-viewer.min.js";
      script.onload = loadBracket;
      document.body.appendChild(script);
    } else {
      loadBracket();
    }
  }, [bracketId]);

  return <div ref={viewerRef} style={{ width: "100%", minHeight: 400 }} />;
};

export default BracketViewer;
