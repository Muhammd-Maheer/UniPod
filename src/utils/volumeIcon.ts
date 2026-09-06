import { VolumeX, Volume, Volume1, Volume2 } from 'lucide-react';

export const getVolumeIcon = (volume: number) => {
  if (volume === 0) return VolumeX;
  if (volume <= 0.33) return Volume;
  if (volume <= 0.66) return Volume1;
  return Volume2;
};