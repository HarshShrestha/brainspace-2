import type { Express } from "express";
import request from "supertest";
import { SESSION_COOKIE_NAME } from "../../src/config/session.js";

export type Client = ReturnType<typeof request.agent>;

export const PASSWORD = "correct horse battery staple";

/** A cookie-keeping client that has registered `username`. */
export async function signedInClient(app: Express, username: string): Promise<Client> {
  const client = request.agent(app);
  const res = await client.post("/api/v1/auth/register").send({ username, password: PASSWORD });
  if (res.status !== 201) throw new Error(`Could not register ${username}: ${res.status} ${JSON.stringify(res.body)}`);
  return client;
}

/** Extracts the raw session token from a response's Set-Cookie header. */
export function sessionTokenFrom(res: { headers: Record<string, unknown> }): string {
  const cookies = ([] as string[]).concat((res.headers["set-cookie"] as string[] | string | undefined) ?? []);
  const cookie = cookies.find((c) => c.startsWith(`${SESSION_COOKIE_NAME}=`));
  if (!cookie) throw new Error("No session cookie in response");
  return cookie.split(";")[0]!.slice(SESSION_COOKIE_NAME.length + 1);
}

export async function createItem(client: Client, overrides: Record<string, unknown> = {}) {
  const res = await client.post("/api/v1/content").send({
    title: "A useful article",
    link: "https://example.com/article",
    type: "article",
    ...overrides,
  });
  if (res.status !== 201) throw new Error(`Could not create content: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data as { id: string; [key: string]: unknown };
}
