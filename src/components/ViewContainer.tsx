import React from 'react';
import { Song, ViewMode } from '../types';

interface ViewContainerProps {
  currentView: ViewMode;
  songs: Song[];
  currentSong: Song | null;
  onSelectSong: (song: Song) => void;
}

export const ViewContainer: React.FC<ViewContainerProps> = ({
  currentView,
  songs,
  currentSong,
  onSelectSong,
}) => {
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
                  <td className="song-title-cell">{song.title}</td>
                  <td>{song.artist}</td>
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