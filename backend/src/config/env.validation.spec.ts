import { validateEnv } from './env.validation.js';

const valid = {
  DATABASE_URL: 'postgres://u:p@localhost:5432/db',
  JWT_SECRET: 'x'.repeat(32),
};

describe('validateEnv', () => {
  it('accepts a complete environment', () => {
    expect(validateEnv(valid)).toEqual(valid);
  });

  it('names every problem at once', () => {
    expect(() => validateEnv({ JWT_SECRET: 'short', PORT: 'abc' })).toThrowError(
      /DATABASE_URL[\s\S]*JWT_SECRET[\s\S]*PORT/,
    );
  });

  it('refuses a database that is not PostgreSQL', () => {
    expect(() => validateEnv({ ...valid, DATABASE_URL: 'mongodb://localhost/db' })).toThrowError(
      /DATABASE_URL/,
    );
  });
});
