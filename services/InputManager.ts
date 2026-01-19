import { InputState, GameState, GameMode } from '../types';
import { KEYS } from '../constants';

class InputManager {
  private keysPressed: Set<string> = new Set();
  private gamepads: (Gamepad | null)[] = [];

  constructor() {
    window.addEventListener('keydown', (e) => this.keysPressed.add(e.code));
    window.addEventListener('keyup', (e) => this.keysPressed.delete(e.code));
    window.addEventListener('gamepadconnected', this.handleGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.handleGamepadDisconnected);
  }

  private handleGamepadConnected = (e: GamepadEvent) => {
    console.log(`Gamepad connected: ${e.gamepad.id}`);
  };

  private handleGamepadDisconnected = (e: GamepadEvent) => {
    console.log(`Gamepad disconnected: ${e.gamepad.id}`);
  };

  public pollGamepads() {
    this.gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  }

  public getPlayerInput(playerId: number): InputState {
    const input: InputState = {
      up: false,
      down: false,
      left: false,
      right: false,
      action: false,
      dash: false,
      start: false,
    };

    // Keyboard mappings
    if (playerId === 0) {
      if (KEYS.P1.UP.some(k => this.keysPressed.has(k))) input.up = true;
      if (KEYS.P1.DOWN.some(k => this.keysPressed.has(k))) input.down = true;
      if (KEYS.P1.LEFT.some(k => this.keysPressed.has(k))) input.left = true;
      if (KEYS.P1.RIGHT.some(k => this.keysPressed.has(k))) input.right = true;
      if (KEYS.P1.ACTION.some(k => this.keysPressed.has(k))) input.action = true;
      if (KEYS.P1.DASH.some(k => this.keysPressed.has(k))) input.dash = true;
    } else if (playerId === 1) {
      if (KEYS.P2.UP.some(k => this.keysPressed.has(k))) input.up = true;
      if (KEYS.P2.DOWN.some(k => this.keysPressed.has(k))) input.down = true;
      if (KEYS.P2.LEFT.some(k => this.keysPressed.has(k))) input.left = true;
      if (KEYS.P2.RIGHT.some(k => this.keysPressed.has(k))) input.right = true;
      if (KEYS.P2.ACTION.some(k => this.keysPressed.has(k))) input.action = true;
      if (KEYS.P2.DASH.some(k => this.keysPressed.has(k))) input.dash = true;
    }

    // Map common keys for everyone (Start/Pause)
    if (this.keysPressed.has('Escape')) input.start = true;

    // Gamepad Overrides
    const gp = this.gamepads[playerId];
    if (gp) {
      // Stick axis usually 0 (LR) and 1 (UD)
      const axisX = gp.axes[0];
      const axisY = gp.axes[1];

      if (axisY < -0.3) input.up = true;
      if (axisY > 0.3) input.down = true;
      if (axisX < -0.3) input.left = true;
      if (axisX > 0.3) input.right = true;

      // Buttons: 0 (A), 1 (B), 9 (Start)
      if (gp.buttons[0].pressed || gp.buttons[7].pressed) input.action = true; // A or RT
      if (gp.buttons[1].pressed || gp.buttons[6].pressed) input.dash = true;   // B or LT
      if (gp.buttons[9].pressed) input.start = true;
      
      // D-Pad
      if (gp.buttons[12].pressed) input.up = true;
      if (gp.buttons[13].pressed) input.down = true;
      if (gp.buttons[14].pressed) input.left = true;
      if (gp.buttons[15].pressed) input.right = true;
    }

    return input;
  }
}

export const inputManager = new InputManager();