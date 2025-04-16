"use client";

import { FC } from 'react';

// Помести свои MP3 файлы в папку public/sounds
const fartSounds: string[] = [
  '/sounds/fart1.mp3',
  '/sounds/fart2.mp3',
  '/sounds/fart3.mp3',
  '/sounds/fart4.mp3',
  '/sounds/fart5.mp3',
  '/sounds/fart6.mp3',
  '/sounds/fart7.mp3',
  '/sounds/fart8.mp3',
];

const FartButton: FC = () => {
  const playRandomFart = (): void => {
    const index = Math.floor(Math.random() * fartSounds.length);
    const sound = new Audio(fartSounds[index]);
    sound.volume = 0.8;
    sound.play().catch((err) => console.error('Error playing sound:', err));
  };

  return (
    <div className="fixed bottom-4 right-4 flex flex-col items-center space-y-2 z-50">
      <button
        onClick={playRandomFart}
        className="w-14 h-14flex items-center justify-center focus:outline-none"
        aria-label="Play fart sound"
      >
        <span className='text-3xl'>💨</span>
      </button>
    </div>
  );
};

export default FartButton;
