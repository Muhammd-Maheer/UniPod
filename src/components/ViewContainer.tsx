import React, { useState, useEffect } from 'react';
import { Song, ViewMode } from '../types';
import { TruncatedTitle } from './TruncatedTitle';
import { ArrowLeftRight, Pencil, Check, MoreVertical, Trash2 } from 'lucide-react';

interface ViewContainerProps {
  currentView: ViewMode;
  songs: Song[];
  currentSong: Song | null;
  onSelectSong: (song: Song) => void;
  onSwapArtistTitle: (songId: string) => void;
  onEditArtist: (songId: string, newArtist: string) => void;
  onRemoveSong: (songId: string) => void;
}

export const ViewContainer: React.FC<ViewContainerProps> = ({
  currentView,
  songs,
  currentSong,
  onSelectSong,
  onSwapArtistTitle,
  onEditArtist,
  onRemoveSong,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);

  // Close dropdown menu when clicking anywhere outside
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
        <h1 style={{ textTransform: 'capitalize' }}>{currentView}</h1>
      </div>

      {currentView === 'songs' && (
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
            {songs.map((song, index) => {
              const isActive = currentSong?.id === song.id;
              return (
                <tr
                  key={song.id}
                  className={`song-row ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectSong(song)}
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
                  
                  {/* Action cell for 3-dots menu */}
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
                          className="dropdown-item danger"
                          onClick={() => {
                            setSongToDelete(song);
                            setOpenMenuId(null);
                          }}
                        >
                          <Trash2 size={14} />
                          <span>Remove from app</span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {currentView !== 'songs' && (
        <p style={{ color: 'var(--text-sub)' }}>
          {currentView} view is under construction.
        </p>
      )}

      {/* Confirmation Modal */}
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