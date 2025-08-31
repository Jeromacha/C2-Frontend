export type Rol = "ADMIN" | "EMPLOYEE";

export function isAdmin(rol?: string | null) {
  return (rol || "").toUpperCase() === "ADMIN";
}
export function isEmployee(rol?: string | null) {
  return (rol || "").toUpperCase() === "EMPLOYEE";
}
