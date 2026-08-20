import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Server-side storage helpers using the service-role client.
 * Used for: custom-cake-refs (private bucket) reference images,
 * admin uploads that must bypass RLS, and cleanup operations.
 */

export interface SignedUploadResult {
  signedUrl: string | null;
  path: string | null;
  error: string | null;
}

/**
 * Generate a signed URL for a private bucket object (e.g. custom cake
 * reference images) so staff can view it without public access.
 */
export async function getSignedUrl(
  bucket: "custom-cake-refs",
  path: string,
  expiresInSeconds = 3600
): Promise<SignedUploadResult> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresInSeconds);

  if (error) {
    return { signedUrl: null, path, error: error.message };
  }
  return { signedUrl: data.signedUrl, path, error: null };
}

/**
 * Upload a file to a private bucket from the server (service role).
 */
export async function uploadPrivateFile(
  bucket: "custom-cake-refs",
  file: ArrayBuffer,
  contentType: string,
  folder = ""
): Promise<SignedUploadResult> {
  const supabase = createAdminClient();

  const ext = contentType.split("/")[1] ?? "bin";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
  const path = folder ? `${folder}/${safeName}` : safeName;

  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType,
  });

  if (error) {
    return { signedUrl: null, path: null, error: error.message };
  }
  return { signedUrl: null, path, error: null };
}