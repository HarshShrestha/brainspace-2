import { useState, type FormEvent } from "react";
import { Alert } from "@/components/common/Alert";
import { SelectField } from "@/components/forms/SelectField";
import { TextField } from "@/components/forms/TextField";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { CONTENT_LIMITS, CONTENT_TYPE_META, CONTENT_TYPES, type ContentType } from "@/constants/content.constants";
import type { Folder } from "@/features/folders/types/folder.types";
import { errorMessage } from "@/utils/errorMessage";
import { fieldErrors, type FieldErrors } from "@/utils/fieldErrors";
import type { ContentInput, ContentItem } from "../types/content.types";
import { contentFormSchema } from "../validation/content.validation";

const TYPE_OPTIONS = CONTENT_TYPES.map((type) => ({ value: type, label: CONTENT_TYPE_META[type].label }));

/** Create a new item, or edit `item` when provided. */
export function ContentFormDialog({
  item,
  folders,
  defaultFolderId = null,
  onSubmit,
  onClose,
}: {
  item?: ContentItem;
  folders: Folder[];
  defaultFolderId?: string | null;
  onSubmit: (input: ContentInput) => Promise<void>;
  onClose: () => void;
}) {
  const [values, setValues] = useState({
    title: item?.title ?? "",
    link: item?.link ?? "",
    type: (item?.type ?? "article") as ContentType,
    tags: item?.tags.join(", ") ?? "",
    folderId: item ? item.folderId : defaultFolderId,
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setServerError("");
    const parsed = contentFormSchema.safeParse(values);
    if (!parsed.success) return setErrors(fieldErrors(parsed.error));
    setErrors({});
    setBusy(true);
    try {
      await onSubmit(parsed.data);
      onClose();
    } catch (e) {
      setServerError(errorMessage(e, "Couldn't save this item."));
      setBusy(false);
    }
  }

  return (
    <Modal
      title={item ? "Edit item" : "Add to your space"}
      eyebrow={item ? undefined : "Capture an idea"}
      onClose={onClose}
    >
      <form className="stack" onSubmit={submit} noValidate>
        <TextField
          label="Title"
          value={values.title}
          maxLength={CONTENT_LIMITS.titleMaxLength}
          placeholder="What would you like to remember?"
          onChange={(e) => setValues({ ...values, title: e.target.value })}
          error={errors.title}
          autoFocus
        />
        <TextField
          label="Link"
          type="url"
          inputMode="url"
          value={values.link}
          placeholder="https://…"
          onChange={(e) => setValues({ ...values, link: e.target.value })}
          error={errors.link}
          hint={item?.ai ? "Changing the link removes its AI index." : undefined}
        />
        <div className="form-row">
          <SelectField
            label="Type"
            value={values.type}
            options={TYPE_OPTIONS}
            onChange={(e) => setValues({ ...values, type: e.target.value as ContentType })}
          />
          <SelectField
            label="Folder"
            value={values.folderId ?? ""}
            options={[{ value: "", label: "No folder" }, ...folders.map((f) => ({ value: f.id, label: f.name }))]}
            onChange={(e) => setValues({ ...values, folderId: e.target.value || null })}
          />
        </div>
        <TextField
          label="Tags"
          optional
          value={values.tags}
          placeholder="design, reading, ideas"
          hint="Separate tags with commas"
          onChange={(e) => setValues({ ...values, tags: e.target.value })}
          error={errors.tags}
        />
        {serverError && <Alert>{serverError}</Alert>}
        <div className="dialog__actions">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={busy}>
            {item ? "Save changes" : "Save to space"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
