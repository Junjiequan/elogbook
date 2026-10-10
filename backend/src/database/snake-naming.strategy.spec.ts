import { SnakeNamingStrategy } from './snake-naming.strategy.js';

describe('SnakeNamingStrategy', () => {
  const naming = new SnakeNamingStrategy();

  it('writes columns in snake_case', () => {
    expect(naming.columnName('createdAt', undefined, [])).toBe('created_at');
    expect(naming.columnName('proposalId', undefined, [])).toBe('proposal_id');
  });

  it('names a join column after the relation', () => {
    expect(naming.joinColumnName('updatedBy', 'id')).toBe('updated_by_id');
  });

  it('keeps a name that was chosen on purpose', () => {
    expect(naming.columnName('x', 'customName', [])).toBe('custom_name');
  });
});
