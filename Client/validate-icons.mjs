import { 
    GiStrong, GiRunningShoe, GiBrain, GiHeartShield, GiPickaxe, GiMuscleUp, 
    GiFist, GiPlantRoots, GiHammerNails, GiMedicalPack, GiGearHammer, 
    GiBrainFreeze, GiHealthPotion, GiCrossbow, GiBackpack, GiTripping, 
    GiPeaceDove, GiBrokenBone, GiLyingDown, GiBloodySword, GiNauseous, 
    GiRun, GiWeakness, GiBrainLeak, GiSick, GiSpikedShoulderArmor, 
    GiSkullCrack, GiBrainTentacle, GiMoneyStack, GiMeat, GiLeaf, 
    GiSuspicious
} from 'react-icons/gi';

const iconMap = {
    GiStrong, GiRunningShoe, GiBrain, GiHeartShield, GiPickaxe, GiMuscleUp, 
    GiFist, GiPlantRoots, GiHammerNails, GiMedicalPack, GiGearHammer, 
    GiBrainFreeze, GiHealthPotion, GiCrossbow, GiBackpack, GiTripping, 
    GiPeaceDove, GiBrokenBone, GiLyingDown, GiBloodySword, GiNauseous, 
    GiRun, GiWeakness, GiBrainLeak, GiSick, GiSpikedShoulderArmor, 
    GiSkullCrack, GiBrainTentacle, GiMoneyStack, GiMeat, GiLeaf, 
    GiSuspicious
};

const missing = [];
const existing = [];

Object.keys(iconMap).forEach(iconName => {
    if (iconMap[iconName] && typeof iconMap[iconName] === 'function') {
        existing.push(iconName);
    } else {
        missing.push(iconName);
    }
});

console.log('Existing icons:', existing.length);
console.log('Missing icons:', missing.length);

if (missing.length > 0) {
    console.log('Missing icons:', missing);
}

if (missing.length === 0) {
    console.log('All icons validated successfully!');
}