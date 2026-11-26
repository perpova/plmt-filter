import HomeInventory from '@/components/HomeInventory';
import HeroSection from '@/components/HeroSection';
import TrustBadges from '@/components/TrustBadges';
import { getVehicles } from '@/lib/wordpress';
import NewHeroSection from '@/components/NewHeroSection';
import type { Metadata } from 'next';


export const metadata: Metadata = {
  title: 'Cars for Sale in Matara, Sri Lanka | Priyankara Car Sale',
  description:
    'Explore new and used cars for sale in Matara, Sri Lanka. Browse trusted Japanese vehicles at Priyankara Car Sale and contact our showroom for details.',
  alternates: {
    canonical: '/',
  },
};


export default async function HomePage() {
  const cars = await getVehicles();
  const featuredCar = cars.find((car) => car.featured);

  return (
    <div className="space-y-12 pb-16">
      {/*<HeroSection/>*/}
      {featuredCar ? <NewHeroSection car={featuredCar} cars={cars}/> : <HeroSection />}
      <TrustBadges />
      <HomeInventory cars={cars} />
    </div>
  );
}
