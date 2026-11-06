import type { UserRole } from "@prisma/client";

export type Resource =
  | "dashboard"
  | "rooms"
  | "schedules"
  | "analytics"
  | "conflicts"
  | "tickets"
  | "improvements"
  | "sync";

export type Capability = "view" | "add" | "update" | "delete";

const permissions: Record<UserRole, Partial<Record<Resource, Capability[]>>> = {
  ADMIN: {
    dashboard: ["view"],
    rooms: ["view", "add", "update", "delete"],
    schedules: ["view", "add", "update", "delete"],
    analytics: ["view"],
    conflicts: ["view"],
    tickets: ["view", "add", "update", "delete"],
    improvements: ["view", "add", "update", "delete"],
    sync: ["view", "add", "update"],
  },
  KAPRODI: {
    dashboard: ["view"],
    rooms: ["view"],
    schedules: ["view"],
    analytics: ["view"],
    conflicts: ["view"],
    tickets: ["view", "add"],
    improvements: ["view", "add"],
  },
  SARPRAS: {
    dashboard: ["view"],
    rooms: ["view", "update"],
    schedules: ["view"],
    analytics: ["view"],
    conflicts: ["view"],
    tickets: ["view", "add", "update"],
    improvements: ["view", "add", "update"],
  },
  VIEWER: {
    dashboard: ["view"],
    rooms: ["view"],
    schedules: ["view"],
    analytics: ["view"],
    conflicts: ["view"],
    tickets: ["view", "add"],
    improvements: ["view", "add"],
  },
};

export function can(role: UserRole, resource: Resource, capability: Capability = "view") {
  return permissions[role]?.[resource]?.includes(capability) ?? false;
}
