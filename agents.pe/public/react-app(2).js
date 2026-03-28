import React, { useEffect, useRef } from 'react';

const App = () => {
  const canvasRef = useRef(null);
  const brandContainerRef = useRef(null);
  const simStatusRef = useRef(null);
  const simYieldRef = useRef(null);
  const animFrameRef = useRef(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=VT323&display=swap');
      * { box-sizing: border-box; margin: 0; padding: 0; }
      html, body, #root { width: 100%; height: 100%; overflow: hidden; background: #000; }
      body { user-select: none; -webkit-font-smoothing: none; }
      #oasis-main {
        display: grid;
        grid-template-columns: 1fr 1fr;
        width: 100vw;
        height: 100vh;
      }
      .panel-left {
        display: flex;
        align-items: center;
        justify-content: center;
        border-right: 1px solid #1a1a1a;
        position: relative;
        z-index: 10;
        background: #000;
      }
      .panel-right {
        position: relative;
        background: #000;
        background-image: linear-gradient(
          to bottom,
          rgba(255,255,255,0),
          rgba(255,255,255,0) 50%,
          rgba(0,0,0,0.1) 50%,
          rgba(0,0,0,0.1)
        );
        background-size: 100% 4px;
        overflow: hidden;
      }
      #oasis-canvas {
        display: block;
        width: 100%;
        height: 100%;
        image-rendering: -moz-crisp-edges;
        image-rendering: -webkit-optimize-contrast;
        image-rendering: crisp-edges;
        image-rendering: pixelated;
      }
      .sys-label {
        position: absolute;
        font-size: 12px;
        color: #444;
        letter-spacing: 2px;
        text-transform: uppercase;
        font-family: 'VT323', monospace;
      }
      .label-top-left { top: 24px; left: 24px; }
      .label-bottom-right { bottom: 24px; right: 24px; text-align: right; }
      #brand-container {
        display: flex;
        align-items: center;
        gap: 24px;
        transform: scale(1.5);
      }
      #brand-container svg { shape-rendering: crispEdges; }
      .data-stream { display: inline-block; width: 80px; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    const buildBrandSVG = () => {
      const iconMatrix = [
        [0,0,0,0,1,0,1,0,0,0,0],
        [0,0,0,1,1,1,1,1,0,0,0],
        [0,0,1,1,0,1,0,1,1,0,0],
        [0,1,1,0,0,0,0,0,1,1,0],
        [1,1,0,0,1,1,1,0,0,1,1],
        [0,1,1,0,1,0,1,0,1,1,0],
        [1,1,0,0,1,1,1,0,0,1,1],
        [0,1,1,0,0,0,0,0,1,1,0],
        [0,0,1,1,0,1,0,1,1,0,0],
        [0,0,0,1,1,1,1,1,0,0,0],
        [0,0,0,0,1,0,1,0,0,0,0]
      ];
      const textMatrix = [
        [0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
        [0,1,1,0, 0,0,0,0, 0,1,1,0, 0,1,0,0, 0,1,1,0],
        [1,0,0,1, 0,1,1,1, 1,0,0,0, 0,0,0,0, 1,0,0,0],
        [1,0,0,1, 1,0,0,1, 0,1,1,0, 0,1,0,0, 0,1,1,0],
        [1,0,0,1, 1,0,0,1, 0,0,0,1, 0,1,0,0, 0,0,0,1],
        [0,1,1,0, 0,1,1,1, 1,1,1,0, 0,1,0,0, 1,1,1,0]
      ];
      const pixelSize = 4;
      const iconWidth = iconMatrix[0].length * pixelSize;
      const iconHeight = iconMatrix.length * pixelSize;
      const textWidth = textMatrix[0].length * pixelSize;
      const textHeight = textMatrix.length * pixelSize;
      const totalWidth = iconWidth + textWidth + 16;
      const totalHeight = Math.max(iconHeight, textHeight);

      let svgHTML = `<svg id="logo-svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" xmlns="http://www.w3.org/2000/svg">`;
      iconMatrix.forEach((row, y) => {
        row.forEach((val, x) => {
          if (val === 1) {
            svgHTML += `<rect x="${x * pixelSize}" y="${y * pixelSize}" width="${pixelSize}" height="${pixelSize}" fill="#FFF" />`;
          }
        });
      });
      const textOffsetX = iconWidth + 16;
      const textOffsetY = (iconHeight - textHeight) / 2 + 2;
      textMatrix.forEach((row, y) => {
        row.forEach((val, x) => {
          if (val === 1) {
            svgHTML += `<rect x="${textOffsetX + x * pixelSize}" y="${textOffsetY + y * pixelSize}" width="${pixelSize}" height="${pixelSize}" fill="#FFF" />`;
          }
        });
      });
      svgHTML += `</svg>`;
      if (brandContainerRef.current) {
        brandContainerRef.current.innerHTML = svgHTML;
      }
    };

    buildBrandSVG();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });

    const CELL_SIZE = 14;
    let cols, rows;
    let time = 0;
    const densityChars = ['@', '#', '&', '%', '*', '+', '=', '-', ':', '.', ' '];
    let simStartTime = Date.now() + 1500;
    let phase = 'INIT';

    const sproutData = [
      {x: 0, y: 0, t: 0.05},
      {x: 0, y: -1, t: 0.10},
      {x: 0, y: -2, t: 0.15},
      {x: 0, y: -3, t: 0.20},
      {x: 0, y: -4, t: 0.25},
      {x: 0, y: -5, t: 0.30},
      {x: 0, y: -6, t: 0.35},
      {x: 0, y: -7, t: 0.40},
      {x: -1, y: -4, t: 0.50},
      {x: -2, y: -5, t: 0.55},
      {x: -3, y: -5, t: 0.60},
      {x: -2, y: -4, t: 0.62},
      {x: 1, y: -5, t: 0.52},
      {x: 2, y: -6, t: 0.57},
      {x: 3, y: -6, t: 0.62},
      {x: 2, y: -5, t: 0.64},
      {x: -1, y: -8, t: 0.75},
      {x: 1, y: -8, t: 0.75},
      {x: 0, y: -9, t: 0.80},
      {x: -1, y: -10, t: 0.85},
      {x: 1, y: -10, t: 0.85},
      {x: 0, y: -11, t: 0.90},
      {x: 0, y: -13, t: 0.98}
    ];

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      cols = Math.ceil(canvas.width / CELL_SIZE);
      rows = Math.ceil(canvas.height / CELL_SIZE);
      ctx.font = `${CELL_SIZE}px "VT323", monospace`;
      ctx.textBaseline = 'top';
    }

    window.addEventListener('resize', resize);
    resize();

    function noise(x, y, t) {
      return Math.sin(x * 0.1 + t) + Math.cos(y * 0.1 - t) + Math.sin((x + y) * 0.05 + t * 0.5);
    }

    function draw() {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

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

      if (phase !== 'INIT') {
        if (simYieldRef.current) {
          simYieldRef.current.innerText = (progress * 99.99).toFixed(4);
        }
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
          let charIndex = Math.floor((depth * 0.5) + (flowVal * 3) + 2);
          charIndex = Math.max(0, Math.min(charIndex, densityChars.length - 2));

          let alpha = 1.0;
          if (progress > 0) {
            const distToRoot = Math.sqrt(Math.pow(x - rootX, 2) + Math.pow(y - rootY, 2));
            if (distToRoot < 3 && progress > 0.1) {
              alpha = 0.2;
              charIndex = densityChars.length - 2;
            }
          }

          if (depth < 2) ctx.fillStyle = `rgba(85, 85, 85, ${alpha})`;
          else if (depth < 6) ctx.fillStyle = `rgba(51, 51, 51, ${alpha})`;
          else ctx.fillStyle = `rgba(17, 17, 17, ${alpha})`;

          const char = densityChars[charIndex];
          ctx.fillText(char, x * CELL_SIZE, y * CELL_SIZE);
        }
      }

      if (progress > 0) {
        ctx.fillStyle = '#FFFFFF';
        const currentSurfaceAtRoot = Math.floor(baseSoilHeight + (Math.sin(rootX * 0.1 + time * 0.02) * 2 + Math.cos(rootX * 0.05) * 2));

        sproutData.forEach(block => {
          if (progress >= block.t) {
            let swayX = 0;
            if (block.y < -4) {
              swayX = Math.round(Math.sin(time * 0.05 + block.y * 0.1) * 0.6);
            }
            const drawX = (rootX + block.x + swayX) * CELL_SIZE;
            const drawY = (currentSurfaceAtRoot + block.y) * CELL_SIZE;
            ctx.fillRect(drawX + 1, drawY + 1, CELL_SIZE - 2, CELL_SIZE - 2);
          }
        });
      }

      time++;
      animFrameRef.current = requestAnimationFrame(draw);
    }

    animFrameRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  return (
    <div id="oasis-main">
      <section className="panel-left">
        <div className="sys-label label-top-left">SYS.INIT // CORE_01</div>
        <div id="brand-container" ref={brandContainerRef}></div>
        <div
          className="sys-label"
          style={{ left: 24, bottom: 24, position: 'absolute', textAlign: 'left', fontFamily: "'VT323', monospace" }}
        >
          V 1.0.4<br />
          <span style={{ color: '#222' }}>AESTHETIC PROTOCOL</span>
        </div>
      </section>

      <section className="panel-right">
        <canvas id="oasis-canvas" ref={canvasRef}></canvas>
        <div className="sys-label label-bottom-right">
          SIMULATION: <span ref={simStatusRef} style={{ color: '#fff' }}>BOOTING...</span><br />
          YIELD: <span className="data-stream" ref={simYieldRef}>0.0000</span>
        </div>
      </section>
    </div>
  );
};

export default App;