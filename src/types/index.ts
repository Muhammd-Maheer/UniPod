export interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  filePath: string;
  driveId: string;
  isAvailable: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  songCount: number;
}

export type ViewMode = 'songs' | 'albums' | 'artists' | 'playlists';

export type RepeatMode = 'off' | 'all' | 'one';

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  repeatMode: RepeatMode;
  isShuffle: boolean;
}