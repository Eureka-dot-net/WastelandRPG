import { Types } from 'mongoose';
import { ISettler, Settler } from '../models/Player/Settler';
import nameCatalogue from '../data/namesCatalogue.json';
import statsCatalogue from '../data/statsCatalogue.json';
import skillsCatalogue from '../data/skillsCatalogue.json';
import traitsCatalogue from '../data/traitsCatalogue.json';

// to do - change namesCatelogue to be names and surnames sperately so we have more options
// to do - pick backstory based on highest skill 

function getRandomTrait(type: 'positive' | 'negative') {
    const filtered = traitsCatalogue.filter(trait => trait.type === type);
    return filtered.length > 0
        ? filtered[Math.floor(Math.random() * filtered.length)]
        : null;
}

function assignTraits(): ISettler['traits'] {
    const positiveTrait = getRandomTrait('positive');
    const negativeTrait = getRandomTrait('negative');
    return [
        positiveTrait && {
            traitId: positiveTrait.traitId,
            name: positiveTrait.name,
            type: 'positive',
            description: positiveTrait.description,
            icon: positiveTrait.icon,
        },
        negativeTrait && {
            traitId: negativeTrait.traitId,
            name: negativeTrait.name,
            type: 'negative',
            description: negativeTrait.description,
            icon: negativeTrait.icon
        }
    ].filter(Boolean) as ISettler['traits'];
}

const statKeys = statsCatalogue.map(stat => stat.statId as keyof ISettler['stats']);
const skillKeys = skillsCatalogue.map(skill => skill.skillId as keyof ISettler['skills']);

function rollStats(totalPoints: number = 25): ISettler['stats'] {
    const statKeys: (keyof ISettler['stats'])[] = ['strength', 'speed', 'intelligence', 'resilience'];
    const minStat = 4;
    const maxStat = 10;
    
    // Step 1: Initialize stats with the minimum value
    const stats: ISettler['stats'] = {
        strength: minStat,
        speed: minStat,
        intelligence: minStat,
        resilience: minStat,
    };

    // Step 2: Calculate remaining points to distribute
    let remainingPoints = totalPoints - (minStat * statKeys.length);

    // Step 3: Randomly distribute the remaining points
    while (remainingPoints > 0) {
        // Pick a random stat
        const randomStat = statKeys[Math.floor(Math.random() * statKeys.length)];

        // Check if the stat can be increased further
        if (stats[randomStat] < maxStat) {
            stats[randomStat]++;
            remainingPoints--;
        }
    }
    
    return stats;
}

function assignInterests(interestsCount = 2): ISettler['interests'] {
    const shuffled = [...skillKeys].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, interestsCount);
}

function rollSkills(): ISettler['skills'] {
    const totalPoints = 20 + Math.floor(Math.random() * 11);
    const skills: ISettler['skills'] = {
        combat: 0,
        scavenging: 0,
        farming: 0,
        crafting: 0,
        medical: 0,
        engineering: 0,
    };
    for (let i = 0; i < totalPoints; i++) {
        const skill = skillKeys[Math.floor(Math.random() * skillKeys.length)];
        if (skills[skill] < 10) skills[skill]++;
    }
    return skills;
}

// Get unused names for a player
async function getAvailableNames(playerId: string): Promise<typeof nameCatalogue> {
    const existingSettlers = await Settler.find({ playerId });
    const usedNameIds = new Set(existingSettlers.map(settler => settler.nameId));
    return nameCatalogue.filter(n => !usedNameIds.has(n.nameId));
}

// Pick N unique names for onboarding or single for recruit
async function pickUniqueNames(playerId: string, count: number): Promise<any[]> {
    const availableNames = await getAvailableNames(playerId);
    if (availableNames.length < count) {
        throw new Error('Not enough unique names available.');
    }
    const pickedNames: any[] = [];
    const usedIndexes = new Set<number>();
    while (pickedNames.length < count) {
        const idx = Math.floor(Math.random() * availableNames.length);
        if (!usedIndexes.has(idx)) {
            pickedNames.push(availableNames[idx]);
            usedIndexes.add(idx);
        }
    }
    return pickedNames;
}

// Generate one settler
export async function generateSettler(playerId: string, options?: { assignInterests?: boolean, isActive?: boolean, nameObj?: any }): Promise<ISettler> {
    const stats = rollStats();
    const skills = rollSkills();
    const traits = assignTraits();

    // Use provided nameObj for deterministic selection, or pick unique
    const pickedName = options?.nameObj || (await pickUniqueNames(playerId, 1))[0];
    const interests = options?.assignInterests ? assignInterests(2) : [];

    const settler = new Settler({
        playerId: new Types.ObjectId(playerId),
        nameId: pickedName.nameId,
        name: pickedName.name,
        backstory: pickedName.backstory,
        theme: pickedName.theme,
        stats,
        skills,
        interests,
        traits,
        status: 'idle',
        health: 100,
        morale: 50,
        carry: [],
        equipment: {},
        maxCarrySlots: 8,
        isActive: options?.isActive ?? false,
        createdAt: new Date(),
    });
    await settler.save();
    return settler;
}

// Generate three unique onboarding choices (names)
export async function generateSettlerChoices(playerId: string): Promise<ISettler[]> {
    // Pick 3 unused names for this player
    const pickedNames = await pickUniqueNames(playerId, 3);

    const settlerPromises = pickedNames.map(nameObj =>
        generateSettler(playerId, { assignInterests: true, isActive: false, nameObj })
    );
    const newSettlers = await Promise.all(settlerPromises);
    return newSettlers;
}