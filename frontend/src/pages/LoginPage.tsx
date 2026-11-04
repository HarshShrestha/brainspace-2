import { AuthForm } from "@/features/authentication/components/AuthForm";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export function LoginPage() {
  useDocumentTitle("Sign in");
  return <AuthForm mode="login" />;
}
