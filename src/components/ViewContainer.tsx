import React, { useState, useEffect } from 'react';
import { Song, ViewMode, Playlist } from '../types';
import { TruncatedTitle } from './TruncatedTitle';
import { ArrowLeftRight, Pencil, Check, MoreVertical, Trash2, Folder, ArrowLeft, Search, ListPlus } from 'lucide-react';

interface ViewContainerProps {
  currentView: ViewMode;
  songs: Song[];
  currentSong: Song | null;
  onSelectSong: (song: Song, contextSongs?: Song[]) => void;
  onSwapArtistTitle: (songId: string) => void;
  onEditArtist: (songId: string, newArtist: string) => void;
  onRemoveSong: (songId: string) => void;
  playlists: Playlist[];
  onCreatePlaylist: (name: string) => void;
  onRenamePlaylist: (playlistId: string, newName: string) => void;
  onAddSongsToPlaylist: (playlistId: string, songIds: string[]) => void;
  onRemoveSongFromPlaylist: (playlistId: string, songId: string) => void;
}

export const ViewContainer: React.FC<ViewContainerProps> = ({
  currentView,
  songs,
  currentSong,
  onSelectSong,
  onSwapArtistTitle,
  onEditArtist,
  onRemoveSong,
  playlists,
  onCreatePlaylist,
  onRenamePlaylist,
  onAddSongsToPlaylist,
  onRemoveSongFromPlaylist
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [editingPlaylistName, setEditingPlaylistName] = useState(false);
  const [playlistNameDraft, setPlaylistNameDraft] = useState('');
  const [showAddSongsModal, setShowAddSongsModal] = useState(false);
  const [songsToAdd, setSongsToAdd] = useState<Set<string>>(new Set());
  const [modalSearchQuery, setModalSearchQuery] = useState('');
  const [songForPlaylistPicker, setSongForPlaylistPicker] = useState<Song | null>(null);
  const [playlistPickerSearch, setPlaylistPickerSearch] = useState('');

  useEffect(() => {
    if (currentView !== 'playlists') {
      setSelectedPlaylistId(null);
      setEditingPlaylistName(false);
    }
  }, [currentView]);

  const selectedPlaylist = playlists.find((p) => p.id === selectedPlaylistId) || null;

  const commitPlaylistRename = () => {
    if (selectedPlaylist) onRenamePlaylist(selectedPlaylist.id, playlistNameDraft);
    setEditingPlaylistName(false);
  };

  useEffect(() => {
    if (currentView !== 'artists') {
      setSelectedArtist(null);
    }
  }, [currentView]);

  const artistGroups = (() => {
    const map = new Map<string, Song[]>();
    songs.forEach((song) => {
      const key = song.artist || 'Unknown Artist';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(song);
    });
    const known = [...map.keys()].filter((a) => a !== 'Unknown Artist').sort((a, b) => a.localeCompare(b));
    const ordered = map.has('Unknown Artist') ? [...known, 'Unknown Artist'] : known;
    return ordered.map((name) => ({ name, songs: map.get(name)! }));
  })();

  const visibleSongs =
    currentView === 'artists' && selectedArtist
      ? songs.filter((s) => (s.artist || 'Unknown Artist') === selectedArtist)
      : currentView === 'playlists' && selectedPlaylist
      ? songs.filter((s) => selectedPlaylist.songIds.includes(s.id))
      : songs;

  const filteredModalSongs = songs.filter((song) => {
      const query = modalSearchQuery.toLowerCase().trim();
      if (!query) return true;
      return (
        song.title.toLowerCase().includes(query) ||
        song.artist.toLowerCase().includes(query)
      );
    });

  const insidePlaylist = currentView === 'playlists' && !!selectedPlaylist;

  const filteredPickerPlaylists = playlists.filter((p) =>
    p.name.toLowerCase().includes(playlistPickerSearch.toLowerCase().trim())
  );

  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const startEditing = (song: Song) => {
    setEditingId(song.id);
    setEditValue(song.artist);
  };

  const commitEdit = (songId: string) => {
    onEditArtist(songId, editValue);
    setEditingId(null);
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <main className="main-view">
      <div className="view-header">
        {currentView === 'playlists' && selectedPlaylist ? (
          editingPlaylistName ? (
            <input
              className="artist-edit-input"
              value={playlistNameDraft}
              autoFocus
              onChange={(e) => setPlaylistNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitPlaylistRename();
                if (e.key === 'Escape') setEditingPlaylistName(false);
              }}
              onBlur={commitPlaylistRename}
            />
          ) : (
            <h1 style={{ textTransform: 'capitalize' }}>
              {selectedPlaylist.name}
              <button
                className="btn-swap playlist-rename-btn"
                title="Rename playlist"
                onClick={() => {
                  setPlaylistNameDraft(selectedPlaylist.name);
                  setEditingPlaylistName(true);
                }}
              >
                <Pencil size={14} />
              </button>
            </h1>
          )
        ) : (
          <h1 style={{ textTransform: 'capitalize' }}>
            {currentView === 'artists' && selectedArtist ? selectedArtist : currentView}
          </h1>
        )}
      </div>

      {(currentView === 'songs' ||
        (currentView === 'artists' && selectedArtist) ||
        (currentView === 'playlists' && selectedPlaylist)) && (
        <table className="song-table">
          <thead>
            <tr>
              <th style={{ width: '40px' }}>#</th>
              <th>Title</th>
              <th>Artist</th>
              <th>Album</th>
              <th style={{ width: '80px' }}>Duration</th>
              <th style={{ width: '40px' }}></th>
            </tr>
          </thead>
          <tbody>
            {visibleSongs.map((song, index) => {
              const isActive = currentSong?.id === song.id;
              return (
                <tr
                  key={song.id}
                  className={`song-row ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectSong(song, visibleSongs)}
                >
                  <td>{index + 1}</td>
                  <td className="song-title-cell">
                    <TruncatedTitle title={song.title} />
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    {editingId === song.id ? (
                      <span className="artist-cell">
                        <input
                          className="artist-edit-input"
                          value={editValue}
                          autoFocus
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitEdit(song.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          onBlur={() => commitEdit(song.id)}
                        />
                        <button className="btn-swap" title="Save" onClick={() => commitEdit(song.id)}>
                          <Check size={13} />
                        </button>
                      </span>
                    ) : (
                      <span className="artist-cell">
                        {song.artist}
                        <button className="btn-swap" title="Edit artist" onClick={() => startEditing(song)}>
                          <Pencil size={13} />
                        </button>
                        <button
                          className="btn-swap"
                          title="Swap title/artist"
                          onClick={() => onSwapArtistTitle(song.id)}
                        >
                          <ArrowLeftRight size={13} />
                        </button>
                      </span>
                    )}
                  </td>
                  <td>{song.album}</td>
                  <td>{formatTime(song.duration)}</td>

                  <td className="action-cell" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="btn-swap"
                      title="More options"
                      onClick={() => setOpenMenuId(openMenuId === song.id ? null : song.id)}
                    >
                      <MoreVertical size={15} />
                    </button>
                    {openMenuId === song.id && (
                      <div className="dropdown-menu">
                        <button
                          className="dropdown-item"
                          onClick={() => {
                            setSongForPlaylistPicker(song);
                            setPlaylistPickerSearch('');
                            setOpenMenuId(null);
                          }}
                        >
                          <ListPlus size={14} />
                          <span>Add to playlist</span>
                        </button>
                        {insidePlaylist ? (
                          <button
                            className="dropdown-item danger"
                            onClick={() => {
                              onRemoveSongFromPlaylist(selectedPlaylist!.id, song.id);
                              setOpenMenuId(null);
                            }}
                          >
                            <Trash2 size={14} />
                            <span>Remove from playlist</span>
                          </button>
                        ) : (
                          <button
                            className="dropdown-item danger"
                            onClick={() => {
                              setSongToDelete(song);
                              setOpenMenuId(null);
                            }}
                          >
                            <Trash2 size={14} />
                            <span>Remove from app</span>
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {currentView === 'artists' && !selectedArtist && (
        <div className="folder-grid">
          {artistGroups.length === 0 ? (
            <p style={{ color: 'var(--text-sub)' }}>No songs yet.</p>
          ) : (
            artistGroups.map((group) => (
              <button key={group.name} className="folder-card" onClick={() => setSelectedArtist(group.name)}>
                <Folder size={32} />
                <div className="folder-name">{group.name}</div>
                <div className="folder-count">
                  {group.songs.length} song{group.songs.length !== 1 ? 's' : ''}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {currentView === 'artists' && selectedArtist && (
        <button className="btn-back" onClick={() => setSelectedArtist(null)}>
          <ArrowLeft size={14} /> Artists
        </button>
      )}

      {currentView === 'playlists' && !selectedPlaylist && (
        <>
          <div className="playlist-create-row">
            <input
              className="artist-edit-input playlist-create-input"
              placeholder="New playlist name"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onCreatePlaylist(newPlaylistName);
                  setNewPlaylistName('');
                }
              }}
            />
            <button
              className="btn-add-songs playlist-create-btn"
              onClick={() => {
                onCreatePlaylist(newPlaylistName);
                setNewPlaylistName('');
              }}
            >
              + Create Playlist
            </button>
          </div>

          <div className="folder-grid">
            {playlists.length === 0 ? (
              <p style={{ color: 'var(--text-sub)' }}>No playlists yet — create one above.</p>
            ) : (
              playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  className="folder-card"
                  onClick={() => setSelectedPlaylistId(playlist.id)}
                >
                  <Folder size={32} />
                  <div className="folder-name">{playlist.name}</div>
                  <div className="folder-count">
                    {playlist.songIds.length} song{playlist.songIds.length !== 1 ? 's' : ''}
                  </div>
                </button>
              ))
            )}
          </div>
        </>
      )}

      {currentView === 'playlists' && selectedPlaylist && (
        <div className="playlist-toolbar">
          <button className="btn-back" onClick={() => setSelectedPlaylistId(null)}>
            <ArrowLeft size={14} /> Playlists
          </button>
          <button
            className="btn-add-songs playlist-add-btn"
            onClick={() => {
              setSongsToAdd(new Set());
              setModalSearchQuery('');
              setShowAddSongsModal(true);
            }}
          >
            + Add Songs
          </button>
        </div>
      )}

      {currentView !== 'songs' && currentView !== 'artists' && currentView !== 'playlists' && (
        <p style={{ color: 'var(--text-sub)' }}>{currentView} view is under construction.</p>
      )}

      {showAddSongsModal && selectedPlaylist && (
        <div className="modal-overlay" onClick={() => setShowAddSongsModal(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <h3>Add Songs to "{selectedPlaylist.name}"</h3>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-sub)',
                }}
              />
              <input
                className="artist-edit-input"
                style={{ paddingLeft: '32px', width: '100%', boxSizing: 'border-box' }}
                placeholder="Search songs by title or artist..."
                value={modalSearchQuery}
                onChange={(e) => setModalSearchQuery(e.target.value)}
                autoFocus
              />
            </div>
            <div className="song-picker-list">
              {songs.length === 0 ? (
                <p style={{ color: 'var(--text-sub)' }}>No songs in your library yet.</p>
              ) : filteredModalSongs.length === 0 ? (
                <p style={{ color: 'var(--text-sub)' }}>No songs match "{modalSearchQuery}".</p>
              ) : (
                filteredModalSongs.map((song) => {
                  const alreadyIn = selectedPlaylist.songIds.includes(song.id);
                  const checked = alreadyIn || songsToAdd.has(song.id);
                  return (
                    <label key={song.id} className="song-picker-item">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={alreadyIn}
                        onChange={(e) => {
                          setSongsToAdd((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(song.id);
                            else next.delete(song.id);
                            return next;
                          });
                        }}
                      />
                      <span>
                        {song.title} <span style={{ color: 'var(--text-sub)' }}>— {song.artist}</span>
                      </span>
                    </label>
                  );
                })
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-modal btn-cancel" onClick={() => setShowAddSongsModal(false)}>
                Cancel
              </button>
              <button
                className="btn-modal btn-confirm"
                onClick={() => {
                  onAddSongsToPlaylist(selectedPlaylist.id, Array.from(songsToAdd));
                  setShowAddSongsModal(false);
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

            {songForPlaylistPicker && (
        <div className="modal-overlay" onClick={() => setSongForPlaylistPicker(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <h3>Add "{songForPlaylistPicker.title}" to Playlist</h3>
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-sub)',
                }}
              />
              <input
                className="artist-edit-input"
                style={{ paddingLeft: '32px', width: '100%', boxSizing: 'border-box' }}
                placeholder="Search playlists..."
                value={playlistPickerSearch}
                onChange={(e) => setPlaylistPickerSearch(e.target.value)}
                autoFocus
              />
            </div>
            <div className="song-picker-list">
              {playlists.length === 0 ? (
                <p style={{ color: 'var(--text-sub)' }}>No playlists yet — create one from the Playlists tab.</p>
              ) : filteredPickerPlaylists.length === 0 ? (
                <p style={{ color: 'var(--text-sub)' }}>No playlists match "{playlistPickerSearch}".</p>
              ) : (
                filteredPickerPlaylists.map((playlist) => {
                  const alreadyIn = playlist.songIds.includes(songForPlaylistPicker.id);
                  return (
                    <label key={playlist.id} className="song-picker-item">
                      <input
                        type="checkbox"
                        checked={alreadyIn}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onAddSongsToPlaylist(playlist.id, [songForPlaylistPicker.id]);
                          } else {
                            onRemoveSongFromPlaylist(playlist.id, songForPlaylistPicker.id);
                          }
                        }}
                      />
                      <span>{playlist.name}</span>
                    </label>
                  );
                })
              )}
            </div>
            <div className="modal-actions">
              <button className="btn-modal btn-cancel" onClick={() => setSongForPlaylistPicker(null)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {songToDelete && (
        <div className="modal-overlay" onClick={() => setSongToDelete(null)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <h3>Remove Song</h3>
            <p>
              Are you sure you want to remove <strong>"{songToDelete.title}"</strong> from the app?
            </p>
            <div className="modal-actions">
              <button className="btn-modal btn-cancel" onClick={() => setSongToDelete(null)}>
                Cancel
              </button>
              <button
                className="btn-modal btn-danger"
                onClick={() => {
                  onRemoveSong(songToDelete.id);
                  setSongToDelete(null);
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};