import React from 'react';
import { PlayerState } from '../types';
import { Shuffle, Repeat, Repeat1 } from 'lucide-react';
import { getVolumeIcon } from '../utils/volumeIcon';

interface NowPlayingProps {
  state: PlayerState;
  playlistName: string;
  onClose: () => void;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onVolumeChange: (level: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onToggleMute: () => void;
}

export const NowPlaying: React.FC<NowPlayingProps> = ({
  state,
  playlistName,
  onClose,
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
  const song = state.currentSong;
  const VolumeIcon = getVolumeIcon(state.volume);

  return (
    <aside className="now-playing">
      <button className="now-playing-close" onClick={onClose} title="Close">✕</button>

      <div className="now-playing-art">
        {song?.artworkUrl ? (
          <img src={song.artworkUrl} alt={song.title} />
        ) : (
          <span className="now-playing-art-fallback">♪</span>
        )}
      </div>

      <div className="now-playing-title">{song ? song.title : 'No Track Selected'}</div>
      <div className="now-playing-artist">{song ? song.artist || 'Unknown Artist' : '—'}</div>
      <div className="now-playing-album">{playlistName}</div>

      <div className="now-playing-progress">
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
        <div className="now-playing-times">
          <span>{formatTime(state.currentTime)}</span>
          <span>{formatTime(state.duration)}</span>
        </div>
      </div>

      <div className="now-playing-controls">
        <button
          className={`btn-control nudge-icon ${state.shuffle ? 'active' : ''}`}
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
          className={`btn-control nudge-icon ${state.repeatMode !== 'off' ? 'active' : ''}`}
          onClick={onToggleRepeat}
          title="Repeat"
        >
          {state.repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
        </button>
        <div className="now-playing-volume">
          <button className="btn-control" onClick={onToggleMute} title="Mute">
            <VolumeIcon size={16} />
          </button>
          <div className="volume-popup">
            <input
              type="range"
              className="seek-slider volume-vertical"
              min={0}
              max={1}
              step={0.01}
              value={state.volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              style={{
                background: `linear-gradient(to right, var(--primary) ${volumePercent}%, var(--border) ${volumePercent}%)`,
              }}
            />
          </div>
        </div>
      </div>
    </aside>
  );
};