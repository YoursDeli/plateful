"use client";

import Link from "next/link";
import { useId } from "react";
import styled, { css, keyframes } from "styled-components";

// "Liquid" call-to-action (client snippet, docs/ui-snippets/liquid-button.jsx):
// a glossy pill with drops that drip from its base through an SVG "goo"
// filter. Used for the lavender storefront CTAs (Request a quote, Browse the
// menu, Write a review…); Add to cart / Pay keep CtaButton.
// Changes from the original (docs/ui-components-and-styling.md §3):
//   * colours → brand tokens. tone="dark" (default, for light surfaces):
//     Velvet pill + drops, white text. tone="light" (for Velvet cards):
//     Lavender pill + drops, Velvet text.
//   * sizes to its label (no fixed 120px / stray margin-left: 20%).
//   * drops fall ~60px and fade instead of 400px across the page.
//   * hover "jump" toned down (scale 1.5 + 10° looked broken on real labels).
//   * unique filter id per button; works as a link (href) or a button;
//     focus ring, disabled state; reduced motion via globals.css.

type Tone = "dark" | "light";

const fadeIn = keyframes`
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
`;

const jump = keyframes`
  0% { transform: scale(1) rotate(0deg); }
  50% { transform: scale(1.08) rotate(2deg); }
  100% { transform: scale(0.98) rotate(-1deg); }
`;

const drip = keyframes`
  0% { bottom: 0; opacity: 1; }
  70% { opacity: 1; }
  100% { bottom: -120px; opacity: 0; }
`;

const tones: Record<Tone, ReturnType<typeof css>> = {
  dark: css`
    --liquid-bg: var(--brand-secondary);
    --liquid-glow: color-mix(in srgb, var(--brand-secondary) 70%, white);
    --liquid-text: #fff;
    --liquid-drop: var(--brand-secondary);
    --liquid-drop-accent: var(--brand-primary);
  `,
  light: css`
    --liquid-bg: var(--brand-primary);
    --liquid-glow: color-mix(in srgb, var(--brand-primary) 55%, white);
    --liquid-text: var(--brand-secondary);
    --liquid-drop: var(--brand-primary);
    --liquid-drop-accent: #fff;
  `,
};

const Wrapper = styled.span<{ $tone: Tone; $full: boolean }>`
  ${(p) => tones[p.$tone]}
  display: ${(p) => (p.$full ? "flex" : "inline-flex")};
  width: ${(p) => (p.$full ? "100%" : "auto")};

  .liquid {
    position: relative;
    display: flex;
    width: 100%;
    justify-content: center;
    padding: 0 0 10px;
    border: 0;
    background: transparent;
    cursor: pointer;
    font: inherit;
    text-decoration: none;
  }

  .liquid-face {
    position: relative;
    z-index: 2;
    width: 100%;
    padding: 11px 20px;
    border-radius: var(--btn-radius);
    color: var(--liquid-text);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 1.5px;
    text-align: center;
    text-transform: uppercase;
    white-space: nowrap;
    background-color: var(--liquid-bg);
    background-image: radial-gradient(circle 80px at 50% 150%, var(--liquid-glow), var(--liquid-bg));
    transition: all 0.2s ease-in-out;
  }

  .liquid:hover:not(:disabled) .liquid-face {
    text-shadow: 0 0 8px color-mix(in srgb, var(--liquid-text) 70%, transparent);
    animation: ${jump} 0.2s ease-in-out;
  }

  .liquid:active:not(:disabled) .liquid-face {
    background-image: radial-gradient(circle 140px at 50% 150%, var(--liquid-glow), var(--liquid-bg));
  }

  .liquid:focus-visible {
    outline: none;
  }
  .liquid:focus-visible .liquid-face {
    outline: 3px solid var(--brand-secondary);
    outline-offset: 3px;
  }

  .liquid:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  .liquid:disabled .liquid-drops {
    display: none;
  }

  .liquid-drops {
    position: absolute;
    inset: 35% 0 0 0;
    z-index: 1;
    opacity: 0;
    pointer-events: none;
    animation: ${fadeIn} 0.3s linear 0.2s forwards;
  }

  .drop {
    position: absolute;
    inset: 0 0 auto 0;
    margin: auto;
    width: 18px;
    height: 24px;
    border-radius: 50%;
    background-color: var(--liquid-drop);
  }

  .drop-base {
    width: calc(100% - 16px);
    height: 16px;
    bottom: 2px;
    border-radius: 0;
  }

  .drop-accent {
    background-color: var(--liquid-drop-accent);
  }

  .drop-fall {
    animation: ${drip} 1.6s cubic-bezier(1, 0.19, 0.66, 0.12) 0.7s infinite;
  }

  .liquid:hover .drop-fall {
    animation-duration: 0.6s;
  }
`;

type Common = {
  tone?: Tone;
  fullWidth?: boolean;
  children: React.ReactNode;
};

type AsLink = Common & { href: string; onClick?: () => void };
type AsButton = Common & { href?: undefined } & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export function LiquidButton(props: AsLink | AsButton) {
  const { tone = "dark", fullWidth = false, children } = props;
  const filterId = `liquid-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const inner = (
    <>
      <span className="liquid-face">{children}</span>
      <span aria-hidden="true" className="liquid-drops" style={{ filter: `url(#${filterId})` }}>
        <span className="drop drop-base" />
        <span className="drop drop-fall" />
        <span className="drop drop-fall drop-accent" />
      </span>
      <svg aria-hidden="true" width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          <filter id={filterId}>
            <feGaussianBlur result="blur" stdDeviation={10} in="SourceGraphic" />
            <feColorMatrix
              result="liquid"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              mode="matrix"
              in="blur"
            />
          </filter>
        </defs>
      </svg>
    </>
  );

  if (props.href !== undefined) {
    return (
      <Wrapper $tone={tone} $full={fullWidth}>
        <Link href={props.href} onClick={props.onClick} className="liquid">
          {inner}
        </Link>
      </Wrapper>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { tone: _tone, fullWidth: _full, children: _children, href: _href, type = "button", ...rest } = props;
  return (
    <Wrapper $tone={tone} $full={fullWidth}>
      <button type={type} className="liquid" {...rest}>
        {inner}
      </button>
    </Wrapper>
  );
}
