import type { Resource } from '../model';

/** Deterministic seed data (fixed ids and timestamps). */
export const resourceFixtures: readonly Resource[] = [
  {
    id: 'res-1',
    name: 'Alpha resource',
    description: 'A featured, active example.',
    category: 'general',
    quantity: 12,
    status: 'active',
    featured: true,
    updatedAt: '2026-01-15T09:30:00.000Z',
  },
  {
    id: 'res-2',
    name: 'Beta resource',
    description: 'An internal resource with a larger quantity.',
    category: 'internal',
    quantity: 1250,
    status: 'active',
    featured: false,
    updatedAt: '2026-02-03T14:00:00.000Z',
  },
  {
    id: 'res-3',
    name: 'Gamma resource',
    description: 'An archived example.',
    category: 'external',
    quantity: 0,
    status: 'archived',
    featured: false,
    updatedAt: '2025-11-20T08:15:00.000Z',
  },
];
