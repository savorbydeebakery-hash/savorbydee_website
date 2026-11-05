import Link from "@/components/site/link";
import { notFound } from "next/navigation";
import { MenuClient } from "@/components/menu-client";
import { MenuPageNav } from "@/components/menu/menu-page-nav";
import { JsonLd } from "@/components/site/json-ld";
import { getPreorderCategory } from "@/lib/menu/preorder-listing";
import { breadcrumbSchema, categoryPath, menuSchema, pageMeta } from "@/lib/site/seo";

/**
 * A Preorder Menu category at its own address, e.g. /menu/cheesecakes.
 *
 * /menu lists everything on one long page, which gives Google one page to
 * rank for every kind of cake. A page per category can be found by someone
 * searching for exactly that in Shillong, with the real items and prices on it.
 */
export async function categoryMetadata(slug: string) {
  const found = await getPreorderCategory(slug);
  if (!found) return { title: { absolute: "Menu | Savor by Dee" }, robots: { index: false } };
  const { name } = found.category;
  return pageMeta({
    title: `${name} in Shillong`,
    description: `Order ${name.toLowerCase()} from Savor by Dee in Shillong, made fresh to order for pickup or delivery. See every item and price.`,
    path: categoryPath(name),
  });
}

export async function CategoryPage({ slug }: { slug: string }) {
  const found = await getPreorderCategory(slug);
  if (!found) notFound();
  const { category, items, settings } = found;
  const path = categoryPath(category.name);

  return (
    <div>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Preorder Menu", path: "/menu" },
          { name: category.name, path },
        ])}
      />
      <JsonLd data={menuSchema(category.name, path, [category], items)} />

      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <MenuPageNav />
        <nav aria-label="Breadcrumb" className="mt-6 text-sm text-ink-soft">
          <Link href="/menu" className="underline underline-offset-4 hover:text-ink">
            Preorder Menu
          </Link>{" "}
          / {category.name}
        </nav>
        <h1 className="text-h1 mt-3 text-ink">{category.name} in Shillong</h1>
        <p className="mt-3 max-w-2xl text-ink-soft">
          {category.name} from Savor by Dee, made fresh to order for pickup or delivery. Please allow
          at least {settings?.preorder_notice_hours ?? 24} hours. Sundays don&rsquo;t count, so an
          order placed on a Sunday is ready from Tuesday.
        </p>
      </div>

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <MenuClient categories={[category]} menuItems={items} />
      </div>
    </div>
  );
}
