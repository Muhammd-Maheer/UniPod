import React from 'react';
import { PlayerState } from '../types';
import { Shuffle, Repeat, Repeat1 } from 'lucide-react';
import { getVolumeIcon } from '../utils/volumeIcon';

interface PlayerProps {
  state: PlayerState;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (level: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleMute: () => void;
}

export const Player: React.FC<PlayerProps> = ({
  state,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onPrevious,
  onNext,
  onToggleShuffle,
  onToggleRepeat,
  onToggleMute,
}) => {
  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const mins = Math.floor(secs / 60);
    const remainder = Math.floor(secs % 60);
    return `${mins}:${remainder < 10 ? '0' : ''}${remainder}`;
  };

  const progressPercent = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
  const volumePercent = state.volume * 100;
  const VolumeIcon = getVolumeIcon(state.volume);

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
          <button
            className={`btn-control ${state.shuffle ? 'active' : ''}`}
            onClick={onToggleShuffle}
            title="Shuffle"
          >
            <Shuffle size={18} />
          </button>
          <button className="btn-control" onClick={onPrevious} title="Previous">⏮</button>
          <button className="btn-play" onClick={onTogglePlay} title="Play/Pause">
            {state.isPlaying ? '❚❚' : '▶'}
          </button>
          <button className="btn-control" onClick={onNext} title="Next">⏭</button>
          <button
            className={`btn-control ${state.repeatMode !== 'off' ? 'active' : ''}`}
            onClick={onToggleRepeat}
            title="Repeat"
          >
            {state.repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
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
            style={{
              background: `linear-gradient(to right, var(--primary) ${progressPercent}%, var(--border) ${progressPercent}%)`,
            }}
          />
          <span>{formatTime(state.duration)}</span>
        </div>
      </div>

      {/* Volume Control */}
      <div className="volume-container">
        <button className="btn-control" onClick={onToggleMute} title="Mute">
          <VolumeIcon size={16} color="var(--text-sub)" />
        </button>
        <input
          type="range"
          className="seek-slider volume-slider"
          style={{
            maxWidth: '100px',
            background: `linear-gradient(to right, var(--primary) ${volumePercent}%, var(--border) ${volumePercent}%)`,
          }}
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