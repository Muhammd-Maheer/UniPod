CREATE TABLE devices (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    identifier TEXT NOT NULL UNIQUE
);

CREATE TABLE artists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE songs (
    id TEXT PRIMARY KEY,
    device_id TEXT NOT NULL,
    relative_path TEXT NOT NULL,
    title TEXT NOT NULL,
    artist_id TEXT,
    album TEXT,
    duration INTEGER NOT NULL DEFAULT 0,
    artwork_url TEXT,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    is_missing INTEGER NOT NULL DEFAULT 0,

    FOREIGN KEY (device_id) REFERENCES devices(id),
    FOREIGN KEY (artist_id) REFERENCES artists(id),
    UNIQUE(device_id, relative_path)
);

CREATE TABLE playlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE TABLE playlist_songs (
    playlist_id TEXT NOT NULL,
    song_id TEXT NOT NULL,
    position INTEGER NOT NULL,

    PRIMARY KEY (playlist_id, song_id),
    FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
    FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
);

CREATE INDEX idx_songs_device ON songs(device_id);
CREATE INDEX idx_songs_artist ON songs(artist_id);
CREATE INDEX idx_songs_favorite ON songs(is_favorite);
CREATE INDEX idx_playlist_songs_playlist ON playlist_songs(playlist_id);
