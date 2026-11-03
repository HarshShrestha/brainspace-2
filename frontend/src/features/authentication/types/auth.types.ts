export interface User {
  id: string;
  username: string;
  createdAt: string;
}

export interface Credentials {
  username: string;
  password: string;
}

export type SessionState =
  { status: "loading"; user: null } | { status: "authenticated"; user: User } | { status: "anonymous"; user: null };
