import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Secrets come from the environment (.dev.vars) — never hardcode them here.
// This file is committed; the service-role key bypasses all RLS.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. " +
      "Load them from .dev.vars before running this script."
  );
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Source folder: pass as argv[1], or set GALLERY_FOLDER.
const FOLDER = process.argv[2] ?? process.env.GALLERY_FOLDER;
const BUCKET = "gallery";

if (!FOLDER) {
  throw new Error(
    "Usage: tsx scripts/upload-gallery-images.ts <folder>  (or set GALLERY_FOLDER)"
  );
}

function captionFromFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/CYMERA_\d{8}_\d{6}/, "Bakery")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function main() {
  const files = fs.readdirSync(FOLDER).filter((f) => /\.(jpe?g|png|webp)$/i.test(f));
  console.log(`Found ${files.length} images`);

  // Sort: named cakes first, then CYMERA
  files.sort((a, b) => {
    const aIsCymera = a.startsWith("CYMERA");
    const bIsCymera = b.startsWith("CYMERA");
    if (aIsCymera && !bIsCymera) return 1;
    if (!aIsCymera && bIsCymera) return -1;
    return a.localeCompare(b);
  });

  // Upload to storage + insert into DB
  const rows: { image_url: string; caption: string; sort_order: number; is_active: boolean }[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(FOLDER, file);
    const fileBuffer = fs.readFileSync(filePath);
    const storagePath = `gallery/${file}`;

    console.log(`[${i + 1}/${files.length}] Uploading ${file}...`);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, fileBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (uploadError) {
      console.error(`  FAILED: ${uploadError.message}`);
      continue;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

    rows.push({
      image_url: urlData.publicUrl,
      caption: captionFromFilename(file),
      sort_order: i + 1,
      is_active: true,
    });
  }

  console.log(`\nUploaded ${rows.length} images. Inserting into gallery_photos...`);

  // Clear existing rows first
  await supabase.from("gallery_photos").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  // Batch insert (Supabase limit is 1000 per call, we have 100)
  const { error: insertError } = await supabase.from("gallery_photos").insert(rows);

  if (insertError) {
    console.error(`Insert failed: ${insertError.message}`);
  } else {
    console.log(`Inserted ${rows.length} rows into gallery_photos`);
  }

  // Print summary
  console.log("\n=== SUMMARY ===");
  console.log(`Total images: ${rows.length}`);
  console.log(`Homepage featured (sort_order 1-20): ${rows.filter((r) => r.sort_order <= 20).length}`);
  console.log(`Gallery only (sort_order 21-${rows.length}): ${rows.filter((r) => r.sort_order > 20).length}`);
}

main().catch(console.error);
