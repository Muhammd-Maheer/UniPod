import { getDatabase } from './db';
import { Artist } from '../types';

export async function getAllArtists(): Promise<Artist[]> {
  const db = await getDatabase();
  return db.select<Artist[]>('SELECT id, name FROM artists ORDER BY name');
}

export async function getArtist(artistId: string): Promise<Artist | null> {
  const db = await getDatabase();
  const artists = await db.select<Artist[]>(
    'SELECT id, name FROM artists WHERE id = ?',
    [artistId],
  );
  return artists[0] ?? null;
}

export async function getOrCreateArtist(name: string): Promise<Artist> {
  const normalizedName = name.trim();
  if (!normalizedName) throw new Error('Artist name cannot be empty');

  const db = await getDatabase();
  const existing = await db.select<Artist[]>(
    'SELECT id, name FROM artists WHERE name = ?',
    [normalizedName],
  );

  if (existing[0]) return existing[0];

  await db.execute(
    'INSERT OR IGNORE INTO artists (id, name) VALUES (?, ?)',
    [crypto.randomUUID(), normalizedName],
  );

  const created = await db.select<Artist[]>(
    'SELECT id, name FROM artists WHERE name = ?',
    [normalizedName],
  );
  if (!created[0]) throw new Error('Artist could not be created');
  return created[0];
}

