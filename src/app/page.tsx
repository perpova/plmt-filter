import type { Metadata } from 'next';
import HomeInventory from '@/components/HomeInventory';
import HeroSection from '@/components/HeroSection';
import TrustBadges from '@/components/TrustBadges';
import { getHomepageSeoMetadata, getVehicles } from '@/lib/wordpress';
import NewHeroSection from '@/components/NewHeroSection';

const homepageTitle = 'Cars for Sale in Matara, Sri Lanka | Priyankara Car Sale';
const defaultHomepageDescription =
  'Explore new and used cars for sale in Matara, Sri Lanka. Browse trusted Japanese vehicles at Priyankara Car Sale and contact our showroom for details.';

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getHomepageSeoMetadata();

  return {
    title: homepageTitle,
    description: seo?.description || defaultHomepageDescription,
    alternates: {
      canonical: '/',
    },
  };
}

export default async function HomePage() {
  const [cars, seo] = await Promise.all([getVehicles(), getHomepageSeoMetadata()]);
  const featuredCar = cars.find((car) => car.featured);
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': 'https://priyankaracarsale.lk/#webpage',
    url: 'https://priyankaracarsale.lk/',
    name: homepageTitle,
    description: seo?.description || defaultHomepageDescription,
    inLanguage: 'en-LK',
    mainEntity: { '@id': 'https://priyankaracarsale.lk/#organization' },
  };

  return (
    <div className="">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, '\\u003c'),
        }}
      />
      {/*<HeroSection/>*/}
      {featuredCar ? <NewHeroSection car={featuredCar} cars={cars}/> : <HeroSection />}
      <TrustBadges />
      <HomeInventory cars={cars} />
    </div>
  );
}
