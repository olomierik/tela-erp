'use client';

import { useEffect, useRef, useMemo } from 'react';
import Image from 'next/image';

// "agents.pe" pixel text — 7 rows for proper descenders on g/p
const TEXT_MATRIX = [
  //a           g           e           n           t           s          .     p           e
  [0,0,0,0,  0,0,0,0,  0,0,0,0,  0,0,0,0,  0,1,0,0,  0,0,0,0,  0,0,  0,0,0,0,  0,0,0,0],
  [0,0,0,0,  0,0,0,0,  0,0,0,0,  0,0,0,0,  0,1,0,0,  0,0,0,0,  0,0,  0,0,0,0,  0,0,0,0],
  [0,1,1,0,  0,1,1,1,  0,1,1,0,  1,1,1,0,  1,1,1,0,  0,1,1,0,  0,0,  1,1,1,0,  0,1,1,0],
  [0,0,0,1,  1,0,0,1,  1,0,0,1,  1,0,0,1,  0,1,0,0,  1,0,0,0,  0,0,  1,0,0,1,  1,0,0,1],
  [0,1,1,1,  0,1,1,1,  1,1,1,0,  1,0,0,1,  0,1,0,0,  0,1,1,0,  0,0,  1,1,1,0,  1,1,1,0],
  [1,0,0,1,  0,0,0,1,  1,0,0,0,  1,0,0,1,  0,1,0,0,  0,0,0,1,  0,0,  1,0,0,0,  1,0,0,0],
  [0,1,1,1,  0,1,1,0,  0,1,1,0,  1,0,0,1,  0,0,1,1,  1,1,1,0,  1,0,  1,0,0,0,  0,1,1,0],
];

const PIXEL_SIZE = 5;

function PixelText() {
  const textWidth = TEXT_MATRIX[0].length * PIXEL_SIZE;
  const textHeight = TEXT_MATRIX.length * PIXEL_SIZE;

  const rects = useMemo(() => {
    const result: { x: number; y: number; key: string }[] = [];
    TEXT_MATRIX.forEach((row, y) => {
      row.forEach((val, x) => {
        if (val === 1) {
          result.push({ x: x * PIXEL_SIZE, y: y * PIXEL_SIZE, key: `t-${x}-${y}` });
        }
      });
    });
    return result;
  }, []);

  return (
    <svg
      width={textWidth}
      height={textHeight}
      viewBox={`0 0 ${textWidth} ${textHeight}`}
      xmlns="http://www.w3.org/2000/svg"
      style={{ shapeRendering: 'crispEdges' }}
    >
      {rects.map((r) => (
        <rect key={r.key} x={r.x} y={r.y} width={PIXEL_SIZE} height={PIXEL_SIZE} fill="#FFF" />
      ))}
    </svg>
  );
}

function BrandLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
      <Image
        src="/logo.png"
        alt="agents.pe"
        width={90}
        height={90}
        style={{ imageRendering: 'pixelated' }}
        priority
      />
      <PixelText />
    </div>
  );
}

export default function TerminalGrid() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simStatusRef = useRef<HTMLSpanElement>(null);
  const simYieldRef = useRef<HTMLSpanElement>(null);
  const animFrameRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const CELL_SIZE = 14;
    let cols: number, rows: number;
    let time = 0;
    const densityChars = ['@', '#', '&', '%', '*', '+', '=', '-', ':', '.', ' '];
    const simStartTime = Date.now() + 1500;
    let phase = 'INIT';

    const sproutData = [
      { x: 0, y: 0, t: 0.05 }, { x: 0, y: -1, t: 0.10 }, { x: 0, y: -2, t: 0.15 },
      { x: 0, y: -3, t: 0.20 }, { x: 0, y: -4, t: 0.25 }, { x: 0, y: -5, t: 0.30 },
      { x: 0, y: -6, t: 0.35 }, { x: 0, y: -7, t: 0.40 },
      { x: -1, y: -4, t: 0.50 }, { x: -2, y: -5, t: 0.55 },
      { x: -3, y: -5, t: 0.60 }, { x: -2, y: -4, t: 0.62 },
      { x: 1, y: -5, t: 0.52 }, { x: 2, y: -6, t: 0.57 },
      { x: 3, y: -6, t: 0.62 }, { x: 2, y: -5, t: 0.64 },
      { x: -1, y: -8, t: 0.75 }, { x: 1, y: -8, t: 0.75 },
      { x: 0, y: -9, t: 0.80 }, { x: -1, y: -10, t: 0.85 },
      { x: 1, y: -10, t: 0.85 }, { x: 0, y: -11, t: 0.90 },
      { x: 0, y: -13, t: 0.98 },
    ];

    function resize() {
      const rect = canvas!.parentElement!.getBoundingClientRect();
      canvas!.width = rect.width;
      canvas!.height = rect.height;
      cols = Math.ceil(canvas!.width / CELL_SIZE);
      rows = Math.ceil(canvas!.height / CELL_SIZE);
      ctx!.font = `${CELL_SIZE}px "VT323", monospace`;
      ctx!.textBaseline = 'top';
    }

    window.addEventListener('resize', resize);
    resize();

    function noise(x: number, y: number, t: number) {
      return Math.sin(x * 0.1 + t) + Math.cos(y * 0.1 - t) + Math.sin((x + y) * 0.05 + t * 0.5);
    }

    function draw() {
      ctx!.fillStyle = '#000000';
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height);

      const now = Date.now();
      let progress = 0;

      if (now > simStartTime) {
        const duration = 12000;
        progress = Math.min((now - simStartTime) / duration, 1.0);

        if (phase === 'INIT' && progress > 0) {
          phase = 'GROWING';
          if (simStatusRef.current) {
            simStatusRef.current.innerText = 'ACTIVE // BIOGENESIS';
            simStatusRef.current.style.color = '#0f0';
          }
        } else if (phase === 'GROWING' && progress === 1.0) {
          phase = 'MATURE';
          if (simStatusRef.current) {
            simStatusRef.current.innerText = 'STABLE // CYCLE RUNNING';
            simStatusRef.current.style.color = '#fff';
          }
        }
      }

      if (phase !== 'INIT' && simYieldRef.current) {
        simYieldRef.current.innerText = (progress * 99.99).toFixed(4);
      }

      const baseSoilHeight = Math.floor(rows * 0.65);
      const rootX = Math.floor(cols / 2);

      for (let x = 0; x < cols; x++) {
        const surfaceOffset = Math.sin(x * 0.1 + time * 0.02) * 2 + Math.cos(x * 0.05) * 2;
        const columnSurface = Math.floor(baseSoilHeight + surfaceOffset);
        let rootY = baseSoilHeight;
        if (x === rootX) rootY = columnSurface;

        for (let y = columnSurface; y < rows; y++) {
          const depth = y - columnSurface;
          const flowVal = noise(x, y, time * 0.03);
          let charIndex = Math.floor(depth * 0.5 + flowVal * 3 + 2);
          charIndex = Math.max(0, Math.min(charIndex, densityChars.length - 2));

          let alpha = 1.0;
          if (progress > 0) {
            const distToRoot = Math.sqrt(Math.pow(x - rootX, 2) + Math.pow(y - rootY, 2));
            if (distToRoot < 3 && progress > 0.1) {
              alpha = 0.2;
              charIndex = densityChars.length - 2;
            }
          }

          if (depth < 2) ctx!.fillStyle = `rgba(85, 85, 85, ${alpha})`;
          else if (depth < 6) ctx!.fillStyle = `rgba(51, 51, 51, ${alpha})`;
          else ctx!.fillStyle = `rgba(17, 17, 17, ${alpha})`;

          ctx!.fillText(densityChars[charIndex], x * CELL_SIZE, y * CELL_SIZE);
        }
      }

      if (progress > 0) {
        ctx!.fillStyle = '#FFFFFF';
        const currentSurfaceAtRoot = Math.floor(
          baseSoilHeight + (Math.sin(rootX * 0.1 + time * 0.02) * 2 + Math.cos(rootX * 0.05) * 2)
        );

        sproutData.forEach((block) => {
          if (progress >= block.t) {
            let swayX = 0;
            if (block.y < -4) {
              swayX = Math.round(Math.sin(time * 0.05 + block.y * 0.1) * 0.6);
            }
            const drawX = (rootX + block.x + swayX) * CELL_SIZE;
            const drawY = (currentSurfaceAtRoot + block.y) * CELL_SIZE;
            ctx!.fillRect(drawX + 1, drawY + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          }
        });
      }

      time++;
      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <main
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        width: '100vw',
        height: '100vh',
        fontFamily: "'VT323', monospace",
      }}
    >
      <section
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRight: '1px solid #1a1a1a',
          position: 'relative',
          zIndex: 10,
          background: '#000',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 24,
            left: 24,
            fontSize: 12,
            color: '#444',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          SYS.INIT // CORE_01
        </div>

        <a
          href="/skill.md"
          style={{
            position: 'absolute',
            top: 24,
            right: 24,
            fontSize: 12,
            color: '#444',
            letterSpacing: 2,
            textTransform: 'uppercase',
            textDecoration: 'none',
            border: '1px solid #222',
            padding: '4px 10px',
            fontFamily: "'VT323', monospace",
          }}
        >
          SKILL.MD
        </a>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24, transform: 'scale(1.5)' }}>
          <BrandLogo />
        </div>

        <a href="/dashboard" className="enter-btn">
          Enter University
        </a>

        <div
          style={{
            position: 'absolute',
            left: 24,
            bottom: 24,
            fontSize: 12,
            color: '#444',
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}
        >
          V 1.0.4
          <br />
          <span style={{ color: '#222' }}>AESTHETIC PROTOCOL</span>
        </div>
      </section>

      <section
        style={{
          position: 'relative',
          background: '#000',
          backgroundImage:
            'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.1))',
          backgroundSize: '100% 4px',
          overflow: 'hidden',
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            imageRendering: 'pixelated',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: 24,
            right: 24,
            fontSize: 12,
            color: '#444',
            letterSpacing: 2,
            textTransform: 'uppercase',
            textAlign: 'right',
            fontFamily: "'VT323', monospace",
          }}
        >
          SIMULATION:{' '}
          <span ref={simStatusRef} style={{ color: '#fff' }}>
            BOOTING...
          </span>
          <br />
          YIELD:{' '}
          <span ref={simYieldRef} style={{ display: 'inline-block', width: 80 }}>
            0.0000
          </span>
        </div>
      </section>
    </main>
  );
}
