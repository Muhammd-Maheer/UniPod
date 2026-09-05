import React from 'react';
import { ViewMode } from '../types';

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  onAddSongs: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onSelectView, onAddSongs }) => {
  return (
    <aside className="sidebar">
      <h2>My Music</h2>
      <nav className="nav-group">
        <button
          className={`nav-item ${currentView === 'songs' ? 'active' : ''}`}
          onClick={() => onSelectView('songs')}
        >
          Songs
        </button>
        <button
          className={`nav-item ${currentView === 'albums' ? 'active' : ''}`}
          onClick={() => onSelectView('albums')}
        >
          Albums
        </button>
        <button
          className={`nav-item ${currentView === 'artists' ? 'active' : ''}`}
          onClick={() => onSelectView('artists')}
        >
          Artists
        </button>
        <button
          className={`nav-item ${currentView === 'playlists' ? 'active' : ''}`}
          onClick={() => onSelectView('playlists')}
        >
          Playlists
        </button>
      </nav>
      <button className='btn-add-songs' onClick={onAddSongs}>+ Add Songs</button>
    </aside>
  );
};