import React from 'react';
import { PlayerState } from '../types';

interface PlayerProps {
  state: PlayerState;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (level: number) => void;
}

export const Player: React.FC<PlayerProps> = ({
  state,
  onTogglePlay,
  onSeek,
  onVolumeChange,
}) => {
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  return (
    <footer className="player-bar">
      {/* Track Info */}
      <div className="track-info">
        <div className="track-title">
          {state.currentSong ? state.currentSong.title : 'No Track Selected'}
        </div>
        <div className="track-artist">
          {state.currentSong ? state.currentSong.artist : '—'}
        </div>
      </div>

      {/* Center Controls */}
      <div className="player-controls">
        <div className="control-buttons">
          <button className="btn-control" title="Previous">⏮</button>
          <button className="btn-play" onClick={onTogglePlay} title="Play/Pause">
            {state.isPlaying ? '❚❚' : '▶'}
          </button>
          <button className="btn-control" title="Next">⏭</button>
        </div>

        <div className="progress-container">
          <span>{formatTime(state.currentTime)}</span>
          <input
            type="range"
            className="seek-slider"
            min={0}
            max={state.duration || 100}
            value={state.currentTime}
            onChange={(e) => onSeek(Number(e.target.value))}
          />
          <span>{formatTime(state.duration)}</span>
        </div>
      </div>

      {/* Volume Control */}
      <div className="volume-container">
        <span style={{ fontSize: '0.8rem', color: 'var(--text-sub)' }}>🔊</span>
        <input
          type="range"
          className="seek-slider"
          style={{ maxWidth: '100px' }}
          min={0}
          max={1}
          step={0.01}
          value={state.volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
        />
      </div>
    </footer>
  );
};