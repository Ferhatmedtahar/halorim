import { PRESET_SCENES } from '@glowframe/presets';
import GalleryView from '@/components/GalleryView';
import Hero from '@/components/Hero';
import DownloadSection from '@/components/DownloadSection';

export default function HomePage() {
  const presets = Object.values(PRESET_SCENES);

  return (
    <>
      <Hero />
      <GalleryView presets={presets} />
      <DownloadSection />
    </>
  );
}
