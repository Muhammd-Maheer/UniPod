import React, { useEffect, useState } from 'react';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { ViewContainer } from './components/ViewContainer';
import { Player } from './components/Player';
import { placeholderSongs } from './data/placeHolderSongs';
import { PlayerState, Song, ViewMode } from './types';
import './App.css';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('songs');
  const songs: Song[] = placeholderSongs;

  const [playOrder, setPlayOrder] = useState<string[]>(songs.map((s) => s.id));

  const [playerState, setPlayerState] = useState<PlayerState>({
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    shuffle: false,
    repeatMode: 'off',
  });

  // Ticks currentTime up once a second while "playing" (no real audio yet).
  useEffect(() => {
    if (!playerState.isPlaying) return;
    const interval = setInterval(() => {
      setPlayerState((prev) =>
        prev.currentTime < prev.duration ? { ...prev, currentTime: prev.currentTime + 1 } : prev
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [playerState.isPlaying]);

  const playSongById = (id: string) => {
    const song = songs.find((s) => s.id === id);
    if (!song) return;
    setPlayerState((prev) => ({
      ...prev,
      currentSong: song,
      duration: song.duration,
      currentTime: 0,
      isPlaying: true,
    }));
  };

  // Handles what happens when a song reaches its end.
  useEffect(() => {
    const { currentSong, currentTime, duration, repeatMode } = playerState;
    if (!currentSong || currentTime < duration) return;

    if (repeatMode === 'one') {
      setPlayerState((prev) => ({ ...prev, currentTime: 0 }));
      return;
    }

    const idx = playOrder.indexOf(currentSong.id);
    let nextIdx = idx + 1;
    if (nextIdx >= playOrder.length) {
      if (repeatMode === 'off') {
        setPlayerState((prev) => ({ ...prev, isPlaying: false }));
        return;
      }
      nextIdx = 0;
    }
    playSongById(playOrder[nextIdx]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerState.currentTime, playerState.duration]);

  const handleSelectSong = (song: Song) => playSongById(song.id);

  const handleTogglePlay = () => {
    if (!playerState.currentSong) return;
    setPlayerState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleSeek = (seconds: number) => {
    setPlayerState((prev) => ({ ...prev, currentTime: seconds }));
  };

  const handleVolumeChange = (level: number) => {
    setPlayerState((prev) => ({ ...prev, volume: level }));
  };

  const handleNext = () => {
    if (!playerState.currentSong || playOrder.length === 0) return;
    const idx = playOrder.indexOf(playerState.currentSong.id);
    let nextIdx = idx + 1;
    if (nextIdx >= playOrder.length) {
      if (playerState.repeatMode === 'off') return;
      nextIdx = 0;
    }
    playSongById(playOrder[nextIdx]);
  };

  const handlePrevious = () => {
    if (!playerState.currentSong || playOrder.length === 0) return;
    const idx = playOrder.indexOf(playerState.currentSong.id);
    let prevIdx = idx - 1;
    if (prevIdx < 0) {
      if (playerState.repeatMode === 'off') {
        setPlayerState((prev) => ({ ...prev, currentTime: 0 }));
        return;
      }
      prevIdx = playOrder.length - 1;
    }
    playSongById(playOrder[prevIdx]);
  };

  const handleToggleShuffle = () => {
    const turningOn = !playerState.shuffle;
    if (turningOn) {
      const shuffled = [...songs.map((s) => s.id)];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
      setPlayOrder(shuffled);
    } else {
      setPlayOrder(songs.map((s) => s.id));
    }
    setPlayerState((prev) => ({ ...prev, shuffle: turningOn }));
  };

  const handleToggleRepeat = () => {
    setPlayerState((prev) => ({
      ...prev,
      repeatMode: prev.repeatMode === 'off' ? 'all' : prev.repeatMode === 'all' ? 'one' : 'off',
    }));
  };

  return (
    <div className="app">
      <TitleBar isConnected={false} driveName="My Music" />
      <div className="app-body">
        <Sidebar currentView={currentView} onSelectView={setCurrentView} />
        <ViewContainer
          currentView={currentView}
          songs={songs}
          currentSong={playerState.currentSong}
          onSelectSong={handleSelectSong}
        />
      </div>
      <Player
        state={playerState}
        onTogglePlay={handleTogglePlay}
        onSeek={handleSeek}
        onVolumeChange={handleVolumeChange}
        onPrevious={handlePrevious}
        onNext={handleNext}
        onToggleShuffle={handleToggleShuffle}
        onToggleRepeat={handleToggleRepeat}
      />
    </div>
  );
};

export default App;