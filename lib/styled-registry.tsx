"use client";

import { useServerInsertedHTML } from "next/navigation";
import { useState } from "react";
import { ServerStyleSheet, StyleSheetManager } from "styled-components";

// Collects styled-components CSS during server rendering and injects it into
// <head>, so the /components/ui buttons render styled on first paint (no
// flash). Per Next's CSS-in-JS guide. styled-components is used ONLY for the
// client-supplied animated buttons (docs/ui-components-and-styling.md §3).
export default function StyledComponentsRegistry({ children }: { children: React.ReactNode }) {
  const [sheet] = useState(() => new ServerStyleSheet());

  useServerInsertedHTML(() => {
    const styles = sheet.getStyleElement();
    sheet.instance.clearTag();
    return <>{styles}</>;
  });

  if (typeof window !== "undefined") return <>{children}</>;
  return <StyleSheetManager sheet={sheet.instance}>{children}</StyleSheetManager>;
}
