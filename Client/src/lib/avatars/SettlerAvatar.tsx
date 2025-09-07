import React from 'react';
import type { Settler } from '../types/settler';

interface SettlerAvatarProps {
  settler: Settler;
  size?: number;
  className?: string;
}

// Deterministic random number generator
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(array: T[]): T {
    return array[this.nextInt(0, array.length - 1)];
  }
}

const SettlerAvatar: React.FC<SettlerAvatarProps> = ({ 
  settler, 
  size = 60,
  className 
}) => {
  // Create deterministic seed from nameId
  const seedValue = settler.nameId
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  const rng = new SeededRandom(seedValue);

  // Deterministic appearance traits
  const skinTones = ['#FDBCB4', '#F1C27D', '#E0AC69', '#C68642', '#8D5524'];
  const eyeColors = ['#654321', '#4169E1', '#228B22', '#8B4513', '#2F4F4F'];
  const shirtColors = ['#4A90E2', '#E74C3C', '#2ECC71', '#9B59B6', '#F39C12', '#34495E'];

  const skinTone = rng.choice(skinTones);
  const eyeColor = rng.choice(eyeColors);
  const shirtColor = rng.choice(shirtColors);
  const hairStyle = rng.nextInt(1, 3); // Different hair shapes
  
  // Gender-specific hair colors
  const femaleHairColors = ['#8B4513', '#D2691E', '#B7472A', '#FFD700', '#654321']; // Warmer tones
  const maleHairColors = ['#2C1B18', '#8B4513', '#696969', '#654321']; // Darker tones
  
  const hairColor = settler.isFemale 
    ? rng.choice(femaleHairColors)
    : rng.choice(maleHairColors);

  // Activity-specific props
  const isWorking = settler.status === 'working' || settler.status === 'crafting' || settler.status === 'questing';
  const isSleeping = settler.status === 'resting';
  const isExploring = settler.status === 'exploring';

  // Generate hair path based on style and gender
  const getHairPath = (style: number, isFemale: boolean): string => {
    if (isFemale) {
      switch (style) {
        case 1: return "M30,25 Q50,10 70,25 Q70,40 50,35 Q30,40 30,25"; // Long flowing
        case 2: return "M32,22 Q50,8 68,22 Q68,38 50,32 Q32,38 32,22"; // Very long
        case 3: return "M35,25 Q50,18 65,25 Q65,35 50,30 Q35,35 35,25"; // Medium length
        default: return "M35,25 Q50,20 65,25 Q65,30 50,28 Q35,30 35,25";
      }
    } else {
      switch (style) {
        case 1: return "M38,25 Q50,22 62,25 Q60,28 50,27 Q40,28 38,25"; // Short
        case 2: return "M36,25 Q50,20 64,25 Q62,30 50,28 Q38,30 36,25"; // Medium
        case 3: return "M40,25 Q50,23 60,25 Q58,27 50,26 Q42,27 40,25"; // Very short
        default: return "M35,25 Q50,20 65,25 Q65,30 50,28 Q35,30 35,25";
      }
    }
  };

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={className}
      style={{ overflow: 'visible' }}
    >
      <defs>
        <style>{`
          .avatar-container {
            transform-origin: 50px 50px;
            animation: ${isSleeping ? 'lay-down 0.5s ease-out forwards' : 'sit-up 0.5s ease-out forwards'};
          }
          .avatar-head {
            transform-origin: 50px 35px;
            animation: ${isSleeping ? 'sleep-breathe' : 'idle-breathe'} ${isSleeping ? '3s' : '4s'} ease-in-out infinite;
          }
          .avatar-tool {
            transform-origin: 30px 60px;
            animation: ${isWorking ? 'tool-work 1.5s ease-in-out infinite alternate' : 'none'};
          }
          .avatar-body {
            animation: ${isExploring ? 'explore-walk 0.8s ease-in-out infinite alternate' : 'none'};
          }
          .sleep-z {
            animation: ${isSleeping ? 'float-z 4s ease-in-out infinite' : 'none'};
            opacity: ${isSleeping ? '1' : '0'};
          }
          
          @keyframes lay-down {
            from { transform: rotate(0deg) translateY(0px); }
            to { transform: rotate(90deg) translateY(10px); }
          }
          
          @keyframes sit-up {
            from { transform: rotate(90deg) translateY(10px); }
            to { transform: rotate(0deg) translateY(0px); }
          }
          
          @keyframes idle-breathe {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-1px); }
          }
          
          @keyframes sleep-breathe {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-2px); }
          }
          
          @keyframes tool-work {
            from { transform: rotate(-15deg) translateX(-2px); }
            to { transform: rotate(15deg) translateX(2px); }
          }
          
          @keyframes explore-walk {
            from { transform: translateX(-1px); }
            to { transform: translateX(1px); }
          }
          
          @keyframes float-z {
            0% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
            25% { transform: translateY(-5px) translateX(2px); opacity: 0.7; }
            50% { transform: translateY(-10px) translateX(4px); opacity: 0.5; }
            75% { transform: translateY(-12px) translateX(6px); opacity: 0.3; }
            100% { transform: translateY(-15px) translateX(8px); opacity: 0; }
          }
        `}</style>
      </defs>

      <g className="avatar-container">
        {/* Body */}
        <g className="avatar-body">
          <ellipse cx="50" cy="75" rx={settler.isFemale ? "10" : "12"} ry="20" fill={shirtColor} />
          
          {/* Arms */}
          <ellipse cx="35" cy="65" rx="6" ry="15" fill={shirtColor} />
          <ellipse cx="65" cy="65" rx="6" ry="15" fill={shirtColor} />
        </g>

        {/* Head */}
        <g className="avatar-head">
          <circle cx="50" cy="35" r={settler.isFemale ? "15" : "16"} fill={skinTone} />
          
          {/* Hair */}
          <path d={getHairPath(hairStyle, settler.isFemale)} fill={hairColor} />
          
          {/* Eyelashes for females */}
          {settler.isFemale && (
            <>
              <path d="M43,31 L43,29" stroke="#000" strokeWidth="1" />
              <path d="M45,30 L45,28" stroke="#000" strokeWidth="1" />
              <path d="M55,30 L55,28" stroke="#000" strokeWidth="1" />
              <path d="M57,31 L57,29" stroke="#000" strokeWidth="1" />
            </>
          )}
          
          {/* Eyes */}
          <circle cx="45" cy="33" r="2" fill={eyeColor} />
          <circle cx="55" cy="33" r="2" fill={eyeColor} />
          
          {/* Simple smile */}
          <path 
            d="M45,40 Q50,45 55,40" 
            stroke={skinTone === '#FDBCB4' ? '#CD919E' : '#8B4513'} 
            strokeWidth="1.5" 
            fill="none" 
          />
        </g>

        {/* Activity-specific overlays */}
        {isWorking && (
          <g className="avatar-tool">
            <line x1="25" y1="70" x2="35" y2="55" stroke="#8B4513" strokeWidth="3" strokeLinecap="round" />
            <circle cx="23" cy="72" r="3" fill="#696969" />
          </g>
        )}

        {settler.status === 'crafting' && (
          <g className="avatar-tool">
            <rect x="20" y="65" width="8" height="3" fill="#DAA520" rx="1" />
            <circle cx="18" cy="66" r="2" fill="#CD7F32" />
          </g>
        )}

        {isExploring && (
          <g>
            <circle cx="38" cy="25" r="8" fill="none" stroke="#8B4513" strokeWidth="2" />
            <circle cx="38" cy="25" r="6" fill="rgba(255,255,255,0.3)" />
          </g>
        )}
      </g>

      {/* Sleeping Z's - positioned to work when lying down */}
      {isSleeping && (
        <g className="sleep-z">
          <text x="65" y="30" fontSize="8" fill="#4A90E2" fontFamily="Arial, sans-serif" fontWeight="bold">Z</text>
          <text x="70" y="25" fontSize="10" fill="#4A90E2" fontFamily="Arial, sans-serif" fontWeight="bold">Z</text>
          <text x="75" y="20" fontSize="12" fill="#4A90E2" fontFamily="Arial, sans-serif" fontWeight="bold">Z</text>
        </g>
      )}
    </svg>
  );
};

export default SettlerAvatar;