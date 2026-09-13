import { getDatabase } from './db';
import { Song } from '../types';

type SongRow = Omit<Song, 'deviceId' | 'relativePath' | 'artistId' | 'artworkUrl' | 'isFavorite' | 'isMissing' | 'sourcePath'> & {
  device_id: string;
  relative_path: string;
  artist_id: string | null;
  artwork_url: string | null;
  is_favorite: number;
  is_missing: number;
};

export async function getAllSongs(): Promise<Song[]> {
  const db = await getDatabase();
  const rows = await db.select<SongRow[]>('SELECT * FROM songs ORDER BY title');

  return rows.map((row) => ({
    id: row.id,
    deviceId: row.device_id,
    relativePath: row.relative_path,
    title: row.title,
    artistId: row.artist_id ?? '',
    duration: row.duration,
    artworkUrl: row.artwork_url ?? undefined,
    isFavorite: row.is_favorite === 1,
    isMissing: row.is_missing === 1,
  }));
}
