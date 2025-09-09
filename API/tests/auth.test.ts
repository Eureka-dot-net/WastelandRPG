import request from 'supertest';
import { app } from '../src/app'; // We'll refactor server entry to export app

describe('Auth API', () => {
    it('should return 200 on GET /', async () => {
        const res = await request(app).get('/api/');
        console.log(res.status, res.body);
    });

    const testUser = { email: 'test@example.com', password: 'password123', serverId: 'harbor' };

    it('should register a user', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser);

        if (res.status !== 201) {
            console.log('Registration failed:', res.status, res.body);
        }
        
        expect(res.status).toBe(201);
        expect(res.body.message).toBe('User created successfully');
    });

    it('should not register the same user twice', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .send(testUser)
            .expect(400);

        expect(res.body.message).toBe('User already exists');
    });

    it('should reject registration with invalid serverId', async () => {
        const invalidUser = { email: 'invalid@example.com', password: 'password123', serverId: 'invalid-server' };
        const res = await request(app)
            .post('/api/auth/register')
            .send(invalidUser)
            .expect(400);

        expect(res.body.message).toBe('Invalid server selected');
    });

    it('should login a user and return JWT', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: testUser.email, password: testUser.password });
            
        if (res.status !== 200) {
            console.log('Login failed:', res.status, res.body);
        }
        
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
    });

    it('should reject invalid credentials', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: testUser.email, password: 'wrongpass' })
            .expect(400);

        expect(res.body.message).toBe('Invalid credentials');
    });
});
