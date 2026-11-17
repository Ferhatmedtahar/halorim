import { PRESET_SCENES } from '@glowframe/presets';
import GalleryView from '@/components/GalleryView';
import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import Features from '@/components/Features';
import DownloadSection from '@/components/DownloadSection';
import Faq from '@/components/Faq';
import ClosingCta from '@/components/ClosingCta';

export default function HomePage() {
  const presets = Object.values(PRESET_SCENES);

  return (
    <>
      <Hero wallpaperCount={presets.length} />
      <HowItWorks />
      <Features />
      <GalleryView presets={presets} />
      <DownloadSection />
      <Faq />
      <ClosingCta />
    </>
  );
}
