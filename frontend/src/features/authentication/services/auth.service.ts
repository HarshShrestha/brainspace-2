import { apiClient } from "@/services/apiClient";
import type { Credentials, User } from "../types/auth.types";

export const authService = {
  session: () => apiClient.get<User>("/auth/session"),
  login: (credentials: Credentials) => apiClient.post<User>("/auth/login", credentials),
  register: (credentials: Credentials) => apiClient.post<User>("/auth/register", credentials),
  logout: () => apiClient.post<void>("/auth/logout"),
};
