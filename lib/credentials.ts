export interface Employee {
  email: string;
  passwordHash: string;
}

/**
 * Predefined employee list. Add/remove employees here.
 *
 * To add someone: run `npx tsx scripts/hash-password.ts "their-password"`,
 * copy the printed hash, and add a new entry below.
 *
 * Default seeded account (CHANGE/REMOVE before real use):
 *   email:    dev@lalagreen.com
 *   password: lalagreen123
 */
export const employees: Employee[] = [
  {
    email: "dev@lalagreen.com",
    passwordHash:
      "$2b$10$Y1a25DVJXvtmvsoVaxe.puHH22L7dyA4fl66RGCjbZKHvau9olxdm",
  },
];
