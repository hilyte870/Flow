export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 800;

export const PADDLE_WIDTH = 100;
export const PADDLE_HEIGHT = 20;
export const PADDLE_SPEED = 8;
export const BALL_SPEED_BASE = 6;
export const BALL_RADIUS = 8;

export const BRICK_ROWS = 6;
export const BRICK_COLS = 10;
export const BRICK_WIDTH = 80;
export const BRICK_HEIGHT = 30;
export const BRICK_GAP = 10;
export const BRICK_START_Y = 50;

export const GRAVITY = 0.1;
export const FRICTION = 0.95;

export const COLORS = {
  P1: '#00ffff', // Cyan
  P2: '#ff00ff', // Magenta
  P3: '#00ff00', // Lime
  P4: '#ffff00', // Yellow
  BALL: '#ffffff',
  BRICK_GRADIENT_START: '#ff0000',
  BRICK_GRADIENT_END: '#8a2be2',
  BOSS: '#ff3333',
  TEXT_NEON: '#00ffde',
};

export const GAME_DURATION_VERSUS = 180; // 3 minutes
export const MAX_LIVES = 3;
export const SURVIVOR_LIVES = 1;

export const KEYS = {
  P1: {
    UP: ['KeyW'],
    DOWN: ['KeyS'],
    LEFT: ['KeyA'],
    RIGHT: ['KeyD'],
    ACTION: ['Space', 'ShiftLeft'],
  },
  P2: {
    UP: ['ArrowUp'],
    DOWN: ['ArrowDown'],
    LEFT: ['ArrowLeft'],
    RIGHT: ['ArrowRight'],
    ACTION: ['Enter', 'ShiftRight'],
  },
};
