import { AuthForm } from "@/features/authentication/components/AuthForm";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export function RegisterPage() {
  useDocumentTitle("Create account");
  return <AuthForm mode="register" />;
}
