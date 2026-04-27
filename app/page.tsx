import Header from '@/components/Header'
import HeroSection from '@/components/home/HeroSection'
import VehicleCategories from '@/components/home/VehicleCategories'
import PopularBrands from '@/components/home/PopularBrands'
import AdBanner from '@/components/home/AdBanner'
import EstimationBanner from '@/components/home/EstimationBanner'
import FeaturedCars from '@/components/home/FeaturedCars'
import PickUpCategory from '@/components/home/PickUpCategory'

export default function Home() {
  return (
    <main className="bg-white">
      <Header />
      <HeroSection />
      <VehicleCategories />
      <PopularBrands />
      <AdBanner
        href="https://web.facebook.com/profile.php?id=61551596171515"
        label="Publicité Redbull Bandeau"
        mobileImageUrl="https://wtkedamrmtvdoippqanc.supabase.co/storage/v1/object/public/partner-ads/1777294204875-j6o29v.png"
        desktopImageUrl="https://wtkedamrmtvdoippqanc.supabase.co/storage/v1/object/public/partner-ads/1777291786751-861ivn.png"
        altText="Redbull Bandeau"
      />
      <EstimationBanner />
      <FeaturedCars />
      <PickUpCategory />
    </main>
  )
}
