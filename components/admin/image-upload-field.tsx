"use client";

import { useRef, useState } from "react";
import { CloudinaryImage } from "@/components/cloudinary-image";
import {
  ALLOWED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  type UploadFolder,
} from "@/lib/cloudinary/constants";

type Status = "idle" | "uploading" | "done" | "error";

// Plain signed-upload control. The animated UploadButton from
// docs/ui-components-and-styling.md §3 replaces the button in step 8a and
// should hook into this same idle → uploading → done lifecycle.
export function ImageUploadField({
  name,
  folder,
  label,
  defaultValue,
}: {
  name: string;
  folder: UploadFolder;
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
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setError("Use a JPG, PNG, WebP, or AVIF image.");
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setError(`Image must be under ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);
      return;
    }

    setStatus("uploading");
    setProgress(0);

    const signRes = await fetch("/api/cloudinary/sign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ folder }),
    });
    if (!signRes.ok) {
      const body = await signRes.json().catch(() => ({}));
      setStatus("error");
      setError(body.error ?? "Could not start upload.");
      return;
    }
    const { cloud_name, ...signed } = (await signRes.json()) as Record<string, string>;

    const form = new FormData();
    form.append("file", file);
    for (const [key, value] of Object.entries(signed)) form.append(key, value);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${cloud_name}/image/upload`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      const body = JSON.parse(xhr.responseText || "{}");
      if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) {
        setUrl(body.secure_url);
        setStatus("done");
      } else {
        setStatus("error");
        setError(body.error?.message ?? "Upload failed.");
      }
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
            <CloudinaryImage src={url} alt="" fill sizes="80px" className="object-cover" />
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
            accept={ALLOWED_MIME_TYPES.join(",")}
            className="sr-only"
            aria-label={label}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void upload(file);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            disabled={status === "uploading"}
            onClick={() => inputRef.current?.click()}
            className="rounded-full border border-secondary px-4 py-1.5 text-sm font-medium text-secondary disabled:opacity-60"
          >
            {status === "uploading" ? `Uploading… ${progress}%` : url ? "Replace" : "Upload"}
          </button>
          {url && status !== "uploading" && (
            <button
              type="button"
              onClick={() => {
                setUrl("");
                setStatus("idle");
              }}
              className="text-xs text-neutral-dark/60 underline"
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
