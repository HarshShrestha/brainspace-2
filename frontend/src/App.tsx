import { useState } from "react";
import { RouterProvider } from "react-router";
import { Toaster } from "@/components/common/Toaster";
import { useSessionBootstrap } from "@/features/authentication/hooks/useSessionBootstrap";
import { useApplyTheme } from "@/hooks/useTheme";
import { createRouter } from "@/routes/router";

export default function App() {
  useSessionBootstrap();
  useApplyTheme();
  const [router] = useState(createRouter);
  return (
    <>
      <RouterProvider router={router} />
      <Toaster />
    </>
  );
}
