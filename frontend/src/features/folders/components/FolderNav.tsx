import { NavLink } from "react-router";
import { Icon } from "@/components/common/Icon";
import { paths } from "@/routes/paths";
import type { Folder } from "../types/folder.types";

export function FolderNav({ folders, status }: { folders: Folder[]; status: string }) {
  if (status === "error") return <p className="nav__empty">Couldn't load folders.</p>;
  if (!folders.length && status === "ready")
    return <p className="nav__empty">Create a folder to organize your links.</p>;
  return (
    <ul className="nav__list">
      {folders.map((folder) => (
        <li key={folder.id}>
          <NavLink to={paths.folder(folder.id)} className="nav__link">
            <Icon name="folder" />
            <span className="nav__label">{folder.name}</span>
            <span className="nav__count">{folder.itemCount}</span>
          </NavLink>
        </li>
      ))}
    </ul>
  );
}
