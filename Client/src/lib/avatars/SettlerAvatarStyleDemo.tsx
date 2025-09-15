import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, Switch, FormControlLabel } from '@mui/material';
import SettlerAvatar from './SettlerAvatar';
import SettlerAvatarOutline from './SettlerAvatarOutline';
import SettlerAvatarMinimalist from './SettlerAvatarMinimalist';
import SettlerAvatarPixel from './SettlerAvatarPixel';
import SettlerAvatarSilhouette from './SettlerAvatarSilhouette';
import type { Settler } from '../types/settler';

// Mock settler data for demo
const createMockSettler = (
    nameId: string, 
    isFemale: boolean, 
    status: 'idle' | 'working' | 'exploring' | 'resting' | 'crafting' | 'questing'
): Settler => ({
    _id: nameId,
    colonyId: 'demo',
    isActive: true,
    nameId: nameId,
    name: nameId.charAt(0).toUpperCase() + nameId.slice(1),
    backstory: 'Demo settler for avatar styles',
    isFemale,
    status,
    health: 100,
    energy: 80,
    hunger: 60,
    morale: 75,
    stats: {
        strength: 5,
        speed: 5,
        intelligence: 5,
        resilience: 5
    },
    skills: {
        combat: 5,
        scavenging: 5,
        farming: 5,
        crafting: 5,
        medical: 5,
        engineering: 5
    },
    interests: ['crafting'],
    traits: [],
    carry: [],
    equipment: {},
    foodConsumption: 1,
    maxCarrySlots: 10,
    energyDeltaPerHour: 0,
    adjustments: {
        quest: { loot: 1.0, speed: 1.0 },
        exploration: { loot: 1.0, speed: 1.0 },
        crafting: { loot: 1.0, speed: 1.0 }
    },
    createdAt: new Date().toISOString()
});

const mockSettlers = [
    createMockSettler('alice', true, 'working'),
    createMockSettler('bob', false, 'exploring'),
    createMockSettler('charlie', true, 'resting'),
    createMockSettler('diana', true, 'crafting'),
    createMockSettler('edward', false, 'idle'),
    createMockSettler('fiona', true, 'questing')
];

const SettlerAvatarStyleDemo: React.FC = () => {
    const [showAnimations, setShowAnimations] = useState(true);
    const [selectedSize, setSelectedSize] = useState(80);

    const avatarComponents = [
        { name: 'Original (Current)', component: SettlerAvatar, description: 'Detailed avatar with full features, animations, and customization' },
        { name: 'Outline Style', component: SettlerAvatarOutline, description: 'Clean line-art style with no fill colors, emphasizing simplicity' },
        { name: 'Minimalist Style', component: SettlerAvatarMinimalist, description: 'Geometric shapes with limited color palette, modern and clean' },
        { name: 'Pixel Art Style', component: SettlerAvatarPixel, description: 'Retro 8-bit inspired blocky pixel art for nostalgic gaming feel' },
        { name: 'Silhouette Style', component: SettlerAvatarSilhouette, description: 'Elegant silhouettes with gradients and subtle details' }
    ];

    return (
        <Box sx={{ p: 3, maxWidth: '1200px', margin: '0 auto' }}>
            <Typography variant="h3" component="h1" gutterBottom align="center" color="primary">
                SettlerAvatar Style Comparison
            </Typography>
            
            <Typography variant="body1" paragraph align="center" color="text.secondary">
                Compare different visual styles for the SettlerAvatar component. Each style maintains the same animations and functionality while offering a unique visual approach.
            </Typography>

            {/* Controls */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 4, flexWrap: 'wrap' }}>
                <FormControlLabel
                    control={
                        <Switch 
                            checked={showAnimations} 
                            onChange={(e) => setShowAnimations(e.target.checked)}
                            color="primary"
                        />
                    }
                    label="Show Animations"
                />
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">Size:</Typography>
                    {[60, 80, 100, 120].map(size => (
                        <Box
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            sx={{
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                cursor: 'pointer',
                                backgroundColor: selectedSize === size ? 'primary.main' : 'grey.200',
                                color: selectedSize === size ? 'white' : 'text.primary',
                                fontSize: '0.8rem'
                            }}
                        >
                            {size}px
                        </Box>
                    ))}
                </Box>
            </Box>

            {/* Avatar Styles Grid */}
            {avatarComponents.map((avatarStyle, styleIndex) => (
                <Card key={avatarStyle.name} sx={{ mb: 4, border: styleIndex === 0 ? 2 : 1, borderColor: styleIndex === 0 ? 'primary.main' : 'grey.300' }}>
                    <CardContent>
                        <Typography variant="h5" component="h2" gutterBottom color={styleIndex === 0 ? 'primary' : 'text.primary'}>
                            {avatarStyle.name}
                            {styleIndex === 0 && <Typography component="span" color="primary" sx={{ ml: 1, fontSize: '0.8em' }}>(Current)</Typography>}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" paragraph>
                            {avatarStyle.description}
                        </Typography>

                        {/* Settlers Grid for this style */}
                        <Box sx={{ 
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                            gap: 3,
                            marginTop: 2
                        }}>
                            {mockSettlers.map((settler) => (
                                <Box key={`${avatarStyle.name}-${settler.nameId}`} sx={{ textAlign: 'center' }}>
                                    <Box sx={{ 
                                        display: 'flex', 
                                        justifyContent: 'center', 
                                        mb: 1,
                                        p: 2,
                                        borderRadius: 2,
                                        backgroundColor: 'grey.50',
                                        border: '1px solid',
                                        borderColor: 'grey.200'
                                    }}>
                                        <avatarStyle.component 
                                            settler={showAnimations ? settler : { ...settler, status: 'idle' as const }}
                                            size={selectedSize}
                                        />
                                    </Box>
                                    
                                    <Typography variant="caption" display="block" color="text.primary" fontWeight="medium">
                                        {settler.name}
                                    </Typography>
                                    <Typography variant="caption" display="block" color="text.secondary">
                                        {showAnimations ? settler.status : 'idle'}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                    </CardContent>
                </Card>
            ))}

            {/* Footer */}
            <Box sx={{ mt: 6, p: 3, backgroundColor: 'grey.50', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="h6" gutterBottom>
                    Implementation Notes
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                    • All styles support the same animations: idle, working, exploring, sleeping, and crafting
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                    • Each avatar is deterministically generated from the settler's nameId for consistency
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                    • Styles are drop-in replacements - just change the import to switch styles
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    • Mobile responsive with appropriate sizing for different screen sizes
                </Typography>
            </Box>
        </Box>
    );
};

export default SettlerAvatarStyleDemo;