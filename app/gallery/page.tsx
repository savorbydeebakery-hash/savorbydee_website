import { GalleryGrid } from "@/components/gallery-grid";
import { pageMeta } from "@/lib/site/seo";
import { isYoutubeShort, videoItem, type GalleryItem } from "@/lib/gallery/youtube";
import { GALLERY_FOLDERS, type GalleryFolder } from "@/lib/gallery/folders";
import { publicSupabase } from "@/lib/site/public-data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "@/components/site/link";
import { ArrowRight } from "lucide-react";

export const metadata = pageMeta({
  title: "Gallery: Cakes and Bakes from Shillong",
  description:
    "Photos and videos of handcrafted cakes, desserts and savoury bakes from Savor by Dee, a bakery in Shillong. See what we make before you order.",
  path: "/gallery",
});

export const dynamic = "force-dynamic"; // see app/page.tsx — ISR hangs on memoryQueue

// Only what Dee adds in Admin → Gallery, so she chooses what's shown. Menu photos
// used to be added on the end automatically (client, 2026-11-05).
const MAX_GALLERY_IMAGES = 300;

export default async function GalleryPage() {
  const supabase = publicSupabase();

  const [{ data: galleryPhotos }, { data: folderRows }] = await Promise.all([
    supabase.from("gallery_photos").select("*").eq("is_active", true).order("sort_order").limit(MAX_GALLERY_IMAGES),
    // Dee's own folders (migration 00059); the starting set if they can't be read.
    supabase.from("gallery_folders").select("slug, label, sort_order").order("sort_order"),
  ]);
  const folders = (folderRows as GalleryFolder[] | null) ?? GALLERY_FOLDERS;

  // A row is a photo or a YouTube video (migration 00055), with a folder and a
  // shape (00057); select("*") so this keeps working before those run.
  const allImages: GalleryItem[] = (
    await Promise.all(
      (galleryPhotos ?? []).map(async (row): Promise<GalleryItem[]> => {
        const p = row as typeof row & {
          youtube_id?: string | null;
          folder?: string | null;
          width?: number | null;
          height?: number | null;
        };
        if (p.youtube_id) {
          return [{ ...videoItem(p.youtube_id, p.caption, await isYoutubeShort(p.youtube_id)), folder: p.folder }];
        }
        return p.image_url
          ? [{ src: p.image_url, alt: p.caption ?? "SAVOR bakery", caption: p.caption, folder: p.folder, width: p.width, height: p.height }]
          : [];
      })
    )
  ).flat();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero section */}
      <section className="text-center pt-12 pb-8 px-4 sm:px-6">
        <Badge color="pink" className="mb-4">
          Savor by Dee
        </Badge>
        <h1 className="text-4xl sm:text-5xl font-bold text-ink mb-4">
          Our Gallery
        </h1>
        <p className="mx-auto max-w-xl text-lg text-ink-soft">
          Explore the visual story of Savor by Dee. From handcrafted cakes to everyday treats,
          every bake is crafted with quality ingredients and a whole lot of heart.
        </p>
      </section>

      {allImages.length === 0 && (
        <section className="mx-auto max-w-6xl px-4 py-20 text-center">
          <p className="text-lg text-ink-soft">
            Gallery photos are being curated. Please check back soon!
          </p>
        </section>
      )}

      {/* Masonry grid + lightbox. Columns rather than a square grid so each
          photo keeps its own aspect ratio and nothing is cropped; clicking
          opens the full frame with resize=contain. */}
      {allImages.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <GalleryGrid items={allImages} folders={folders} />
        </section>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 text-center">
        <div className="rounded-3xl bg-gradient-to-br from-lavender-soft to-pink-soft p-8 sm:p-12">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl mb-3">
            Want to see your cake here?
          </h2>
          <p className="mx-auto max-w-lg text-ink-soft mb-6">
            Order custom cakes and treats from Savor by Dee. Every bake is made fresh to order in Shillong.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/menu">
              <Button size="lg" variant="primary">
                Browse Menu <ArrowRight size={18} />
              </Button>
            </Link>
            <Link href="/custom-cake">
              <Button size="lg" variant="outline">
                Custom Cake Inquiry
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}