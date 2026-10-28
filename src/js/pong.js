/**
 * Full-Screen Canvas Pong Mini-Game ("Zambales Pong Arcade")
 * - Triggered by "Challenge the Zambales Pong AI" button in Footer or Nav "Arcade" link
 * - Supports keyboard (W/S, ArrowUp/ArrowDown) and pointer/touch drag on the canvas
 * - Includes AI opponent, live score readout, rally speed-up, Esc/button to close
 * - Pauses page scroll and ambient audio while open
 */

import { lockScroll, unlockScroll } from './smooth-scroll.js';
import { setOverlayAudioPause, playPongBeep, playClickSound } from './sound.js';
import { clamp } from './utils.js';

export function initPong() {
  const modal = document.getElementById('pong-modal');
  const openBtns = document.querySelectorAll('[data-open-pong]');
  const closeBtn = document.getElementById('pong-close-btn');
  const resetBtn = document.getElementById('pong-reset-btn');
  const canvas = /** @type {HTMLCanvasElement | null} */ (document.getElementById('pong-canvas'));
  const scorePlayerEl = document.getElementById('pong-score-player');
  const scoreAiEl = document.getElementById('pong-score-ai');
  const statusBannerEl = document.getElementById('pong-status-text');

  if (!modal || !canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let isOpen = false;
  let rafId = 0;

  const WIDTH = 800;
  const HEIGHT = 450;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;

  const PADDLE_W = 12;
  const PADDLE_H = 82;
  const BALL_R = 7;

  const state = {
    playerY: HEIGHT / 2 - PADDLE_H / 2,
    aiY: HEIGHT / 2 - PADDLE_H / 2,
    ballX: WIDTH / 2,
    ballY: HEIGHT / 2,
    vx: 5.5,
    vy: 3.4,
    playerScore: 0,
    aiScore: 0,
    upPressed: false,
    downPressed: false,
  };

  function resetBall(direction = 1) {
    state.ballX = WIDTH / 2;
    state.ballY = HEIGHT / 2;
    const speed = 5.6;
    const angle = (Math.random() * 0.5 - 0.25) * Math.PI;
    state.vx = direction * speed * Math.cos(angle);
    state.vy = speed * Math.sin(angle);
  }

  function updateScoresUI() {
    if (scorePlayerEl) scorePlayerEl.textContent = String(state.playerScore).padStart(2, '0');
    if (scoreAiEl) scoreAiEl.textContent = String(state.aiScore).padStart(2, '0');
  }

  function step() {
    // Player keyboard control
    if (state.upPressed) state.playerY -= 6.8;
    if (state.downPressed) state.playerY += 6.8;
    state.playerY = clamp(state.playerY, 12, HEIGHT - PADDLE_H - 12);

    // AI paddle tracking with subtle imperfection so player can win
    const aiCenter = state.aiY + PADDLE_H / 2;
    const targetY = state.vx > 0 ? state.ballY : HEIGHT / 2;
    const diff = targetY - aiCenter;
    state.aiY += clamp(diff * 0.085, -4.9, 4.9);
    state.aiY = clamp(state.aiY, 12, HEIGHT - PADDLE_H - 12);

    // Move ball
    state.ballX += state.vx;
    state.ballY += state.vy;

    // Top / Bottom wall bounce
    if (state.ballY - BALL_R <= 10) {
      state.ballY = 10 + BALL_R;
      state.vy *= -1;
      playPongBeep(420);
    } else if (state.ballY + BALL_R >= HEIGHT - 10) {
      state.ballY = HEIGHT - 10 - BALL_R;
      state.vy *= -1;
      playPongBeep(420);
    }

    // Left paddle (Player) collision
    const pLeft = 28;
    const pRight = pLeft + PADDLE_W;
    if (
      state.vx < 0 &&
      state.ballX - BALL_R <= pRight &&
      state.ballX - BALL_R >= pLeft - 8 &&
      state.ballY >= state.playerY &&
      state.ballY <= state.playerY + PADDLE_H
    ) {
      const hitPos = (state.ballY - (state.playerY + PADDLE_H / 2)) / (PADDLE_H / 2);
      const speed = Math.min(10.5, Math.hypot(state.vx, state.vy) * 1.05);
      const bounceAngle = hitPos * (Math.PI / 3.2);
      state.vx = Math.abs(speed * Math.cos(bounceAngle));
      state.vy = speed * Math.sin(bounceAngle);
      playPongBeep(640);
      if (statusBannerEl) statusBannerEl.textContent = 'Clean return · Database latency nominal';
    }

    // Right paddle (AI) collision
    const aiLeft = WIDTH - 28 - PADDLE_W;
    const aiRight = WIDTH - 28;
    if (
      state.vx > 0 &&
      state.ballX + BALL_R >= aiLeft &&
      state.ballX + BALL_R <= aiRight + 8 &&
      state.ballY >= state.aiY &&
      state.ballY <= state.aiY + PADDLE_H
    ) {
      const hitPos = (state.ballY - (state.aiY + PADDLE_H / 2)) / (PADDLE_H / 2);
      const speed = Math.min(10.5, Math.hypot(state.vx, state.vy) * 1.04);
      const bounceAngle = hitPos * (Math.PI / 3.2);
      state.vx = -Math.abs(speed * Math.cos(bounceAngle));
      state.vy = speed * Math.sin(bounceAngle);
      playPongBeep(520);
    }

    // Scoring
    if (state.ballX < 0) {
      state.aiScore += 1;
      updateScoresUI();
      playPongBeep(220);
      if (statusBannerEl) {
        statusBannerEl.textContent = 'Zambales AI scored · Blame it on a garbage collection pause';
      }
      resetBall(1);
    } else if (state.ballX > WIDTH) {
      state.playerScore += 1;
      updateScoresUI();
      playPongBeep(880);
      if (statusBannerEl) {
        statusBannerEl.textContent = 'Point to you! Even the PHP worker is impressed.';
      }
      resetBall(-1);
    }
  }

  function draw() {
    ctx.fillStyle = '#0B0E16';
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // Center dashed court line
    ctx.strokeStyle = 'rgba(244, 243, 239, 0.14)';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 10]);
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2, 16);
    ctx.lineTo(WIDTH / 2, HEIGHT - 16);
    ctx.stroke();
    ctx.setLineDash([]);

    // Player Paddle (Accent Orange)
    ctx.fillStyle = '#F97316';
    ctx.fillRect(28, state.playerY, PADDLE_W, PADDLE_H);

    // AI Paddle (Off-white)
    ctx.fillStyle = '#F4F3EF';
    ctx.fillRect(WIDTH - 28 - PADDLE_W, state.aiY, PADDLE_W, PADDLE_H);

    // Ball
    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.arc(state.ballX, state.ballY, BALL_R, 0, Math.PI * 2);
    ctx.fill();
  }

  function loop() {
    if (!isOpen) return;
    step();
    draw();
    rafId = requestAnimationFrame(loop);
  }

  function openPong() {
    if (isOpen) return;
    isOpen = true;
    playClickSound();
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    lockScroll();
    setOverlayAudioPause(true);
    resetBall(1);
    draw();
    rafId = requestAnimationFrame(loop);
    if (closeBtn) closeBtn.focus();
  }

  function closePong() {
    if (!isOpen) return;
    isOpen = false;
    cancelAnimationFrame(rafId);
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    setOverlayAudioPause(false);
    unlockScroll();
  }

  openBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openPong();
    });
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', closePong);
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      state.playerScore = 0;
      state.aiScore = 0;
      updateScoresUI();
      resetBall(1);
      if (statusBannerEl) statusBannerEl.textContent = 'Scoreboard reset · Fresh match started';
    });
  }

  // Pointer / Touch drag on canvas
  const onPointerMove = (e) => {
    if (!isOpen) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.height) return;
    const relY = ((e.clientY - rect.top) / rect.height) * HEIGHT;
    state.playerY = clamp(relY - PADDLE_H / 2, 12, HEIGHT - PADDLE_H - 12);
  };

  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener(
    'touchmove',
    (e) => {
      if (!isOpen || !e.touches[0]) return;
      const rect = canvas.getBoundingClientRect();
      const relY = ((e.touches[0].clientY - rect.top) / rect.height) * HEIGHT;
      state.playerY = clamp(relY - PADDLE_H / 2, 12, HEIGHT - PADDLE_H - 12);
    },
    { passive: true }
  );

  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    if (!isOpen) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      closePong();
      return;
    }
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      state.upPressed = true;
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      e.preventDefault();
      state.downPressed = true;
    }
  });

  window.addEventListener('keyup', (e) => {
    if (!isOpen) return;
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      state.upPressed = false;
    } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      state.downPressed = false;
    }
  });
}
