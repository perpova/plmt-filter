import type { Metadata } from 'next';
import CarsCatalogue from '@/components/CarsCatalogue';
import { DEALERSHIP } from '@/data/dealership';
import { getVehicles } from '@/lib/wordpress';

export const metadata: Metadata = {
  title: `Cars for Sale in Matara, Sri Lanka | ${DEALERSHIP.altName}`,
  description: `Browse available vehicles at ${DEALERSHIP.altName} in Matara, Sri Lanka. Explore current stock, compare specifications, and contact the showroom about a vehicle.`,
  alternates: {
    canonical: '/cars',
  },
  openGraph: {
    title: `Cars for Sale in Matara, Sri Lanka | ${DEALERSHIP.altName}`,
    description: `Browse current vehicle stock at ${DEALERSHIP.altName} in Matara, Sri Lanka.`,
    url: '/cars',
    type: 'website',
    images: [
      {
        url: '/Priyankara-Lanka.jpg',
        width: 1200,
        height: 630,
        alt: `${DEALERSHIP.altName} vehicle showroom in Matara`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `Cars for Sale in Matara, Sri Lanka | ${DEALERSHIP.altName}`,
    description: `Browse current vehicle stock at ${DEALERSHIP.altName} in Matara, Sri Lanka.`,
    images: ['/Priyankara-Lanka.jpg'],
  },
};

export default async function CarsCataloguePage() {
  const cars = await getVehicles();
  const canonicalUrl = 'https://priyankaracarsale.lk/cars';
  const structuredData = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${canonicalUrl}#webpage`,
        url: canonicalUrl,
        name: `Cars for Sale in Matara, Sri Lanka | ${DEALERSHIP.altName}`,
        description: `Browse current vehicle stock at ${DEALERSHIP.altName} in Matara, Sri Lanka.`,
        inLanguage: 'en-LK',
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: 'https://priyankaracarsale.lk/',
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Cars',
            item: canonicalUrl,
          },
        ],
      },
      {
        '@type': 'ItemList',
        itemListElement: cars.map((car, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Vehicle',
            name: car.name,
            url: `${canonicalUrl}/${encodeURIComponent(car.id)}`,
          },
        })),
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      <CarsCatalogue cars={cars} />
    </>
  );
}
