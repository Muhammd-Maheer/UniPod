import React from 'react';
import { ViewMode } from '../types';
import { FolderSearch, Menu } from 'lucide-react';

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  onAddSongs: () => void;
  onScanFolder: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onSelectView, 
  onAddSongs,
  onScanFolder,
  collapsed,
  onToggleCollapsed
 }) => {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <button
        className="sidebar-toggle"
        type="button"
        title={collapsed ? 'Open sidebar' : 'Close sidebar'}
        aria-label={collapsed ? 'Open sidebar' : 'Close sidebar'}
        onClick={onToggleCollapsed}
      >
        <Menu size={18} />
      </button>
      {!collapsed && <h2>My Music</h2>}
      {!collapsed && <nav className="nav-group">
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
      </nav>}
      {!collapsed && <>
        <button className='btn-add-songs' onClick={onAddSongs}>+ Add Songs</button>
        <button className="btn-add-songs" onClick={onScanFolder}>
          <FolderSearch size={16} />
          <span>Scan Folder</span>
        </button>
      </>}
    </aside>
  );
};