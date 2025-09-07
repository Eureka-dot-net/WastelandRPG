import React from 'react';
import type { Settler } from '../types/settler';

interface SettlerAvatarMinimalistProps {
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

const SettlerAvatarMinimalist: React.FC<SettlerAvatarMinimalistProps> = ({
    settler,
    size = 60,
    className
}) => {
    // Create deterministic seed from nameId
    const seedValue = settler.nameId
        .split('')
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const rng = new SeededRandom(seedValue);

    // Minimalist color palette - muted and simple
    const primaryColors = ['#3498DB', '#E74C3C', '#2ECC71', '#F39C12', '#9B59B6', '#1ABC9C'];
    const secondaryColors = ['#ECF0F1', '#BDC3C7', '#95A5A6', '#7F8C8D'];
    
    const primaryColor = rng.choice(primaryColors);
    const secondaryColor = rng.choice(secondaryColors);

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
                    .minimalist-container {
                        transform-origin: 50px 50px;
                        animation: ${isSleeping ? 'minimalist-lay-down 0.5s ease-out forwards' : 'minimalist-sit-up 0.5s ease-out forwards'};
                        transform: ${isExploring ? 'scaleX(-1)' : 'scaleX(1)'};
                    }
                    .minimalist-head {
                        transform-origin: 50px 35px;
                        animation: ${isSleeping ? 'minimalist-sleep-breathe' : 'minimalist-idle-breathe'} ${isSleeping ? '3s' : '4s'} ease-in-out infinite;
                    }
                    .minimalist-tool {
                        transform-origin: 30px 60px;
                        animation: ${isWorking ? 'minimalist-tool-work 1.5s ease-in-out infinite alternate' : 'none'};
                    }
                    .minimalist-walking-stick {
                        transform-origin: 32px 65px;
                        animation: ${isExploring ? 'minimalist-stick-walk 1.2s ease-in-out infinite' : 'none'};
                    }
                    .minimalist-body {
                        animation: ${isExploring ? 'minimalist-walk-cycle 1.2s ease-in-out infinite' : 'none'};
                    }
                    .minimalist-sleep-indicator {
                        animation: ${isSleeping ? 'minimalist-float-z 4s ease-in-out infinite' : 'none'};
                        opacity: ${isSleeping ? '1' : '0'};
                    }
                    @keyframes minimalist-lay-down { from { transform: rotate(0deg) translateY(0px); } to { transform: rotate(90deg) translateY(10px); } }
                    @keyframes minimalist-sit-up { from { transform: rotate(90deg) translateY(10px); } to { transform: rotate(0deg) translateY(0px); } }
                    @keyframes minimalist-idle-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.02); } }
                    @keyframes minimalist-sleep-breathe { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
                    @keyframes minimalist-tool-work { 
                        0% { transform: rotate(-10deg) scale(1); } 
                        50% { transform: rotate(-10deg) scale(1.1); } 
                        100% { transform: rotate(-10deg) scale(1); } 
                    }
                    @keyframes minimalist-stick-walk { 
                        0% { transform: rotate(-5deg); } 
                        25% { transform: rotate(0deg); } 
                        50% { transform: rotate(5deg); } 
                        75% { transform: rotate(0deg); } 
                        100% { transform: rotate(-5deg); } 
                    }
                    @keyframes minimalist-walk-cycle { 
                        0% { transform: translateX(-0.5px) scale(1); } 
                        50% { transform: translateX(0.5px) scale(1.02); } 
                        100% { transform: translateX(-0.5px) scale(1); } 
                    }
                    @keyframes minimalist-float-z { 0% { transform: translateY(0px); opacity: 0.3; } 50% { transform: translateY(-8px); opacity: 1; } 100% { transform: translateY(-16px); opacity: 0; } }
                `}</style>
            </defs>

            <g className="minimalist-container">
                {/* Body - Simple geometric shapes */}
                <g className="minimalist-body">
                    {/* Main body - rounded rectangle */}
                    <rect 
                        x="40" 
                        y="55" 
                        width={settler.isFemale ? "20" : "24"} 
                        height="35" 
                        fill={primaryColor} 
                        rx="12" 
                        ry="12"
                    />
                    
                    {/* Arms - simple rectangles */}
                    <rect 
                        x="25" 
                        y="58" 
                        width="8" 
                        height="20" 
                        fill={primaryColor} 
                        rx="4" 
                    />
                    
                    {!isWorking && (
                        <rect 
                            x="67" 
                            y="58" 
                            width="8" 
                            height="20" 
                            fill={primaryColor} 
                            rx="4" 
                        />
                    )}

                    {/* Working arm with tool */}
                    {isWorking && (
                        <g className="minimalist-tool">
                            <rect 
                                x="67" 
                                y="58" 
                                width="8" 
                                height="20" 
                                fill={primaryColor} 
                                rx="4" 
                            />
                            {/* Simple tool - just a shape */}
                            <rect 
                                x="75" 
                                y="55" 
                                width="3" 
                                height="12" 
                                fill={secondaryColor} 
                                rx="1" 
                            />
                            <rect 
                                x="74" 
                                y="65" 
                                width="5" 
                                height="3" 
                                fill={secondaryColor} 
                                rx="1" 
                            />
                        </g>
                    )}

                    {/* Legs - simple rectangles */}
                    <rect 
                        x="44" 
                        y="85" 
                        width="5" 
                        height="12" 
                        fill={primaryColor} 
                        rx="2" 
                    />
                    <rect 
                        x="51" 
                        y="85" 
                        width="5" 
                        height="12" 
                        fill={primaryColor} 
                        rx="2" 
                    />
                </g>

                {/* Head - Simple circle */}
                <g className="minimalist-head">
                    <circle 
                        cx="50" 
                        cy="35" 
                        r="16" 
                        fill={secondaryColor} 
                    />

                    {/* Hair - simple shape based on gender */}
                    {settler.isFemale ? (
                        <ellipse 
                            cx="50" 
                            cy="25" 
                            rx="18" 
                            ry="10" 
                            fill={primaryColor} 
                        />
                    ) : (
                        <ellipse 
                            cx="50" 
                            cy="28" 
                            rx="12" 
                            ry="6" 
                            fill={primaryColor} 
                        />
                    )}

                    {/* Eyes - two simple dots */}
                    <circle cx="46" cy="33" r="2" fill={primaryColor} />
                    <circle cx="54" cy="33" r="2" fill={primaryColor} />

                    {/* Mouth - simple shape */}
                    {!isSleeping && (
                        <ellipse 
                            cx="50" 
                            cy="40" 
                            rx="3" 
                            ry="1.5" 
                            fill={primaryColor} 
                        />
                    )}
                </g>

                {/* Activity indicators */}
                {isExploring && (
                    <g className="minimalist-walking-stick">
                        <rect 
                            x="31" 
                            y="65" 
                            width="2" 
                            height="25" 
                            fill={secondaryColor} 
                            rx="1" 
                        />
                    </g>
                )}

                {settler.status === 'crafting' && (
                    <rect 
                        x="20" 
                        y="65" 
                        width="6" 
                        height="4" 
                        fill={secondaryColor} 
                        rx="2" 
                    />
                )}
            </g>

            {/* Sleep indicator - simple shape instead of Z */}
            {isSleeping && (
                <g className="minimalist-sleep-indicator">
                    <circle cx="70" cy="25" r="3" fill={primaryColor} opacity="0.6" />
                    <circle cx="75" cy="20" r="4" fill={primaryColor} opacity="0.4" />
                    <circle cx="80" cy="15" r="5" fill={primaryColor} opacity="0.2" />
                </g>
            )}

            {/* Status indicator dot */}
            <circle 
                cx="85" 
                cy="15" 
                r="3" 
                fill={
                    isWorking ? '#E74C3C' :
                    isExploring ? '#3498DB' :
                    isSleeping ? '#9B59B6' :
                    '#2ECC71'
                } 
            />
        </svg>
    );
};

export default SettlerAvatarMinimalist;