"use client";

import { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import { FacebookIcon, LinkIcon, ShareIcon, WhatsAppIcon, XIcon } from "./icons";

// Expanding share cluster — adapted from the client's snippet
// (docs/ui-snippets/share-cluster.jsx, "made by csozi"): neumorphic share
// button whose platform buttons fan out with a staggered delay and fill with
// each brand colour on hover. Changes (docs/ui-components-and-styling.md §3):
//   * trimmed to WhatsApp, X, Facebook, Copy link (client choice); Instagram
//     has no web share URL — "Copy link" covers pasting into a story/DM.
//   * fans out in a half-circle to the RIGHT (safe at a left edge on mobile)
//     and no longer grows its own padding, so the page doesn't jump.
//   * opens on hover (mouse) AND tap (touch) / keyboard; Esc + outside click
//     close it; hidden buttons aren't tabbable; every button has a label.

const RADIUS = 64;
// Half-circle to the right: up, up-right, down-right, down.
const POSITIONS = [
  [0, -RADIUS],
  [Math.round(RADIUS * 0.87), -Math.round(RADIUS * 0.5)],
  [Math.round(RADIUS * 0.87), Math.round(RADIUS * 0.5)],
  [0, RADIUS],
];

const Wrapper = styled.div`
  position: relative;
  display: inline-grid;
  place-items: center;

  .main-button {
    position: relative;
    display: grid;
    place-items: center;
    padding: 10px;
    border: none;
    color: #212121;
    background: #e8e8e8;
    box-shadow: 5px 5px 12px #cacaca, -5px -5px 12px #ffffff;
    border-radius: 50%;
    transition: 0.2s;
    z-index: 30;
    cursor: pointer;
  }

  .main-button:focus-visible,
  .button:focus-visible {
    outline: 3px solid var(--brand-secondary);
    outline-offset: 2px;
  }

  .button {
    position: absolute;
    display: grid;
    place-items: center;
    padding: 10px;
    border: none;
    color: #212121;
    background: #e8e8e8;
    box-shadow: 5px 5px 12px rgba(202, 202, 202, 0), -5px -5px 12px rgba(255, 255, 255, 0);
    transition-property: translate, background, box-shadow, opacity, color;
    transition-duration: 0.3s;
    border-radius: 50%;
    opacity: 0;
    pointer-events: none;
    z-index: 29;
    cursor: pointer;
  }

  &.open .button {
    opacity: 1;
    pointer-events: auto;
    box-shadow: 5px 5px 12px #cacaca, -5px -5px 12px #ffffff;
  }

  @media (hover: hover) {
    &:hover .button {
      opacity: 1;
      pointer-events: auto;
      box-shadow: 5px 5px 12px #cacaca, -5px -5px 12px #ffffff;
    }
  }

  ${POSITIONS.map(
    ([x, y], i) => `
    .button:nth-of-type(${i + 1}) { transition-delay: ${i * 0.08}s, 0s, ${i * 0.08}s, ${i * 0.08}s, 0s; }
    &.open .button:nth-of-type(${i + 1}) { translate: ${x}px ${y}px; }
    @media (hover: hover) { &:hover .button:nth-of-type(${i + 1}) { translate: ${x}px ${y}px; } }
  `,
  ).join("")}

  .whatsapp-button:hover { background: #25d366; color: #fff; }
  .x-button:hover { background: #000; color: #fff; }
  .facebook-button:hover { background: #1877f2; color: #fff; }
  .copy-button:hover { background: var(--brand-secondary); color: var(--brand-primary); }

  .copied {
    position: absolute;
    left: calc(100% + ${RADIUS + 28}px);
    white-space: nowrap;
    font-size: 12px;
    font-weight: 600;
    color: var(--brand-secondary);
    background: #fff;
    padding: 4px 8px;
    border-radius: 999px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }
`;

export function ShareButtonCluster({
  text,
  url,
  label = "Share",
}: {
  text: string; // e.g. the dish name
  url?: string; // defaults to the current page
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const target = () => url ?? window.location.href;
  const popup = (href: string) => window.open(href, "_blank", "noopener,noreferrer");

  const targets = [
    {
      key: "whatsapp",
      label: "Share on WhatsApp",
      icon: <WhatsAppIcon size={22} />,
      onClick: () => popup(`https://wa.me/?text=${encodeURIComponent(`${text} — ${target()}`)}`),
    },
    {
      key: "x",
      label: "Share on X",
      icon: <XIcon size={20} />,
      onClick: () =>
        popup(`https://x.com/intent/post?text=${encodeURIComponent(text)}&url=${encodeURIComponent(target())}`),
    },
    {
      key: "facebook",
      label: "Share on Facebook",
      icon: <FacebookIcon size={22} />,
      onClick: () => popup(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(target())}`),
    },
    {
      key: "copy",
      label: "Copy link",
      icon: <LinkIcon size={20} />,
      onClick: async () => {
        try {
          await navigator.clipboard.writeText(target());
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          // Clipboard blocked (e.g. insecure context) — nothing else to do.
        }
      },
    },
  ];

  return (
    <Wrapper ref={ref} className={open ? "open" : undefined}>
      <button
        type="button"
        className="main-button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <ShareIcon size={24} />
      </button>
      {targets.map((t) => (
        <button
          key={t.key}
          type="button"
          className={`button ${t.key}-button`}
          aria-label={t.label}
          title={t.label}
          tabIndex={open ? 0 : -1}
          aria-hidden={!open}
          onClick={() => {
            void t.onClick();
            if (t.key !== "copy") setOpen(false);
          }}
        >
          {t.icon}
        </button>
      ))}
      <span role="status" aria-live="polite" className={copied ? "copied" : "sr-only"}>
        {copied ? "Link copied" : ""}
      </span>
    </Wrapper>
  );
}
