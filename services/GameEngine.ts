import { 
  GameState, GameMode, Paddle, Ball, Brick, Particle, PowerUp, Projectile, Boss, Vector2, InputState, Entity 
} from '../types';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_SPEED, 
  BALL_RADIUS, BALL_SPEED_BASE, BRICK_WIDTH, BRICK_HEIGHT, BRICK_ROWS, BRICK_COLS, 
  BRICK_GAP, BRICK_START_Y, COLORS, SURVIVOR_LIVES, MAX_LIVES, GAME_DURATION_VERSUS 
} from '../constants';
import { soundService } from './SoundService';

export class GameEngine {
  private state: GameState;
  private flowTime: number = 0;

  constructor() {
    this.state = this.getInitialState(GameMode.MENU);
  }

  public getInitialState(mode: GameMode): GameState {
    const isBoss = mode === GameMode.BOSS_RUSH;
    const is4P = mode === GameMode.COOP_4P;
    
    // Initialize Paddles
    const paddles: Paddle[] = [];
    
    // P1 (Bottom Left)
    paddles.push({
      id: 'p1', playerId: 0, pos: { x: CANVAS_WIDTH * 0.25, y: CANVAS_HEIGHT - 60 },
      size: { x: PADDLE_WIDTH, y: PADDLE_HEIGHT }, color: COLORS.P1, active: true,
      velocity: { x: 0, y: 0 }, isSuperCharged: false, ammo: 0, superMeter: 0, zone: 'left',
      width: PADDLE_WIDTH, height: PADDLE_HEIGHT, rocketCooldown: 0
    });

    // P2 (Bottom Right)
    paddles.push({
      id: 'p2', playerId: 1, pos: { x: CANVAS_WIDTH * 0.75, y: CANVAS_HEIGHT - 60 },
      size: { x: PADDLE_WIDTH, y: PADDLE_HEIGHT }, color: COLORS.P2, active: true,
      velocity: { x: 0, y: 0 }, isSuperCharged: false, ammo: 0, superMeter: 0, zone: 'right',
      width: PADDLE_WIDTH, height: PADDLE_HEIGHT, rocketCooldown: 0
    });

    if (is4P) {
      // P3 (Top Left)
      paddles.push({
        id: 'p3', playerId: 2, pos: { x: CANVAS_WIDTH * 0.25, y: CANVAS_HEIGHT - 140 },
        size: { x: PADDLE_WIDTH, y: PADDLE_HEIGHT }, color: COLORS.P3, active: true,
        velocity: { x: 0, y: 0 }, isSuperCharged: false, ammo: 0, superMeter: 0, zone: 'left',
        width: PADDLE_WIDTH, height: PADDLE_HEIGHT, rocketCooldown: 0
      });
      // P4 (Top Right)
      paddles.push({
        id: 'p4', playerId: 3, pos: { x: CANVAS_WIDTH * 0.75, y: CANVAS_HEIGHT - 140 },
        size: { x: PADDLE_WIDTH, y: PADDLE_HEIGHT }, color: COLORS.P4, active: true,
        velocity: { x: 0, y: 0 }, isSuperCharged: false, ammo: 0, superMeter: 0, zone: 'right',
        width: PADDLE_WIDTH, height: PADDLE_HEIGHT, rocketCooldown: 0
      });
    }

    const balls: Ball[] = [{
      id: 'b1', pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
      size: { x: BALL_RADIUS * 2, y: BALL_RADIUS * 2 }, color: COLORS.BALL,
      velocity: { x: (Math.random() > 0.5 ? 1 : -1) * BALL_SPEED_BASE, y: -BALL_SPEED_BASE },
      radius: BALL_RADIUS, active: true, damage: 10, isSuper: false, lastHitByPlayerId: null
    }];

    const bricks: Brick[] = [];
    if (!isBoss) {
      for (let r = 0; r < BRICK_ROWS; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          const type = Math.random() > 0.9 ? 'explosive' : (Math.random() > 0.8 ? 'hard' : 'normal');
          bricks.push({
            id: `brick-${r}-${c}`,
            pos: { 
              x: c * (BRICK_WIDTH + BRICK_GAP) + (CANVAS_WIDTH - (BRICK_COLS * (BRICK_WIDTH + BRICK_GAP))) / 2, 
              y: BRICK_START_Y + r * (BRICK_HEIGHT + BRICK_GAP) 
            },
            size: { x: BRICK_WIDTH, y: BRICK_HEIGHT },
            color: type === 'explosive' ? '#ffaa00' : (type === 'hard' ? '#888888' : `hsl(${r * 40}, 70%, 50%)`),
            active: true,
            type: type,
            hp: type === 'hard' ? 2 : 1,
            maxHp: type === 'hard' ? 2 : 1,
            value: (BRICK_ROWS - r) * 10
          });
        }
      }
    }

    let boss: Boss | null = null;
    if (isBoss) {
      boss = {
        id: 'boss', pos: { x: CANVAS_WIDTH / 2 - 100, y: 80 },
        size: { x: 200, y: 100 }, color: COLORS.BOSS, active: true,
        hp: 1000, maxHp: 1000, phase: 1, attackTimer: 0
      };
    }

    let lives = MAX_LIVES;
    if (mode === GameMode.SURVIVOR) lives = SURVIVOR_LIVES;
    if (mode === GameMode.PRACTICE) lives = 999;

    this.flowTime = 0;

    return {
      mode,
      paddles,
      balls,
      bricks,
      particles: [],
      powerUps: [],
      projectiles: [],
      boss,
      score: [0, 0, 0, 0],
      lives,
      combo: 0,
      timeRemaining: mode === GameMode.VERSUS ? GAME_DURATION_VERSUS : 0,
      isGameOver: false,
      isPaused: false,
      screenShake: 0,
      level: 1,
      startTimer: 3 // 3 Seconds countdown
    };
  }

  public update(deltaTime: number, inputs: InputState[]) {
    if (this.state.isPaused || this.state.isGameOver) return;

    // Countdown Logic
    if (this.state.startTimer > 0) {
      this.state.startTimer -= deltaTime;
      if (this.state.startTimer < 0) this.state.startTimer = 0;
      // Only update paddles during countdown so players can get ready
      this.updatePaddles(deltaTime, inputs);
      return; 
    }

    this.flowTime += deltaTime;
    this.updatePaddles(deltaTime, inputs);
    this.updateBalls();
    this.updateProjectiles(deltaTime);
    this.updatePowerUps();
    this.updateParticles();
    this.updateBoss(deltaTime);
    this.checkCollisions();
    
    // Screen shake decay
    if (this.state.screenShake > 0) {
      this.state.screenShake *= 0.9;
      if (this.state.screenShake < 0.5) this.state.screenShake = 0;
    }

    // Timer for Versus
    if (this.state.mode === GameMode.VERSUS && this.state.timeRemaining > 0) {
      this.state.timeRemaining -= deltaTime;
      if (this.state.timeRemaining <= 0) {
        this.state.isGameOver = true;
      }
    }

    // Bricks Flow Effect and Drift
    if (!this.state.boss) {
       this.state.bricks.forEach(b => {
           if(b.active) {
             // Downward drift
             b.pos.y += 0.05; 
             // "Flow" effect: Horizontal sine wave logic (Position = Base + Sine)
             // Simulating this by adding velocity based on sine
             // A cleaner visual effect that moves them left/right gently
             const flowVelocity = Math.cos(this.flowTime * 1.5 + b.pos.y * 0.01) * 0.8;
             b.pos.x += flowVelocity;
             
             if(b.pos.y > CANVAS_HEIGHT - 100) this.state.isGameOver = true; // Crushed
           }
       });
    }
  }

  private updatePaddles(deltaTime: number, inputs: InputState[]) {
    this.state.paddles.forEach(p => {
      const input = inputs[p.playerId];
      if (!input) return;

      if (input.left) p.pos.x -= PADDLE_SPEED;
      if (input.right) p.pos.x += PADDLE_SPEED;

      // Zone constraint
      if (p.zone === 'left') {
        p.pos.x = Math.max(0, Math.min(CANVAS_WIDTH / 2 - p.size.x, p.pos.x));
      } else {
        p.pos.x = Math.max(CANVAS_WIDTH / 2, Math.min(CANVAS_WIDTH - p.size.x, p.pos.x));
      }
      
      // Vertical movement (limited)
      if (input.up) p.pos.y = Math.max(CANVAS_HEIGHT * 0.6, p.pos.y - PADDLE_SPEED);
      if (input.down) p.pos.y = Math.min(CANVAS_HEIGHT - p.size.y - 10, p.pos.y + PADDLE_SPEED);

      // Decrement Cooldown
      if (p.rocketCooldown > 0) {
          p.rocketCooldown -= deltaTime;
          if (p.rocketCooldown < 0) p.rocketCooldown = 0;
      }

      // Firing with Cooldown (Only if game started)
      if (input.action && p.ammo > 0 && p.rocketCooldown === 0 && this.state.startTimer <= 0) {
          p.ammo--;
          p.rocketCooldown = 0.5; // Set cooldown to 0.5 seconds
          
          const spawnX = p.pos.x + p.size.x/2;
          const spawnY = p.pos.y;
          
          this.state.projectiles.push({
              id: `proj-${Date.now()}-${Math.random()}`,
              pos: { x: spawnX, y: spawnY },
              size: { x: 5, y: 15 },
              color: '#ffff00',
              active: true,
              velocity: { x: 0, y: -10 },
              ownerId: p.playerId,
              trailTimer: 0
          });

          // Visual burst effect
          this.createExplosion(spawnX, spawnY, 8, '#ffaa00');

          soundService.playRocketLaunch();
      }
    });
  }

  private updateBalls() {
    this.state.balls.forEach(b => {
      if (!b.active) return;
      b.pos.x += b.velocity.x;
      b.pos.y += b.velocity.y;

      // Wall collisions
      if (b.pos.x - b.radius < 0) {
        b.pos.x = b.radius;
        b.velocity.x *= -1;
        soundService.playHit();
      }
      if (b.pos.x + b.radius > CANVAS_WIDTH) {
        b.pos.x = CANVAS_WIDTH - b.radius;
        b.velocity.x *= -1;
        soundService.playHit();
      }
      if (b.pos.y - b.radius < 0) {
        b.pos.y = b.radius;
        b.velocity.y *= -1;
        soundService.playHit();
      }
      
      // Death
      if (b.pos.y - b.radius > CANVAS_HEIGHT) {
        b.active = false;
        this.handleLifeLost();
      }
    });
  }

  private handleLifeLost() {
    if (this.state.balls.some(b => b.active)) return; // Multiball active

    this.state.lives--;
    this.state.combo = 0;
    this.state.screenShake = 10;
    
    if (this.state.lives <= 0) {
      this.state.isGameOver = true;
    } else {
      // Respawn ball
      this.state.balls.push({
        id: `b-${Date.now()}`,
        pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
        size: { x: BALL_RADIUS * 2, y: BALL_RADIUS * 2 },
        color: COLORS.BALL,
        velocity: { x: (Math.random() > 0.5 ? 1 : -1) * BALL_SPEED_BASE, y: -BALL_SPEED_BASE },
        radius: BALL_RADIUS, active: true, damage: 10, isSuper: false, lastHitByPlayerId: null
      });
    }
  }

  private updateProjectiles(deltaTime: number) {
      this.state.projectiles.forEach(p => {
          p.pos.y += p.velocity.y;
          if (p.pos.y < 0) p.active = false;

          // Trail Effect
          p.trailTimer += deltaTime;
          if (p.trailTimer > 0.04) { // Slightly faster trail emission
              p.trailTimer = 0;
              this.state.particles.push({
                  id: `trail-${Date.now()}-${Math.random()}`,
                  pos: { x: p.pos.x + p.size.x / 2 + (Math.random()-0.5)*4, y: p.pos.y + p.size.y },
                  size: { x: 4, y: 4 },
                  color: p.color, // MATCH PROJECTILE COLOR
                  active: true,
                  velocity: { x: (Math.random() - 0.5) * 1, y: 1 }, 
                  life: 0.4, // SHORT LIVED
                  maxLife: 0.4,
                  rotation: Math.random() * 360,
                  rotationSpeed: (Math.random() - 0.5) * 10
              });
          }
      });
      this.state.projectiles = this.state.projectiles.filter(p => p.active);
  }

  private updatePowerUps() {
      this.state.powerUps.forEach(p => {
          p.pos.y += p.velocity.y;
          if (p.pos.y > CANVAS_HEIGHT) p.active = false;
      });
      this.state.powerUps = this.state.powerUps.filter(p => p.active);
  }

  private updateParticles() {
      this.state.particles.forEach(p => {
          p.pos.x += p.velocity.x;
          p.pos.y += p.velocity.y;
          p.life -= 0.02;
          p.rotation += p.rotationSpeed;
          if (p.life <= 0) p.active = false;
      });
      this.state.particles = this.state.particles.filter(p => p.active);
  }

  private updateBoss(dt: number) {
      if (!this.state.boss || !this.state.boss.active) return;
      
      const boss = this.state.boss;
      // Move side to side
      boss.pos.x = (CANVAS_WIDTH / 2 - 100) + Math.sin(Date.now() / 1000) * 200;

      // Boss Attack
      boss.attackTimer += dt;
      if (boss.attackTimer > 2) {
          boss.attackTimer = 0;
          // Spawn bricks or shoot
          const type = Math.random() > 0.5 ? 'rocket' : 'normal';
          this.state.projectiles.push({
              id: `boss-proj-${Date.now()}`,
              pos: { x: boss.pos.x + boss.size.x/2, y: boss.pos.y + boss.size.y },
              size: { x: 10, y: 20 },
              color: '#ff0000',
              active: true,
              velocity: { x: (Math.random() - 0.5) * 5, y: 5 },
              ownerId: -1, // Enemy
              trailTimer: 0
          });
      }

      if (boss.hp <= 0) {
          boss.active = false;
          this.createExplosion(boss.pos.x + boss.size.x/2, boss.pos.y + boss.size.y/2, 50, '#ff0000');
          this.state.isGameOver = true; // Win?
      }
  }

  private checkCollisions() {
    // Paddle vs Powerup
    this.state.paddles.forEach(paddle => {
        this.state.powerUps.forEach(pu => {
            if (this.rectIntersect(paddle, pu)) {
                pu.active = false;
                soundService.playPowerUp();
                this.applyPowerUp(paddle, pu);
            }
        });
    });

    // Projectile vs Brick/Boss
    this.state.projectiles.forEach(proj => {
        if (!proj.active) return;
        if (proj.ownerId === -1) {
             // Enemy projectile hits paddle?
             this.state.paddles.forEach(pad => {
                 if (this.rectIntersect(pad, proj)) {
                     proj.active = false;
                     this.state.lives--; // Ouch
                     this.state.screenShake = 5;
                     soundService.playExplosion();
                 }
             });
             return;
        }

        this.state.bricks.forEach(brick => {
            if (brick.active && this.rectIntersect(brick, proj)) {
                brick.hp--;
                proj.active = false;
                if (brick.hp <= 0) this.destroyBrick(brick);
                
                // Enhanced Rocket Impact
                this.createExplosion(brick.pos.x + brick.size.x/2, brick.pos.y + brick.size.y/2, 15, '#ff6600');
            }
        });
        if (this.state.boss && this.state.boss.active && this.rectIntersect(this.state.boss, proj)) {
            this.state.boss.hp -= 10;
            proj.active = false;
            this.state.screenShake = 2;
            soundService.playHit();
            this.createExplosion(proj.pos.x, proj.pos.y, 15, '#ff6600');
        }
    });

    // Ball Collisions
    this.state.balls.forEach(ball => {
        // Paddle
        this.state.paddles.forEach(paddle => {
            if (this.ballRectIntersect(ball, paddle)) {
                ball.velocity.y = -Math.abs(ball.velocity.y);
                // English/Spin based on hit position
                const hitPoint = ball.pos.x - (paddle.pos.x + paddle.size.x / 2);
                ball.velocity.x = hitPoint * 0.15; 
                ball.lastHitByPlayerId = paddle.playerId;
                
                // Super charge check
                paddle.superMeter = Math.min(100, paddle.superMeter + 5);
                
                soundService.playHit();
            }
        });

        // Bricks
        this.state.bricks.forEach(brick => {
            if (brick.active && this.ballRectIntersect(ball, brick)) {
                brick.hp -= ball.damage;
                ball.velocity.y *= -1; // Simple bounce
                if (brick.hp <= 0) {
                    this.destroyBrick(brick);
                    if (ball.lastHitByPlayerId !== null) {
                        this.state.score[ball.lastHitByPlayerId] += brick.value * (1 + this.state.combo * 0.1);
                    }
                    this.state.combo++;
                } else {
                    soundService.playHit();
                }
            }
        });

        // Boss
        if (this.state.boss && this.state.boss.active && this.ballRectIntersect(ball, this.state.boss)) {
             ball.velocity.y *= -1;
             this.state.boss.hp -= ball.damage;
             soundService.playHit();
             this.createExplosion(ball.pos.x, ball.pos.y, 5, '#fff');
        }
    });
  }

  private destroyBrick(brick: Brick) {
      brick.active = false;
      this.state.screenShake = 5;
      this.createExplosion(brick.pos.x + brick.size.x/2, brick.pos.y + brick.size.y/2, 10, brick.color);
      soundService.playExplosion();
      
      // Chance for powerup
      if (Math.random() < 0.2) {
          const type = Math.random() < 0.5 ? 'rocket' : 'wide';
          this.state.powerUps.push({
              id: `pu-${Date.now()}`,
              pos: { x: brick.pos.x + brick.size.x/2, y: brick.pos.y },
              size: { x: 20, y: 20 },
              color: '#00ff00',
              active: true,
              type: type,
              velocity: { x: 0, y: 2 }
          });
      }
  }

  private applyPowerUp(paddle: Paddle, pu: PowerUp) {
      if (pu.type === 'rocket') {
          paddle.ammo += 5;
      } else if (pu.type === 'wide') {
          paddle.size.x += 20;
          setTimeout(() => paddle.size.x -= 20, 10000);
      }
  }

  private createExplosion(x: number, y: number, count: number, color: string) {
      for(let i=0; i<count; i++) {
          this.state.particles.push({
              id: `p-${Math.random()}`,
              pos: { x, y },
              size: { x: 4, y: 4 },
              color: color,
              active: true,
              velocity: { x: (Math.random() - 0.5) * 12, y: (Math.random() - 0.5) * 12 }, // More velocity spread
              life: 1.2, // Slightly longer life
              maxLife: 1.2,
              rotation: Math.random() * 360,
              rotationSpeed: (Math.random() - 0.5) * 15
          });
      }
  }

  // Utils
  private rectIntersect(r1: Entity, r2: Entity) {
      return !(r2.pos.x > r1.pos.x + r1.size.x || 
               r2.pos.x + r2.size.x < r1.pos.x || 
               r2.pos.y > r1.pos.y + r1.size.y || 
               r2.pos.y + r2.size.y < r1.pos.y);
  }

  private ballRectIntersect(ball: Ball, rect: Entity) {
      // Find closest point on rect to circle center
      const closestX = Math.max(rect.pos.x, Math.min(ball.pos.x, rect.pos.x + rect.size.x));
      const closestY = Math.max(rect.pos.y, Math.min(ball.pos.y, rect.pos.y + rect.size.y));

      const dx = ball.pos.x - closestX;
      const dy = ball.pos.y - closestY;

      return (dx * dx + dy * dy) < (ball.radius * ball.radius);
  }

  public getState() {
      return this.state;
  }

  public draw(ctx: CanvasRenderingContext2D) {
      const { width, height } = ctx.canvas;
      
      // Clear
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      // Shake
      ctx.save();
      if (this.state.screenShake > 0) {
          const dx = (Math.random() - 0.5) * this.state.screenShake;
          const dy = (Math.random() - 0.5) * this.state.screenShake;
          ctx.translate(dx, dy);
      }

      // Draw Bricks
      this.state.bricks.forEach(b => {
          if (!b.active) return;
          this.drawMetalRect(ctx, b.pos.x, b.pos.y, b.size.x, b.size.y, b.color);
          // Electric arc effect if explosive
          if (b.type === 'explosive' && Math.random() > 0.9) {
              ctx.strokeStyle = '#fff';
              ctx.beginPath();
              ctx.moveTo(b.pos.x, b.pos.y);
              ctx.lineTo(b.pos.x + Math.random()*b.size.x, b.pos.y + Math.random()*b.size.y);
              ctx.stroke();
          }
      });

      // Draw Paddles
      this.state.paddles.forEach(p => {
          if (!p.active) return;
          this.drawMetalRect(ctx, p.pos.x, p.pos.y, p.size.x, p.size.y, p.color);
          // Ammo indicator
          if (p.ammo > 0) {
              ctx.fillStyle = '#ff0000';
              for(let i=0; i<p.ammo; i++) {
                  ctx.fillRect(p.pos.x + i*5, p.pos.y - 5, 4, 4);
              }
              // Cooldown Indicator (white bar under paddle)
              if (p.rocketCooldown > 0) {
                  ctx.fillStyle = '#ffffff';
                  ctx.fillRect(p.pos.x, p.pos.y + p.size.y + 2, p.size.x * (p.rocketCooldown / 0.5), 2);
              }
          }
      });

      // Draw Boss
      if (this.state.boss && this.state.boss.active) {
          this.drawMetalRect(ctx, this.state.boss.pos.x, this.state.boss.pos.y, this.state.boss.size.x, this.state.boss.size.y, COLORS.BOSS);
          // Health Bar
          ctx.fillStyle = 'red';
          ctx.fillRect(this.state.boss.pos.x, this.state.boss.pos.y - 20, this.state.boss.size.x * (this.state.boss.hp / this.state.boss.maxHp), 10);
      }

      // Draw Balls
      this.state.balls.forEach(b => {
          if (!b.active) return;
          ctx.beginPath();
          ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2);
          ctx.fillStyle = b.isSuper ? '#ff0000' : b.color;
          ctx.fill();
          ctx.shadowBlur = 10;
          ctx.shadowColor = b.isSuper ? '#ff0000' : '#fff';
          ctx.fill();
          ctx.shadowBlur = 0;
      });

      // Draw Particles
      this.state.particles.forEach(p => {
          ctx.save();
          ctx.translate(p.pos.x, p.pos.y);
          ctx.rotate(p.rotation * Math.PI / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.fillRect(-p.size.x/2, -p.size.y/2, p.size.x, p.size.y);
          ctx.restore();
      });

      // Draw Projectiles
      this.state.projectiles.forEach(p => {
          ctx.fillStyle = p.color;
          ctx.fillRect(p.pos.x, p.pos.y, p.size.x, p.size.y);
      });

      // Draw Powerups
      this.state.powerUps.forEach(p => {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.pos.x, p.pos.y, 10, 0, Math.PI*2);
          ctx.fill();
          ctx.fillStyle = '#000';
          ctx.font = '10px Orbitron';
          ctx.fillText(p.type[0].toUpperCase(), p.pos.x - 3, p.pos.y + 3);
      });

      ctx.restore();
  }

  private drawMetalRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
      const grad = ctx.createLinearGradient(x, y, x, y + h);
      grad.addColorStop(0, '#ffffff');
      grad.addColorStop(0.2, color);
      grad.addColorStop(0.5, '#333'); // Metallic middle
      grad.addColorStop(0.8, color);
      grad.addColorStop(1, '#000');
      
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
      
      // Outline
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
  }
}