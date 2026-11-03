import { apiClient } from "@/services/apiClient";

export const accountService = {
  changePassword: (currentPassword: string, newPassword: string) =>
    apiClient.patch<void>("/account/password", { currentPassword, newPassword }),
  deleteAccount: (password: string) => apiClient.delete("/account", { password }),
};
