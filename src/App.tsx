import React, { useEffect, useRef, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc } from '@tauri-apps/api/core';
import { TitleBar } from './components/TitleBar';
import { Sidebar } from './components/Sidebar';
import { ViewContainer } from './components/ViewContainer';
import { Player } from './components/Player';
import { PlayerState, Song, ViewMode, Playlist } from './types';
import { NowPlaying } from './components/NowPlaying';
import { parseFilenameForMetadata, extractArtistName } from './utils/parseFilename';
import { readDir, watch } from '@tauri-apps/plugin-fs';
import './App.css';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('songs');
  const [songs, setSongs] = useState<Song[]>([]);
  const [playOrder, setPlayOrder] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const watchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const songsRef = useRef<Song[]>([]);
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
    const song = list.find((s) => s.id === id) || songs.find((s) => s.id === id);
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
        if (direction === -1 && audioRef.current) {
          audioRef.current.currentTime = 0;
        }
        return;
      }
      nextIdx = direction === 1 ? 0 : playOrder.length - 1;
    }
    playSongById(playOrder[nextIdx]);
  };

  const buildSongFromPath = (path: string): Song => {
    const fileName = path.split(/[/\\]/).pop() || 'Unknown';
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    const parsed = parseFilenameForMetadata(nameWithoutExt);
    return {
      id: crypto.randomUUID(),
      title: nameWithoutExt,
      artist: parsed.artist || 'Unknown Artist',
      duration: 0,
      path,
      isFavorite: false,
    };
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
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
      const parsed = parseFilenameForMetadata(nameWithoutExt);
      return {
        id: crypto.randomUUID(),
        title: fileName.replace(/\.[^/.]+$/, ''),
        artist: parsed.artist || 'Unknown Artist',
        duration: 0,
        path,
        isFavorite: false,
      };
    });

    setSongs((prev) => [...prev, ...newSongs]);
    setPlayOrder((prev) => [...prev, ...newSongs.map((s) => s.id)]);
  };

  const handleSelectSong = (song: Song, contextSongs?: Song[]) => {
    const list = contextSongs && contextSongs.length > 0 ? contextSongs : songs;
    let newPlayOrder = list.map((s) => s.id);

    if (playerState.shuffle) {
      const remaining = newPlayOrder.filter((id) => id !== song.id);
      for (let i = remaining.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
      }
      newPlayOrder = [song.id, ...remaining];
    }

    setPlayOrder(newPlayOrder);

    if (playerState.currentSong?.id === song.id) {
      setShowNowPlaying((prev) => !prev);
    } else {
      playSongById(song.id, list);
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
    if (playOrder.length === 0) return;

    const turningOn = !playerState.shuffle;

    if (turningOn) {
      let shuffled = [...playOrder];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      if (playerState.currentSong) {
        shuffled = shuffled.filter((id) => id !== playerState.currentSong!.id);
        shuffled.unshift(playerState.currentSong.id);
      }
      setPlayOrder(shuffled);
      setPlayerState((prev) => ({ ...prev, shuffle: true }));
    } else {
      const playOrderSet = new Set(playOrder);
      const restored = songs.filter((s) => playOrderSet.has(s.id)).map((s) => s.id);
      setPlayOrder(restored.length > 0 ? restored : songs.map((s) => s.id));
      setPlayerState((prev) => ({ ...prev, shuffle: false }));
    }
  };

  const handleToggleRepeat = () => {
    setPlayerState((prev) => ({
      ...prev,
      repeatMode: prev.repeatMode === 'off' ? 'all' : prev.repeatMode === 'all' ? 'one' : 'off',
    }));
  };

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

  const handleSwapArtistTitle = (songId: string) => {
    setSongs((prev) =>
      prev.map((s) => {
        if (s.id !== songId) return s;

        const extractedArtist = extractArtistName(s.title);
        const originalParsedArtist = parseFilenameForMetadata(s.title).artist || 'Unknown Artist';

        const newArtist = s.artist === extractedArtist ? originalParsedArtist : extractedArtist;

        return { ...s, artist: newArtist };
      })
    );

    setPlayerState((prev) => {
      if (prev.currentSong?.id !== songId) return prev;
      const cs = prev.currentSong;

      const extractedArtist = extractArtistName(cs.title);
      const originalParsedArtist = parseFilenameForMetadata(cs.title).artist || 'Unknown Artist';
      const newArtist = cs.artist === extractedArtist ? originalParsedArtist : extractedArtist;

      return { ...prev, currentSong: { ...cs, artist: newArtist } };
    });
  };

  const handleEditArtist = (songId: string, newArtist: string) => {
    const trimmed = newArtist.trim();
    if (!trimmed) return;

    setSongs((prev) => prev.map((s) => (s.id === songId ? { ...s, artist: trimmed } : s)));
    setPlayerState((prev) =>
      prev.currentSong?.id === songId
        ? { ...prev, currentSong: { ...prev.currentSong, artist: trimmed } }
        : prev
    );
  };

  const handleCreatePlaylist = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newPlaylist: Playlist = { id: crypto.randomUUID(), name: trimmed, songIds: [] };
    setPlaylists((prev) => [...prev, newPlaylist]);
  };

  const handleRenamePlaylist = (playlistId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? { ...p, name: trimmed } : p)));
  };

  const handleAddSongsToPlaylist = (playlistId: string, songIds: string[]) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id !== playlistId) return p;
        const merged = Array.from(new Set([...p.songIds, ...songIds]));
        return { ...p, songIds: merged };
      })
    );
  };

  const handleRemoveSongFromPlaylist = (playlistId: string, songId: string) => {
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === playlistId ? { ...p, songIds: p.songIds.filter((id) => id !== songId) } : p
      )
    );
  };

  const handleDeletePlaylist = (playlistId: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
  };

  const intentionalStopRef = useRef(false);

  const removeSongsByIds = (ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);

    setSongs((prev) => prev.filter((s) => !idSet.has(s.id)));
    setPlayOrder((prev) => prev.filter((id) => !idSet.has(id)));

    setPlayerState((prev) => {
      if (prev.currentSong && idSet.has(prev.currentSong.id)) {
        if (audioRef.current) {
          intentionalStopRef.current = true;
          audioRef.current.pause();
          audioRef.current.src = '';
        }
        return { ...prev, currentSong: null, isPlaying: false, currentTime: 0 };
      }
      return prev;
    });
  };

  const handleRemoveSong = (songId: string) => removeSongsByIds([songId]);

  const handleAudioError = () => {
    if (intentionalStopRef.current) {
      intentionalStopRef.current = false;
      return;
    }
    if (playerState.currentSong) {
      removeSongsByIds([playerState.currentSong.id]);
    }
  };

  const scanDirectory = async (dirPath: string): Promise<string[]> => {
    let audioPaths: string[] = [];
    const validExtensions = ['.mp3', '.wav', '.flac', '.m4a', '.ogg'];

    try {
      const entries = await readDir(dirPath);
      for (const entry of entries) {
        const separator = dirPath.includes('\\') ? '\\' : '/';
        const fullPath = `${dirPath.replace(/[/\\]+$/, '')}${separator}${entry.name}`;

        if (entry.isDirectory) {
          const subFolderFiles = await scanDirectory(fullPath);
          audioPaths = audioPaths.concat(subFolderFiles);
        } else if (entry.isFile) {
          const ext = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase();
          if (validExtensions.includes(ext)) {
            audioPaths.push(fullPath);
          }
        }
      }
    } catch (err) {
      console.error('Failed to read directory:', dirPath, err);
    }

    return audioPaths;
  };

  const syncFolder = async (folderPath: string) => {
    const foundPaths = await scanDirectory(folderPath);
    const existingPaths = new Set(songsRef.current.map((s) => s.path));
    const newSongs = foundPaths.filter((p) => !existingPaths.has(p)).map(buildSongFromPath);

    if (newSongs.length > 0) {
      setSongs((prev) => [...prev, ...newSongs]);
      setPlayOrder((prev) => [...prev, ...newSongs.map((s) => s.id)]);
    }
  };

  const startWatchingFolder = async (folderPath: string) => {
    try {
      await watch(
        folderPath,
        () => {
          if (watchDebounceRef.current) clearTimeout(watchDebounceRef.current);
          watchDebounceRef.current = setTimeout(() => syncFolder(folderPath), 1000);
        },
        { recursive: true }
      );
    } catch (err) {
      console.error('Could not watch folder:', folderPath, err);
    }
  };

  const handleScanFolder = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    if (!selected) return;

    const folderPath = Array.isArray(selected) ? selected[0] : selected;
    const foundAudioPaths = await scanDirectory(folderPath);

    if (foundAudioPaths.length === 0) return;

    const newSongs: Song[] = foundAudioPaths.map((path) => {
      const fileName = path.split(/[/\\]/).pop() || 'Unknown';
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
      const parsed = parseFilenameForMetadata(nameWithoutExt);
      return {
        id: crypto.randomUUID(),
        title: nameWithoutExt,
        artist: parsed.artist || 'Unknown Artist',
        duration: 0,
        path,
        isFavorite: false,
      };
    });

    setSongs((prev) => [...prev, ...newSongs]);
    setPlayOrder((prev) => [...prev, ...newSongs.map((s) => s.id)]);
    startWatchingFolder(folderPath);
  };

  const handleToggleFavorite = (songId: string) => {
    setSongs(prevSongs =>
      prevSongs.map(song =>
        song.id === songId ? { ...song, isFavorite: !song.isFavorite } : song
      )
    );
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

  const seekRelative = (deltaSeconds: number) => {
    const audio = audioRef.current;
    if (!audio || !playerState.currentSong) return;
    const max = playerState.duration || audio.duration || 0;
    const newTime = Math.min(Math.max(audio.currentTime + deltaSeconds, 0), max);
    audio.currentTime = newTime;
    setPlayerState((prev) => ({ ...prev, currentTime: newTime }));
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
    songsRef.current = songs;
  }, [songs]);

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
  }, [playerState.shuffle, playerState.repeatMode, playerState.currentSong, songs, playOrder]);

  useEffect(() => {
    const hasSong = !!playerState.currentSong;
    if (hasSong && !prevHadSongRef.current) {
      setShowNowPlaying(true);
    }
    prevHadSongRef.current = hasSong;
  }, [playerState.currentSong]);

  return (
    <div className="app">
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleAudioError}
      />
      <TitleBar isConnected={false} driveName="My Music" />
      <div className="app-body">
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          onAddSongs={handleAddSongs}
          onScanFolder={handleScanFolder}
        />
        <ViewContainer
          currentView={currentView}
          songs={songs}
          currentSong={playerState.currentSong}
          onSelectSong={handleSelectSong}
          onSwapArtistTitle={handleSwapArtistTitle}
          onEditArtist={handleEditArtist}
          onRemoveSong={handleRemoveSong}
          playlists={playlists}
          onCreatePlaylist={handleCreatePlaylist}
          onRenamePlaylist={handleRenamePlaylist}
          onAddSongsToPlaylist={handleAddSongsToPlaylist}
          onRemoveSongFromPlaylist={handleRemoveSongFromPlaylist}
          onDeletePlaylist={handleDeletePlaylist}
          onToggleFavorite={handleToggleFavorite}
        />
        {showNowPlaying && playerState.currentSong && (
          <NowPlaying
            state={playerState}
            playlistName={
              playerState.currentSong
                ? playlists
                    .filter((p) => p.songIds.includes(playerState.currentSong!.id))
                    .map((p) => p.name)
                    .join(', ') || 'No Playlist'
                : 'No Playlist'
            }
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