import { 
  GameState, GameMode, Paddle, Ball, Brick, Particle, PowerUp, Projectile, Boss, Vector2, InputState, Entity 
} from '../types';
import { 
  CANVAS_WIDTH, CANVAS_HEIGHT, PADDLE_WIDTH, PADDLE_HEIGHT, PADDLE_SPEED, PADDLE_DASH_SPEED, DASH_COOLDOWN, DASH_DURATION,
  BALL_RADIUS, BALL_SPEED_BASE, SUPER_BALL_SPEED_MULT, SUPER_BALL_DAMAGE,
  BRICK_WIDTH, BRICK_HEIGHT, BRICK_ROWS, BRICK_COLS, BRICK_GAP, BRICK_START_Y, 
  COLORS, SURVIVOR_LIVES, MAX_LIVES, GAME_DURATION_VERSUS 
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
    const isOnePlayer = mode === GameMode.ONE_PLAYER;
    
    // Initialize Paddles
    const paddles: Paddle[] = [];
    
    const createPaddle = (id: string, playerId: number, x: number, y: number, color: string, zone: 'left' | 'right' | 'full'): Paddle => ({
      id, playerId, pos: { x, y },
      size: { x: PADDLE_WIDTH, y: PADDLE_HEIGHT }, color, active: true,
      velocity: { x: 0, y: 0 }, isSuperCharged: false, ammo: 0, superMeter: 0, zone,
      width: PADDLE_WIDTH, height: PADDLE_HEIGHT, rocketCooldown: 0, dashCooldown: 0, isDashing: false
    });

    if (isOnePlayer) {
       paddles.push(createPaddle('p1', 0, CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2, CANVAS_HEIGHT - 60, COLORS.P1, 'full'));
    } else {
       paddles.push(createPaddle('p1', 0, CANVAS_WIDTH * 0.25, CANVAS_HEIGHT - 60, COLORS.P1, 'left'));
       paddles.push(createPaddle('p2', 1, CANVAS_WIDTH * 0.75, CANVAS_HEIGHT - 60, COLORS.P2, 'right'));
    }

    if (is4P) {
      paddles.push(createPaddle('p3', 2, CANVAS_WIDTH * 0.25, CANVAS_HEIGHT - 140, COLORS.P3, 'left'));
      paddles.push(createPaddle('p4', 3, CANVAS_WIDTH * 0.75, CANVAS_HEIGHT - 140, COLORS.P4, 'right'));
    }

    const balls: Ball[] = [{
      id: 'b1', pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
      size: { x: BALL_RADIUS * 2, y: BALL_RADIUS * 2 }, color: COLORS.BALL,
      velocity: { x: (Math.random() > 0.5 ? 1 : -1) * BALL_SPEED_BASE, y: -BALL_SPEED_BASE },
      radius: BALL_RADIUS, active: true, damage: 1, isSuper: false, lastHitByPlayerId: null
    }];

    const bricks: Brick[] = [];
    if (!isBoss) {
      for (let r = 0; r < BRICK_ROWS; r++) {
        for (let c = 0; c < BRICK_COLS; c++) {
          const rand = Math.random();
          // Brick Types: Explosive (10%), Shielded (15%), Hard (15%), Normal (60%)
          let type: Brick['type'] = 'normal';
          if (rand > 0.9) type = 'explosive';
          else if (rand > 0.75) type = 'shield';
          else if (rand > 0.6) type = 'hard';

          let hp = 1;
          if (type === 'hard') hp = 2;
          if (type === 'shield') hp = 3;

          let color = `hsl(${r * 40}, 70%, 50%)`;
          if (type === 'explosive') color = '#ffaa00';
          if (type === 'hard') color = '#888888';
          if (type === 'shield') color = '#00aaff'; // Cyan shield

          bricks.push({
            id: `brick-${r}-${c}`,
            pos: { 
              x: c * (BRICK_WIDTH + BRICK_GAP) + (CANVAS_WIDTH - (BRICK_COLS * (BRICK_WIDTH + BRICK_GAP))) / 2, 
              y: BRICK_START_Y + r * (BRICK_HEIGHT + BRICK_GAP) 
            },
            size: { x: BRICK_WIDTH, y: BRICK_HEIGHT },
            color, active: true, type, hp, maxHp: hp,
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
        hp: 1500, maxHp: 1500, phase: 1, attackTimer: 0, pattern: 'idle'
      };
    }

    let lives = MAX_LIVES;
    if (mode === GameMode.SURVIVOR) lives = SURVIVOR_LIVES;
    if (mode === GameMode.PRACTICE) lives = 999;

    this.flowTime = 0;

    return {
      mode, paddles, balls, bricks,
      particles: [], powerUps: [], projectiles: [], boss,
      score: [0, 0, 0, 0], lives, combo: 0,
      timeRemaining: mode === GameMode.VERSUS ? GAME_DURATION_VERSUS : 0,
      isGameOver: false, isPaused: false, screenShake: 0, level: 1, startTimer: 3
    };
  }

  public update(deltaTime: number, inputs: InputState[]) {
    if (this.state.isPaused || this.state.isGameOver) return;

    if (this.state.startTimer > 0) {
      this.state.startTimer -= deltaTime;
      if (this.state.startTimer < 0) this.state.startTimer = 0;
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
    
    if (this.state.screenShake > 0) {
      this.state.screenShake *= 0.9;
      if (this.state.screenShake < 0.5) this.state.screenShake = 0;
    }

    if (this.state.mode === GameMode.VERSUS && this.state.timeRemaining > 0) {
      this.state.timeRemaining -= deltaTime;
      if (this.state.timeRemaining <= 0) this.state.isGameOver = true;
    }

    if (!this.state.boss) {
       this.state.bricks.forEach(b => {
           if(b.active) {
             b.pos.y += 0.05; 
             const flowVelocity = Math.cos(this.flowTime * 1.5 + b.pos.y * 0.01) * 0.8;
             b.pos.x += flowVelocity;
             if(b.pos.y > CANVAS_HEIGHT - 100) this.state.isGameOver = true; 
           }
       });
    }
  }

  private updatePaddles(deltaTime: number, inputs: InputState[]) {
    this.state.paddles.forEach(p => {
      const input = inputs[p.playerId];
      if (!input) return;

      // Super Mode Activation
      if (p.superMeter >= 100) {
          p.isSuperCharged = true;
          this.activateSuperBall(p.playerId);
          p.superMeter = 0;
          soundService.playPowerUp();
      }

      // Dash Logic
      if (p.dashCooldown > 0) p.dashCooldown -= deltaTime;
      if (p.isDashing) {
          // Dash lasts for 0.15s
          // Since we don't track dash duration state separately, we check if cooldown is just started
          // A simpler way: use high drag/decay or a specific timer.
          // For now, let's just use input based dashing but high speed.
          // Let's implement a short burst state.
          if (p.dashCooldown < DASH_COOLDOWN - DASH_DURATION) {
              p.isDashing = false; 
          } else {
              // Create ghost trail
               if (Math.random() > 0.5) {
                   this.state.particles.push({
                       id: `dash-${Math.random()}`,
                       pos: { x: p.pos.x, y: p.pos.y },
                       size: { x: p.size.x, y: p.size.y },
                       color: p.color, active: true,
                       velocity: { x: 0, y: 0 }, life: 0.3, maxLife: 0.3, rotation: 0, rotationSpeed: 0
                   });
               }
          }
      }

      if (input.dash && p.dashCooldown <= 0) {
          p.isDashing = true;
          p.dashCooldown = DASH_COOLDOWN;
          soundService.playRocketLaunch(); // Reuse sharp sound for dash
          // Add burst at rear
          this.createExplosion(p.pos.x + p.size.x/2, p.pos.y + p.size.y, 5, '#fff');
      }

      const speed = p.isDashing ? PADDLE_DASH_SPEED : PADDLE_SPEED;

      if (input.left) p.pos.x -= speed;
      if (input.right) p.pos.x += speed;

      if (p.zone === 'left') {
        p.pos.x = Math.max(0, Math.min(CANVAS_WIDTH / 2 - p.size.x, p.pos.x));
      } else if (p.zone === 'right') {
        p.pos.x = Math.max(CANVAS_WIDTH / 2, Math.min(CANVAS_WIDTH - p.size.x, p.pos.x));
      } else if (p.zone === 'full') {
        p.pos.x = Math.max(0, Math.min(CANVAS_WIDTH - p.size.x, p.pos.x));
      }
      
      if (input.up) p.pos.y = Math.max(CANVAS_HEIGHT * 0.6, p.pos.y - speed);
      if (input.down) p.pos.y = Math.min(CANVAS_HEIGHT - p.size.y - 10, p.pos.y + speed);

      if (p.rocketCooldown > 0) {
          p.rocketCooldown -= deltaTime;
          if (p.rocketCooldown < 0) p.rocketCooldown = 0;
      }

      if (input.action && p.ammo > 0 && p.rocketCooldown === 0 && this.state.startTimer <= 0) {
          p.ammo--;
          p.rocketCooldown = 0.5;
          const spawnX = p.pos.x + p.size.x/2;
          const spawnY = p.pos.y;
          this.state.projectiles.push({
              id: `proj-${Date.now()}-${Math.random()}`,
              pos: { x: spawnX, y: spawnY },
              size: { x: 5, y: 15 }, color: '#ffff00', active: true,
              velocity: { x: 0, y: -10 }, ownerId: p.playerId, trailTimer: 0
          });
          this.createExplosion(spawnX, spawnY, 8, '#ffaa00');
          soundService.playRocketLaunch();
      }
    });
  }

  private activateSuperBall(playerId: number) {
      this.state.balls.forEach(b => {
          b.isSuper = true;
          b.damage = SUPER_BALL_DAMAGE;
          b.color = COLORS.BALL_SUPER;
          // Speed boost
          const speed = Math.sqrt(b.velocity.x**2 + b.velocity.y**2);
          const newSpeed = speed * SUPER_BALL_SPEED_MULT;
          const angle = Math.atan2(b.velocity.y, b.velocity.x);
          b.velocity.x = Math.cos(angle) * newSpeed;
          b.velocity.y = Math.sin(angle) * newSpeed;
          b.lastHitByPlayerId = playerId;
      });
      // Super mode lasts 10s then reverts (simplification: handled via color check or timer? Let's leave it perma for the ball's life or until dropped)
      // For gameplay balance, let's revert it after a while? 
      // Actually, standard brick breaker super balls usually last until lost. We keep it.
  }

  private updateBalls() {
    this.state.balls.forEach(b => {
      if (!b.active) return;
      b.pos.x += b.velocity.x;
      b.pos.y += b.velocity.y;

      // Super Ball Particles
      if (b.isSuper) {
          if (Math.random() > 0.2) {
            this.state.particles.push({
                id: `super-${Math.random()}`,
                pos: { x: b.pos.x + (Math.random()-0.5)*10, y: b.pos.y + (Math.random()-0.5)*10 },
                size: { x: 4, y: 4 }, color: COLORS.BALL_SUPER, active: true,
                velocity: { x: 0, y: 0 }, life: 0.3, maxLife: 0.3, rotation: 0, rotationSpeed: 0
            });
          }
      }

      if (b.pos.x - b.radius < 0) {
        b.pos.x = b.radius;
        b.velocity.x *= -1;
        soundService.playHit();
        this.createExplosion(b.pos.x, b.pos.y, 5, '#fff');
      }
      if (b.pos.x + b.radius > CANVAS_WIDTH) {
        b.pos.x = CANVAS_WIDTH - b.radius;
        b.velocity.x *= -1;
        soundService.playHit();
        this.createExplosion(b.pos.x, b.pos.y, 5, '#fff');
      }
      if (b.pos.y - b.radius < 0) {
        b.pos.y = b.radius;
        b.velocity.y *= -1;
        soundService.playHit();
        this.createExplosion(b.pos.x, b.pos.y, 5, '#fff');
      }
      
      if (b.pos.y - b.radius > CANVAS_HEIGHT) {
        b.active = false;
        this.handleLifeLost();
      }
    });
  }

  private handleLifeLost() {
    if (this.state.balls.some(b => b.active)) return; 
    this.state.lives--;
    this.state.combo = 0;
    this.state.screenShake = 10;
    if (this.state.lives <= 0) {
      this.state.isGameOver = true;
    } else {
      this.state.balls.push({
        id: `b-${Date.now()}`,
        pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
        size: { x: BALL_RADIUS * 2, y: BALL_RADIUS * 2 },
        color: COLORS.BALL,
        velocity: { x: (Math.random() > 0.5 ? 1 : -1) * BALL_SPEED_BASE, y: -BALL_SPEED_BASE },
        radius: BALL_RADIUS, active: true, damage: 1, isSuper: false, lastHitByPlayerId: null
      });
    }
  }

  private updateProjectiles(deltaTime: number) {
      this.state.projectiles.forEach(p => {
          p.pos.y += p.velocity.y;
          p.pos.x += p.velocity.x;
          if (p.pos.y < 0 || p.pos.y > CANVAS_HEIGHT) p.active = false;

          p.trailTimer += deltaTime;
          if (p.trailTimer > 0.04) { 
              p.trailTimer = 0;
              this.state.particles.push({
                  id: `trail-${Date.now()}-${Math.random()}`,
                  pos: { x: p.pos.x + p.size.x / 2 + (Math.random()-0.5)*4, y: p.pos.y + p.size.y },
                  size: { x: 4, y: 4 },
                  color: p.color, active: true,
                  velocity: { x: (Math.random() - 0.5) * 1, y: 1 }, 
                  life: 0.4, maxLife: 0.4,
                  rotation: Math.random() * 360, rotationSpeed: (Math.random() - 0.5) * 10
              });
          }
      });
      this.state.projectiles = this.state.projectiles.filter(p => p.active);
  }

  private updatePowerUps() {
      this.state.powerUps.forEach(p => {
          p.pos.y += p.velocity.y;
          if (p.pos.y > CANVAS_HEIGHT) p.active = false;
          // Sparkles
          if (Math.random() > 0.8) {
              this.state.particles.push({
                  id: `spark-${Math.random()}`,
                  pos: { x: p.pos.x + (Math.random()-0.5)*10, y: p.pos.y + (Math.random()-0.5)*10 },
                  size: { x: 2, y: 2 }, color: '#fff', active: true,
                  velocity: { x: 0, y: -1 }, life: 0.5, maxLife: 0.5, rotation: 0, rotationSpeed: 0
              });
          }
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

      // Phases based on HP
      const hpPercent = boss.hp / boss.maxHp;
      if (hpPercent < 0.3) {
          boss.phase = 3;
          boss.color = COLORS.BOSS_PHASE_3;
          boss.pattern = 'laser';
      } else if (hpPercent < 0.6) {
          boss.phase = 2;
          boss.color = COLORS.BOSS_PHASE_2;
          boss.pattern = 'spray';
      } else {
          boss.phase = 1;
          boss.color = COLORS.BOSS;
          boss.pattern = 'idle';
      }
      
      boss.pos.x = (CANVAS_WIDTH / 2 - 100) + Math.sin(Date.now() / (1000 / boss.phase)) * (200 + (boss.phase * 50));

      boss.attackTimer += dt;
      
      // Attack Patterns
      const attackRate = 3.0 / boss.phase; 
      if (boss.attackTimer > attackRate) {
          boss.attackTimer = 0;
          const centerX = boss.pos.x + boss.size.x/2;
          const centerY = boss.pos.y + boss.size.y;

          if (boss.pattern === 'idle') {
             // Single Shot
             this.spawnEnemyProjectile(centerX, centerY, 0, 5);
          } else if (boss.pattern === 'spray') {
             // 3 way spray
             this.spawnEnemyProjectile(centerX, centerY, -2, 5);
             this.spawnEnemyProjectile(centerX, centerY, 0, 5);
             this.spawnEnemyProjectile(centerX, centerY, 2, 5);
          } else if (boss.pattern === 'laser') {
             // Burst
             for(let i=-5; i<=5; i+=2) {
                 this.spawnEnemyProjectile(centerX, centerY, i, 6 + Math.abs(i));
             }
             this.state.screenShake = 5;
             soundService.playExplosion();
          }
      }

      if (boss.hp <= 0) {
          boss.active = false;
          this.createExplosion(boss.pos.x + boss.size.x/2, boss.pos.y + boss.size.y/2, 100, '#ff0000');
          this.state.isGameOver = true; 
      }
  }

  private spawnEnemyProjectile(x: number, y: number, vx: number, vy: number) {
      this.state.projectiles.push({
          id: `boss-proj-${Date.now()}-${Math.random()}`,
          pos: { x, y }, size: { x: 10, y: 20 }, color: '#ff0000', active: true,
          velocity: { x: vx, y: vy }, ownerId: -1, trailTimer: 0
      });
  }

  private checkCollisions() {
    this.state.paddles.forEach(paddle => {
        this.state.powerUps.forEach(pu => {
            if (this.rectIntersect(paddle, pu)) {
                pu.active = false;
                soundService.playPowerUp();
                this.createExplosion(pu.pos.x, pu.pos.y, 10, '#00ff00');
                this.applyPowerUp(paddle, pu);
            }
        });
    });

    this.state.projectiles.forEach(proj => {
        if (!proj.active) return;
        if (proj.ownerId === -1) {
             this.state.paddles.forEach(pad => {
                 if (this.rectIntersect(pad, proj)) {
                     proj.active = false;
                     this.state.lives--; 
                     this.state.screenShake = 5;
                     soundService.playExplosion();
                 }
             });
             return;
        }

        this.state.bricks.forEach(brick => {
            if (brick.active && this.rectIntersect(brick, proj)) {
                this.damageBrick(brick, 1);
                proj.active = false;
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

    this.state.balls.forEach(ball => {
        this.state.paddles.forEach(paddle => {
            if (this.ballRectIntersect(ball, paddle)) {
                ball.velocity.y = -Math.abs(ball.velocity.y);
                const hitPoint = ball.pos.x - (paddle.pos.x + paddle.size.x / 2);
                ball.velocity.x = hitPoint * 0.15; 
                ball.lastHitByPlayerId = paddle.playerId;
                paddle.superMeter = Math.min(100, paddle.superMeter + 10);
                soundService.playHit();
                this.createExplosion(ball.pos.x, ball.pos.y + 10, 5, '#00ffff');
            }
        });

        this.state.bricks.forEach(brick => {
            if (brick.active && this.ballRectIntersect(ball, brick)) {
                this.damageBrick(brick, ball.damage);
                if (!ball.isSuper) ball.velocity.y *= -1; // Super balls drill through
                
                if (ball.lastHitByPlayerId !== null) {
                    this.state.score[ball.lastHitByPlayerId] += brick.value * (1 + this.state.combo * 0.1);
                }
                soundService.playHit();
            }
        });

        if (this.state.boss && this.state.boss.active && this.ballRectIntersect(ball, this.state.boss)) {
             ball.velocity.y *= -1;
             this.state.boss.hp -= ball.damage * 5;
             soundService.playHit();
             this.createExplosion(ball.pos.x, ball.pos.y, 10, '#fff');
        }
    });
  }

  private damageBrick(brick: Brick, dmg: number) {
      if (brick.type === 'shield') {
          // Shield absorbs 1 damage but breaks
          brick.hp -= 1;
          if (brick.hp <= 1) { // Shield broken, now normal
              brick.type = 'normal';
              brick.color = `hsl(${Math.random()*360}, 70%, 50%)`;
              this.createExplosion(brick.pos.x + brick.size.x/2, brick.pos.y + brick.size.y/2, 10, '#00aaff'); // Shield shatter
          }
          return;
      }
      
      brick.hp -= dmg;
      if (brick.hp <= 0) {
          this.destroyBrick(brick);
      } else {
          // Visual feedback for hit
          brick.color = '#ffffff';
          setTimeout(() => {
              if (brick.active) {
                 if (brick.type === 'hard') brick.color = '#888888';
                 else brick.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
              }
          }, 50);
      }
  }

  private destroyBrick(brick: Brick) {
      if (!brick.active) return;
      brick.active = false;
      this.state.screenShake = 5;
      this.state.combo++;
      this.createExplosion(brick.pos.x + brick.size.x/2, brick.pos.y + brick.size.y/2, 15, brick.color);
      soundService.playExplosion();

      // Explosive Logic
      if (brick.type === 'explosive') {
          this.triggerExplosiveBrick(brick);
      }
      
      if (Math.random() < 0.25) { // Increased drop rate
          const types: PowerUp['type'][] = ['rocket', 'wide', 'super', 'life'];
          const type = types[Math.floor(Math.random() * types.length)];
          this.state.powerUps.push({
              id: `pu-${Date.now()}-${Math.random()}`,
              pos: { x: brick.pos.x + brick.size.x/2, y: brick.pos.y },
              size: { x: 20, y: 20 },
              color: type === 'super' ? '#ff00ff' : '#00ff00',
              active: true, type,
              velocity: { x: 0, y: 3 }
          });
      }
  }

  private triggerExplosiveBrick(source: Brick) {
      // Simple radius check
      const radius = 150;
      const center = { x: source.pos.x + source.size.x/2, y: source.pos.y + source.size.y/2 };
      
      this.createExplosion(center.x, center.y, 30, '#ffaa00');

      this.state.bricks.forEach(b => {
          if (!b.active || b.id === source.id) return;
          const bCenter = { x: b.pos.x + b.size.x/2, y: b.pos.y + b.size.y/2 };
          const dist = Math.sqrt((bCenter.x - center.x)**2 + (bCenter.y - center.y)**2);
          if (dist < radius) {
              this.damageBrick(b, 10); // Massive damage
          }
      });
  }

  private applyPowerUp(paddle: Paddle, pu: PowerUp) {
      if (pu.type === 'rocket') {
          paddle.ammo += 5;
      } else if (pu.type === 'wide') {
          paddle.size.x += 40;
          setTimeout(() => paddle.size.x -= 40, 10000);
      } else if (pu.type === 'super') {
          paddle.superMeter = 100; // Instant fill
      } else if (pu.type === 'life') {
          this.state.lives++;
      }
  }

  private createExplosion(x: number, y: number, count: number, color: string) {
      for(let i=0; i<count; i++) {
          this.state.particles.push({
              id: `p-${Math.random()}`,
              pos: { x, y }, size: { x: 4, y: 4 }, color, active: true,
              velocity: { x: (Math.random() - 0.5) * 15, y: (Math.random() - 0.5) * 15 },
              life: 1.0, maxLife: 1.0,
              rotation: Math.random() * 360, rotationSpeed: (Math.random() - 0.5) * 15
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
      const closestX = Math.max(rect.pos.x, Math.min(ball.pos.x, rect.pos.x + rect.size.x));
      const closestY = Math.max(rect.pos.y, Math.min(ball.pos.y, rect.pos.y + rect.size.y));
      const dx = ball.pos.x - closestX;
      const dy = ball.pos.y - closestY;
      return (dx * dx + dy * dy) < (ball.radius * ball.radius);
  }

  public getState() { return this.state; }

  public draw(ctx: CanvasRenderingContext2D) {
      const { width, height } = ctx.canvas;
      
      ctx.fillStyle = '#050505';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      if (this.state.screenShake > 0) {
          const dx = (Math.random() - 0.5) * this.state.screenShake;
          const dy = (Math.random() - 0.5) * this.state.screenShake;
          ctx.translate(dx, dy);
      }

      // Bricks
      this.state.bricks.forEach(b => {
          if (!b.active) return;
          this.drawMetalRect(ctx, b.pos.x, b.pos.y, b.size.x, b.size.y, b.color);
          if (b.type === 'shield') {
              ctx.strokeStyle = '#00ffff';
              ctx.lineWidth = 3;
              ctx.strokeRect(b.pos.x - 2, b.pos.y - 2, b.size.x + 4, b.size.y + 4);
          }
      });

      // Paddles
      this.state.paddles.forEach(p => {
          if (!p.active) return;
          // Ghost trail if dashing
          if (p.isDashing) {
             ctx.globalAlpha = 0.5;
             this.drawMetalRect(ctx, p.pos.x - p.velocity.x * 2, p.pos.y, p.size.x, p.size.y, p.color);
             ctx.globalAlpha = 1.0;
          }
          this.drawMetalRect(ctx, p.pos.x, p.pos.y, p.size.x, p.size.y, p.color);
          
          if (p.ammo > 0) {
              ctx.fillStyle = '#ff0000';
              for(let i=0; i<p.ammo; i++) ctx.fillRect(p.pos.x + i*5, p.pos.y - 5, 4, 4);
          }
          // Super Meter Bar
          ctx.fillStyle = '#333';
          ctx.fillRect(p.pos.x, p.pos.y + p.size.y + 5, p.size.x, 4);
          ctx.fillStyle = p.isSuperCharged ? '#ff00ff' : '#00ffff';
          ctx.fillRect(p.pos.x, p.pos.y + p.size.y + 5, p.size.x * (p.superMeter / 100), 4);
      });

      // Boss
      if (this.state.boss && this.state.boss.active) {
          this.drawMetalRect(ctx, this.state.boss.pos.x, this.state.boss.pos.y, this.state.boss.size.x, this.state.boss.size.y, this.state.boss.color);
          ctx.fillStyle = 'red';
          ctx.fillRect(this.state.boss.pos.x, this.state.boss.pos.y - 20, this.state.boss.size.x * (this.state.boss.hp / this.state.boss.maxHp), 10);
      }

      // Balls
      this.state.balls.forEach(b => {
          if (!b.active) return;
          ctx.beginPath();
          ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2);
          ctx.fillStyle = b.isSuper ? COLORS.BALL_SUPER : b.color;
          ctx.shadowBlur = b.isSuper ? 20 : 10;
          ctx.shadowColor = b.isSuper ? COLORS.BALL_SUPER : '#fff';
          ctx.fill();
          ctx.shadowBlur = 0;
      });

      // Particles
      this.state.particles.forEach(p => {
          ctx.save();
          ctx.translate(p.pos.x, p.pos.y);
          ctx.rotate(p.rotation * Math.PI / 180);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = p.life;
          ctx.fillRect(-p.size.x/2, -p.size.y/2, p.size.x, p.size.y);
          ctx.restore();
      });

      // Projectiles
      this.state.projectiles.forEach(p => {
          ctx.fillStyle = p.color;
          ctx.fillRect(p.pos.x, p.pos.y, p.size.x, p.size.y);
      });

      // Powerups
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
      grad.addColorStop(0.5, '#333'); 
      grad.addColorStop(0.8, color);
      grad.addColorStop(1, '#000');
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
  }
}