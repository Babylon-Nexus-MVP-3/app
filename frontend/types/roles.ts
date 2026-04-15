export const UserRole = {
  Admin: "Admin",
  Owner: "Owner",
  Builder: "Builder",
  PM: "PM",
  Subbie: "Subbie",
  Consultant: "Consultant",
  Financier: "Financier",
  VIP: "VIP",
  Observer: "Observer",
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];
