import React, { useRef, useEffect } from 'react';
import { GameEngine } from '../services/GameEngine';
import { inputManager } from '../services/InputManager';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';
import { GameMode, GameState } from '../types';

interface GameCanvasProps {
  mode: GameMode;
  onGameOver: (score: number[]) => void;
  onPause: () => void;
  engineRef: React.MutableRefObject<GameEngine | null>;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ mode, onGameOver, onPause, engineRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  const previousTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!engineRef.current) {
        engineRef.current = new GameEngine();
    }
    // Reset state for new mode
    // We assume the parent sets the engine state properly or we re-init
    engineRef.current = new GameEngine();
    // Force set the initial state from mode
    Object.assign(engineRef.current, { state: engineRef.current.getInitialState(mode) });
    
    previousTimeRef.current = performance.now();
    requestRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(requestRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const animate = (time: number) => {
    const deltaTime = (time - previousTimeRef.current) / 1000;
    previousTimeRef.current = time;

    inputManager.pollGamepads();
    // Get inputs for all potential 4 players
    const inputs = [0, 1, 2, 3].map(id => inputManager.getPlayerInput(id));
    
    // Pause check
    if (inputs.some(i => i.start)) {
        onPause();
    }

    if (engineRef.current) {
      engineRef.current.update(deltaTime, inputs);
      
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          engineRef.current.draw(ctx);
        }
      }

      const state = engineRef.current.getState();
      if (state.isGameOver) {
        onGameOver(state.score);
        return; // Stop loop
      }
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="border-4 border-slate-700 rounded-lg shadow-2xl shadow-cyan-500/50 bg-black mx-auto"
      style={{ maxWidth: '100%', maxHeight: '80vh' }}
    />
  );
};

export default GameCanvas;
