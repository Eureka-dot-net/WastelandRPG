import request from 'supertest';
import { app } from '../src/app';
import mongoose from 'mongoose';
import './setup';
import { createTestUserAndColony } from './utils';

describe('Server API', () => {
  let token: string;
  let userId: mongoose.Types.ObjectId;
  let colony: any;

  const serverId = 'harbor';
  const colonyName = 'First Colony';

  beforeAll(async () => {
    if ((global as any).skipIfNoMongoDB?.()) {
      console.log('Skipping MongoDB-dependent setup for Server API tests');
      return;
    }

    const result = await createTestUserAndColony({
      userProps: { email: 'player@test.com', password: 'password123' },
      colonyProps: { 
        serverId, 
        serverName: 'Test Server',
        serverType: 'PvE', 
        colonyName, 
        level: 1,
        spiralIndex: 0,
        spiralLayer: 0,
        spiralPosition: 0,
        spiralDirection: 0,
        homesteadLocation: { x: 0, y: 0 }
      }
    });
    userId = result.user._id;
    colony = result.colony  ;
    token = result.token;
  });

  it('should return list of servers', async () => {
    // This test doesn't require database
    const res = await request(app).get('/api/servers');
    expect(res.status).toBe(200);
    expect(res.body.servers).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: serverId, name: 'Harbor', type: 'PvE' })
    ]));
  });

  it('should return colony info for authenticated user', async () => {
    if ((global as any).skipIfNoMongoDB?.()) {
      console.log('Skipping MongoDB-dependent test: should return colony info for authenticated user');
      return;
    }

    const res = await request(app)
      .get(`/api/servers/${serverId}/colony`)
      .set('Authorization', `Bearer ${token}`);
    
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expect.objectContaining({
      colonyName,
      level: 1
    }));
  });

  it('should reject request without token', async () => {
    if ((global as any).skipIfNoMongoDB?.()) {
      console.log('Skipping MongoDB-dependent test: should reject request without token');
      return;
    }

    const res = await request(app)
      .get(`/api/servers/${serverId}/colony`);
    
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Missing token');
  });

  it('should return 404 if player does not exist', async () => {
    if ((global as any).skipIfNoMongoDB?.()) {
      console.log('Skipping MongoDB-dependent test: should return 404 if player does not exist');
      return;
    }

    const fakeServer = 'nonexistent-server';
    const res = await request(app)
      .get(`/api/servers/${fakeServer}/colony`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.message).toBe('Colony not found');
  });

  it('should allow user to join additional servers', async () => {
    if ((global as any).skipIfNoMongoDB?.()) {
      console.log('Skipping MongoDB-dependent test: should allow user to join additional servers');
      return;
    }

    const newServerId = 'wasteland';
    const res = await request(app)
      .post(`/api/servers/${newServerId}/join`)
      .set('Authorization', `Bearer ${token}`)
      .send({ colonyName: 'My Wasteland Colony' });

    expect(res.status).toBe(201);
    expect(res.body.message).toContain('Successfully joined');
    expect(res.body.colony).toBeDefined();
  });

  it('should prevent joining the same server twice', async () => {
    if ((global as any).skipIfNoMongoDB?.()) {
      console.log('Skipping MongoDB-dependent test: should prevent joining the same server twice');
      return;
    }

    const res = await request(app)
      .post(`/api/servers/${serverId}/join`)
      .set('Authorization', `Bearer ${token}`)
      .send({ colonyName: 'Another Colony' });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe('You already have a colony on this server');
  });

  it('should list all user colonies across servers', async () => {
    if ((global as any).skipIfNoMongoDB?.()) {
      console.log('Skipping MongoDB-dependent test: should list all user colonies across servers');
      return;
    }

    const res = await request(app)
      .get(`/api/servers/colonies`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.colonies).toBeDefined();
    expect(Array.isArray(res.body.colonies)).toBe(true);
    expect(res.body.colonies.length).toBeGreaterThanOrEqual(1);
  });
});