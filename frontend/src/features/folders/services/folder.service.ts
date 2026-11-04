import { apiClient } from "@/services/apiClient";
import type { Folder } from "../types/folder.types";

const folder = (id: string) => `/folders/${encodeURIComponent(id)}`;

export const folderService = {
  list: () => apiClient.get<Folder[]>("/folders"),
  create: (name: string) => apiClient.post<Folder>("/folders", { name }),
  rename: (id: string, name: string) => apiClient.patch<Folder>(folder(id), { name }),
  remove: (id: string) => apiClient.delete(folder(id)),
};
