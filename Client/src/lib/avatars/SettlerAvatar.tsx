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

    // Appearance traits
    const skinTones = ['#FDBCB4', '#F1C27D', '#E0AC69', '#C68642', '#8D5524'];
    const eyeColors = ['#654321', '#4169E1', '#228B22', '#8B4513', '#2F4F4F', '#800080', '#FF4500'];
    const shirtColors = ['#4A90E2', '#E74C3C', '#2ECC71', '#9B59B6', '#F39C12', '#34495E', '#FF1493', '#00CED1'];
    const femaleHairColors = ['#8B4513', '#D2691E', '#B7472A', '#FFD700', '#654321', '#FF69B4', '#9370DB', '#DC143C', '#00FF00', '#FF1493'];
    const maleHairColors = ['#2C1B18', '#8B4513', '#696969', '#654321', '#B22222', '#4B0082', '#000080', '#228B22'];

    const skinTone = rng.choice(skinTones);
    const eyeColor = rng.choice(eyeColors);
    const shirtColor = rng.choice(shirtColors);
    const hairStyle = rng.nextInt(1, 8); // Expanded to 8 styles
    const hairColor = settler.isFemale ? rng.choice(femaleHairColors) : rng.choice(maleHairColors);

    // Enhanced facial hair for males
    const beardStyle = !settler.isFemale ? rng.nextInt(0, 6) : 0; // 7 beard options
    const mustacheStyle = !settler.isFemale ? rng.nextInt(0, 4) : 0; // 5 mustache options

    // Additional features
    const hasGlasses = rng.nextInt(1, 10) === 1; // 10% chance
    const hasTattoo = rng.nextInt(1, 8) === 1; // 12.5% chance
    const hasEarrings = settler.isFemale && rng.nextInt(1, 3) === 1; // 33% chance for females

    // Activity states
    const isWorking =  ['working', 'crafting', 'questing'].includes(settler.status);
    const isSleeping = settler.status === 'resting';
    const isExploring = settler.status === 'exploring';

    // Generate hair path - EXTREME STYLES!
    const getHairPath = (style: number, isFemale: boolean) => {
        if (isFemale) {
            switch (style) {
                case 1: return "M30,25 Q50,5 70,25 Q70,50 50,45 Q30,50 30,25"; // Long flowing
                case 2: return "M20,20 Q50,3 80,20 Q80,35 50,30 Q20,35 20,20"; // Extra wide
                case 3: return "M45,18 L50,8 L55,18 L50,22 Z"; // Mohawk
                case 4: return "M25,30 Q35,15 45,30 M55,30 Q65,15 75,30"; // Pigtails
                case 5: return "M32,22 Q50,8 68,22 Q75,25 68,35 Q50,32 32,35 Q25,25 32,22"; // Afro
                case 6: return "M35,25 Q50,12 65,25 Q65,28 50,27 Q35,28 35,25 M48,27 L48,40 M52,27 L52,40"; // Bob with braids
                case 7: return "M40,15 Q50,10 60,15 L65,25 Q50,22 35,25 Z"; // Asymmetrical
                case 8: return "M30,25 Q35,10 40,25 M45,20 Q50,8 55,20 M60,25 Q65,10 70,25"; // Spiky
                default: return "M35,25 Q50,20 65,25 Q65,30 50,28 Q35,30 35,25";
            }
        } else {
            switch (style) {
                case 1: return "M42,25 Q50,23 58,25 Q56,27 50,26 Q44,27 42,25"; // Short neat
                case 2: return "M35,22 Q50,18 65,22 Q63,26 50,25 Q37,26 35,22"; // Medium
                case 3: return "M47,18 L50,8 L53,18 L50,22 Z"; // Male mohawk
                case 4: return "M30,20 Q50,15 70,20 Q68,25 50,24 Q32,25 30,20"; // Slicked back
                case 5: return "M35,20 Q50,12 65,20 Q70,22 65,30 Q50,27 35,30 Q30,22 35,20"; // Male afro
                case 6: return "M38,25 Q50,22 62,25 Q60,26 50,25 Q40,26 38,25 M45,25 L45,15 M55,25 L55,15"; // Dreadlocks
                case 7: return "M25,25 Q50,18 75,25 Q73,28 50,27 Q27,28 25,25"; // Long metal hair
                case 8: return ""; // Bald
                default: return "M35,25 Q50,20 65,25 Q65,30 50,28 Q35,30 35,25";
            }
        }
    };

    // Beard paths - EXTREME BEARDS!
    const getBeardPath = (style: number) => {
        switch (style) {
            case 0: return ""; // Clean shaven
            case 1: return "M43,42 Q50,45 57,42"; // Light stubble
            case 2: return "M42,42 Q50,48 58,42 Q58,45 50,47 Q42,45 42,42"; // Goatee
            case 3: return "M40,42 Q50,55 60,42 L60,50 Q50,58 40,50 Z"; // Full beard
            case 4: return "M38,42 Q50,65 62,42 L62,55 Q50,68 38,55 Z"; // Massive beard
            case 5: return "M45,42 Q50,48 55,42 M48,48 L48,52 M52,48 L52,52"; // Braided goatee
            case 6: return "M35,40 Q50,60 65,40 Q65,52 50,62 Q35,52 35,40"; // Viking beard
            default: return "";
        }
    };

    // Mustache paths
    const getMustachePath = (style: number) => {
        switch (style) {
            case 0: return ""; // No mustache
            case 1: return "M46,38 Q50,40 54,38"; // Simple
            case 2: return "M44,38 Q50,41 56,38"; // Thick
            case 3: return "M43,38 Q47,40 50,39 Q53,40 57,38 L57,36 Q53,37 50,37 Q47,37 43,36 Z"; // Handlebar
            case 4: return "M45,38 Q50,42 55,38 Q55,40 50,41 Q45,40 45,38"; // Walrus
            default: return "";
        }
    };

    // Smile position offset
    const noseOffsetY = 0;
    const smileStartY = 40 + noseOffsetY;
    const smileEndY = 40 + noseOffsetY;

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
            transform: ${isExploring ? 'scaleX(-1)' : 'scaleX(1)'};
          }
          .avatar-head {
            transform-origin: 50px 35px;
            animation: ${isSleeping ? 'sleep-breathe' : 'idle-breathe'} ${isSleeping ? '3s' : '4s'} ease-in-out infinite;
          }
          .avatar-tool {
            transform-origin: 30px 60px;
            animation: ${isWorking ? 'tool-work 1.5s ease-in-out infinite alternate' : 'none'};
          }
          .walking-stick {
            transform-origin: 32px 65px;
            animation: ${isExploring ? 'stick-walk 1.2s ease-in-out infinite' : 'none'};
          }
          .avatar-body {
            animation: ${isExploring ? 'walk-cycle 1.2s ease-in-out infinite' : 'none'};
          }
          .sleep-z {
            animation: ${isSleeping ? 'float-z 4s ease-in-out infinite' : 'none'};
            opacity: ${isSleeping ? '1' : '0'};
          }
          .tattoo {
            opacity: ${hasTattoo ? '0.8' : '0'};
          }
          @keyframes lay-down { from { transform: rotate(0deg) translateY(0px); } to { transform: rotate(90deg) translateY(10px); } }
          @keyframes sit-up { from { transform: rotate(90deg) translateY(10px); } to { transform: rotate(0deg) translateY(0px); } }
          @keyframes idle-breathe { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-1px); } }
          @keyframes sleep-breathe { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-2px); } }
          @keyframes tool-work { 
            0% { transform: rotate(-30deg) translateY(0px); } 
            50% { transform: rotate(-30deg) translateY(-8px); } 
            100% { transform: rotate(-30deg) translateY(0px); } 
          }
          @keyframes stick-walk { 
            0% { transform: rotate(-15deg) translateY(0px); } 
            25% { transform: rotate(-10deg) translateY(-2px); } 
            50% { transform: rotate(-5deg) translateY(-1px); } 
            75% { transform: rotate(-10deg) translateY(-2px); } 
            100% { transform: rotate(-15deg) translateY(0px); } 
          }
          @keyframes walk-cycle { 
            0% { transform: translateX(-1px) translateY(0px); } 
            25% { transform: translateX(0px) translateY(-0.5px); } 
            50% { transform: translateX(1px) translateY(0px); } 
            75% { transform: translateX(0px) translateY(-0.5px); } 
            100% { transform: translateX(-1px) translateY(0px); } 
          }
          @keyframes float-z { 0% { transform: translateY(0px) translateX(0px); opacity: 0.3; } 25% { transform: translateY(-5px) translateX(2px); opacity: 0.7; } 50% { transform: translateY(-10px) translateX(4px); opacity: 0.5; } 75% { transform: translateY(-12px) translateX(6px); opacity: 0.3; } 100% { transform: translateY(-15px) translateX(8px); opacity: 0; } }
        `}</style>
            </defs>

            <g className="avatar-container">
                {/* Body */}
                <g className="avatar-body">
                    <ellipse cx="50" cy="75" rx={settler.isFemale ? "8" : "10"} ry="18" fill={shirtColor} />
                    <ellipse cx="35" cy="65" rx="5" ry="13" fill={shirtColor} />
                    {/* Right arm */}
                    {!isWorking && (
                        <ellipse cx="65" cy="65" rx="5" ry="13" fill={shirtColor} />
                    )}
                    {isWorking && (
                        <g className="avatar-tool">
                            {/* Arm - horizontal, matching non-working arm color/size */}
                            <ellipse
                                cx="73"
                                cy="65"
                                rx="13"
                                ry="5"
                                fill={shirtColor}
                                transform="rotate(-25 65 70)"
                            />
                            {/* Hammer handle */}
                            <rect
                                x="80"
                                y="60"
                                width="5.5"
                                height="20"
                                fill="#8B4513"
                                rx="1"
                            />
                            {/* Hammer head */}
                            <rect
                                x="75"
                                y="75"
                                width="7"
                                height="5"
                                fill="#696969"
                                rx="1"
                            />
                        </g>
                    )}
                </g>

                {/* Head */}
                <g className="avatar-head">
                    <circle cx="50" cy="35" r={settler.isFemale ? "17" : "18"} fill={skinTone} />

                    {/* Hair */}
                    {getHairPath(hairStyle, settler.isFemale) && (
                        <path d={getHairPath(hairStyle, settler.isFemale)} fill={hairColor} />
                    )}

                    {/* Eyes - Much Bigger! */}
                    <circle cx="45" cy="33" r="4" fill="white" />
                    <circle cx="55" cy="33" r="4" fill="white" />
                    <circle cx="45" cy="33" r="3" fill={eyeColor} />
                    <circle cx="55" cy="33" r="3" fill={eyeColor} />
                    <circle cx="46" cy="32" r="1" fill="white" opacity="0.8" />
                    <circle cx="56" cy="32" r="1" fill="white" opacity="0.8" />

                    {/* Simple eyelashes for everyone */}
                    {settler.isFemale ? (
                        <>
                            <path d="M43,31 L43,29" stroke="#000" strokeWidth="1" />
                            <path d="M45,30 L45,28" stroke="#000" strokeWidth="1" />
                            <path d="M55,30 L55,28" stroke="#000" strokeWidth="1" />
                            <path d="M57,31 L57,29" stroke="#000" strokeWidth="1" />
                        </>
                    ) : (
                        <>
                            <path d="M43,31 L45,31" stroke="#000" strokeWidth="1" />
                            <path d="M55,31 L57,31" stroke="#000" strokeWidth="1" />
                        </>
                    )}

                    {/* Glasses */}
                    {hasGlasses && (
                        <g>
                            <circle cx="45" cy="33" r="4" fill="none" stroke="#333" strokeWidth="1" />
                            <circle cx="55" cy="33" r="4" fill="none" stroke="#333" strokeWidth="1" />
                            <line x1="49" y1="33" x2="51" y2="33" stroke="#333" strokeWidth="1" />
                        </g>
                    )}

                    {/* Nose */}
                    <circle cx="50" cy="37" r="0.5" fill="#CD919E" opacity="0.6" />

                    {/* Mouth */}
                    {!isSleeping && (
                        <path
                            d={`M45,${smileStartY} Q50,45 55,${smileEndY}`}
                            stroke={skinTone === '#FDBCB4' ? '#CD919E' : '#8B4513'}
                            strokeWidth="1.5"
                            fill="none"
                        />
                    )}

                    {/* Male facial hair */}
                    {!settler.isFemale && (
                        <>
                            {/* Mustache */}
                            {getMustachePath(mustacheStyle) && (
                                <path
                                    d={getMustachePath(mustacheStyle)}
                                    fill={hairColor}
                                    stroke={hairColor}
                                    strokeWidth="0.5"
                                />
                            )}

                            {/* Beard */}
                            {getBeardPath(beardStyle) && (
                                <path
                                    d={getBeardPath(beardStyle)}
                                    fill={hairColor}
                                    stroke={hairColor}
                                    strokeWidth="0.5"
                                />
                            )}
                        </>
                    )}

                    {/* Earrings for females */}
                    {hasEarrings && (
                        <>
                            <circle cx="35" cy="35" r="1" fill="#FFD700" />
                            <circle cx="65" cy="35" r="1" fill="#FFD700" />
                        </>
                    )}
                </g>

                {/* Face tattoo */}
                <g className="tattoo">
                    <path d="M40,30 L42,32 M58,30 L60,32" stroke="#4169E1" strokeWidth="1" opacity="0.8" />
                </g>

                {/* Activity overlays */}

                {settler.status === 'crafting' && (
                    <g className="avatar-tool">
                        <rect x="20" y="65" width="8" height="3" fill="#DAA520" rx="1" />
                        <circle cx="18" cy="66" r="2" fill="#CD7F32" />
                    </g>
                )}
                {isExploring && (
                    <g className="walking-stick">
                        {/* Diagonal walking stick */}
                        <line x1="32" y1="65" x2="38" y2="100" stroke="#8B4513" strokeWidth="2" strokeLinecap="round" />
                        {/* Walking stick grip/handle */}
                        <circle cx="32" cy="65" r="1.5" fill="#CD7F32" />
                    </g>
                )}
            </g>

            {/* Sleeping Z's */}
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