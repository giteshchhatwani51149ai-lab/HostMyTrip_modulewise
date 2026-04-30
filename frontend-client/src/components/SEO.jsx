import React from 'react';
import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'HostMyTrip';
const SITE_URL  = import.meta.env.VITE_SITE_URL || 'https://hostmytrip.com';
const DEFAULT_IMAGE = `${SITE_URL}/og-default.jpg`;

function buildJsonLd(schema, schemaData) {
  if (!schema) return null;

  if (schema === 'flight') {
    return {
      '@context': 'https://schema.org',
      '@type': 'FlightReservation',
      reservationStatus: 'https://schema.org/ReservationConfirmed',
      underName: { '@type': 'Person', name: schemaData.guestName || '' },
      reservationFor: {
        '@type': 'Flight',
        flightNumber: schemaData.flightNumber || '',
        departureAirport: { '@type': 'Airport', iataCode: schemaData.origin || '' },
        arrivalAirport:   { '@type': 'Airport', iataCode: schemaData.destination || '' },
        departureTime: schemaData.departureDate || '',
        airline: { '@type': 'Airline', name: schemaData.airline || '', iataCode: schemaData.airlineCode || '' },
      },
    };
  }

  if (schema === 'hotel') {
    return {
      '@context': 'https://schema.org',
      '@type': 'LodgingBusiness',
      name: schemaData.name || '',
      description: schemaData.description || '',
      address: { '@type': 'PostalAddress', addressLocality: schemaData.city || '', addressCountry: 'IN' },
      starRating: schemaData.rating ? { '@type': 'Rating', ratingValue: schemaData.rating } : undefined,
      image: schemaData.image || DEFAULT_IMAGE,
      url: schemaData.url || SITE_URL,
      priceRange: schemaData.priceRange || '₹₹',
    };
  }

  if (schema === 'package') {
    return {
      '@context': 'https://schema.org',
      '@type': 'TouristTrip',
      name: schemaData.name || '',
      description: schemaData.description || '',
      touristType: schemaData.touristType || 'Leisure',
      image: schemaData.image || DEFAULT_IMAGE,
    };
  }

  return null;
}

/**
 * SEO component — injects <title>, meta, OG, Twitter Card, and JSON-LD.
 *
 * Usage:
 *   <SEO title="Hotels in Mumbai" description="..." />
 *   <SEO title="Flight to Dubai" schema="flight" schemaData={{ flightNumber: 'AI101', ... }} />
 */
export default function SEO({
  title,
  description,
  image,
  type = 'website',
  url,
  schema,
  schemaData = {},
  noIndex = false,
}) {
  const fullTitle    = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const metaDesc     = description || 'Book hotels and flights at the best prices. HostMyTrip — your travel companion.';
  const metaImage    = image || DEFAULT_IMAGE;
  const canonical    = url || (typeof window !== 'undefined' ? window.location.href : SITE_URL);
  const jsonLd       = buildJsonLd(schema, schemaData);

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={metaDesc} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
      <link rel="canonical" href={canonical} />

      {/* Open Graph */}
      <meta property="og:type"        content={type} />
      <meta property="og:title"       content={fullTitle} />
      <meta property="og:description" content={metaDesc} />
      <meta property="og:image"       content={metaImage} />
      <meta property="og:url"         content={canonical} />
      <meta property="og:site_name"   content={SITE_NAME} />

      {/* Twitter Card */}
      <meta name="twitter:card"        content="summary_large_image" />
      <meta name="twitter:title"       content={fullTitle} />
      <meta name="twitter:description" content={metaDesc} />
      <meta name="twitter:image"       content={metaImage} />

      {/* JSON-LD structured data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
