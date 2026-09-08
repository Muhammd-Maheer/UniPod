export type ViewMode = 'songs' | 'albums' | 'artists' | 'playlists';

export type RepeatMode = 'off' | 'all' | 'one';

export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // seconds
  path: string;
  artworkUrl?: string;
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
  songIds: string[];
}