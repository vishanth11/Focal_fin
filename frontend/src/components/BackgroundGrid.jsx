import React, { useEffect, useRef } from 'react';

export default function BackgroundGrid() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Create subtle particles for light theme
    const particleCount = 30;
    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.25,
      vy: (Math.random() - 0.5) * 0.25,
      size: Math.random() * 1.5 + 0.5,
      color: Math.random() > 0.5 ? '#111111' : '#39FF88',
      alpha: Math.random() * 0.25 + 0.05
    }));

    let gridOffset = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw subtle light moving grid lines
      gridOffset = (gridOffset + 0.12) % 40;
      ctx.strokeStyle = 'rgba(220, 220, 213, 0.6)';
      ctx.lineWidth = 1;

      // Vertical grid lines
      for (let x = 0; x < canvas.width; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Horizontal grid lines moving down
      for (let y = gridOffset; y < canvas.height; y += 60) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Render subtle drifting particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full opacity-80" />

      {/* Subtle ambient corner technical metadata in light gray */}
      <div className="absolute top-24 left-6 hidden lg:flex flex-col gap-1 text-[10px] font-mono text-textMuted/40 select-none tracking-widest">
        <span>TRUST_ENGINE // ACTIVE</span>
        <span>NODE_04 // VERIFIED</span>
        <span>SCAN_CHANNEL_01</span>
      </div>

      <div className="absolute bottom-6 right-6 hidden lg:flex flex-col gap-1 text-[10px] font-mono text-textMuted/40 select-none tracking-widest text-right">
        <span>NETWORK_STATUS // ONLINE</span>
        <span>LATENCY // 024ms</span>
        <span>PROTOCOL // DECENTRALIZED_TRUST</span>
      </div>
    </div>
  );
}
