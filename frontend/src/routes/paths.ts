/** Single source of truth for client-side URLs. */
export const paths = {
  login: () => "/login",
  register: () => "/register",
  library: () => "/",
  folder: (id: string) => `/folders/${encodeURIComponent(id)}`,
  sharedWithMe: () => "/shared-with-me",
  receivedSpace: (id: string) => `/shared-with-me/${encodeURIComponent(id)}`,
  assistant: () => "/assistant",
  settings: () => "/settings",
  publicShare: (token: string) => `/shared/${encodeURIComponent(token)}`,
};
