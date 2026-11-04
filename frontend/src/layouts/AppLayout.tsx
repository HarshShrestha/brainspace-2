import { useCallback, useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate, useOutletContext } from "react-router";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { Icon } from "@/components/common/Icon";
import { Logo } from "@/components/common/Logo";
import { Sidebar } from "@/components/layout/Sidebar";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Topbar } from "@/components/layout/Topbar";
import { UserMenu } from "@/components/layout/UserMenu";
import { Button } from "@/components/ui/Button";
import { useAuthActions } from "@/features/authentication/hooks/useAuthActions";
import { ContentFormDialog } from "@/features/content/components/ContentFormDialog";
import { contentService } from "@/features/content/services/content.service";
import type { ContentInput } from "@/features/content/types/content.types";
import { FolderFormDialog } from "@/features/folders/components/FolderFormDialog";
import { FolderNav } from "@/features/folders/components/FolderNav";
import { useFolders } from "@/features/folders/hooks/useFolders";
import { ShareDialog } from "@/features/sharing/components/ShareDialog";
import { useNotify } from "@/hooks/useNotify";
import { paths } from "@/routes/paths";
import { contentRevisionState } from "@/store/library.atoms";
import { sessionState } from "@/store/session.atoms";
import { errorMessage } from "@/utils/errorMessage";

type Dialog = { kind: "content"; folderId: string | null } | { kind: "folder" } | { kind: "share" } | null;

export interface AppLayoutContext {
  openNewItem: (folderId?: string | null) => void;
}

/** Pages rendered inside AppLayout use this to open app-wide dialogs. */
export function useAppLayout() {
  return useOutletContext<AppLayoutContext>();
}

const navClass = ({ isActive }: { isActive: boolean }) => (isActive ? "nav__link nav__link--active" : "nav__link");

/** Authenticated shell: navigation, top bar, account menu and app-wide dialogs. */
export function AppLayout() {
  const session = useRecoilValue(sessionState);
  const folders = useFolders();
  const { status: folderStatus, reload: reloadFolders } = folders;
  const { logout } = useAuthActions();
  const bumpRevision = useSetRecoilState(contentRevisionState);
  const notify = useNotify();
  const navigate = useNavigate();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (folderStatus === "idle") void reloadFolders();
  }, [folderStatus, reloadFolders]);

  const openNewItem = useCallback((folderId: string | null = null) => setDialog({ kind: "content", folderId }), []);

  async function createItem(input: ContentInput) {
    await contentService.create(input);
    bumpRevision((n) => n + 1);
    void reloadFolders();
    notify("Saved to your space");
  }

  async function createFolder(name: string) {
    const folder = await folders.create(name);
    notify(`Folder “${folder.name}” created`);
    navigate(paths.folder(folder.id));
  }

  async function signOut() {
    try {
      await logout();
    } catch (e) {
      notify(errorMessage(e, "Couldn't sign out. Please try again."), "error");
    }
  }

  if (session.status !== "authenticated") return null;

  return (
    <div className="app">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)}>
        <NavLink to={paths.library()} className="sidebar__brand" aria-label="BrainSpace home">
          <Logo />
        </NavLink>
        <div className="sidebar__new">
          <Button icon="add" onClick={() => openNewItem()} className="button--wide">
            New item
          </Button>
          <Button
            variant="secondary"
            icon="create_new_folder"
            onClick={() => setDialog({ kind: "folder" })}
            className="button--wide"
          >
            New folder
          </Button>
        </div>
        <nav className="nav">
          <NavLink to={paths.library()} end className={navClass}>
            <Icon name="home_storage" /> <span className="nav__label">Library</span>
          </NavLink>
          <NavLink to={paths.assistant()} className={navClass}>
            <Icon name="auto_awesome" /> <span className="nav__label">Ask your space</span>
          </NavLink>
          <NavLink to={paths.sharedWithMe()} className={navClass}>
            <Icon name="group" /> <span className="nav__label">Shared with me</span>
          </NavLink>
          <p className="nav__heading">Folders</p>
          <FolderNav folders={folders.folders} status={folders.status} />
        </nav>
      </Sidebar>

      <div className="app__main">
        <Topbar menuOpen={menuOpen} onMenu={() => setMenuOpen((o) => !o)} brand={<Logo />}>
          <Button
            variant="secondary"
            icon="share"
            className="topbar__share"
            onClick={() => setDialog({ kind: "share" })}
          >
            Share
          </Button>
          <ThemeToggle />
          <UserMenu username={session.user.username} settingsHref={paths.settings()} onSignOut={() => void signOut()} />
        </Topbar>
        <main id="main" className="page" tabIndex={-1}>
          <Outlet context={{ openNewItem } satisfies AppLayoutContext} />
        </main>
      </div>

      {dialog?.kind === "content" && (
        <ContentFormDialog
          folders={folders.folders}
          defaultFolderId={dialog.folderId}
          onSubmit={createItem}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "folder" && <FolderFormDialog onSubmit={createFolder} onClose={() => setDialog(null)} />}
      {dialog?.kind === "share" && <ShareDialog onClose={() => setDialog(null)} />}
    </div>
  );
}
