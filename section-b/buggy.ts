type User = {
  id: string;
  name?: string;
  email: string;
  role: "admin" | "member";
};

const cache: Record<string, User> = {};

export async function getUser(id: string) {
  if (cache[id]) return cache[id]; // returns stale objects that may be mutated elsewhere
  // Simulate remote call
  const res = await fetch(`https://example.com/api/users/${id}`);
  const data = await res.json(); // any
  cache[id] = data; // blindly trust
  return cache[id];
}

export function isAdmin(u: User | null) {
  return u && u.role === "admin";
}

export async function getAdmins(ids: string[]) {
  const users = await Promise.all(ids.map(getUser));
  return users.filter(isAdmin); // 'isAdmin' not a type guard; null leakage
}
