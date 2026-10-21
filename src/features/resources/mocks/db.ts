import type { Resource, ResourceInput, ResourceStatus } from '../model';

import { resourceFixtures } from './fixtures';

let rows: Resource[] = [];
let sequence = 0;

/** Stable clock so created/updated timestamps are deterministic. */
const timestamp = () =>
  new Date(Date.UTC(2026, 5, 1, 12, 0, sequence)).toISOString();

const byFeaturedThenName = (a: Resource, b: Resource) =>
  Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name);

/** In-memory store behind the reference API (reset between tests). */
export const resourceDb = {
  reset() {
    rows = resourceFixtures.map((row) => ({ ...row }));
    sequence = 0;
  },
  list(status?: ResourceStatus) {
    return rows
      .filter((row) => !status || row.status === status)
      .sort(byFeaturedThenName);
  },
  find(id: string) {
    return rows.find((row) => row.id === id);
  },
  isNameTaken(name: string, exceptId?: string) {
    const normalized = name.trim().toLowerCase();
    return rows.some(
      (row) => row.id !== exceptId && row.name.toLowerCase() === normalized,
    );
  },
  create(input: ResourceInput): Resource {
    sequence += 1;
    const row = { ...input, id: `res-new-${sequence}`, updatedAt: timestamp() };
    rows.push(row);
    return row;
  },
  update(id: string, input: ResourceInput): Resource | undefined {
    const index = rows.findIndex((row) => row.id === id);
    if (index === -1) return undefined;
    sequence += 1;
    const row = { ...input, id, updatedAt: timestamp() };
    rows[index] = row;
    return row;
  },
  remove(id: string) {
    const before = rows.length;
    rows = rows.filter((row) => row.id !== id);
    return rows.length !== before;
  },
};

resourceDb.reset();
