import React, { useRef } from 'react';

interface TruncatedTitleProps {
  title: string;
}

export const TruncatedTitle: React.FC<TruncatedTitleProps> = ({ title }) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    // Only show tooltip if the text is actually truncated (overflowing)
    if (target.scrollWidth > target.clientWidth) {
      timeoutRef.current = setTimeout(() => {
        target.setAttribute('title', title);
      }, 100); // 1-second delay
    }
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    e.currentTarget.removeAttribute('title');
  };

  return (
    <div
      className="song-title-truncated"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {title}
    </div>
  );
};