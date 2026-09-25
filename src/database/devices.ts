import { getDatabase } from './db';

export interface Device {
  id: string;
  name: string;
  identifier: string;
  mountPath: string | null;
}

export interface ScanRoot {
  id: string;
  deviceId: string;
  rootPath: string;
  relativePath: string;
}

export async function getAllDevices(): Promise<Device[]> {
  const db = await getDatabase();
  return db.select<Device[]>('SELECT id, name, identifier, mount_path AS mountPath FROM devices ORDER BY name');
}

export async function getOrCreateDevice(name: string, identifier: string, mountPath: string): Promise<Device> {
  const db = await getDatabase();
  const existing = await db.select<Device[]>(
    'SELECT id, name, identifier, mount_path AS mountPath FROM devices WHERE identifier = ?',
    [identifier],
  );
  if (existing[0]) {
    await db.execute('UPDATE devices SET mount_path = ?, name = ? WHERE id = ?', [mountPath, name, existing[0].id]);
    return { ...existing[0], mountPath, name };
  }

  const device = { id: crypto.randomUUID(), name, identifier, mountPath };
  await db.execute(
    'INSERT OR IGNORE INTO devices (id, name, identifier, mount_path) VALUES (?, ?, ?, ?)',
    [device.id, device.name, device.identifier, device.mountPath],
  );
  const created = await db.select<Device[]>(
    'SELECT id, name, identifier, mount_path AS mountPath FROM devices WHERE identifier = ?',
    [identifier],
  );
  if (!created[0]) throw new Error('Device could not be created');
  return created[0];
}

export async function updateDeviceIdentity(
  deviceId: string,
  identifier: string,
  mountPath: string,
): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    'UPDATE devices SET identifier = ?, mount_path = ? WHERE id = ?',
    [identifier, mountPath, deviceId],
  );
}

export async function getScanRoots(): Promise<ScanRoot[]> {
  const db = await getDatabase();
  return db.select<ScanRoot[]>(
    'SELECT id, device_id AS deviceId, root_path AS rootPath, relative_path AS relativePath FROM scan_roots ORDER BY root_path',
  );
}

export async function saveScanRoot(
  deviceId: string,
  rootPath: string,
  relativePath: string,
): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO scan_roots (id, device_id, root_path, relative_path)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(device_id, root_path) DO UPDATE SET relative_path = excluded.relative_path`,
    [crypto.randomUUID(), deviceId, rootPath, relativePath],
  );
}
