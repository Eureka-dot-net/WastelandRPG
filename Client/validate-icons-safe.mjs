const traitIcons = [
    'GiStrong', 'GiRunningShoe', 'GiBrain', 'GiHeartShield', 'GiPickaxe', 'GiMuscleUp', 
    'GiFist', 'GiPlantRoots', 'GiHammerNails', 'GiMedicalPack', 'GiGearHammer', 
    'GiBrainFreeze', 'GiHealthPotion', 'GiCrossbow', 'GiBackpack', 'GiTripping', 
    'GiPeaceDove', 'GiBrokenBone', 'GiLyingDown', 'GiBloodySword', 'GiNauseous', 
    'GiRun', 'GiWeakness', 'GiBrainLeak', 'GiSick', 'GiSpikedShoulderArmor', 
    'GiSkullCrack', 'GiBrainTentacle', 'GiMoneyStack', 'GiMeat', 'GiLeaf', 
    'GiSuspicious'
];

async function validateIcons() {
    const results = {
        existing: [],
        missing: []
    };

    try {
        // Dynamically import all react-icons/gi
        const giModule = await import('react-icons/gi');
        
        for (const iconName of traitIcons) {
            if (giModule[iconName] && typeof giModule[iconName] === 'function') {
                results.existing.push(iconName);
            } else {
                results.missing.push(iconName);
            }
        }
    } catch (error) {
        console.error('Error importing react-icons/gi:', error);
        return;
    }

    console.log(`Validated ${traitIcons.length} trait icons:`);
    console.log(`Existing: ${results.existing.length}`);
    console.log(`Missing: ${results.missing.length}`);
    
    if (results.missing.length > 0) {
        console.log('\nMissing icons:');
        results.missing.forEach(icon => console.log(`- ${icon}`));
        
        console.log('\nSuggested replacements:');
        results.missing.forEach(icon => {
            switch(icon) {
                case 'GiLeaf':
                    console.log(`- ${icon} -> GiOakLeaf or GiTreeLeaf or GiLeafSwirl`);
                    break;
                default:
                    console.log(`- ${icon} -> Check react-icons.github.io for alternatives`);
            }
        });
    } else {
        console.log('\nAll icons exist!');
    }
}

validateIcons();