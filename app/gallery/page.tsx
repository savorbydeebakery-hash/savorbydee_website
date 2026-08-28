import { createClient } from "@/lib/supabase/server";
import { ParallaxGallery } from "@/components/ui/3d-parallax-unfurling-gallery";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const metadata = {
  title: "Gallery - Savor by Dee",
  description:
    "Explore the visual story of Savor by Dee - handcrafted cakes, desserts, and savoury bakes from Shillong.",
};

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const supabase = await createClient();

  const [{ data: galleryPhotos }, { data: menuItems }] = await Promise.all([
    supabase
      .from("gallery_photos")
      .select("id, image_url, caption")
      .eq("is_active", true)
      .order("sort_order"),
    supabase
      .from("menu_items")
      .select("id, name, image_url")
      .eq("is_active", true)
      .order("sort_order"),
  ]);

  const galleryImages = (galleryPhotos ?? []).map((p) => ({
    src: p.image_url,
    alt: p.caption ?? "SAVOR bakery",
    caption: p.caption,
  }));

  const menuImages = (menuItems ?? [])
    .filter((item) => item.image_url)
    .map((item) => ({
      src: item.image_url!,
      alt: item.name,
    }));

  const allImages = [...galleryImages, ...menuImages];

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

      {/* 3D parallax gallery */}
      {allImages.length > 0 ? (
        <ParallaxGallery images={allImages} />
      ) : (
        <section className="mx-auto max-w-6xl px-4 py-20 text-center">
          <p className="text-lg text-ink-soft">
            Gallery photos are being curated. Please check back soon!
          </p>
        </section>
      )}

      {/* Static gallery grid for accessibility and SEO */}
      {allImages.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="mb-6 text-2xl font-semibold text-ink">All Photos</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {allImages.map((img, i) => (
              <div
                key={i}
                className="group relative aspect-square overflow-hidden rounded-2xl bg-pink-soft"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.src}
                  alt={img.alt}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            ))}
          </div>
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