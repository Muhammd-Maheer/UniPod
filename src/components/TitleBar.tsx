import React from 'react';

interface TitleBarProps {
  isConnected: boolean;
  driveName: string;
}

export const TitleBar: React.FC<TitleBarProps> = ({ isConnected, driveName }) => {
  return (
    <header className="title-bar" data-tauri-drag-region>
      <div className="title-bar-brand">UniPod</div>
      <div className={`drive-status ${isConnected ? 'connected' : 'disconnected'}`}>
        <span className="status-dot" />
        {isConnected ? `Connected to ${driveName}` : 'No Data Detected'}
      </div>
    </header>
  );
};