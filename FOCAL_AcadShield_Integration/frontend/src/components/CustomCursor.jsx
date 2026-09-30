import React, { useEffect, useState } from 'react';

export default function CustomCursor() {
  const [pos, setPos] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isClicking, setIsClicking] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setPos({ x: e.clientX, y: e.clientY });

      const target = e.target;
      const isInteractive = target.closest('button, a, input, select, textarea, [data-interactive="true"]');
      setIsHovered(!!isInteractive);
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  if (typeof window !== 'undefined' && 'ontouchstart' in window) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {/* Target Dot */}
      <div
        className={`fixed top-0 left-0 w-2 h-2 rounded-full transition-transform duration-75 ease-out ${
          isHovered ? 'bg-textDark scale-150 shadow-[0_0_10px_#111111]' : 'bg-neon-yellow'
        }`}
        style={{
          transform: `translate3d(${pos.x - 4}px, ${pos.y - 4}px, 0) scale(${isClicking ? 0.7 : 1})`,
        }}
      />
      {/* Technical Light Ring */}
      <div
        className={`fixed top-0 left-0 rounded-full border transition-all duration-200 ease-out ${
          isHovered
            ? 'w-10 h-10 border-textDark/80 bg-neon-yellow/30 shadow-md'
            : 'w-7 h-7 border-textDark/30'
        }`}
        style={{
          transform: `translate3d(${pos.x - (isHovered ? 20 : 14)}px, ${pos.y - (isHovered ? 20 : 14)}px, 0) scale(${
            isClicking ? 1.2 : 1
          })`,
        }}
      />
    </div>
  );
}
