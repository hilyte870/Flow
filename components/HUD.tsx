import React from 'react';
import { GameState, GameMode } from '../types';

interface HUDProps {
  state: GameState;
}

const HUD: React.FC<HUDProps> = ({ state }) => {
  return (
    <>
      <div className="absolute top-0 left-0 w-full p-4 pointer-events-none flex justify-between items-start font-orbitron text-white z-10">
        {/* Player 1 Score */}
        <div className="flex flex-col items-start w-[200px]">
          <h2 className="text-cyan-400 text-2xl font-bold neon-text">P1 CYBER</h2>
          <div className="text-4xl">{state.score[0].toString().padStart(6, '0')}</div>
          {state.paddles[0]?.ammo > 0 && <div className="text-yellow-400 text-sm">ROCKETS: {state.paddles[0].ammo}</div>}
        </div>

        {/* Center Info */}
        <div className="flex flex-col items-center flex-1">
          <h1 className="text-3xl font-black italic tracking-widest metal-text">FLOW MY BRICKS</h1>
          {state.mode === GameMode.VERSUS && (
             <div className={`text-4xl font-bold mt-2 ${state.timeRemaining < 30 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
               {Math.floor(state.timeRemaining / 60)}:{(Math.floor(state.timeRemaining) % 60).toString().padStart(2, '0')}
             </div>
          )}
          <div className="text-xl mt-2 text-purple-400">LIVES: {state.lives}</div>
          {state.combo > 1 && (
               <div className="text-2xl text-yellow-500 animate-bounce mt-2">COMBO x{state.combo}</div>
          )}
        </div>

        {/* Player 2 Score - Hide if single player */}
        {state.mode === GameMode.ONE_PLAYER ? (
            <div className="w-[200px]" /> /* Spacer */
        ) : (
            <div className="flex flex-col items-end w-[200px]">
                <h2 className="text-fuchsia-400 text-2xl font-bold neon-text">P2 NEON</h2>
                <div className="text-4xl">{state.score[1].toString().padStart(6, '0')}</div>
                {state.paddles[1]?.ammo > 0 && <div className="text-yellow-400 text-sm">ROCKETS: {state.paddles[1].ammo}</div>}
            </div>
        )}
      </div>

      {/* Countdown Overlay */}
      {state.startTimer > 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
              <h1 className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-cyan-500 neon-text animate-pulse">
                  {Math.ceil(state.startTimer)}
              </h1>
          </div>
      )}
    </>
  );
};

export default HUD;