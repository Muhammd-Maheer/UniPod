import { getDatabase } from './db';

export interface Device {
  id: string;
  name: string;
  identifier: string;
}

export async function getAllDevices(): Promise<Device[]> {
  const db = await getDatabase();
  return db.select<Device[]>('SELECT id, name, identifier FROM devices ORDER BY name');
}

export async function getOrCreateDevice(name: string, identifier: string): Promise<Device> {
  const db = await getDatabase();
  const existing = await db.select<Device[]>(
    'SELECT id, name, identifier FROM devices WHERE identifier = ?',
    [identifier],
  );
  if (existing[0]) return existing[0];

  const device = { id: crypto.randomUUID(), name, identifier };
  await db.execute(
    'INSERT OR IGNORE INTO devices (id, name, identifier) VALUES (?, ?, ?)',
    [device.id, device.name, device.identifier],
  );
  const created = await db.select<Device[]>(
    'SELECT id, name, identifier FROM devices WHERE identifier = ?',
    [identifier],
  );
  if (!created[0]) throw new Error('Device could not be created');
  return created[0];
}
