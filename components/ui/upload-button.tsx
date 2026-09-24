"use client";

import { useEffect, useRef, useState } from "react";
import styled, { keyframes } from "styled-components";
import { CheckIcon } from "./icons";

// Upload button with a stroke-progress border + checkmark on completion
// (docs/ui-components-and-styling.md §3). No snippet was supplied for this
// one, so it's built from the description in the same neumorphic family as
// the other buttons. Driven by the REAL upload lifecycle — status + progress
// come from ImageUploadField's XHR, not from :focus.

export type UploadStatus = "idle" | "uploading" | "done" | "error";

const draw = keyframes`
  from { stroke-dashoffset: 24; }
  to { stroke-dashoffset: 0; }
`;

const Button = styled.button`
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border: 0;
  border-radius: 14px;
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  color: var(--brand-secondary);
  background: #eeebf5;
  box-shadow: 4px 4px 10px #d3cfe0, -4px -4px 10px #ffffff;
  cursor: pointer;
  transition: box-shadow 0.2s, transform 0.2s, background 0.3s;

  &:hover:not(:disabled) {
    background: var(--brand-primary);
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
    box-shadow: inset 3px 3px 8px #d3cfe0, inset -3px -3px 8px #ffffff;
  }

  &:disabled {
    cursor: progress;
  }

  &:focus-visible {
    outline: 3px solid var(--brand-secondary);
    outline-offset: 3px;
  }

  /* Border that fills as the upload progresses. */
  svg.progress {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }

  svg.progress rect {
    fill: none;
    stroke: var(--brand-secondary);
    stroke-width: 2.5;
    stroke-linecap: round;
    transition: stroke-dashoffset 0.25s linear, opacity 0.4s;
  }

  &[data-status="done"] {
    background: var(--brand-primary);
  }

  &[data-status="done"] .check path {
    stroke-dasharray: 24;
    animation: ${draw} 0.4s ease-out forwards;
  }

  &[data-status="error"] svg.progress rect {
    stroke: #b91c1c;
  }
`;

export function UploadButton({
  status,
  progress,
  onClick,
  hasFile,
  noun = "photo",
}: {
  status: UploadStatus;
  progress: number; // 0–100
  onClick: () => void;
  hasFile: boolean; // an image is already set → "Replace"
  noun?: string; // "photo", "logo"…
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);

  // Measure the button so the progress border traces it exactly (SVG
  // attributes can't use calc() reliably across browsers).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setBox({ w: entry.contentRect.width + 40, h: entry.contentRect.height + 20 });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const uploading = status === "uploading";
  const pct = Math.max(0, Math.min(100, progress));
  const label = uploading
    ? `Uploading… ${pct}%`
    : status === "done"
      ? "Uploaded"
      : status === "error"
        ? "Try again"
        : hasFile
          ? `Replace ${noun}`
          : `Upload ${noun}`;

  return (
    <Button ref={ref} type="button" onClick={onClick} disabled={uploading} data-status={status} aria-busy={uploading}>
      {box && (uploading || status === "done" || status === "error") && (
        <svg className="progress" aria-hidden="true" viewBox={`0 0 ${box.w} ${box.h}`}>
          <rect
            x={1.25}
            y={1.25}
            width={box.w - 2.5}
            height={box.h - 2.5}
            rx={13}
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={status === "uploading" ? 100 - pct : 0}
            opacity={status === "done" ? 0 : 1}
          />
        </svg>
      )}
      {status === "done" && <CheckIcon size={18} className="check" />}
      <span>{label}</span>
    </Button>
  );
}
