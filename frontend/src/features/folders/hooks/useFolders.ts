import { useCallback } from "react";
import { useRecoilState } from "recoil";
import { foldersState } from "@/store/folders.atoms";
import { folderService } from "../services/folder.service";

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

/** Shared folder list plus mutations that keep it in sync. */
export function useFolders() {
  const [state, setState] = useRecoilState(foldersState);

  const reload = useCallback(async () => {
    try {
      setState({ status: "ready", folders: await folderService.list() });
    } catch {
      setState((s) => ({ ...s, status: "error" }));
    }
  }, [setState]);

  const create = useCallback(
    async (name: string) => {
      const folder = await folderService.create(name);
      setState((s) => ({ ...s, folders: [...s.folders, folder].sort(byName) }));
      return folder;
    },
    [setState],
  );

  const rename = useCallback(
    async (id: string, name: string) => {
      const folder = await folderService.rename(id, name);
      setState((s) => ({ ...s, folders: s.folders.map((f) => (f.id === id ? folder : f)).sort(byName) }));
    },
    [setState],
  );

  const remove = useCallback(
    async (id: string) => {
      await folderService.remove(id);
      setState((s) => ({ ...s, folders: s.folders.filter((f) => f.id !== id) }));
    },
    [setState],
  );

  return { ...state, reload, create, rename, remove };
}
