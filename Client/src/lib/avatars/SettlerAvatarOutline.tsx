import React from 'react';
import type { Settler } from '../types/settler';

interface SettlerAvatarOutlineProps {
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

const SettlerAvatarOutline: React.FC<SettlerAvatarOutlineProps> = ({
    settler,
    size = 60,
    className
}) => {
    // Create deterministic seed from nameId
    const seedValue = settler.nameId
        .split('')
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const rng = new SeededRandom(seedValue);

    // Simple outline colors - just different stroke colors
    const outlineColors = ['#2C3E50', '#8B4513', '#4A90E2', '#27AE60', '#E74C3C', '#9B59B6'];
    const outlineColor = rng.choice(outlineColors);

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
                    .outline-container {
                        transform-origin: 50px 50px;
                        animation: ${isSleeping ? 'outline-lay-down 0.5s ease-out forwards' : 'outline-sit-up 0.5s ease-out forwards'};
                        transform: ${isExploring ? 'scaleX(-1)' : 'scaleX(1)'};
                    }
                    .outline-head {
                        transform-origin: 50px 35px;
                        animation: ${isSleeping ? 'outline-sleep-breathe' : 'outline-idle-breathe'} ${isSleeping ? '3s' : '4s'} ease-in-out infinite;
                    }
                    .outline-tool {
                        transform-origin: 30px 60px;
                        animation: ${isWorking ? 'outline-tool-work 1.5s ease-in-out infinite alternate' : 'none'};
                    }
                    .outline-walking-stick {
                        transform-origin: 32px 65px;
                        animation: ${isExploring ? 'outline-stick-walk 1.2s ease-in-out infinite' : 'none'};
                    }
                    .outline-body {
                        animation: ${isExploring ? 'outline-walk-cycle 1.2s ease-in-out infinite' : 'none'};
                    }
                    .outline-sleep-z {
                        animation: ${isSleeping ? 'outline-float-z 4s ease-in-out infinite' : 'none'};
                        opacity: ${isSleeping ? '1' : '0'};
                    }
                    @keyframes outline-lay-down { from { transform: rotate(0deg) translateY(0px); } to { transform: rotate(90deg) translateY(10px); } }
                    @keyframes outline-sit-up { from { transform: rotate(90deg) translateY(10px); } to { transform: rotate(0deg) translateY(0px); } }
                    @keyframes outline-idle-breathe { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-1px); } }
                    @keyframes outline-sleep-breathe { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-2px); } }
                    @keyframes outline-tool-work { 
                        0% { transform: rotate(-30deg) translateY(0px); } 
                        50% { transform: rotate(-30deg) translateY(-8px); } 
                        100% { transform: rotate(-30deg) translateY(0px); } 
                    }
                    @keyframes outline-stick-walk { 
                        0% { transform: rotate(-15deg) translateY(0px); } 
                        25% { transform: rotate(-10deg) translateY(-2px); } 
                        50% { transform: rotate(-5deg) translateY(-1px); } 
                        75% { transform: rotate(-10deg) translateY(-2px); } 
                        100% { transform: rotate(-15deg) translateY(0px); } 
                    }
                    @keyframes outline-walk-cycle { 
                        0% { transform: translateX(-1px) translateY(0px); } 
                        25% { transform: translateX(0px) translateY(-0.5px); } 
                        50% { transform: translateX(1px) translateY(0px); } 
                        75% { transform: translateX(0px) translateY(-0.5px); } 
                        100% { transform: translateX(-1px) translateY(0px); } 
                    }
                    @keyframes outline-float-z { 0% { transform: translateY(0px) translateX(0px); opacity: 0.3; } 25% { transform: translateY(-5px) translateX(2px); opacity: 0.7; } 50% { transform: translateY(-10px) translateX(4px); opacity: 0.5; } 75% { transform: translateY(-12px) translateX(6px); opacity: 0.3; } 100% { transform: translateY(-15px) translateX(8px); opacity: 0; } }
                `}</style>
            </defs>

            <g className="outline-container">
                {/* Body - Outline only */}
                <g className="outline-body">
                    <ellipse 
                        cx="50" 
                        cy="75" 
                        rx={settler.isFemale ? "8" : "10"} 
                        ry="18" 
                        fill="none" 
                        stroke={outlineColor} 
                        strokeWidth="2" 
                    />
                    {/* Left arm */}
                    <ellipse 
                        cx="35" 
                        cy="65" 
                        rx="5" 
                        ry="13" 
                        fill="none" 
                        stroke={outlineColor} 
                        strokeWidth="2" 
                    />
                    {/* Right arm */}
                    {!isWorking && (
                        <ellipse 
                            cx="65" 
                            cy="65" 
                            rx="5" 
                            ry="13" 
                            fill="none" 
                            stroke={outlineColor} 
                            strokeWidth="2" 
                        />
                    )}
                    {isWorking && (
                        <g className="outline-tool">
                            {/* Arm */}
                            <ellipse
                                cx="73"
                                cy="65"
                                rx="13"
                                ry="5"
                                fill="none"
                                stroke={outlineColor}
                                strokeWidth="2"
                                transform="rotate(-25 65 70)"
                            />
                            {/* Hammer handle - outline */}
                            <rect
                                x="80"
                                y="60"
                                width="5.5"
                                height="20"
                                fill="none"
                                stroke={outlineColor}
                                strokeWidth="2"
                                rx="1"
                            />
                            {/* Hammer head - outline */}
                            <rect
                                x="75"
                                y="75"
                                width="7"
                                height="5"
                                fill="none"
                                stroke={outlineColor}
                                strokeWidth="2"
                                rx="1"
                            />
                        </g>
                    )}
                    {/* Legs - simple lines */}
                    <line x1="45" y1="90" x2="45" y2="100" stroke={outlineColor} strokeWidth="2" strokeLinecap="round" />
                    <line x1="55" y1="90" x2="55" y2="100" stroke={outlineColor} strokeWidth="2" strokeLinecap="round" />
                </g>

                {/* Head - Outline only */}
                <g className="outline-head">
                    <circle 
                        cx="50" 
                        cy="35" 
                        r={settler.isFemale ? "17" : "18"} 
                        fill="none" 
                        stroke={outlineColor} 
                        strokeWidth="2" 
                    />

                    {/* Simple hair indication - just a curved line */}
                    <path 
                        d={settler.isFemale ? "M35,25 Q50,15 65,25" : "M40,25 Q50,20 60,25"} 
                        fill="none" 
                        stroke={outlineColor} 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                    />

                    {/* Eyes - simple dots */}
                    <circle cx="45" cy="33" r="2" fill="none" stroke={outlineColor} strokeWidth="2" />
                    <circle cx="55" cy="33" r="2" fill="none" stroke={outlineColor} strokeWidth="2" />

                    {/* Nose - just a small line */}
                    <line x1="50" y1="36" x2="50" y2="38" stroke={outlineColor} strokeWidth="1" strokeLinecap="round" />

                    {/* Mouth - simple curve */}
                    {!isSleeping && (
                        <path
                            d="M45,40 Q50,43 55,40"
                            stroke={outlineColor}
                            strokeWidth="2"
                            fill="none"
                            strokeLinecap="round"
                        />
                    )}
                </g>

                {/* Walking stick for exploring - outline only */}
                {isExploring && (
                    <g className="outline-walking-stick">
                        <line 
                            x1="32" 
                            y1="65" 
                            x2="38" 
                            y2="100" 
                            stroke={outlineColor} 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                        />
                        <circle cx="32" cy="65" r="1.5" fill="none" stroke={outlineColor} strokeWidth="2" />
                    </g>
                )}

                {/* Crafting tool - outline only */}
                {settler.status === 'crafting' && (
                    <g className="outline-tool">
                        <rect 
                            x="20" 
                            y="65" 
                            width="8" 
                            height="3" 
                            fill="none" 
                            stroke={outlineColor} 
                            strokeWidth="2" 
                            rx="1" 
                        />
                        <circle cx="18" cy="66" r="2" fill="none" stroke={outlineColor} strokeWidth="2" />
                    </g>
                )}
            </g>

            {/* Sleeping Z's - outline style */}
            {isSleeping && (
                <g className="outline-sleep-z">
                    <text 
                        x="65" 
                        y="30" 
                        fontSize="8" 
                        fill="none" 
                        stroke={outlineColor} 
                        strokeWidth="1" 
                        fontFamily="Arial, sans-serif" 
                        fontWeight="bold"
                    >
                        Z
                    </text>
                    <text 
                        x="70" 
                        y="25" 
                        fontSize="10" 
                        fill="none" 
                        stroke={outlineColor} 
                        strokeWidth="1" 
                        fontFamily="Arial, sans-serif" 
                        fontWeight="bold"
                    >
                        Z
                    </text>
                    <text 
                        x="75" 
                        y="20" 
                        fontSize="12" 
                        fill="none" 
                        stroke={outlineColor} 
                        strokeWidth="1" 
                        fontFamily="Arial, sans-serif" 
                        fontWeight="bold"
                    >
                        Z
                    </text>
                </g>
            )}
        </svg>
    );
};

export default SettlerAvatarOutline;