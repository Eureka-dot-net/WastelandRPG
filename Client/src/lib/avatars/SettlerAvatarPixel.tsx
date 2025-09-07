import React from 'react';
import type { Settler } from '../types/settler';

interface SettlerAvatarPixelProps {
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

const SettlerAvatarPixel: React.FC<SettlerAvatarPixelProps> = ({
    settler,
    size = 60,
    className
}) => {
    // Create deterministic seed from nameId
    const seedValue = settler.nameId
        .split('')
        .reduce((acc, char) => acc + char.charCodeAt(0), 0);

    const rng = new SeededRandom(seedValue);

    // Pixel art color palette - retro/8-bit inspired
    const skinTones = ['#FFDBAC', '#F1C27D', '#E0AC69', '#C68642', '#8D5524'];
    const shirtColors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8'];
    const hairColors = ['#8B4513', '#2F1B14', '#D2B48C', '#FFD700', '#FF69B4', '#800080', '#006400'];

    const skinTone = rng.choice(skinTones);
    const shirtColor = rng.choice(shirtColors);
    const hairColor = rng.choice(hairColors);

    // Activity states
    const isWorking = ['working', 'crafting', 'questing'].includes(settler.status);
    const isSleeping = settler.status === 'resting';
    const isExploring = settler.status === 'exploring';

    // Pixel size for the retro effect
    const pixelSize = 4;

    // Create pixel function
    const Pixel = ({ x, y, color }: { x: number; y: number; color: string }) => (
        <rect
            x={x * pixelSize + 20}
            y={y * pixelSize + 10}
            width={pixelSize}
            height={pixelSize}
            fill={color}
            style={{ imageRendering: 'pixelated' }}
        />
    );

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 100 100"
            className={className}
            style={{ overflow: 'visible', imageRendering: 'pixelated' }}
        >
            <defs>
                <style>{`
                    .pixel-container {
                        transform-origin: 50px 50px;
                        animation: ${isSleeping ? 'pixel-lay-down 0.5s ease-out forwards' : 'pixel-sit-up 0.5s ease-out forwards'};
                        transform: ${isExploring ? 'scaleX(-1)' : 'scaleX(1)'};
                    }
                    .pixel-head {
                        transform-origin: 50px 35px;
                        animation: ${isSleeping ? 'pixel-sleep-breathe' : 'pixel-idle-breathe'} ${isSleeping ? '3s' : '4s'} ease-in-out infinite;
                    }
                    .pixel-tool {
                        transform-origin: 30px 60px;
                        animation: ${isWorking ? 'pixel-tool-work 1.5s ease-in-out infinite alternate' : 'none'};
                    }
                    .pixel-walking-stick {
                        transform-origin: 32px 65px;
                        animation: ${isExploring ? 'pixel-stick-walk 1.2s ease-in-out infinite' : 'none'};
                    }
                    .pixel-body {
                        animation: ${isExploring ? 'pixel-walk-cycle 1.2s ease-in-out infinite' : 'none'};
                    }
                    .pixel-sleep-z {
                        animation: ${isSleeping ? 'pixel-float-z 4s ease-in-out infinite' : 'none'};
                        opacity: ${isSleeping ? '1' : '0'};
                    }
                    @keyframes pixel-lay-down { from { transform: rotate(0deg) translateY(0px); } to { transform: rotate(90deg) translateY(10px); } }
                    @keyframes pixel-sit-up { from { transform: rotate(90deg) translateY(10px); } to { transform: rotate(0deg) translateY(0px); } }
                    @keyframes pixel-idle-breathe { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-1px); } }
                    @keyframes pixel-sleep-breathe { 0%,100% { transform: translateY(0px); } 50% { transform: translateY(-2px); } }
                    @keyframes pixel-tool-work { 
                        0% { transform: rotate(-30deg) translateY(0px); } 
                        50% { transform: rotate(-30deg) translateY(-8px); } 
                        100% { transform: rotate(-30deg) translateY(0px); } 
                    }
                    @keyframes pixel-stick-walk { 
                        0% { transform: rotate(-15deg) translateY(0px); } 
                        25% { transform: rotate(-10deg) translateY(-2px); } 
                        50% { transform: rotate(-5deg) translateY(-1px); } 
                        75% { transform: rotate(-10deg) translateY(-2px); } 
                        100% { transform: rotate(-15deg) translateY(0px); } 
                    }
                    @keyframes pixel-walk-cycle { 
                        0% { transform: translateX(-1px) translateY(0px); } 
                        25% { transform: translateX(0px) translateY(-0.5px); } 
                        50% { transform: translateX(1px) translateY(0px); } 
                        75% { transform: translateX(0px) translateY(-0.5px); } 
                        100% { transform: translateX(-1px) translateY(0px); } 
                    }
                    @keyframes pixel-float-z { 0% { transform: translateY(0px) translateX(0px); opacity: 0.3; } 25% { transform: translateY(-5px) translateX(2px); opacity: 0.7; } 50% { transform: translateY(-10px) translateX(4px); opacity: 0.5; } 75% { transform: translateY(-12px) translateX(6px); opacity: 0.3; } 100% { transform: translateY(-15px) translateX(8px); opacity: 0; } }
                `}</style>
            </defs>

            <g className="pixel-container">
                {/* Body - pixel art style */}
                <g className="pixel-body">
                    {/* Head - 8x8 pixel grid */}
                    <g className="pixel-head">
                        {/* Face outline */}
                        <Pixel x={2} y={2} color={skinTone} />
                        <Pixel x={3} y={2} color={skinTone} />
                        <Pixel x={4} y={2} color={skinTone} />
                        <Pixel x={5} y={2} color={skinTone} />
                        <Pixel x={6} y={2} color={skinTone} />
                        
                        <Pixel x={1} y={3} color={skinTone} />
                        <Pixel x={2} y={3} color={skinTone} />
                        <Pixel x={3} y={3} color={skinTone} />
                        <Pixel x={4} y={3} color={skinTone} />
                        <Pixel x={5} y={3} color={skinTone} />
                        <Pixel x={6} y={3} color={skinTone} />
                        <Pixel x={7} y={3} color={skinTone} />
                        
                        <Pixel x={1} y={4} color={skinTone} />
                        <Pixel x={2} y={4} color={skinTone} />
                        <Pixel x={3} y={4} color={skinTone} />
                        <Pixel x={4} y={4} color={skinTone} />
                        <Pixel x={5} y={4} color={skinTone} />
                        <Pixel x={6} y={4} color={skinTone} />
                        <Pixel x={7} y={4} color={skinTone} />
                        
                        <Pixel x={2} y={5} color={skinTone} />
                        <Pixel x={3} y={5} color={skinTone} />
                        <Pixel x={4} y={5} color={skinTone} />
                        <Pixel x={5} y={5} color={skinTone} />
                        <Pixel x={6} y={5} color={skinTone} />

                        {/* Hair */}
                        <Pixel x={2} y={1} color={hairColor} />
                        <Pixel x={3} y={1} color={hairColor} />
                        <Pixel x={4} y={1} color={hairColor} />
                        <Pixel x={5} y={1} color={hairColor} />
                        <Pixel x={6} y={1} color={hairColor} />
                        <Pixel x={1} y={2} color={hairColor} />
                        <Pixel x={7} y={2} color={hairColor} />
                        {settler.isFemale && (
                            <>
                                <Pixel x={1} y={1} color={hairColor} />
                                <Pixel x={7} y={1} color={hairColor} />
                                <Pixel x={0} y={2} color={hairColor} />
                                <Pixel x={8} y={2} color={hairColor} />
                            </>
                        )}

                        {/* Eyes */}
                        <Pixel x={2} y={3} color="#000000" />
                        <Pixel x={6} y={3} color="#000000" />

                        {/* Mouth */}
                        {!isSleeping && (
                            <>
                                <Pixel x={3} y={4} color="#000000" />
                                <Pixel x={4} y={4} color="#000000" />
                                <Pixel x={5} y={4} color="#000000" />
                            </>
                        )}
                    </g>

                    {/* Body */}
                    <Pixel x={2} y={6} color={shirtColor} />
                    <Pixel x={3} y={6} color={shirtColor} />
                    <Pixel x={4} y={6} color={shirtColor} />
                    <Pixel x={5} y={6} color={shirtColor} />
                    <Pixel x={6} y={6} color={shirtColor} />
                    
                    <Pixel x={2} y={7} color={shirtColor} />
                    <Pixel x={3} y={7} color={shirtColor} />
                    <Pixel x={4} y={7} color={shirtColor} />
                    <Pixel x={5} y={7} color={shirtColor} />
                    <Pixel x={6} y={7} color={shirtColor} />
                    
                    <Pixel x={2} y={8} color={shirtColor} />
                    <Pixel x={3} y={8} color={shirtColor} />
                    <Pixel x={4} y={8} color={shirtColor} />
                    <Pixel x={5} y={8} color={shirtColor} />
                    <Pixel x={6} y={8} color={shirtColor} />

                    {/* Arms */}
                    <Pixel x={0} y={6} color={shirtColor} />
                    <Pixel x={0} y={7} color={shirtColor} />
                    <Pixel x={1} y={6} color={shirtColor} />
                    <Pixel x={1} y={7} color={shirtColor} />
                    
                    {!isWorking && (
                        <>
                            <Pixel x={7} y={6} color={shirtColor} />
                            <Pixel x={7} y={7} color={shirtColor} />
                            <Pixel x={8} y={6} color={shirtColor} />
                            <Pixel x={8} y={7} color={shirtColor} />
                        </>
                    )}

                    {/* Working arm with tool */}
                    {isWorking && (
                        <g className="pixel-tool">
                            <Pixel x={7} y={6} color={shirtColor} />
                            <Pixel x={7} y={7} color={shirtColor} />
                            <Pixel x={8} y={6} color={shirtColor} />
                            <Pixel x={8} y={7} color={shirtColor} />
                            
                            {/* Tool - hammer */}
                            <Pixel x={9} y={5} color="#8B4513" />
                            <Pixel x={9} y={6} color="#8B4513" />
                            <Pixel x={9} y={7} color="#8B4513" />
                            <Pixel x={10} y={5} color="#696969" />
                            <Pixel x={11} y={5} color="#696969" />
                        </g>
                    )}

                    {/* Legs */}
                    <Pixel x={3} y={9} color={shirtColor} />
                    <Pixel x={3} y={10} color={shirtColor} />
                    <Pixel x={3} y={11} color={shirtColor} />
                    
                    <Pixel x={5} y={9} color={shirtColor} />
                    <Pixel x={5} y={10} color={shirtColor} />
                    <Pixel x={5} y={11} color={shirtColor} />

                    {/* Feet */}
                    <Pixel x={2} y={11} color="#654321" />
                    <Pixel x={3} y={11} color="#654321" />
                    <Pixel x={5} y={11} color="#654321" />
                    <Pixel x={6} y={11} color="#654321" />
                </g>

                {/* Walking stick for exploring */}
                {isExploring && (
                    <g className="pixel-walking-stick">
                        <Pixel x={0} y={8} color="#8B4513" />
                        <Pixel x={0} y={9} color="#8B4513" />
                        <Pixel x={0} y={10} color="#8B4513" />
                        <Pixel x={0} y={11} color="#8B4513" />
                        <Pixel x={0} y={12} color="#8B4513" />
                    </g>
                )}

                {/* Crafting indicator */}
                {settler.status === 'crafting' && (
                    <>
                        <Pixel x={-1} y={8} color="#DAA520" />
                        <Pixel x={-1} y={9} color="#DAA520" />
                        <Pixel x={-2} y={8} color="#CD7F32" />
                    </>
                )}
            </g>

            {/* Sleeping Z's - pixel style */}
            {isSleeping && (
                <g className="pixel-sleep-z">
                    {/* Z made of pixels */}
                    <Pixel x={10} y={2} color="#4A90E2" />
                    <Pixel x={11} y={2} color="#4A90E2" />
                    <Pixel x={11} y={3} color="#4A90E2" />
                    <Pixel x={10} y={4} color="#4A90E2" />
                    <Pixel x={11} y={4} color="#4A90E2" />
                    
                    <Pixel x={12} y={1} color="#4A90E2" />
                    <Pixel x={13} y={1} color="#4A90E2" />
                    <Pixel x={13} y={2} color="#4A90E2" />
                    <Pixel x={12} y={3} color="#4A90E2" />
                    <Pixel x={13} y={3} color="#4A90E2" />
                </g>
            )}
        </svg>
    );
};

export default SettlerAvatarPixel;