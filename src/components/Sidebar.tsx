import React from 'react';
import { ViewMode } from '../types';
import { FolderSearch, HardDrive, Menu } from 'lucide-react';

export type ThemeId = 'classic' | 'dark' | 'warm' | 'retro' | 'navy';

interface ThemeOption {
  id: ThemeId;
  name: string;
  primary: string;
  secondary: string;
}

const themeOptions: ThemeOption[] = [
  { id: 'classic', name: 'Classic iPod', primary: '#1769e0', secondary: '#8bb8eb' },
  { id: 'dark', name: 'Dark iPod', primary: '#13c4df', secondary: '#56d9e8' },
  { id: 'warm', name: 'Warm Player', primary: '#ed7d0f', secondary: '#f5aa4f' },
  { id: 'retro', name: 'Retro Tech', primary: '#8bd619', secondary: '#cce7ad' },
  { id: 'navy', name: 'Navy + Cream', primary: '#203b63', secondary: '#d9b477' },
];

interface SidebarProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  onAddSongs: () => void;
  onScanFolder: () => void;
  onScanDevice: () => void;
  isScanningDevice: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  theme: ThemeId;
  onSelectTheme: (theme: ThemeId) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentView, 
  onSelectView, 
  onAddSongs,
  onScanFolder,
  onScanDevice,
  isScanningDevice,
  collapsed,
  onToggleCollapsed,
  theme,
  onSelectTheme,
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
        <button className="btn-add-songs" onClick={onScanDevice} disabled={isScanningDevice}>
          <HardDrive size={16} />
          <span>{isScanningDevice ? 'Scanning Disk...' : 'Scan Disk'}</span>
        </button>
      </>}
      <div className="theme-switcher" aria-label="Choose theme">
        {themeOptions.map((option) => {
          const isSelected = theme === option.id;
          return (
            <button
              key={option.id}
              className={`theme-dot ${isSelected ? 'selected' : ''}`}
              type="button"
              title={option.name}
              aria-label={`Use ${option.name} theme`}
              aria-pressed={isSelected}
              style={{ '--theme-primary': option.primary, '--theme-secondary': option.secondary } as React.CSSProperties}
              onClick={() => onSelectTheme(option.id)}
            />
          );
        })}
      </div>
    </aside>
  );
};