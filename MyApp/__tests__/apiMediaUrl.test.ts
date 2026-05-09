import { normalizeApiMediaUrl } from '@/lib/mediaUrl';

describe('normalizeApiMediaUrl', () => {
  const apiBase = 'http://192.168.1.5:3000';

  it('rewrites localhost origins to the configured API host', () => {
    expect(normalizeApiMediaUrl('http://localhost:3000/uploads/a.png', apiBase)).toBe(
      'http://192.168.1.5:3000/uploads/a.png',
    );
    expect(normalizeApiMediaUrl('http://127.0.0.1:3000/uploads/b.png', apiBase)).toBe(
      'http://192.168.1.5:3000/uploads/b.png',
    );
  });

  it('prefixes root-relative media paths with API host', () => {
    expect(normalizeApiMediaUrl('/uploads/c.png', apiBase)).toBe(
      'http://192.168.1.5:3000/uploads/c.png',
    );
  });

  it('keeps already valid remote urls untouched', () => {
    expect(normalizeApiMediaUrl('https://cdn.example.com/u.png', apiBase)).toBe(
      'https://cdn.example.com/u.png',
    );
  });
});
