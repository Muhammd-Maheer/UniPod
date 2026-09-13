import { getDatabase } from './db';
import { Song } from '../types';

type SongRow = Omit<Song, 'deviceId' | 'relativePath' | 'artistId' | 'artistName' | 'artworkUrl' | 'isFavorite' | 'isMissing' | 'sourcePath'> & {
  device_id: string;
  relative_path: string;
  artist_id: string | null;
  artist_name: string | null;
  artwork_url: string | null;
  is_favorite: number;
  is_missing: number;
};

export async function getAllSongs(): Promise<Song[]> {
  const db = await getDatabase();
  const rows = await db.select<SongRow[]>(
    `SELECT songs.*, artists.name AS artist_name
     FROM songs LEFT JOIN artists ON artists.id = songs.artist_id
     ORDER BY songs.sort_position IS NULL, songs.sort_position, songs.title`,
  );

  return mapSongRows(rows);
}

export async function getFavoriteSongs(): Promise<Song[]> {
  const db = await getDatabase();
  const rows = await db.select<SongRow[]>('SELECT * FROM songs WHERE is_favorite = 1');

  return mapSongRows(rows);
}

function mapSongRows(rows: SongRow[]): Song[] {
  return rows.map((row) => ({
    id: row.id,
    deviceId: row.device_id,
    relativePath: row.relative_path,
    title: row.title,
    artistId: row.artist_id ?? '',
    artistName: row.artist_name ?? undefined,
    duration: row.duration,
    artworkUrl: row.artwork_url ?? undefined,
    isFavorite: row.is_favorite === 1,
    isMissing: row.is_missing === 1,
  }));
}

export async function setSongFavorite(songId: string, isFavorite: boolean): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    'UPDATE songs SET is_favorite = ? WHERE id = ?',
    [isFavorite ? 1 : 0, songId],
  );
}

export async function setSongOrder(songIds: string[]): Promise<void> {
  const db = await getDatabase();
  await Promise.all(songIds.map((songId, position) =>
    db.execute('UPDATE songs SET sort_position = ? WHERE id = ?', [position, songId]),
  ));
}

export async function saveSong(song: Song): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO songs
      (id, device_id, relative_path, title, artist_id, duration, artwork_url, is_favorite, is_missing)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(device_id, relative_path) DO UPDATE SET
       title = excluded.title,
       artist_id = excluded.artist_id,
       duration = excluded.duration,
       artwork_url = excluded.artwork_url,
       is_favorite = excluded.is_favorite,
       is_missing = excluded.is_missing`,
    [
      song.id,
      song.deviceId,
      song.relativePath,
      song.title,
      song.artistId || null,
      Math.round(song.duration),
      song.artworkUrl ?? null,
      song.isFavorite ? 1 : 0,
      song.isMissing ? 1 : 0,
    ],
  );
}

export async function deleteSong(songId: string): Promise<void> {
  const db = await getDatabase();
  await db.execute('DELETE FROM playlist_songs WHERE song_id = ?', [songId]);
  await db.execute('DELETE FROM songs WHERE id = ?', [songId]);
}

export async function migrateSongPaths(deviceId: string, prefix: string): Promise<void> {
  if (!prefix) return;
  const db = await getDatabase();
  await db.execute(
    "UPDATE songs SET relative_path = ? || '/' || relative_path WHERE device_id = ? AND relative_path NOT LIKE ?",
    [prefix, deviceId, `${prefix}/%`],
  );
}
