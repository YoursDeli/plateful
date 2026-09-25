"use client";

import { useState } from "react";
import { ShareButtonCluster } from "@/components/ui/share-button-cluster";

export function ReferralLinkBox({ link, brandName }: { link: string; brandName: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-secondary card-accent-light p-5 text-white shadow-sm sm:p-6">
      <p className="text-sm text-white/75">Your referral link</p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          readOnly
          value={link}
          aria-label="Your referral link"
          onFocus={(e) => e.currentTarget.select()}
          className="min-w-0 flex-1 rounded-btn border border-white/20 bg-white/10 px-4 py-3 font-mono text-sm text-white outline-none focus:ring-2 focus:ring-primary"
        />
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              } catch {
                // Clipboard blocked — the field is selectable as a fallback.
              }
            }}
            className="rounded-btn bg-primary px-5 py-3 text-sm font-semibold text-secondary"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
          <ShareButtonCluster
            text={`Order from ${brandName} with my link`}
            url={link}
            label="Share your referral link"
          />
        </div>
      </div>
      <span role="status" aria-live="polite" className="sr-only">
        {copied ? "Link copied" : ""}
      </span>
    </div>
  );
}
