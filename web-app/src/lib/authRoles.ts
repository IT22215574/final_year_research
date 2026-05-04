export function normalizeRole(role?: string | null) {
  return String(role ?? "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isFisherAdminRole(role?: string | null) {
  const normalized = normalizeRole(role);
  return (
    normalized === "fisher admin" ||
    normalized === "fish admin" ||
    (normalized.includes("admin") &&
      (normalized.includes("fisher") || normalized.includes("fish")))
  );
}
