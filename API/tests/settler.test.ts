import request from 'supertest';
import { app } from '../src/app';
import { createTestUserAndColony } from './utils';
import mongoose from 'mongoose';

describe('Player endpoints', () => {
  let token: string;
  let userId: mongoose.Types.ObjectId;
  let colony: any;

  const serverId = 'server-1';
  const colonyName = 'First Colony';

  beforeAll(async () => {
    const result = await createTestUserAndColony({
      userProps: { email: 'playersettler@test.com', password: 'password123' },
      colonyProps: { serverId, colonyName, level: 1 }
    });
    userId = result.user._id;
    colony = result.colony;
    token = result.token;
  });

  it('should onboard with correct colonyId and JWT', async () => {
    const res = await request(app)
      .post(`/api/colonies/${colony._id}/settlers/onboard`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    // Check the returned data as you expect
  });

  it('should fail onboarding with wrong playerId', async () => {
    const fakePlayerId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post(`/api/players/${fakePlayerId}/settlers/onboard`)
      .set('Authorization', `Bearer ${token}`);
    expect([403, 404]).toContain(res.status);
  });

  it('should fail onboarding with missing JWT', async () => {
    const res = await request(app)
      .post(`/api/colonies/${colony._id}/settlers/onboard`);
    expect(res.status).toBe(401);
  });
});