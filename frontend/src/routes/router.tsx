import { createBrowserRouter, type RouteObject } from "react-router";
import { AppLayout } from "@/layouts/AppLayout";
import { AuthLayout } from "@/layouts/AuthLayout";
import { PublicLayout } from "@/layouts/PublicLayout";
import { AssistantPage } from "@/pages/AssistantPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { LoginPage } from "@/pages/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { PublicSharePage } from "@/pages/PublicSharePage";
import { ReceivedSpacePage } from "@/pages/ReceivedSpacePage";
import { RegisterPage } from "@/pages/RegisterPage";
import { RouteErrorPage } from "@/pages/RouteErrorPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { SharedWithMePage } from "@/pages/SharedWithMePage";
import { RedirectIfAuthenticated, RequireAuth } from "./RequireAuth";

export const routes: RouteObject[] = [
  {
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <RedirectIfAuthenticated />,
        children: [
          {
            element: <AuthLayout />,
            children: [
              { path: "/login", element: <LoginPage /> },
              { path: "/register", element: <RegisterPage /> },
            ],
          },
        ],
      },
      { element: <PublicLayout />, children: [{ path: "/shared/:token", element: <PublicSharePage /> }] },
      {
        element: <RequireAuth />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <LibraryPage /> },
              { path: "/folders/:folderId", element: <LibraryPage /> },
              { path: "/assistant", element: <AssistantPage /> },
              { path: "/shared-with-me", element: <SharedWithMePage /> },
              { path: "/shared-with-me/:id", element: <ReceivedSpacePage /> },
              { path: "/settings", element: <SettingsPage /> },
            ],
          },
        ],
      },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
];

export const createRouter = () => createBrowserRouter(routes);
