import React, { useState, useRef, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import MainMenu from './components/MainMenu';
import HUD from './components/HUD';
import PauseMenu from './components/PauseMenu';
import GameOverMenu from './components/GameOverMenu';
import { GameMode, GameState } from './types';
import { GameEngine } from './services/GameEngine';

const App: React.FC = () => {
  const [mode, setMode] = useState<GameMode>(GameMode.MENU);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [showGameOver, setShowGameOver] = useState(false);
  const [finalScores, setFinalScores] = useState<number[]>([0, 0]);
  
  const engineRef = useRef<GameEngine | null>(null);

  // Poll engine state for UI updates
  useEffect(() => {
    let intervalId: number;
    if (mode !== GameMode.MENU && !showGameOver) {
      intervalId = window.setInterval(() => {
        if (engineRef.current) {
          // Force a re-render with new state shallow copy
          setGameState({ ...engineRef.current.getState() });
        }
      }, 50); // Increased update rate for smoother UI
    }
    return () => clearInterval(intervalId);
  }, [mode, showGameOver]);

  const handleStart = (selectedMode: GameMode) => {
    setMode(selectedMode);
    setIsPaused(false);
    setShowGameOver(false);
  };

  const handleGameOver = (scores: number[]) => {
    setFinalScores(scores);
    setShowGameOver(true);
    // Stop engine updates implicity by showing game over menu
  };

  const handlePauseToggle = () => {
      if (showGameOver) return;
      if (engineRef.current) {
          const newState = !isPaused;
          setIsPaused(newState);
          const engineState = engineRef.current.getState();
          engineState.isPaused = newState;
      }
  };

  const handleResume = () => {
      if (engineRef.current) {
          setIsPaused(false);
          const engineState = engineRef.current.getState();
          engineState.isPaused = false;
      }
  };

  const handleRestart = () => {
      // Re-initialize engine
      engineRef.current = new GameEngine();
      Object.assign(engineRef.current, { state: engineRef.current.getInitialState(mode) });
      setIsPaused(false);
      setShowGameOver(false);
  };

  const handleQuit = () => {
      setIsPaused(false);
      setShowGameOver(false);
      setMode(GameMode.MENU);
  };

  return (
    <div className="w-full h-screen bg-neutral-900 flex items-center justify-center relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-[url('https://picsum.photos/1920/1080?blur=10')] opacity-20 bg-cover bg-center" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black opacity-80" />
      
      {mode === GameMode.MENU && <MainMenu onStart={handleStart} />}
      
      {mode !== GameMode.MENU && (
        <>
          {gameState && !showGameOver && <HUD state={gameState} />}
          
          {isPaused && (
            <PauseMenu 
                onResume={handleResume} 
                onRestart={handleRestart}
                onQuit={handleQuit} 
            />
          )}
          
          {showGameOver && (
            <GameOverMenu 
                score={finalScores} 
                onRestart={handleRestart} 
                onMenu={handleQuit}
                mode={mode}
            />
          )}

          <div className={`relative z-0 transition-all duration-500 ${isPaused || showGameOver ? 'blur-sm scale-95' : 'scale-100'}`}>
             <GameCanvas 
                mode={mode} 
                onGameOver={handleGameOver} 
                onPause={handlePauseToggle}
                engineRef={engineRef}
             />
          </div>
        </>
      )}
    </div>
  );
};

export default App;