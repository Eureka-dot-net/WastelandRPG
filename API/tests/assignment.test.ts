import request from 'supertest';
import { app } from '../src/app';
import { createTestUserAndColony } from './utils';
import mongoose from 'mongoose';


describe('Player endpoints', () => {
  let token: string;
  let userId: mongoose.Types.ObjectId;
  let colony: any;
  let settlerId: string;
  let assignment: any;

  const serverId = 'harbor';
  const colonyName = 'First Colony';

  beforeAll(async () => {
    const result = await createTestUserAndColony({
      userProps: { email: 'playersettler@test.com', password: 'password123' },
      colonyProps: { serverId, colonyName, level: 1, serverType: 'PvE' }
    });
    userId = result.user._id;
    colony = result.colony;
    token = result.token;

    // Grab a settler from the onboarded settlers
    const res = await request(app)
      .post(`/api/colonies/${colony._id}/settlers/onboard`)
      .set('Authorization', `Bearer ${token}`);
    settlerId = res.body.settlers[0]._id;

    // Fetch or create an assignment
    const assignmentsRes = await request(app)
      .get(`/api/colonies/${colony._id}/assignments`)
      .set('Authorization', `Bearer ${token}`);
    assignment = assignmentsRes.body.assignments[0];
  });

  it('should start an assignment successfully', async () => {
    const res = await request(app)
      .post(`/api/colonies/${colony._id}/assignments/${assignment._id}/start`)
      .set('Authorization', `Bearer ${token}`)
      .send({ settlerId });
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('state', 'in-progress');
    expect(res.body.settlerId).toBe(settlerId);
    expect(new Date(res.body.startedAt).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it('should return 400 if settlerId is missing', async () => {
    const res = await request(app)
      .post(`/api/colonies/${colony._id}/assignments/${assignment._id}/start`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('settlerId is required');
  });

  it('should return 400 if assignment already started', async () => {
    const res = await request(app)
      .post(`/api/colonies/${colony._id}/assignments/${assignment._id}/start`)
      .set('Authorization', `Bearer ${token}`)
      .send({ settlerId });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Assignment already started or completed');
  });

  it('should return 401 if JWT is missing', async () => {
    const res = await request(app)
      .post(`/api/colonies/${colony._id}/assignments/${assignment._id}/start`)
      .send({ settlerId });

    expect(res.status).toBe(401);
  });

  it('should return 404 if assignmentId does not exist', async () => {
    const fakeId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .post(`/api/colonies/${colony._id}/assignments/${fakeId}/start`)
      .set('Authorization', `Bearer ${token}`)
      .send({ settlerId });

    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Assignment not found');
  });
});
