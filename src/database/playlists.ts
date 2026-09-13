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

export async function savePlaylist(playlist: Playlist): Promise<void> {
  const db = await getDatabase();
  const now = Date.now();
  await db.execute(
    `INSERT INTO playlists (id, name, created_at, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at`,
    [playlist.id, playlist.name, now, now],
  );
}

export async function deletePlaylist(playlistId: string): Promise<void> {
  const db = await getDatabase();
  await db.execute('DELETE FROM playlist_songs WHERE playlist_id = ?', [playlistId]);
  await db.execute('DELETE FROM playlists WHERE id = ?', [playlistId]);
}

export async function savePlaylistSong(item: PlaylistSong): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO playlist_songs (playlist_id, song_id, position)
     VALUES (?, ?, ?)
     ON CONFLICT(playlist_id, song_id) DO UPDATE SET position = excluded.position`,
    [item.playlistId, item.songId, item.position],
  );
}

export async function deletePlaylistSong(playlistId: string, songId: string): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    'DELETE FROM playlist_songs WHERE playlist_id = ? AND song_id = ?',
    [playlistId, songId],
  );
}
