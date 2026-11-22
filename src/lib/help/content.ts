// SPDX-License-Identifier: AGPL-3.0-or-later
// Help docs for gratisgis.org/help, read at build time from help/content
// (copied from the main repository by scripts/sync-help.mjs).
//
// The portal reads the same files with apps/portal-web/src/lib/help/content.ts.
// This is a smaller version of that loader for a static site: same
// slugs, same frontmatter, same sort order and same Markdown renderer,
// so a page reads the same here as in the portal. The category order
// and labels below are copied from that file; keep them in step.
import { load as yamlLoad } from 'js-yaml';
import { renderMarkdown } from './markdown';

export interface HelpFrontmatter {
  id?: string;
  title: string;
  seoTitle?: string;
  summary: string;
  category?: string;
  order?: number;
  prerequisites?: string[];
  complexity?: 'basic' | 'intermediate' | 'advanced';
  related?: Array<string | { id: string; label?: string }>;
  tags?: string[];
}

export interface HelpDoc {
  /** URL slug under /help, without slashes at either end. '' is the landing page. */
  slug: string;
  id: string;
  frontmatter: HelpFrontmatter;
  html: string;
  headings: Array<{ depth: number; text: string; id: string }>;
}

export interface HelpNavNode {
  label: string;
  slug?: string;
  children: HelpNavNode[];
}

const CATEGORY_ORDER: Record<string, number> = {
  'getting-started': 10,
  items: 20,
  'map-editing': 30,
  forms: 40,
  'web-apps': 50,
  'print-templates': 55,
  analysis: 60,
  admin: 70,
  reference: 90,
};

const SUBCATEGORY_ORDER: Record<string, number> = {
  'coming-from-arcgis': 80,
  'maps-and-apps': 10,
  data: 20,
  'field-and-forms': 30,
  organize: 40,
  advanced: 90,
  'select-and-calculate': 10,
  proximity: 20,
  overlay: 30,
  geometry: 40,
  summarize: 50,
  generate: 60,
  widgets: 20,
  symbology: 10,
};

const CATEGORY_LABELS: Record<string, string> = {
  'getting-started': 'Getting started',
  'coming-from-arcgis': 'Coming from ArcGIS',
  'map-editing': 'Map editing',
  'web-apps': 'Web apps',
  'print-templates': 'Print templates',
  'maps-and-apps': 'Maps & apps',
  'field-and-forms': 'Field & forms',
  'select-and-calculate': 'Select & calculate',
};

export function categoryLabel(segment: string): string {
  return (
    CATEGORY_LABELS[segment] ??
    segment
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ')
  );
}

function categoryRank(category: string): number {
  const [top = '', sub] = category.split('/').filter(Boolean);
  const topRank = (CATEGORY_ORDER[top] ?? 1000) * 1000;
  return sub === undefined ? topRank : topRank + (SUBCATEGORY_ORDER[sub] ?? 500);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function extractHeadings(body: string): HelpDoc['headings'] {
  const out: HelpDoc['headings'] = [];
  let inCode = false;
  for (const line of body.split(/\r?\n/)) {
    if (/^```/.test(line.trim())) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const m = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (m) out.push({ depth: m[1]!.length, text: m[2]!, id: slugify(m[2]!) });
  }
  return out;
}

function parseFrontmatter(raw: string): { data: Record<string, unknown>; body: string } {
  const text = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
  const m = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(text);
  if (!m) return { data: {}, body: text };
  const parsed = yamlLoad(m[1]!);
  const data =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  return { data, body: text.slice(m[0].length) };
}

/**
 * Help pages link to each other as /help/<slug>, which is right in the
 * portal. This site serves them at /help/<slug>/, and GitHub Pages
 * answers the form without the slash with a redirect, so add the slash
 * to page links (not to screenshots, which have a file extension).
 */
function withSiteLinks(html: string): string {
  return html.replace(/href="(\/help(?:\/[^"#?.]*)?)(#[^"]*)?"/g, (_m, p: string, hash?: string) => {
    const withSlash = p.endsWith('/') ? p : `${p}/`;
    return `href="${withSlash}${hash ?? ''}"`;
  });
}

// Vite reads every help file at build time. The path is relative to
// the project root.
const files = import.meta.glob<string>('/help/content/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
});

function loadDocs(): HelpDoc[] {
  const docs: HelpDoc[] = [];
  for (const [file, raw] of Object.entries(files)) {
    const rel = file.replace(/^\/help\/content\//, '').replace(/\.md$/, '');
    const { data, body } = parseFrontmatter(raw);
    const fm = data as unknown as HelpFrontmatter;
    // ORGANIZATION.md and other notes have no frontmatter. Not pages.
    if (!fm.title || !fm.summary) continue;
    const segments = rel.split('/');
    if (segments[segments.length - 1] === 'index') segments.pop();
    docs.push({
      slug: segments.join('/'),
      id: fm.id ?? segments[segments.length - 1] ?? 'index',
      frontmatter: fm,
      html: withSiteLinks(renderMarkdown(body)),
      headings: extractHeadings(body),
    });
  }
  docs.sort((a, b) => {
    const ca = a.frontmatter.category ?? '';
    const cb = b.frontmatter.category ?? '';
    const ra = categoryRank(ca);
    const rb = categoryRank(cb);
    if (ra !== rb) return ra - rb;
    if (ca !== cb) return ca.localeCompare(cb);
    const oa = a.frontmatter.order ?? 100;
    const ob = b.frontmatter.order ?? 100;
    if (oa !== ob) return oa - ob;
    return a.frontmatter.title.localeCompare(b.frontmatter.title);
  });
  return docs;
}

export const helpDocs: HelpDoc[] = loadDocs();

/** Find a doc by id or slug, the two ways frontmatter refers to a page. */
export function findDoc(ref: string): HelpDoc | undefined {
  return helpDocs.find((d) => d.id === ref || d.slug === ref);
}

/** Sidebar tree: categories as nodes, docs as leaves, in reading order. */
export function buildNav(): HelpNavNode {
  const root: HelpNavNode = { label: 'root', children: [] };
  for (const d of helpDocs) {
    if (d.slug === '') continue;
    let cursor = root;
    for (const part of (d.frontmatter.category ?? '').split('/').filter(Boolean)) {
      const label = categoryLabel(part);
      let next = cursor.children.find((c) => c.label === label && !c.slug);
      if (!next) {
        next = { label, children: [] };
        cursor.children.push(next);
      }
      cursor = next;
    }
    cursor.children.push({ label: d.frontmatter.title, slug: d.slug, children: [] });
  }
  return root;
}

/** URL of a help page on this site. */
export function helpPath(slug: string): string {
  return slug ? `/help/${slug}/` : '/help/';
}
