import { createClient } from "@/lib/supabase/client";

export type UploadBucket =
  | "menu-items"
  | "gallery"
  | "promo-banners"
  | "site-assets"
  | "custom-cake-refs";

export interface UploadResult {
  url: string | null;
  path: string | null;
  error: string | null;
}

/**
 * Upload a file to a Supabase Storage bucket using the browser client.
 * Returns the public URL for public buckets, or the path for private buckets.
 */
export async function uploadFile(
  bucket: UploadBucket,
  file: File,
  folder = ""
): Promise<UploadResult> {
  const supabase = createClient();

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "bin";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const path = folder ? `${folder}/${safeName}` : safeName;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    return { url: null, path: null, error: error.message };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return { url: data.publicUrl, path, error: null };
}

/**
 * Upload multiple files in parallel.
 */
export async function uploadFiles(
  bucket: UploadBucket,
  files: File[],
  folder = ""
): Promise<UploadResult[]> {
  return Promise.all(files.map((f) => uploadFile(bucket, f, folder)));
}

/**
 * Delete a file from a bucket by path.
 */
export async function deleteFile(
  bucket: UploadBucket,
  path: string
): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(bucket).remove([path]);
  return error?.message ?? null;
}