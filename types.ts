export enum GameMode {
  MENU = 'MENU',
  ONE_PLAYER = 'ONE_PLAYER',
  VERSUS = 'VERSUS',
  COOP = 'COOP',
  COOP_4P = 'COOP_4P',
  SURVIVOR = 'SURVIVOR',
  PRACTICE = 'PRACTICE',
  BOSS_RUSH = 'BOSS_RUSH',
}

export interface Vector2 {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  pos: Vector2;
  size: Vector2;
  color: string;
  active: boolean;
}

export interface Paddle extends Entity {
  playerId: number;
  velocity: Vector2;
  isSuperCharged: boolean;
  ammo: number;
  superMeter: number; // 0-100
  zone: 'left' | 'right' | 'full';
  width: number;
  height: number;
  rocketCooldown: number;
  dashCooldown: number;
  isDashing: boolean;
}

export interface Ball extends Entity {
  velocity: Vector2;
  radius: number;
  damage: number;
  isSuper: boolean; // Overdrive mode
  lastHitByPlayerId: number | null;
}

export interface Brick extends Entity {
  hp: number;
  type: 'normal' | 'explosive' | 'hard' | 'regen' | 'shield';
  value: number;
  maxHp: number;
}

export interface Particle extends Entity {
  velocity: Vector2;
  life: number;
  maxLife: number;
  rotation: number;
  rotationSpeed: number;
}

export interface PowerUp extends Entity {
  type: 'rocket' | 'wide' | 'super' | 'life';
  velocity: Vector2;
}

export interface Projectile extends Entity {
  velocity: Vector2;
  ownerId: number;
  trailTimer: number;
}

export interface Boss extends Entity {
  hp: number;
  maxHp: number;
  phase: number;
  attackTimer: number;
  pattern: 'idle' | 'spray' | 'laser' | 'burst';
}

export interface GameState {
  mode: GameMode;
  paddles: Paddle[];
  balls: Ball[];
  bricks: Brick[];
  particles: Particle[];
  powerUps: PowerUp[];
  projectiles: Projectile[];
  boss: Boss | null;
  score: number[]; // Index by playerId (or team)
  lives: number;
  combo: number;
  timeRemaining: number; // Seconds
  isGameOver: boolean;
  isPaused: boolean;
  screenShake: number;
  level: number;
  startTimer: number; // Countdown timer
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  action: boolean; // Fire
  dash: boolean;   // Secondary action
  start: boolean; // Pause / Menu
}