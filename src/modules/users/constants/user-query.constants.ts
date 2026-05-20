export const USER_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'name',
  'email',
] as const;

export type UserSortField = (typeof USER_SORT_FIELDS)[number];
