import React from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Maximize2, Minus, X } from 'lucide-react';
import logoUrl from '../../src-tauri/icons/UniPod-logo.svg';

interface TitleBarProps {
  isConnected: boolean;
  driveName: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ isConnected, driveName }) => {
  const appWindow = getCurrentWindow();

  return (
    <header className="title-bar">
      <div className="title-bar-drag-region">
        <img
          className="title-bar-logo"
          src={logoUrl}
          role="img"
          aria-label="UniPod logo"
        />
        <div className="title-bar-brand">UniPod</div>
        <div className={`drive-status ${isConnected ? 'connected' : 'disconnected'}`}>
          {isConnected ? `Connected to ${driveName}` : ''}
        </div>
      </div>
      <div
        className="window-controls"
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <button type="button" title="Minimize" aria-label="Minimize window" onClick={() => appWindow.minimize()}>
          <Minus size={15} />
        </button>
        <button type="button" title="Maximize" aria-label="Maximize window" onClick={() => appWindow.toggleMaximize()}>
          <Maximize2 size={13} />
        </button>
        <button className="window-close" type="button" title="Close" aria-label="Close window" onClick={() => appWindow.close()}>
          <X size={15} />
        </button>
      </div>
    </header>
  );
};