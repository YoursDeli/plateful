import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentProfile, isStaffRole } from "@/lib/auth";
import {
  UPLOAD_FOLDERS,
  isCloudinaryConfigured,
  signUploadParams,
} from "@/lib/cloudinary/sign";

const bodySchema = z.object({ folder: z.enum(UPLOAD_FOLDERS) });

// POST { folder } → signed params for a direct browser → Cloudinary upload.
// Staff/admin only; the file itself never passes through this server.
export async function POST(request: Request) {
  const profile = await getCurrentProfile();
  if (!profile) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (!isStaffRole(profile)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!isCloudinaryConfigured()) {
    return NextResponse.json({ error: "Image uploads are not configured" }, { status: 503 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid upload folder" }, { status: 400 });
  }

  return NextResponse.json(signUploadParams(parsed.data.folder), {
    headers: { "Cache-Control": "no-store" },
  });
}
