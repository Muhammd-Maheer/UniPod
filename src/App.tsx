import React, { useEffect, useRef, useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { TitleBar } from './components/TitleBar';
import { Sidebar, ThemeId } from './components/Sidebar';
import { ViewContainer } from './components/ViewContainer';
import { Player } from './components/Player';
import { PlayerState, Song, ViewMode, Playlist, PlaylistSong } from './types';
import { NowPlaying } from './components/NowPlaying';
import { parseFilenameForMetadata, extractArtistName } from './utils/parseFilename';
import { readDir, watch } from '@tauri-apps/plugin-fs';
import { getAllSongs, saveSong, setSongFavorite, setSongOrder, deleteSongs, migrateSongPaths } from './database/songs';
import { getOrCreateArtist } from './database/artists';
import { getAllDevices, getOrCreateDevice, getScanRoots, saveScanRoot, updateDeviceIdentity } from './database/devices';
import {
  deletePlaylist,
  deletePlaylistSong,
  getAllPlaylists,
  getPlaylistSongs,
  savePlaylist,
  savePlaylistSong,
} from './database/playlists';
import './App.css';

const getBasename = (path: string) => path.split(/[/\\]/).pop() || '';
const getDriveRoot = (path: string) => {
  const match = path.match(/^([A-Za-z]):[\\/]/);
  return match ? `${match[1]}:\\` : path;
};
const getMountRelativePath = (path: string) => path
  .replace(/^[A-Za-z]:[\\/]?/, '')
  .replace(/[\\/]+$/, '')
  .replace(/\\/g, '/');
const joinDrivePath = (root: string, relativePath: string) =>
  relativePath ? `${root.replace(/[\\/]+$/, '')}\\${relativePath.replace(/\//g, '\\')}` : root;
const themeStorageKey = 'unipod-theme';
const themeIds: ThemeId[] = ['classic', 'dark', 'warm', 'retro', 'navy'];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('songs');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState<ThemeId>(() => {
    const savedTheme = localStorage.getItem(themeStorageKey);
    return savedTheme && themeIds.includes(savedTheme as ThemeId) ? savedTheme as ThemeId : 'warm';
  });
  const [songs, setSongs] = useState<Song[]>([]);
  const [playOrder, setPlayOrder] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [playlistSongs, setPlaylistSongs] = useState<PlaylistSong[]>([]);
  const [isScanningDevice, setIsScanningDevice] = useState(false);
  const watchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const artworkLoadingRef = useRef(new Set<string>());
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

  useEffect(() => {
    document.title = playerState.currentSong?.title || 'UniPod';
  }, [playerState.currentSong]);

  useEffect(() => {
    localStorage.setItem(themeStorageKey, theme);
  }, [theme]);

  const playSongById = (id: string, list: Song[] = songs) => {
    const song = list.find((s) => s.id === id) || songs.find((s) => s.id === id);
    const audio = audioRef.current;
    if (!song || !audio) return;

    const sourcePath = song.sourcePath ?? song.relativePath;
    audio.src = convertFileSrc(sourcePath);
    audio.currentTime = 0;
    audio.play();

    setPlayerState((prev) => ({
      ...prev,
      currentSong: song,
      currentTime: 0,
      isPlaying: true,
    }));

    if (!song.artworkUrl && !artworkLoadingRef.current.has(sourcePath)) {
      artworkLoadingRef.current.add(sourcePath);
      getArtworkUrl(sourcePath)
        .then((artworkUrl) => {
          if (!artworkUrl) return;
          setSongs((prev) => prev.map((item) => (
            (item.sourcePath ?? item.relativePath) === sourcePath ? { ...item, artworkUrl } : item
          )));
          setPlayerState((prev) => {
            if (!prev.currentSong) return prev;
            return (prev.currentSong.sourcePath ?? prev.currentSong.relativePath) === sourcePath
              ? { ...prev, currentSong: { ...prev.currentSong, artworkUrl } }
              : prev;
          });
        })
        .finally(() => artworkLoadingRef.current.delete(sourcePath));
    }
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

  const getArtworkUrl = async (path: string): Promise<string | undefined> => {
    try {
      return await invoke<string | null>('get_embedded_artwork', { path }) || undefined;
    } catch (error) {
      console.error('Failed to read embedded artwork:', path, error);
      return undefined;
    }
  };

  const buildSongFromPath = async (path: string, deviceId: string, relativePath: string): Promise<Song> => {
    const fileName = getBasename(path) || 'Unknown';
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');
    const parsed = parseFilenameForMetadata(nameWithoutExt);
    const artist = await getOrCreateArtist(parsed.artist || 'Unknown Artist');
    return {
      id: crypto.randomUUID(),
      deviceId,
      relativePath,
      title: nameWithoutExt,
      artistId: artist.id,
      artistName: artist.name,
      duration: 0,
      isFavorite: false,
      isMissing: false,
      sourcePath: path,
    };
  };

  const handleAddSongs = async () => {
    const selected = await open({
      multiple: true,
      filters: [{ name: 'Audio', extensions: ['mp3', 'wav', 'flac', 'm4a', 'ogg'] }],
    });
    if (!selected) return;

    const paths = Array.isArray(selected) ? selected : [selected];
    const device = await getOrCreateDevice('Local files', 'local-files', '');
    const newSongs = await Promise.all(paths.map((path) => buildSongFromPath(path, device.id, path)));

    await Promise.all(newSongs.map(saveSong));

    setSongs((prev) => [...prev, ...newSongs]);
    setPlayOrder((prev) => [...prev, ...newSongs.map((s) => s.id)]);
  };

  const handleSelectSong = (song: Song, contextSongs?: Song[]) => {
    if (song.isMissing) return;
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
    const song = songsRef.current.find((item) => item.id === playerState.currentSong!.id);
    if (song) void saveSong({ ...song, duration: realDuration });
  };

  const handleEnded = () => {
    if (playerState.repeatMode === 'one' && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play();
      return;
    }
    advance(1);
  };

  const handleSwapArtistTitle = async (songId: string) => {
    const currentSong = songsRef.current.find((song) => song.id === songId);
    if (!currentSong) return;
    const extractedArtist = extractArtistName(currentSong.title);
    const originalParsedArtist = parseFilenameForMetadata(currentSong.title).artist || 'Unknown Artist';
    const newArtist = (currentSong.artistName ?? '') === extractedArtist ? originalParsedArtist : extractedArtist;
    const artist = await getOrCreateArtist(newArtist);
    const updatedSong = { ...currentSong, artistId: artist.id, artistName: artist.name };
    await saveSong(updatedSong);
    songsRef.current = songsRef.current.map((song) => song.id === songId ? updatedSong : song);
    setSongs((prev) => prev.map((song) => song.id === songId ? updatedSong : song));
    setPlayerState((prev) => prev.currentSong?.id === songId
      ? { ...prev, currentSong: updatedSong }
      : prev);
  };

  const handleEditArtist = async (songId: string, newArtist: string) => {
    const trimmed = newArtist.trim();
    if (!trimmed) return;

    const artist = await getOrCreateArtist(trimmed);
    const currentSong = songsRef.current.find((song) => song.id === songId);
    if (!currentSong) return;
    const updatedSong = { ...currentSong, artistId: artist.id, artistName: artist.name };
    await saveSong(updatedSong);

    songsRef.current = songsRef.current.map((song) => song.id === songId ? updatedSong : song);
    setSongs((prev) => prev.map((s) => (s.id === songId ? updatedSong : s)));
    setPlayerState((prev) =>
      prev.currentSong?.id === songId
        ? { ...prev, currentSong: { ...prev.currentSong, artistId: artist.id, artistName: artist.name } }
        : prev
    );
  };

  const handleCreatePlaylist = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newPlaylist: Playlist = { id: crypto.randomUUID(), name: trimmed };
    void savePlaylist(newPlaylist);
    setPlaylists((prev) => [...prev, newPlaylist]);
  };

  const handleRenamePlaylist = (playlistId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    void savePlaylist({ id: playlistId, name: trimmed });
    setPlaylists((prev) => prev.map((p) => (p.id === playlistId ? { ...p, name: trimmed } : p)));
  };

  const handleAddSongsToPlaylist = (playlistId: string, songIds: string[]) => {
    setPlaylistSongs((prev) => {
      const existing = prev.filter((item) => item.playlistId === playlistId);
      const existingIds = new Set(existing.map((item) => item.songId));
      const additions = songIds
        .filter((songId) => !existingIds.has(songId))
        .map((songId, index) => ({ playlistId, songId, position: existing.length + index }));
      void Promise.all(additions.map(savePlaylistSong));
      return [...prev, ...additions];
    });
  };

  const handleRemoveSongFromPlaylist = (playlistId: string, songId: string) => {
    void deletePlaylistSong(playlistId, songId);
    let position = 0;
    const remainingSongs = playlistSongs
      .filter((item) => !(item.playlistId === playlistId && item.songId === songId))
      .map((item) => item.playlistId === playlistId ? { ...item, position: position++ } : item);
    void Promise.all(
      remainingSongs
        .filter((item) => item.playlistId === playlistId)
        .map(savePlaylistSong),
    );
    setPlaylistSongs(remainingSongs);
  };

  const handleReorderSongs = (orderedVisibleIds: string[], playlistId?: string) => {
    if (playlistId) {
      const playlist = playlists.find((candidate) => candidate.id === playlistId);
      const currentPlaylistSongIds = playlistSongs
        .filter((item) => item.playlistId === playlistId)
        .sort((a, b) => a.position - b.position)
        .map((item) => item.songId);
      setPlaylistSongs((prev) => prev.map((item) => {
        if (item.playlistId !== playlistId) return item;
        const position = orderedVisibleIds.indexOf(item.songId);
        return position >= 0 ? { ...item, position } : item;
      }));
      void Promise.all(orderedVisibleIds.map((songId, position) =>
        savePlaylistSong({ playlistId, songId, position })
      ));

      if (
        playlist &&
        currentPlaylistSongIds.length === playOrder.length &&
        currentPlaylistSongIds.every((songId) => playOrder.includes(songId))
      ) {
        setPlayOrder(orderedVisibleIds);
      }
      return;
    }

    const visibleIdSet = new Set(orderedVisibleIds);
    const reorderedVisibleSongs = orderedVisibleIds
      .map((songId) => songs.find((song) => song.id === songId))
      .filter((song): song is Song => !!song);
    let visibleIndex = 0;
    const reorderedSongs = songs.map((song) =>
      visibleIdSet.has(song.id) ? reorderedVisibleSongs[visibleIndex++] : song
    );
    void setSongOrder(reorderedSongs.map((song) => song.id));
    setSongs(() => reorderedSongs);

    if (!playerState.shuffle) {
      setPlayOrder(reorderedSongs.map((song) => song.id));
    }
  };

  const handleDeletePlaylist = (playlistId: string) => {
    void deletePlaylist(playlistId);
    setPlaylists((prev) => prev.filter((p) => p.id !== playlistId));
    setPlaylistSongs((prev) => prev.filter((item) => item.playlistId !== playlistId));
  };

  const intentionalStopRef = useRef(false);

  const removeSongsByIds = (ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);

    setSongs((prev) => prev.filter((s) => !idSet.has(s.id)));
    void deleteSongs(ids);
    setPlaylistSongs((prev) => prev.filter((item) => !idSet.has(item.songId)));
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

  const handleAudioError = () => {
    if (intentionalStopRef.current) {
      intentionalStopRef.current = false;
      return;
    }
    const missingSong = playerState.currentSong;
    if (!missingSong) return;

    const updatedSong = { ...missingSong, isMissing: true };
    void saveSong(updatedSong);
    setSongs((prev) => prev.map((s) => (s.id === missingSong.id ? updatedSong : s)));
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
    setPlayerState((prev) => ({ ...prev, currentSong: null, isPlaying: false, currentTime: 0 }));
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

  const syncDevicePaths = async (rootPath: string, paths: string[]) => {
    const driveRoot = getDriveRoot(rootPath);
    const identifier = await invoke<string>('get_device_identifier', { root: driveRoot });
    const mountPath = getMountRelativePath(rootPath);
    const knownDevices = await getAllDevices();
    const legacyDevice = knownDevices.find((device) =>
      device.mountPath === null && getDriveRoot(device.identifier).toLowerCase() === driveRoot.toLowerCase()
    );
    const legacyPrefix = legacyDevice && /^[A-Za-z]:[\\/]/.test(legacyDevice.identifier)
      ? getMountRelativePath(legacyDevice.identifier)
      : '';
    const device = legacyDevice
      ? (await updateDeviceIdentity(legacyDevice.id, identifier, mountPath), {
          ...legacyDevice,
          identifier,
          mountPath,
        })
      : await getOrCreateDevice(getBasename(rootPath) || 'Music device', identifier, mountPath);
    await saveScanRoot(device.id, rootPath, mountPath);
    const currentSongs = songsRef.current;
    const normalizedMountPath = mountPath.replace(/[\\/]/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase();
    const isInScannedRoot = (relativePath: string) => {
      const normalizedPath = relativePath.replace(/[\\/]/g, '/').replace(/^\/+/, '').toLowerCase();
      return !normalizedMountPath
        || normalizedPath === normalizedMountPath
        || normalizedPath.startsWith(`${normalizedMountPath}/`);
    };
    const deviceSongs = currentSongs
      .filter((song) => song.deviceId === device.id && isInScannedRoot(song.relativePath))
      .map((song) => legacyPrefix
        ? { ...song, relativePath: `${legacyPrefix}/${song.relativePath}`.replace(/\/+/g, '/') }
        : song);
    if (legacyPrefix) await Promise.all(deviceSongs.map(saveSong));
    const existingByPath = new Map(deviceSongs.map((song) => [song.relativePath.toLocaleLowerCase(), song]));
    const foundRelativePaths = new Set<string>();
    const syncedSongs: Song[] = [];

    for (const path of paths) {
      const relativePath = path
        .replace(/\\/g, '/')
        .replace(driveRoot.replace(/\\/g, '/').replace(/\/$/, ''), '')
        .replace(/^\//, '');
      const existing = existingByPath.get(relativePath.toLocaleLowerCase());
      const song = existing
        ? { ...existing, sourcePath: path, isMissing: false }
        : await buildSongFromPath(path, device.id, relativePath);
      foundRelativePaths.add(relativePath.toLocaleLowerCase());
      syncedSongs.push(song);
      await saveSong(song);
    }

    const missingSongs = deviceSongs.filter((song) => !foundRelativePaths.has(song.relativePath.toLocaleLowerCase()))
      .map((song) => ({ ...song, sourcePath: undefined, isMissing: true }));
    await Promise.all(missingSongs.map(saveSong));

    const syncedById = new Map([...syncedSongs, ...missingSongs].map((song) => [song.id, song]));
    const knownSongIds = new Set(currentSongs.map((song) => song.id));
    const nextSongs = currentSongs.map((song) => syncedById.get(song.id) ?? song);
    nextSongs.push(...[...syncedSongs, ...missingSongs].filter((song) => !knownSongIds.has(song.id)));
    songsRef.current = nextSongs;
    setSongs(nextSongs);
    setPlayOrder(nextSongs.map((song) => song.id));
  };

  const syncFolder = async (folderPath: string) => {
    await syncDevicePaths(folderPath, await scanDirectory(folderPath));
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
    await syncFolder(folderPath);
    startWatchingFolder(folderPath);
  };

  const handleScanDisk = async () => {
    if (isScanningDevice) return;
    const selected = await open({
      directory: true,
      multiple: false,
    });
    if (!selected) return;

    setIsScanningDevice(true);

    try {
      const diskPath = Array.isArray(selected) ? selected[0] : selected;
      const paths = await invoke<string[]>('scan_disk_for_audio', { root: diskPath });
      const uniquePaths = Array.from(new Map(paths.map((path) => [path.toLowerCase(), path])).values());
      await syncDevicePaths(diskPath, uniquePaths);
    } catch (error) {
      console.error('Could not scan the disk:', error);
    } finally {
      setIsScanningDevice(false);
    }
  };

  const findDeviceRoot = async (identifier: string): Promise<string | null> => {
    for (let code = 65; code <= 90; code += 1) {
      const root = `${String.fromCharCode(code)}:\\`;
      try {
        const currentIdentifier = await invoke<string>('get_device_identifier', { root });
        if (currentIdentifier === identifier) return root;
      } catch {
        // An unavailable drive is expected while checking possible mount points.
      }
    }
    return null;
  };

  const handleToggleFavorite = (songId: string) => {
    const song = songsRef.current.find((item) => item.id === songId);
    if (!song) return;
    const isFavorite = !song.isFavorite;
    const updatedSong = { ...song, isFavorite };
    void setSongFavorite(songId, isFavorite);
    setSongs((prevSongs) => prevSongs.map((item) => item.id === songId ? updatedSong : item));
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
    let cancelled = false;

    const loadLibrary = async () => {
      try {
        const [storedSongs, storedPlaylists] = await Promise.all([
          getAllSongs(),
          getAllPlaylists(),
        ]);
        const storedPlaylistSongs = (
          await Promise.all(storedPlaylists.map((playlist) => getPlaylistSongs(playlist.id)))
        ).flat();
        if (cancelled) return;

        const unavailableSongs = storedSongs.map((song) => ({
          ...song,
          sourcePath: undefined,
          isMissing: true,
        }));
        setSongs(unavailableSongs);
        songsRef.current = unavailableSongs;
        setPlaylists(storedPlaylists);
        setPlaylistSongs(storedPlaylistSongs);
        setPlayOrder(unavailableSongs.map((song) => song.id));

        const devices = await getAllDevices();
        const storedRoots = await getScanRoots();
        const rootsToScan = storedRoots.length > 0
          ? storedRoots
          : devices
            .filter((device) => device.identifier !== 'local-files' && device.mountPath !== null)
            .map((device) => ({
              id: device.id,
              deviceId: device.id,
              rootPath: '',
              relativePath: device.mountPath!,
            }));

        for (const root of rootsToScan) {
          const device = devices.find((item) => item.id === root.deviceId);
          if (!device || device.identifier === 'local-files') continue;
          let identifier = device.identifier;
          let mountPath = root.relativePath;
          if (device.mountPath === null && /^[A-Za-z]:[\\/]/.test(identifier)) {
            const legacyPrefix = getMountRelativePath(identifier);
            await migrateSongPaths(device.id, legacyPrefix);
            identifier = await invoke<string>('get_device_identifier', { root: identifier });
            mountPath = legacyPrefix;
            await updateDeviceIdentity(device.id, identifier, mountPath);
          }
          const driveRoot = await findDeviceRoot(identifier);
          if (!driveRoot) continue;
          const scanRoot = /^[A-Za-z]:[\\/]/.test(root.rootPath)
            ? joinDrivePath(driveRoot, mountPath)
            : root.rootPath || joinDrivePath(driveRoot, mountPath);
          const paths = await invoke<string[]>('scan_disk_for_audio', { root: scanRoot });
          const uniquePaths = Array.from(new Map(paths.map((path) => [path.toLowerCase(), path])).values());
          await syncDevicePaths(scanRoot, uniquePaths);
        }
      } catch (error) {
        console.error('Could not load the library database:', error);
      }
    };

    void loadLibrary();
    return () => {
      cancelled = true;
    };
  }, []);

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
    <div className={`app theme-${theme}`} data-theme={theme}>
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
          onScanDevice={handleScanDisk}
          isScanningDevice={isScanningDevice}
          collapsed={isSidebarCollapsed}
          onToggleCollapsed={() => setIsSidebarCollapsed((collapsed) => !collapsed)}
          theme={theme}
          onSelectTheme={setTheme}
        />
        <ViewContainer
          currentView={currentView}
          songs={songs}
          currentSong={playerState.currentSong}
          onSelectSong={handleSelectSong}
          onSwapArtistTitle={handleSwapArtistTitle}
          onEditArtist={handleEditArtist}
          onRemoveSongs={removeSongsByIds}
          playlists={playlists}
          playlistSongs={playlistSongs}
          onCreatePlaylist={handleCreatePlaylist}
          onRenamePlaylist={handleRenamePlaylist}
          onAddSongsToPlaylist={handleAddSongsToPlaylist}
          onRemoveSongFromPlaylist={handleRemoveSongFromPlaylist}
          onReorderSongs={handleReorderSongs}
          onDeletePlaylist={handleDeletePlaylist}
          onToggleFavorite={handleToggleFavorite}
        />
        {showNowPlaying && playerState.currentSong && (
          <NowPlaying
            state={playerState}
            playlistName={
              playerState.currentSong
                ? playlists
                  .filter((p) => playlistSongs.some((item) => item.playlistId === p.id && item.songId === playerState.currentSong!.id))
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