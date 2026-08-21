import { prisma, invalidateAccelerateCache, userCacheTag } from "./prisma";

export async function getCredentialAccount(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, providerId: "credential" },
    select: { id: true },
    cacheStrategy: {
      ttl: 60,
      swr: 120,
      tags: [userCacheTag(userId)],
    },
  });
  return account;
}

export async function updateAccountPassword(
  userId: string,
  providerId: string,
  password: string,
) {
  await prisma.account.updateMany({
    where: { userId, providerId },
    data: { password },
  });
  await invalidateAccelerateCache([userCacheTag(userId)]);
}

export async function updateUserName(userId: string, data: { firstName: string; lastName: string }) {
  await prisma.user.update({
    where: { id: userId },
    data: { firstName: data.firstName, lastName: data.lastName, name: `${data.firstName} ${data.lastName}` },
  });
  await invalidateAccelerateCache([userCacheTag(userId)]);
}
