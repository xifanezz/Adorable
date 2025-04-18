"use server";

import { freestyle } from "@/lib/freestyle";

export async function createGitIdentity() {
  const { id } = await freestyle.createGitIdentity();

  return id;
}

export async function grantRepoAccess(repoId: string, identityId: string) {
  "use server";

  await freestyle.grantGitPermission({
    repoId,
    identityId,
    permission: "write",
  });
}

export async function createGitAccessToken(identityId: string) {
  "use server";

  const { token } = await freestyle.createGitAccessToken({
    identityId,
  });

  return token;
}
