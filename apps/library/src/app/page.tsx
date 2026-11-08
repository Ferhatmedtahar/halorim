import { PRESET_SCENES } from '@glowframe/presets';
import GalleryView from '@/components/GalleryView';

export default function HomePage() {
  const presets = Object.values(PRESET_SCENES);

  return <GalleryView presets={presets} />;
}
