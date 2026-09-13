export type ViewMode = 'songs' | 'artists' | 'playlists' | 'favorites';

export type RepeatMode = 'off' | 'all' | 'one';

export interface Song {
  id: string;
  deviceId: string;
  relativePath: string;
  title: string;
  artistId: string;
  artistName?: string;
  duration: number;
  artworkUrl?: string;
  isFavorite: boolean;
  isMissing: boolean;
  sourcePath?: string;
}

export interface Artist {
  id: string;
  name: string;
}

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number; // seconds
  duration: number; // seconds
  volume: number; // 0–1
  shuffle: boolean;
  repeatMode: RepeatMode;
}

export interface Playlist {
  id: string;
  name: string;
}

export interface PlaylistSong {
  playlistId: string;
  songId: string;
  position: number;
}