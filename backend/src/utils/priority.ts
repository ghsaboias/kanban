export const PRIORITY_VALUES = ['LOW', 'MEDIUM', 'HIGH'] as const;
export type Priority = typeof PRIORITY_VALUES[number];

export function toPriority(value: string | null | undefined): Priority {
  if (value === 'LOW' || value === 'MEDIUM' || value === 'HIGH') return value;
  return 'MEDIUM';
}

