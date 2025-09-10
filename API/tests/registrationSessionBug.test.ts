import request from 'supertest';
import { app } from '../src/app';
import { User } from '../src/models/User';
import { Colony } from '../src/models/Player/Colony';
import { UserMapTile } from '../src/models/Player/UserMapTile';
import { SpiralCounter } from '../src/models/Server/SpiralCounter';
import mongoose from 'mongoose';
import { withSession } from '../src/utils/sessionUtils';

describe('Registration Session Bug', () => {
    
    afterEach(async () => {
        // Clean up after each test
        await User.deleteMany({});
        await Colony.deleteMany({});
        await UserMapTile.deleteMany({});
        await SpiralCounter.deleteMany({});
    });

    it('should register a user successfully with proper session handling', async () => {
        const testEmail = 'sessiontest@example.com';
        const testPassword = 'testpassword123';

        const response = await request(app)
            .post('/api/auth/register')
            .send({
                email: testEmail,
                password: testPassword,
                serverId: 'harbor',
                colonyName: 'TestColony'
            });

        console.log('Registration response:', response.status, response.body);

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('User created successfully');

        // Verify user was created
        const user = await User.findOne({ email: testEmail });
        expect(user).toBeTruthy();

        // Verify colony was created
        const colony = await Colony.findOne({ userId: user!._id });
        expect(colony).toBeTruthy();
        expect(colony!.colonyName).toBe('TestColony');

        // Verify UserMapTile was created
        const userMapTile = await UserMapTile.findOne({ colonyId: colony!._id.toString() });
        expect(userMapTile).toBeTruthy();
        expect(userMapTile!.terrain).toBe('homestead');
    });

    it('should handle the session scenario that caused the production bug', async () => {
        // This test specifically tests the scenario where Colony.findById within 
        // a transaction needs the session to see uncommitted changes
        
        const testUserId = new mongoose.Types.ObjectId();
        const testServerId = 'harbor';
        const testColonyName = 'SessionTestColony';
        
        await withSession(async (session) => {
            // Import here to avoid circular dependencies
            const { createColonyWithSpiralLocation } = await import('../src/services/mapService');
            
            // This should complete successfully without throwing "Colony not found for user map tile"
            const colony = await createColonyWithSpiralLocation(
                testUserId,
                testServerId, 
                testColonyName,
                'pvpve',
                'Harbor',
                5,
                5,
                session
            );

            expect(colony).toBeTruthy();
            expect(colony.colonyName).toBe(testColonyName);
            expect(colony.userId).toEqual(testUserId);
            expect(colony.serverId).toBe(testServerId);

            // Verify the UserMapTile was created and accessible within the session
            const userMapTile = await UserMapTile.findOne({ colonyId: colony._id.toString() }).session(session);
            expect(userMapTile).toBeTruthy();
            expect(userMapTile!.terrain).toBe('homestead');
            expect(userMapTile!.isExplored).toBe(true);
        });
    });

    it('should demonstrate the issue if session is not passed properly', async () => {
        // This test would demonstrate the bug if we didn't fix it
        // We'll create a UserMapTile manually and try to get the colony without session
        
        const testUserId = new mongoose.Types.ObjectId();
        const testColonyId = new mongoose.Types.ObjectId();
        
        await withSession(async (session) => {
            // Create a colony within a session but don't commit yet
            const { Colony } = await import('../src/models/Player/Colony');
            const colony = new Colony({
                _id: testColonyId,
                userId: testUserId,
                serverId: 'harbor',
                serverName: 'Harbor',
                colonyName: 'TestColony',
                serverType: 'pvpve',
                level: 1,
                hasInitialSettlers: false,
                maxSettlers: 20,
                notoriety: 0,
                maxInventory: 100,
                settlers: [],
                logs: [],
                homesteadLocation: { x: 0, y: 0 },
                spiralLayer: 0,
                spiralPosition: 0,
                spiralDirection: 0,
                spiralIndex: 0
            });
            
            await colony.save({ session });

            // Create UserMapTile that references this colony
            const userMapTile = new UserMapTile({
                colonyId: testColonyId.toString(),
                serverTile: new mongoose.Types.ObjectId(),
                x: 0,
                y: 0,
                terrain: 'homestead',
                icon: 'GiHut',
                distanceFromHomestead: 0,
                explorationTime: 0,
                lootMultiplier: 1,
                isExplored: false,
                exploredAt: new Date()
            });
            
            await userMapTile.save({ session });

            // Import UserMapTileManager
            const { UserMapTileManager } = await import('../src/managers/UserMapTileManager');
            const manager = new UserMapTileManager(userMapTile);
            
            // This should work now with our fix (passing session)
            const colonyManager = await manager.getColony(session);
            expect(colonyManager).toBeTruthy();
            expect(colonyManager.id).toBe(testColonyId.toString());
            
            // This would previously fail if session wasn't passed (simulating the old bug)
            // We can't easily test the failure case since we fixed it, but we can verify success
        });
    });
});