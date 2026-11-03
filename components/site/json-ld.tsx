import { jsonLdHtml } from "@/lib/site/seo";

/** Structured data for search engines. Renders nothing a visitor can see. */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHtml(data) }} />;
}
