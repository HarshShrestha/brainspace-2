import { atom } from "recoil";
import type { Folder } from "@/features/folders/types/folder.types";

/** Folders are shown in the sidebar and on several pages, so they live in global state. */
export const foldersState = atom<{ status: "idle" | "loading" | "ready" | "error"; folders: Folder[] }>({
  key: "folders",
  default: { status: "idle", folders: [] },
});
