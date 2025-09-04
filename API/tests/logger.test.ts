// This test file runs independently of the global test setup to avoid database dependencies
import { sanitizeData } from '../src/utils/logger';

describe('Logger Utility (Standalone)', () => {
  describe('sanitizeData', () => {
    test('should redact sensitive fields', () => {
      const input = {
        email: 'test@example.com',
        password: 'secret123',
        token: 'jwt-token',
        authorization: 'Bearer xyz',
        normalField: 'should-remain'
      };

      const result = sanitizeData(input);

      expect(result.email).toBe('test@example.com');
      expect(result.password).toBe('[REDACTED]');
      expect(result.token).toBe('[REDACTED]');
      expect(result.authorization).toBe('[REDACTED]');
      expect(result.normalField).toBe('should-remain');
    });

    test('should handle nested objects', () => {
      const input = {
        user: {
          email: 'test@example.com',
          password: 'secret123'
        },
        meta: {
          jwt: 'token-value',
          data: 'normal-data'
        }
      };

      const result = sanitizeData(input);

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.password).toBe('[REDACTED]');
      expect(result.meta.jwt).toBe('[REDACTED]');
      expect(result.meta.data).toBe('normal-data');
    });

    test('should handle arrays', () => {
      const input = [
        { password: 'secret1', name: 'user1' },
        { token: 'token1', name: 'user2' }
      ];

      const result = sanitizeData(input);

      expect(result[0].password).toBe('[REDACTED]');
      expect(result[0].name).toBe('user1');
      expect(result[1].token).toBe('[REDACTED]');
      expect(result[1].name).toBe('user2');
    });

    test('should handle non-object values', () => {
      expect(sanitizeData(null)).toBe(null);
      expect(sanitizeData(undefined)).toBe(undefined);
      expect(sanitizeData('string')).toBe('string');
      expect(sanitizeData(123)).toBe(123);
      expect(sanitizeData(true)).toBe(true);
    });

    test('should handle case insensitive matching', () => {
      const input = {
        PASSWORD: 'secret123',
        Token: 'jwt-token',
        SECRET: 'hidden',
        normalField: 'should-remain'
      };

      const result = sanitizeData(input);

      expect(result.PASSWORD).toBe('[REDACTED]');
      expect(result.Token).toBe('[REDACTED]');
      expect(result.SECRET).toBe('[REDACTED]');
      expect(result.normalField).toBe('should-remain');
    });

    test('should handle fields containing sensitive keywords', () => {
      const input = {
        userPassword: 'secret123',
        apiToken: 'jwt-token',
        authSecret: 'hidden',
        normalField: 'should-remain'
      };

      const result = sanitizeData(input);

      expect(result.userPassword).toBe('[REDACTED]');
      expect(result.apiToken).toBe('[REDACTED]');
      expect(result.authSecret).toBe('[REDACTED]');
      expect(result.normalField).toBe('should-remain');
    });

    test('should handle empty objects and arrays', () => {
      expect(sanitizeData({})).toEqual({});
      expect(sanitizeData([])).toEqual([]);
    });
  });

  describe('Logger module structure', () => {
    test('should export expected functions', () => {
      // Test that the module exports can be imported without database setup
      const loggerModule = require('../src/utils/logger');
      
      expect(typeof loggerModule.sanitizeData).toBe('function');
      expect(typeof loggerModule.logError).toBe('function');
      expect(typeof loggerModule.logWarn).toBe('function');
      expect(typeof loggerModule.logInfo).toBe('function');
      expect(typeof loggerModule.logDebug).toBe('function');
      expect(typeof loggerModule.logger).toBe('object');
    });
  });
});