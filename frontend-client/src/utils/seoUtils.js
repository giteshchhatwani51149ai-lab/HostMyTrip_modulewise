const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://hostmytrip.com';
const DEFAULT_IMAGE = `${SITE_URL}/og-default.jpg`;

/**
 * generateMetadata — build a metadata object to pass as props to <SEO />.
 */
export function generateMetadata({
  title,
  description = 'Book hotels and flights at the best prices. HostMyTrip — your travel companion.',
  image = DEFAULT_IMAGE,
  type = 'website',
  url,
  schema,
  schemaData = {},
} = {}) {
  return { title, description, image, type, url, schema, schemaData };
}
