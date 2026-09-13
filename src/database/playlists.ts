import { getDatabase } from './db';
import { Playlist, PlaylistSong } from '../types';

export async function getAllPlaylists(): Promise<Playlist[]> {
  const db = await getDatabase();
  return db.select<Playlist[]>('SELECT id, name FROM playlists ORDER BY name');
}

export async function getPlaylistSongs(playlistId: string): Promise<PlaylistSong[]> {
  const db = await getDatabase();
  return db.select<PlaylistSong[]>(
    `SELECT playlist_id AS playlistId, song_id AS songId, position
     FROM playlist_songs
     WHERE playlist_id = ?
     ORDER BY position`,
    [playlistId],
  );
}
