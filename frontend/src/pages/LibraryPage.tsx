import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { CONTENT_TYPES, type ContentType } from "@/constants/content.constants";
import { IndexSourceDialog } from "@/features/assistant/components/IndexSourceDialog";
import { useAssistantStatus } from "@/features/assistant/hooks/useAssistantStatus";
import { ContentFormDialog } from "@/features/content/components/ContentFormDialog";
import { ContentGrid } from "@/features/content/components/ContentGrid";
import { ContentToolbar, type ToolbarValues } from "@/features/content/components/ContentToolbar";
import { useContentList } from "@/features/content/hooks/useContentList";
import { useTags } from "@/features/content/hooks/useTags";
import { contentService } from "@/features/content/services/content.service";
import type { ContentInput, ContentItem } from "@/features/content/types/content.types";
import { FolderFormDialog } from "@/features/folders/components/FolderFormDialog";
import { useFolders } from "@/features/folders/hooks/useFolders";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useNotify } from "@/hooks/useNotify";
import { useAppLayout } from "@/layouts/AppLayout";
import { paths } from "@/routes/paths";
import { errorMessage } from "@/utils/errorMessage";

type Dialog =
  | { kind: "edit"; item: ContentItem }
  | { kind: "index"; item: ContentItem }
  | { kind: "delete"; item: ContentItem }
  | { kind: "rename-folder" }
  | { kind: "delete-folder" }
  | null;

const asType = (value: string | null): ContentType | "" =>
  CONTENT_TYPES.includes(value as ContentType) ? (value as ContentType) : "";

/** All items, or one folder's items, with search, filters and owner actions. */
export function LibraryPage() {
  const { folderId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const notify = useNotify();
  const { openNewItem } = useAppLayout();
  const folders = useFolders();
  const tags = useTags();
  const { status: assistant } = useAssistantStatus();
  const [dialog, setDialog] = useState<Dialog>(null);

  const toolbar: ToolbarValues = {
    q: params.get("q") ?? "",
    type: asType(params.get("type")),
    tag: params.get("tag") ?? "",
  };
  const q = useDebouncedValue(toolbar.q.trim());
  const filters = useMemo(
    () => ({ folder: folderId, type: toolbar.type || undefined, tag: toolbar.tag || undefined, q: q || undefined }),
    [folderId, toolbar.type, toolbar.tag, q],
  );
  const list = useContentList(filters);
  const folder = folderId ? folders.folders.find((f) => f.id === folderId) : undefined;
  const filtering = Boolean(toolbar.q || toolbar.type || toolbar.tag);
  useDocumentTitle(folder?.name ?? (folderId ? "Folder" : "Library"));

  function setToolbar(values: ToolbarValues) {
    const next = new URLSearchParams();
    if (values.q) next.set("q", values.q);
    if (values.type) next.set("type", values.type);
    if (values.tag) next.set("tag", values.tag);
    setParams(next, { replace: true });
  }

  /** Applies a server-confirmed change to the visible list (an item moved out of this folder disappears). */
  function applyChange(item: ContentItem) {
    if (folderId && item.folderId !== folderId) list.removeItem(item.id);
    else list.replaceItem(item);
  }

  async function saveEdit(original: ContentItem, input: ContentInput) {
    applyChange(await contentService.update(original.id, input));
    void folders.reload();
    notify("Changes saved");
  }

  async function move(item: ContentItem, target: string | null) {
    try {
      applyChange(await contentService.update(item.id, { folderId: target }));
      void folders.reload();
      notify(
        target ? `Moved to “${folders.folders.find((f) => f.id === target)?.name ?? "folder"}”` : "Removed from folder",
      );
    } catch (e) {
      notify(errorMessage(e, "Couldn't move that item."), "error");
    }
  }

  async function remove(item: ContentItem) {
    await contentService.remove(item.id);
    list.removeItem(item.id);
    void folders.reload();
    notify("Item deleted");
  }

  async function deleteFolder() {
    if (!folderId) return;
    await folders.remove(folderId);
    notify("Folder deleted");
    navigate(paths.library());
  }

  if (folderId && folders.status === "ready" && !folder)
    return (
      <EmptyState
        icon="folder_off"
        title="Folder not found"
        action={<Button onClick={() => navigate(paths.library())}>Back to library</Button>}
      >
        It may have been deleted.
      </EmptyState>
    );

  return (
    <div className="stack stack--loose">
      <header className="page-header">
        <div>
          <p className="eyebrow">{folder ? "Folder" : "Your second brain"}</p>
          <h1>{folder?.name ?? "Library"}</h1>
          <p className="muted">
            {folder
              ? `${folder.itemCount} ${folder.itemCount === 1 ? "item" : "items"}`
              : "A home for the links, thoughts and discoveries you want to keep."}
          </p>
        </div>
        <div className="page-header__actions">
          {folder && (
            <>
              <IconButton icon="edit" label="Rename folder" onClick={() => setDialog({ kind: "rename-folder" })} />
              <IconButton
                icon="delete"
                label="Delete folder"
                className="icon-button--danger"
                onClick={() => setDialog({ kind: "delete-folder" })}
              />
            </>
          )}
          <Button icon="add" onClick={() => openNewItem(folderId ?? null)}>
            Add item
          </Button>
        </div>
      </header>

      <ContentToolbar values={toolbar} tags={tags} onChange={setToolbar} />

      <ContentGrid
        items={list.items}
        status={list.status}
        error={list.error}
        hasMore={list.hasMore}
        loadingMore={list.loadingMore}
        onLoadMore={() => void list.loadMore()}
        onRetry={list.reload}
        onTagClick={(tag) => setToolbar({ ...toolbar, tag })}
        actions={{
          folders: folders.folders,
          canIndex: Boolean(assistant?.enabled),
          onEdit: (item) => setDialog({ kind: "edit", item }),
          onIndex: (item) => setDialog({ kind: "index", item }),
          onDelete: (item) => setDialog({ kind: "delete", item }),
          onMove: (item, target) => void move(item, target),
        }}
        empty={
          filtering ? (
            <EmptyState icon="search_off" title="No matches">
              Try a different search or clear the filters.
            </EmptyState>
          ) : (
            <EmptyState
              title={folder ? "This folder is empty" : "Space to think"}
              action={
                <Button icon="add" onClick={() => openNewItem(folderId ?? null)}>
                  Add your first item
                </Button>
              }
            >
              {folder
                ? "Add an item here, or move existing items into this folder."
                : "Save a link to start building your space."}
            </EmptyState>
          )
        }
      />

      {dialog?.kind === "edit" && (
        <ContentFormDialog
          item={dialog.item}
          folders={folders.folders}
          onSubmit={(input) => saveEdit(dialog.item, input)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "index" && (
        <IndexSourceDialog item={dialog.item} onChanged={list.replaceItem} onClose={() => setDialog(null)} />
      )}
      {dialog?.kind === "delete" && (
        <ConfirmDialog
          title="Delete this item?"
          message={`“${dialog.item.title}” and its AI index will be permanently removed.`}
          confirmLabel="Delete"
          onConfirm={() => remove(dialog.item)}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "rename-folder" && folder && (
        <FolderFormDialog
          folder={folder}
          onSubmit={async (name) => {
            await folders.rename(folder.id, name);
            notify("Folder renamed");
          }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog?.kind === "delete-folder" && folder && (
        <ConfirmDialog
          title="Delete this folder?"
          message="Only empty folders can be deleted. Items are never deleted with a folder."
          confirmLabel="Delete folder"
          onConfirm={deleteFolder}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
