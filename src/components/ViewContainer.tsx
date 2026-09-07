import React from 'react';
import { Song, ViewMode } from '../types';
import { TruncatedTitle } from './TruncatedTitle';
import { useState } from 'react';
import { ArrowLeftRight, Pencil, Check } from 'lucide-react';

interface ViewContainerProps {
  currentView: ViewMode;
  songs: Song[];
  currentSong: Song | null;
  onSelectSong: (song: Song) => void;
  onSwapArtistTitle: (songId: string) => void;
  onEditArtist: (songId: string, newArtist: string) => void;
}

export const ViewContainer: React.FC<ViewContainerProps> = ({
  currentView,
  songs,
  currentSong,
  onSelectSong,
  onSwapArtistTitle,
  onEditArtist,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

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
                  <td className="song-title-cell"><TruncatedTitle title={song.title} /></td>
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
    </main>
  );
};