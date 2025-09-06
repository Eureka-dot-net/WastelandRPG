import { ClientSession, Types } from 'mongoose';
import { ISettler, Settler, SettlerDoc } from '../models/Player/Settler';
import namesCatalogue from '../data/namesCatalogue.json';
import surnamesCatalogue from '../data/surnamesCatalogue.json';
import backstoryCatalogue from '../data/backstoryCatalogue.json';
import skillsCatalogue from '../data/skillsCatalogue.json';
import traitsCatalogue from '../data/traitsCatalogue.json'; 

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

// Generate a random name combining first name and surname
function generateRandomName(): { name: string, nameId: string } {
    const firstName = namesCatalogue[Math.floor(Math.random() * namesCatalogue.length)];
    const surname = surnamesCatalogue[Math.floor(Math.random() * surnamesCatalogue.length)];
    const fullName = `${firstName} ${surname}`;
    const nameId = `${firstName.toLowerCase()}_${surname.toLowerCase()}`;
    
    return {
        name: fullName,
        nameId: nameId
    };
}

// Find the highest skill value and return the skill name
function getHighestSkill(skills: ISettler['skills']): keyof ISettler['skills'] {
    const skillEntries = Object.entries(skills) as [keyof ISettler['skills'], number][];
    skillEntries.sort((a, b) => b[1] - a[1]);
    return skillEntries[0][0];
}

// Get a backstory based on the highest skill
function getSkillLinkedBackstory(skills: ISettler['skills']): string {
    const highestSkill = getHighestSkill(skills);
    
    // Filter backstories by the highest skill
    const matchingBackstories = backstoryCatalogue.filter(entry => entry.skill === highestSkill);
    
    // Fallback to random backstory if no matches found
    if (matchingBackstories.length === 0) {
        const randomBackstory = backstoryCatalogue[Math.floor(Math.random() * backstoryCatalogue.length)];
        return randomBackstory.backstory;
    }
    
    // Select random backstory from matching ones
    const selectedBackstory = matchingBackstories[Math.floor(Math.random() * matchingBackstories.length)];
    return selectedBackstory.backstory;
}

// Generate unique names ensuring no duplicates within a colony
async function generateUniqueNames(colonyId: string, count: number): Promise<{ name: string, nameId: string }[]> {
    const existingSettlers = await Settler.find({ colonyId });
    const usedNameIds = new Set(existingSettlers.map(settler => settler.nameId));
    
    const generatedNames: { name: string, nameId: string }[] = [];
    const attempts = count * 1000; // Prevent infinite loop
    let attemptCount = 0;
    
    while (generatedNames.length < count && attemptCount < attempts) {
        const nameObj = generateRandomName();
        
        // Check if this nameId is already used in the colony or already generated
        if (!usedNameIds.has(nameObj.nameId) && !generatedNames.some(n => n.nameId === nameObj.nameId)) {
            generatedNames.push(nameObj);
            usedNameIds.add(nameObj.nameId);
        }
        
        attemptCount++;
    }
    
    if (generatedNames.length < count) {
        throw new Error(`Could not generate ${count} unique names. Only generated ${generatedNames.length}.`);
    }
    
    return generatedNames;
}

// Generate one settler
export async function generateSettler(colonyId: string, session: ClientSession, options?: { assignInterests?: boolean, isActive?: boolean, nameObj?: any }): Promise<SettlerDoc> {
    const stats = rollStats();
    const skills = rollSkills();
    const traits = assignTraits();

    // Use provided nameObj for deterministic selection, or generate unique name
    const nameObj = options?.nameObj || (await generateUniqueNames(colonyId, 1))[0];
    const interests = options?.assignInterests ? assignInterests(2) : [];
    
    // Generate skill-linked backstory
    const backstory = getSkillLinkedBackstory(skills);

    const settler = new Settler({
        colonyId: new Types.ObjectId(colonyId),
        nameId: nameObj.nameId,
        name: nameObj.name,
        backstory: backstory,
        theme: 'wasteland', // Default theme since we removed theme from names
        stats,
        skills,
        interests,
        traits,
        status: 'idle',
        health: 100,
        morale: 90,
        carry: [],
        equipment: {},
        maxCarrySlots: 8,
        isActive: options?.isActive ?? false,
        createdAt: new Date(),
    });
    return await settler.save({ session });
}

// Generate three unique onboarding choices (settlers)
export async function generateSettlerChoices(colonyId: string, session: ClientSession): Promise<ISettler[]> {
    // Generate 3 unique names for this colony
     const uniqueNames = await generateUniqueNames(colonyId, 3);

    const newSettlers: SettlerDoc[] = [];
    for (const nameObj of uniqueNames) {
        const settler = await generateSettler(colonyId, session, { assignInterests: true, isActive: false, nameObj });
        // optional debug:
        // console.log('Saved settler in tx:', settler._id?.toString(), settler.name);
        newSettlers.push(settler);
    }
    return newSettlers;
}