"use client";

import Image, { type ImageLoaderProps, type ImageProps } from "next/image";

// Delivers one stored original through Cloudinary's on-the-fly transforms
// (f_auto,q_auto,w_<n>) instead of Next's optimiser or pre-resized copies.
function cloudinaryLoader({ src, width, quality }: ImageLoaderProps) {
  const marker = "/image/upload/";
  const i = src.indexOf(marker);
  if (i === -1) return src;
  const transforms = `f_auto,q_${quality ?? "auto"},c_limit,w_${width}`;
  const at = i + marker.length;
  return `${src.slice(0, at)}${transforms}/${src.slice(at)}`;
}

export function CloudinaryImage({ alt, ...props }: Omit<ImageProps, "loader">) {
  return <Image alt={alt} {...props} loader={cloudinaryLoader} />;
}
