// SPDX-License-Identifier: AGPL-3.0-or-later
// Shared constants for the project website. Every link to the live
// demo goes through DEMO_URL so the move to its own subdomain is one
// edit, not a search.

export const SITE_URL = 'https://gratisgis.org';
export const DEMO_URL = 'https://demo.gratisgis.org';
export const REPO_URL = 'https://github.com/palavido-dev/gratis-gis';
export const QGIS_PLUGIN_URL = 'https://github.com/palavido-dev/gratis-gis-qgis';

export const SITE_TITLE = 'GratisGIS: self-hosted, open source GIS portal';
export const SITE_DESCRIPTION =
  'GratisGIS is an open source GIS portal you run on your own server: web maps, data layers, forms, dashboards and an offline field app, with no per-user fees.';

/** A file or folder in the main repository, on the main branch. */
export function repoFile(path: string): string {
  return `${REPO_URL}/blob/main/${path}`;
}

/**
 * Top-level paths that belong to the portal, not this site. The 404
 * page sends a browser on one of these to the same path on the demo,
 * so old links to gratisgis.org/items/... keep working after the
 * portal moves. Keep in sync with apps/portal-web/src/app.
 */
export const PORTAL_PATH_PREFIXES = [
  'admin',
  'api',
  'assistant',
  'credits',
  'feedback',
  'field',
  'forms',
  'groups',
  'help',
  'items',
  'maps',
  'print',
  'print-preview',
  'profile',
  'recently-deleted',
  'settings',
  'signin',
  'whats-new',
];
