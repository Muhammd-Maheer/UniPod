import React, { useEffect, useRef, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { ViewContainer } from './components/ViewContainer';
import { Player } from './components/Player';
import { PlayerState, Song, ViewMode } from './types';
import { NowPlaying } from './components/NowPlaying';
import './App.css';


const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('songs');
  const [songs, setSongs] = useState<Song[]>([]);
  const [playOrder, setPlayOrder] = useState<string[]>([]);
  const audioRef = useRef<HTMLAudioElement>(null);
  const rightPressRef = useRef(0);
  const leftPressRef = useRef(0);
  const rightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const leftTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastVolumeRef = useRef(0.8);
  const [playerState, setPlayerState] = useState<PlayerState>({
    currentSong: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.8,
    shuffle: false,
    repeatMode: 'off',
  });
  const [showNowPlaying, setShowNowPlaying] = useState(false);
  const prevHadSongRef = useRef(false);

  const playSongById = (id: string, list: Song[] = songs) => {
    const song = list.find((s) => s.id === id);
    const audio = audioRef.current;
    if (!song || !audio) return;

    audio.src = convertFileSrc(song.path);
    audio.currentTime = 0;
    audio.play();

    setPlayerState((prev) => ({
      ...prev,
      currentSong: song,
      currentTime: 0,
      isPlaying: true,
    }));
  };

  const advance = (direction: 1 | -1) => {
    if (!playerState.currentSong || playOrder.length === 0) return;
    const idx = playOrder.indexOf(playerState.currentSong.id);
    let nextIdx = idx + direction;

    if (nextIdx < 0 || nextIdx >= playOrder.length) {
      if (playerState.repeatMode === 'off') {
        if (direction === -1) {
          audioRef.current!.currentTime = 0;
        }
        return;
      }
      nextIdx = direction === 1 ? 0 : playOrder.length - 1;
    }
    playSongById(playOrder[nextIdx]);
  };

  const handleAddSongs = async () => {
    const selected = await open({
      multiple: true,
      filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'm4a', 'ogg'] }],
    });
    if (!selected) return;

    const paths = Array.isArray(selected) ? selected : [selected];
    const newSongs: Song[] = paths.map((path) => {
      const fileName = path.split(/[/\\]/).pop() || 'Unknown';
      return {
        id: crypto.randomUUID(),
        title: fileName.replace(/\.[^/.]+$/, ''),
        artist: 'Unknown Artist',
        album: 'Unknown Album',
        duration: 0,
        path,
      };
    });

    setSongs((prev) => [...prev, ...newSongs]);
    setPlayOrder((prev) => [...prev, ...newSongs.map((s) => s.id)]);
  };

  const handleSelectSong = (song: Song) => {
    if (playerState.currentSong?.id === song.id) {
      setShowNowPlaying((prev) => !prev);
    } else {
      playSongById(song.id);
      setShowNowPlaying(true);
    }
  };

  const handleTogglePlay = () => {
    const audio = audioRef.current;
    if (!audio || !playerState.currentSong) return;
    if (playerState.isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setPlayerState((prev) => ({ ...prev, isPlaying: !prev.isPlaying }));
  };

  const handleSeek = (seconds: number) => {
    if (audioRef.current) audioRef.current.currentTime = seconds;
    setPlayerState((prev) => ({ ...prev, currentTime: seconds }));
  };

const handleVolumeChange = (level: number) => {
  if (level > 0) {
    lastVolumeRef.current = level;
  }
  if (audioRef.current) audioRef.current.volume = level;
  setPlayerState((prev) => ({ ...prev, volume: level }));
};

const handleToggleMute = () => {
  if (playerState.volume > 0) {
    lastVolumeRef.current = playerState.volume;
    handleVolumeChange(0);
  } else {
    handleVolumeChange(lastVolumeRef.current || 0.8);
  }
};

  const handleNext = () => advance(1);
  const handlePrevious = () => advance(-1);

  const handleToggleShuffle = () => {
    if (songs.length === 0) return;

    const turningOn = !playerState.shuffle;

    if (turningOn) {
      let shuffled = songs.map((s) => s.id);
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      if (playerState.currentSong) {
        // Keep current song playing, move it to the front of the new queue
        shuffled = shuffled.filter((id) => id !== playerState.currentSong!.id);
        shuffled.unshift(playerState.currentSong.id);
        
        setPlayOrder(shuffled);
        setPlayerState((prev) => ({ ...prev, shuffle: true }));
      } else {
        // If nothing is playing, set the queue and play the first random song
        setPlayOrder(shuffled);
        setPlayerState((prev) => ({ ...prev, shuffle: true }));
        playSongById(shuffled[0]);
      }
    } else {
      // Turn off shuffle, restore the chronological order
      setPlayOrder(songs.map((s) => s.id));
      setPlayerState((prev) => ({ ...prev, shuffle: false }));
    }
  };

  const handleToggleRepeat = () => {
    setPlayerState((prev) => ({
      ...prev,
      repeatMode: prev.repeatMode === 'off' ? 'all' : prev.repeatMode === 'all' ? 'one' : 'off',
    }));
  };

  // Real <audio> element event handlers
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setPlayerState((prev) => ({ ...prev, currentTime: audioRef.current!.currentTime }));
    }
  };

  const handleLoadedMetadata = () => {
    const audio = audioRef.current;
    if (!audio || !playerState.currentSong) return;
    const realDuration = audio.duration;
    setPlayerState((prev) => ({ ...prev, duration: realDuration }));
    setSongs((prev) =>
      prev.map((s) => (s.id === playerState.currentSong!.id ? { ...s, duration: realDuration } : s))
    );
  };

  const handleEnded = () => {
    if (playerState.repeatMode === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }
    advance(1);
  };

  const seekRelative = (deltaSeconds: number) => {
  const audio = audioRef.current;
  if (!audio || !playerState.currentSong) return;
  const max = playerState.duration || audio.duration || 0;
  const newTime = Math.min(Math.max(audio.currentTime + deltaSeconds, 0), max);
  audio.currentTime = newTime;
  setPlayerState((prev) => ({ ...prev, currentTime: newTime }));
};

const skipToNext = () => {
  if (playOrder.length <= 1 || !playerState.currentSong) return;
  const idx = playOrder.indexOf(playerState.currentSong.id);
  const nextIdx = (idx + 1) % playOrder.length;
  playSongById(playOrder[nextIdx]);
};

const skipToPrevious = () => {
  if (playOrder.length <= 1 || !playerState.currentSong) return;
  const idx = playOrder.indexOf(playerState.currentSong.id);
  const prevIdx = (idx - 1 + playOrder.length) % playOrder.length;
  playSongById(playOrder[prevIdx]);
};

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = playerState.volume;
  }, []);

  useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isTyping =
      target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    if (e.code === 'Space' && !isTyping) {
      e.preventDefault();
      handleTogglePlay();
    }
  };

  window.addEventListener('keydown', handleKeyDown);
  return () => window.removeEventListener('keydown', handleKeyDown);
}, [playerState.isPlaying, playerState.currentSong]);

useEffect(() => {
  const handleVolumeKeys = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isTyping =
      target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    if (isTyping) return;

    if (e.code === 'ArrowUp') {
      e.preventDefault();
      handleVolumeChange(Math.min(1, playerState.volume + 0.05));
    } else if (e.code === 'ArrowDown') {
      e.preventDefault();
      handleVolumeChange(Math.max(0, playerState.volume - 0.05));
    } else if (e.code === 'KeyM') {
      e.preventDefault();
      handleToggleMute();
    }
  };

  window.addEventListener('keydown', handleVolumeKeys);
  return () => window.removeEventListener('keydown', handleVolumeKeys);
}, [playerState.volume]);

useEffect(() => {
  const DOUBLE_PRESS_MS = 350;
  const SEEK_STEP = 5;

  const handleArrowSkip = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isTyping =
      target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    if (isTyping) return;

    if (e.code === 'ArrowRight') {
      e.preventDefault();
      const now = Date.now();
      if (now - rightPressRef.current < DOUBLE_PRESS_MS) {
        if (rightTimeoutRef.current) clearTimeout(rightTimeoutRef.current);
        rightPressRef.current = 0;
        skipToNext();
      } else {
        rightPressRef.current = now;
        rightTimeoutRef.current = setTimeout(() => seekRelative(SEEK_STEP), DOUBLE_PRESS_MS);
      }
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      const now = Date.now();
      if (now - leftPressRef.current < DOUBLE_PRESS_MS) {
        if (leftTimeoutRef.current) clearTimeout(leftTimeoutRef.current);
        leftPressRef.current = 0;
        skipToPrevious();
      } else {
        leftPressRef.current = now;
        leftTimeoutRef.current = setTimeout(() => seekRelative(-SEEK_STEP), DOUBLE_PRESS_MS);
      }
    }
  };

  window.addEventListener('keydown', handleArrowSkip);
  return () => {
    window.removeEventListener('keydown', handleArrowSkip);
    if (rightTimeoutRef.current) clearTimeout(rightTimeoutRef.current);
    if (leftTimeoutRef.current) clearTimeout(leftTimeoutRef.current);
  };
}, [playerState.currentSong, playerState.duration, playOrder, songs]);


useEffect(() => {
  const handleRepeatShuffleKeys = (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    const isTyping =
      target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
    if (isTyping) return;

    if (e.code === 'KeyR') {
      e.preventDefault();
      handleToggleRepeat();
    } else if (e.code === 'KeyS') {
      e.preventDefault();
      handleToggleShuffle();
    }
  };

  window.addEventListener('keydown', handleRepeatShuffleKeys);
  return () => window.removeEventListener('keydown', handleRepeatShuffleKeys);
}, [playerState.shuffle, playerState.repeatMode, playerState.currentSong, songs]);


useEffect(() => {
  const hasSong = !!playerState.currentSong;
  if (hasSong && !prevHadSongRef.current) {
    setShowNowPlaying(true);
  }
  prevHadSongRef.current = hasSong;
}, [playerState.currentSong]);


  return (
    <div className="app">
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata} onEnded={handleEnded} />
      <TitleBar isConnected={false} driveName="My Music" />
      <div className="app-body">
        <Sidebar currentView={currentView} onSelectView={setCurrentView} onAddSongs={handleAddSongs} />
        <ViewContainer
          currentView={currentView}
          songs={songs}
          currentSong={playerState.currentSong}
          onSelectSong={handleSelectSong}
        />
        {showNowPlaying && playerState.currentSong && (
          <NowPlaying
            state={playerState}
            playlistName= "No Playlist"
            onClose={() => setShowNowPlaying(false)}
            onTogglePlay={handleTogglePlay}
            onSeek={handleSeek}
            onVolumeChange={handleVolumeChange}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onToggleShuffle={handleToggleShuffle}
            onToggleRepeat={handleToggleRepeat}
            onToggleMute={handleToggleMute}
          />
        )}
      </div>
      {!showNowPlaying && (
        <Player
          state={playerState}
          onTogglePlay={handleTogglePlay}
          onSeek={handleSeek}
          onVolumeChange={handleVolumeChange}
          onPrevious={handlePrevious}
          onNext={handleNext}
          onToggleShuffle={handleToggleShuffle}
          onToggleRepeat={handleToggleRepeat}
          onToggleMute={handleToggleMute}
        />
      )}
    </div>
  );
};

export default App;