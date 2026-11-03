import { useRecoilValue } from "recoil";
import { ChangePasswordForm } from "@/features/settings/components/ChangePasswordForm";
import { DeleteAccountForm } from "@/features/settings/components/DeleteAccountForm";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { sessionState } from "@/store/session.atoms";
import { formatDate } from "@/utils/formatDate";

export function SettingsPage() {
  useDocumentTitle("Settings");
  const session = useRecoilValue(sessionState);
  if (session.status !== "authenticated") return null;
  return (
    <div className="stack stack--loose settings">
      <header className="page-header">
        <div>
          <p className="eyebrow">Account</p>
          <h1>Settings</h1>
          <p className="muted">
            Signed in as <strong>{session.user.username}</strong> · member since {formatDate(session.user.createdAt)}
          </p>
        </div>
      </header>
      <ChangePasswordForm />
      <DeleteAccountForm username={session.user.username} />
    </div>
  );
}
