"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { UploadButton } from "@/components/ui/upload-button";
import { createClient } from "@/lib/supabase/client";
import {
  ALLOWED_IMAGE_TYPES,
  IMAGES_BUCKET,
  MAX_IMAGE_BYTES,
  publicImageUrl,
  type ImageFolder,
} from "@/lib/storage/images";

type Status = "idle" | "uploading" | "done" | "error";

// Uploads straight from the browser to Supabase Storage as the signed-in
// user; the bucket's RLS policies only accept staff uploads into allowed
// folders, and the bucket itself enforces size/type. Uses XHR instead of
// supabase.storage.upload() because only XHR reports upload progress, which
// drives the animated UploadButton's border (idle → uploading → done).
export function ImageUploadField({
  name,
  folder,
  label,
  defaultValue,
}: {
  name: string;
  folder: ImageFolder;
  label: string;
  defaultValue?: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState(defaultValue ?? "");
  const [status, setStatus] = useState<Status>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    const ext = ALLOWED_IMAGE_TYPES[file.type];
    if (!ext) {
      setError("Use a JPG, PNG, WebP, or AVIF image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError(`Image must be under ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`);
      return;
    }

    const {
      data: { session },
    } = await createClient().auth.getSession();
    if (!session) {
      setStatus("error");
      setError("Your session expired — please sign in again.");
      return;
    }

    setStatus("uploading");
    setProgress(0);

    // Random name: never overwrites an existing file, and avoids stale CDN
    // caches when an image is replaced.
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const form = new FormData();
    form.append("cacheControl", "31536000");
    form.append("", file);

    const base = process.env.NEXT_PUBLIC_SUPABASE_URL!.replace(/\/$/, "");
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${base}/storage/v1/object/${IMAGES_BUCKET}/${path}`);
    xhr.setRequestHeader("Authorization", `Bearer ${session.access_token}`);
    xhr.setRequestHeader("apikey", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        setUrl(publicImageUrl(path));
        setStatus("done");
        // Show the checkmark briefly, then settle back to "Replace …".
        setTimeout(() => setStatus((s) => (s === "done" ? "idle" : s)), 2500);
        return;
      }
      let message = "Upload failed.";
      try {
        const body = JSON.parse(xhr.responseText);
        message = body.message ?? body.error ?? message;
      } catch {
        // Non-JSON error body; keep the generic message.
      }
      setStatus("error");
      setError(message);
    };
    xhr.onerror = () => {
      setStatus("error");
      setError("Upload failed — check your connection.");
    };
    xhr.send(form);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <input type="hidden" name={name} value={url} />
      <div className="flex items-center gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-neutral-dark/10 bg-white">
          {url ? (
            <Image src={url} alt="" fill sizes="80px" className="object-cover" />
          ) : (
            <span className="flex size-full items-center justify-center text-xs text-neutral-dark/40">
              No image
            </span>
          )}
        </div>
        <div className="flex flex-col items-start gap-1.5">
          <input
            ref={inputRef}
            type="file"
            accept={Object.keys(ALLOWED_IMAGE_TYPES).join(",")}
            className="sr-only"
            aria-label={label}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
          <UploadButton
            status={status}
            progress={progress}
            hasFile={Boolean(url)}
            noun={label.toLowerCase()}
            onClick={() => inputRef.current?.click()}
          />
          {url && status !== "uploading" && (
            <button
              type="button"
              onClick={() => {
                setUrl("");
                setStatus("idle");
              }}
              className="text-xs text-neutral-dark/65 underline"
            >
              Remove image
            </button>
          )}
        </div>
      </div>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
