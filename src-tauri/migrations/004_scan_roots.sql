CREATE TABLE scan_roots (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    root_path TEXT NOT NULL,
    relative_path TEXT NOT NULL,
    FOREIGN KEY (device_id) REFERENCES devices(id) ON DELETE CASCADE,
    UNIQUE(device_id, root_path)
);

CREATE INDEX idx_scan_roots_device ON scan_roots(device_id);