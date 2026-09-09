import React from 'react';
import { ViewMode } from '../types';
import { FolderSearch} from 'lucide-react';

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  onAddSongs: () => void;
  onScanFolder: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onSelectView, 
  onAddSongs,
  onScanFolder
 }) => {
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
          className={`nav-item ${currentView === 'favorites' ? 'active' : ''}`}
          onClick={() => onSelectView('favorites')}
        >
          <span>Favorites</span>
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
      <button className="btn-add-songs" onClick={onScanFolder}>
          <FolderSearch size={16} />
          <span>Scan Folder</span>
      </button>
    </aside>
  );
};