import request from 'supertest';
import { app } from '../src/app';
import { createTestUserAndColony } from './utils';
import mongoose from 'mongoose';

describe('Player endpoints', () => {
  let token: string;
  let userId: mongoose.Types.ObjectId;
  let colony: any;

  const serverId = 'harbor';
  const colonyName = 'First Colony';

  beforeAll(async () => {
    if ((global as any).skipIfNoMongoDB?.()) {
      console.log('Skipping MongoDB-dependent setup for Player endpoints tests');
      return;
    }

    const result = await createTestUserAndColony({
      userProps: { email: 'playersettler@test.com', password: 'password123' },
      colonyProps: { 
        serverId, 
        serverName: 'Test Server',
        colonyName, 
        level: 1, 
        serverType: 'PvE',
        spiralIndex: 0,
        spiralLayer: 0,
        spiralPosition: 0,
        spiralDirection: 0,
        homesteadLocation: { x: 0, y: 0 }
      }
    });
    userId = result.user._id;
    colony = result.colony;
    token = result.token;
  });

  it('should onboard with correct colonyId and JWT', async () => {
    if ((global as any).skipIfNoMongoDB?.()) {
      console.log('Skipping MongoDB-dependent test: should onboard with correct colonyId and JWT');
      return;
    }
    const res = await request(app)
      .post(`/api/colonies/${colony._id}/settlers/onboard`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.settlers)).toBe(true);
    expect(res.body.settlers).toHaveLength(3);
    for (const settler of res.body.settlers) {
      expect(settler).toHaveProperty('_id');
      expect(settler).toHaveProperty('name');
      expect(settler).toHaveProperty('theme');
      expect(settler).toHaveProperty('stats');
      expect(settler).toHaveProperty('skills');
      expect(settler).toHaveProperty('status', 'idle');
      expect(settler).toHaveProperty('health', 100);
      expect(settler).toHaveProperty('morale', 90);
    }
    for (const settler of res.body.settlers) {
      expect(settler.colonyId).toBe(String(colony._id)); 
    }
  });

  it('should fail onboarding with wrong colonyId', async () => {
    if ((global as any).skipIfNoMongoDB?.()) {
      console.log('Skipping MongoDB-dependent test: should fail onboarding with wrong colonyId');
      return;
    }

    const fakeColonyId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post(`/api/colonies/${fakeColonyId}/settlers/onboard`)
      .set('Authorization', `Bearer ${token}`);
    expect([403, 404]).toContain(res.status);
  });

  it('should fail onboarding with missing JWT', async () => {
    if ((global as any).skipIfNoMongoDB?.()) {
      console.log('Skipping MongoDB-dependent test: should fail onboarding with missing JWT');
      return;
    }
    const res = await request(app)
      .post(`/api/colonies/${colony._id}/settlers/onboard`);
    expect(res.status).toBe(401);
  });
});