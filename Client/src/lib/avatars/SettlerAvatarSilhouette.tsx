import React from 'react';
import type { Settler } from '../types/settler';

interface SettlerAvatarSilhouetteProps {
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

const SettlerAvatarSilhouette: React.FC<SettlerAvatarSilhouetteProps> = ({
    settler,
    size = 60,
    className
}) => {
    // Create deterministic seed from nameId
    const seedValue = settler.nameId
        .split('')
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const rng = new SeededRandom(seedValue);

    // Silhouette colors - gradients and solids
    const silhouetteColors = [
        '#2C3E50', '#34495E', '#7F8C8D', '#95A5A6', '#BDC3C7',
        '#8E44AD', '#9B59B6', '#3498DB', '#2980B9', '#1ABC9C',
        '#16A085', '#27AE60', '#2ECC71', '#F39C12', '#E67E22',
        '#E74C3C', '#C0392B'
    ];

    const silhouetteColor = rng.choice(silhouetteColors);
    const accentColor = rng.choice(silhouetteColors.filter(c => c !== silhouetteColor));

    // Activity states
    const isWorking = ['working', 'crafting', 'questing'].includes(settler.status);
    const isSleeping = settler.status === 'resting';
    const isExploring = settler.status === 'exploring';

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
                    .silhouette-container {
                        transform-origin: 50px 50px;
                        animation: ${isSleeping ? 'silhouette-lay-down 0.5s ease-out forwards' : 'silhouette-sit-up 0.5s ease-out forwards'};
                        transform: ${isExploring ? 'scaleX(-1)' : 'scaleX(1)'};
                    }
                    .silhouette-head {
                        transform-origin: 50px 35px;
                        animation: ${isSleeping ? 'silhouette-sleep-breathe' : 'silhouette-idle-breathe'} ${isSleeping ? '3s' : '4s'} ease-in-out infinite;
                    }
                    .silhouette-tool {
                        transform-origin: 30px 60px;
                        animation: ${isWorking ? 'silhouette-tool-work 1.5s ease-in-out infinite alternate' : 'none'};
                    }
                    .silhouette-walking-stick {
                        transform-origin: 32px 65px;
                        animation: ${isExploring ? 'silhouette-stick-walk 1.2s ease-in-out infinite' : 'none'};
                    }
                    .silhouette-body {
                        animation: ${isExploring ? 'silhouette-walk-cycle 1.2s ease-in-out infinite' : 'none'};
                    }
                    .silhouette-sleep-indicator {
                        animation: ${isSleeping ? 'silhouette-float-z 4s ease-in-out infinite' : 'none'};
                        opacity: ${isSleeping ? '1' : '0'};
                    }
                    @keyframes silhouette-lay-down { from { transform: rotate(0deg) translateY(0px); } to { transform: rotate(90deg) translateY(10px); } }
                    @keyframes silhouette-sit-up { from { transform: rotate(90deg) translateY(10px); } to { transform: rotate(0deg) translateY(0px); } }
                    @keyframes silhouette-idle-breathe { 0%,100% { transform: translateY(0px) scale(1); } 50% { transform: translateY(-1px) scale(1.01); } }
                    @keyframes silhouette-sleep-breathe { 0%,100% { transform: translateY(0px) scale(1); } 50% { transform: translateY(-2px) scale(1.02); } }
                    @keyframes silhouette-tool-work { 
                        0% { transform: rotate(-30deg) translateY(0px); } 
                        50% { transform: rotate(-30deg) translateY(-8px); } 
                        100% { transform: rotate(-30deg) translateY(0px); } 
                    }
                    @keyframes silhouette-stick-walk { 
                        0% { transform: rotate(-15deg) translateY(0px); } 
                        25% { transform: rotate(-10deg) translateY(-2px); } 
                        50% { transform: rotate(-5deg) translateY(-1px); } 
                        75% { transform: rotate(-10deg) translateY(-2px); } 
                        100% { transform: rotate(-15deg) translateY(0px); } 
                    }
                    @keyframes silhouette-walk-cycle { 
                        0% { transform: translateX(-1px) translateY(0px); } 
                        25% { transform: translateX(0px) translateY(-0.5px); } 
                        50% { transform: translateX(1px) translateY(0px); } 
                        75% { transform: translateX(0px) translateY(-0.5px); } 
                        100% { transform: translateX(-1px) translateY(0px); } 
                    }
                    @keyframes silhouette-float-z { 0% { transform: translateY(0px) translateX(0px); opacity: 0.3; } 25% { transform: translateY(-5px) translateX(2px); opacity: 0.7; } 50% { transform: translateY(-10px) translateX(4px); opacity: 0.5; } 75% { transform: translateY(-12px) translateX(6px); opacity: 0.3; } 100% { transform: translateY(-15px) translateX(8px); opacity: 0; } }
                `}</style>
                
                {/* Gradient definitions */}
                <linearGradient id={`silhouette-gradient-${seedValue}`} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={silhouetteColor} />
                    <stop offset="100%" stopColor={accentColor} />
                </linearGradient>
                
                <radialGradient id={`silhouette-radial-${seedValue}`} cx="50%" cy="30%" r="70%">
                    <stop offset="0%" stopColor={accentColor} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={silhouetteColor} />
                </radialGradient>
            </defs>

            <g className="silhouette-container">
                {/* Main body silhouette - single connected shape */}
                <g className="silhouette-body">
                    <path
                        d={`
                            M50,18 
                            C${settler.isFemale ? '35,18 25,25 25,35' : '36,18 28,25 28,35'} 
                            C25,45 30,50 35,52 
                            L35,65 
                            C35,70 32,75 28,78 
                            L28,88 
                            C28,92 30,95 35,95 
                            L45,95 
                            L45,88 
                            L50,88 
                            L50,52 
                            C52,50 55,48 60,52 
                            L60,65 
                            ${!isWorking ? `
                                C60,70 63,75 67,78 
                                L67,88 
                                C67,92 65,95 60,95 
                                L55,95 
                                L55,88 
                                L50,88
                            ` : `
                                C60,68 65,70 70,65 
                                L75,60 
                                C80,55 85,60 85,65 
                                L80,70 
                                C75,75 70,75 65,78 
                                L60,85 
                                C60,90 58,95 55,95 
                                L50,95
                            `}
                            L50,88 
                            C${settler.isFemale ? '65,50 75,45 75,35' : '64,50 72,45 72,35'} 
                            C${settler.isFemale ? '75,25 65,18 50,18' : '72,25 64,18 50,18'}
                        `}
                        fill={`url(#silhouette-gradient-${seedValue})`}
                        opacity="0.9"
                    />

                    {/* Head silhouette with hair */}
                    <g className="silhouette-head">
                        <path
                            d={`
                                M50,18 
                                C${settler.isFemale ? '35,18 25,25 25,35' : '36,18 28,25 28,35'} 
                                C25,45 35,52 50,52 
                                C65,52 75,45 ${settler.isFemale ? '75,35' : '72,35'} 
                                C${settler.isFemale ? '75,25 65,18 50,18' : '72,25 64,18 50,18'}
                            `}
                            fill={`url(#silhouette-radial-${seedValue})`}
                        />

                        {/* Hair silhouette - different styles */}
                        <path
                            d={settler.isFemale ? `
                                M35,25 
                                C30,15 25,12 35,10 
                                C45,8 55,8 65,10 
                                C75,12 70,15 65,25 
                                C70,20 75,22 72,28 
                                C68,25 65,25 65,25 
                                C65,25 55,20 50,22 
                                C45,20 35,25 35,25 
                                C35,25 32,25 28,28 
                                C25,22 30,20 35,25
                            ` : `
                                M40,25 
                                C38,20 35,18 40,16 
                                C45,15 55,15 60,16 
                                C65,18 62,20 60,25 
                                C60,25 55,22 50,23 
                                C45,22 40,25 40,25
                            `}
                            fill={accentColor}
                            opacity="0.7"
                        />

                        {/* Eye glow - subtle indication */}
                        <circle cx="44" cy="33" r="2" fill={accentColor} opacity="0.6" />
                        <circle cx="56" cy="33" r="2" fill={accentColor} opacity="0.6" />
                    </g>

                    {/* Activity-specific silhouettes */}
                    {isWorking && (
                        <g className="silhouette-tool">
                            {/* Tool silhouette */}
                            <path
                                d="M75,60 L80,55 L85,60 L85,65 L80,70 L75,65 Z"
                                fill={accentColor}
                                opacity="0.8"
                            />
                        </g>
                    )}

                    {isExploring && (
                        <g className="silhouette-walking-stick">
                            <line 
                                x1="32" 
                                y1="65" 
                                x2="38" 
                                y2="100" 
                                stroke={accentColor} 
                                strokeWidth="3" 
                                strokeLinecap="round" 
                                opacity="0.8"
                            />
                        </g>
                    )}

                    {settler.status === 'crafting' && (
                        <circle 
                            cx="20" 
                            cy="67" 
                            r="4" 
                            fill={accentColor} 
                            opacity="0.8" 
                        />
                    )}
                </g>
            </g>

            {/* Sleep indicator */}
            {isSleeping && (
                <g className="silhouette-sleep-indicator">
                    <circle cx="70" cy="25" r="3" fill={accentColor} opacity="0.6" />
                    <circle cx="75" cy="20" r="4" fill={accentColor} opacity="0.4" />
                    <circle cx="80" cy="15" r="5" fill={accentColor} opacity="0.2" />
                </g>
            )}

            {/* Status indicator border */}
            <circle 
                cx="50" 
                cy="50" 
                r="45" 
                fill="none" 
                stroke={
                    isWorking ? accentColor :
                    isExploring ? silhouetteColor :
                    isSleeping ? accentColor :
                    silhouetteColor
                } 
                strokeWidth="1" 
                strokeDasharray={
                    isWorking ? "5,5" :
                    isExploring ? "10,2" :
                    isSleeping ? "2,8" :
                    "none"
                }
                opacity="0.3"
            />
        </svg>
    );
};

export default SettlerAvatarSilhouette;