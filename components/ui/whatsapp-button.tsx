"use client";

import styled from "styled-components";
import { WhatsAppIcon } from "./icons";

// "Message us on WhatsApp" — adapted from the client's "Button 1" snippet
// (docs/ui-snippets/button-1.jsx): neumorphic face, a teal fill rises like
// liquid on hover, inset press. Teal #009087 kept on purpose — it's
// WhatsApp-branded (docs/ui-components-and-styling.md §3). Rendered as a link
// to wa.me; changes: WhatsApp icon + real label, focus style, pill radius.

const Link = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 10px;
  transition: all 0.2s ease-in;
  position: relative;
  overflow: hidden;
  z-index: 1;
  color: #090909;
  padding: 0.7em 1.5em;
  cursor: pointer;
  font-size: 15px;
  font-weight: 600;
  text-decoration: none;
  border-radius: var(--btn-radius);
  background: #e8e8e8;
  border: 1px solid #e8e8e8;
  box-shadow: 6px 6px 12px #c5c5c5, -6px -6px 12px #ffffff;

  svg {
    color: #009087;
    transition: color 0.2s ease-in;
  }

  &:active {
    color: #666;
    box-shadow: inset 4px 4px 12px #c5c5c5, inset -4px -4px 12px #ffffff;
  }

  &::before {
    content: "";
    position: absolute;
    left: 50%;
    transform: translateX(-50%) scaleY(1) scaleX(1.25);
    top: 100%;
    width: 140%;
    height: 180%;
    background-color: rgba(0, 0, 0, 0.05);
    border-radius: 50%;
    display: block;
    transition: all 0.5s 0.1s cubic-bezier(0.55, 0, 0.1, 1);
    z-index: -1;
  }

  &::after {
    content: "";
    position: absolute;
    left: 55%;
    transform: translateX(-50%) scaleY(1) scaleX(1.45);
    top: 180%;
    width: 160%;
    height: 190%;
    background-color: #009087;
    border-radius: 50%;
    display: block;
    transition: all 0.5s 0.1s cubic-bezier(0.55, 0, 0.1, 1);
    z-index: -1;
  }

  &:hover {
    color: #ffffff;
    border: 1px solid #009087;
  }

  &:hover svg {
    color: #ffffff;
  }

  &:hover::before {
    top: -35%;
    background-color: #009087;
    transform: translateX(-50%) scaleY(1.3) scaleX(0.8);
  }

  &:hover::after {
    top: -45%;
    background-color: #009087;
    transform: translateX(-50%) scaleY(1.3) scaleX(0.8);
  }

  &:focus-visible {
    outline: 3px solid #009087;
    outline-offset: 3px;
  }
`;

// `phone`: international digits only, e.g. 2348031234567 (site_settings.whatsapp_number).
export function WhatsAppButton({
  phone,
  message,
  label = "Message us on WhatsApp",
}: {
  phone: string;
  message?: string;
  label?: string;
}) {
  const href = `https://wa.me/${phone}${message ? `?text=${encodeURIComponent(message)}` : ""}`;
  return (
    <Link href={href} target="_blank" rel="noopener noreferrer">
      <WhatsAppIcon size={20} />
      {label}
    </Link>
  );
}
