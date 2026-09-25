"use client";

import { forwardRef } from "react";
import styled, { css } from "styled-components";

// Primary call-to-action (Add to cart, Order now, Pay) — adapted from the
// client's "Button 2" snippet (docs/ui-snippets/button-2.jsx): a fill grows
// out from the centre on hover and the button presses in on click.
// Changes from the original (docs/ui-components-and-styling.md §3):
//   * colours → brand tokens: Lavender face + Velvet text; the fill is Velvet
//     with Lavender text. CSS vars, so admin colour changes apply live.
//   * press scale 80% → 94%: 80% looked broken on a full-width Pay button.
//   * real labels, disabled/focus styles; reduced motion via globals.css.

type Size = "sm" | "md" | "lg";

const sizes: Record<Size, ReturnType<typeof css>> = {
  sm: css`
    padding: 8px 16px;
    font-size: 14px;
    border-radius: var(--btn-radius);
  `,
  md: css`
    padding: 11px 24px;
    font-size: 16px;
    border-radius: var(--btn-radius);
  `,
  lg: css`
    padding: 15px 28px;
    font-size: 18px;
    border-radius: var(--btn-radius);
  `,
};

const StyledButton = styled.button<{ $size: Size; $full: boolean }>`
  position: relative;
  z-index: 1;
  overflow: hidden;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: ${(p) => (p.$full ? "100%" : "auto")};
  border: 0;
  cursor: pointer;
  font-family: inherit;
  font-weight: 700;
  color: var(--brand-secondary);
  background: var(--brand-primary);
  box-shadow: 4px 8px 19px -3px rgba(0, 0, 0, 0.18);
  transition: all 250ms;
  ${(p) => sizes[p.$size]}

  &::before {
    content: "";
    position: absolute;
    top: 50%;
    left: 50%;
    height: 0;
    width: 0;
    border-radius: inherit;
    background-color: var(--brand-secondary);
    z-index: -1;
    transition: all 250ms;
  }

  &:hover:not(:disabled) {
    color: var(--brand-primary);
  }

  &:hover:not(:disabled)::before {
    width: 100%;
    top: 0;
    left: 0;
    height: 100%;
  }

  &:active:not(:disabled) {
    transform: scale(0.94);
  }

  &:focus-visible {
    outline: 3px solid var(--brand-secondary);
    outline-offset: 3px;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.6;
    box-shadow: none;
  }
`;

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: Size;
  fullWidth?: boolean;
};

export const CtaButton = forwardRef<HTMLButtonElement, Props>(function CtaButton(
  { size = "md", fullWidth = false, type = "button", children, ...rest },
  ref,
) {
  return (
    <StyledButton ref={ref} type={type} $size={size} $full={fullWidth} {...rest}>
      {children}
    </StyledButton>
  );
});
