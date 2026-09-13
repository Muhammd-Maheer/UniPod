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
