import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const u = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: { email: "test@example.com", authUserId: "local-test-user" }
  });
  console.log("OK user:", u.id, u.email);
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
