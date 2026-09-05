import { useState } from 'react';
import { Sidebar } from './components/Sidebar';
import { ViewContainer } from './components/ViewContainer';
import { Player } from './components/Player';
import { Song, ViewMode, PlayerState } from './types';

// Mock Data representing indexed files on an external USB
const MOCK_SONGS: Song[] = [
  {
    id: '1',
    title: 'Nights',
    artist: 'Frank Ocean',
    album: 'Blonde',
    duration: 307,
    filePath: 'E:/Music/Frank Ocean/Blonde/Nights.mp3',
    driveId: 'USB-8A4F-29C1',
    isAvailable: true,
  },
  {
    id: '2',
    title: 'Get Lucky',
    artist: 'Daft Punk',
    album: 'Random Access Memories',
    duration: 248,
    filePath: 'E:/Music/Daft Punk/Random Access Memories/Get Lucky.mp3',
    driveId: 'USB-8A4F-29C1',
    isAvailable: true,
  },
  {
    id: '3',
    title: 'HUMBLE.',
    artist: 'Kendrick Lamar',
    album: 'DAMN.',
    duration: 177,
    filePath: 'E:/Music/Kendrick Lamar/DAMN/HUMBLE.mp3',
    driveId: 'USB-8A4F-29C1',
    isAvailable: true,
  },
];

export function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('songs');
  const [songs] = useState<Song[]>(MOCK_SONGS);
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    repeatMode: 'off',
    isShuffle: false,
  });

  const handleSelectSong = (song: Song) => {
    setPlayerState((prev) => ({
      ...prev,
      currentSong: song,
      isPlaying: true,
      duration: song.duration,
      currentTime: 0,
    }));
  };

  const handleTogglePlay = () => {
    if (!playerState.currentSong) return;
    setPlayerState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleSeek = (seconds: number) => {
    setPlayerState((prev) => ({ ...prev, currentTime: seconds }));
  };

  const handleVolumeChange = (volume: number) => {
    setPlayerState((prev) => ({ ...prev, volume }));
  };

  return (
    <div className="app-container">
      <Sidebar currentView={currentView} onSelectView={setCurrentView} />
      <ViewContainer
        currentView={currentView}
        songs={songs}
        currentSong={playerState.currentSong}
        onSelectSong={handleSelectSong}
      />
      <Player
        state={playerState}
        onTogglePlay={handleTogglePlay}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
      />
    </div>
  );
}

export default App;