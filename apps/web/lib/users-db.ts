export interface UserItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
  department: string;
  branch: string;
  jobTitle: string;
  phone: string;
  status: string;
  employeeId: string | null;
  isEmployeeLinked: boolean;
  avatarUrl: string;
  createdAt: string;
  lastLoginAt: string | null;
}

// Runtime cache initialized empty — Supabase Auth & PostgreSQL are Single Source of Truth
export let usersDatabase: UserItem[] = [];

export function deleteUsersByIds(ids: string[]) {
  usersDatabase = usersDatabase.filter((u) => !ids.includes(u.id));
}

export function addUserToDb(user: UserItem) {
  usersDatabase = [user, ...usersDatabase.filter((u) => u.email !== user.email)];
}

export function updateUserInDb(id: string, updates: Partial<UserItem>) {
  usersDatabase = usersDatabase.map((u) => (u.id === id ? { ...u, ...updates } : u));
}

export function linkUserToEmployee(userId: string, employeeId: string) {
  usersDatabase = usersDatabase.map((u) =>
    u.id === userId ? { ...u, employeeId, isEmployeeLinked: true } : u
  );
}

export function addUserFromEmployee(data: {
  fullName: string;
  email: string;
  department: string;
  jobTitle: string;
  employeeId?: string;
  branch?: string;
}): UserItem {
  const newUser: UserItem = {
    id: `u-${Date.now()}`,
    fullName: data.fullName,
    email: data.email.toLowerCase().trim(),
    role: 'Officer',
    department: data.department || 'General',
    branch: data.branch || 'Head Office (Banani)',
    jobTitle: data.jobTitle || 'Staff Member',
    phone: '',
    status: 'active',
    employeeId: data.employeeId || null,
    isEmployeeLinked: Boolean(data.employeeId),
    avatarUrl: '',
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  };

  usersDatabase = [newUser, ...usersDatabase.filter((u) => u.email !== newUser.email)];
  return newUser;
}
