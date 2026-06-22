import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const existing = await prisma.user.findFirst();
  if (existing) {
    console.log("✓ Kullanıcı zaten mevcut:", existing.email);
    return;
  }

  const hash = await bcrypt.hash("admin123", 12);
  const user = await prisma.user.create({
    data: {
      email: "admin@panel.com",
      password: hash,
      name: "Admin",
    },
  });

  await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  console.log("✓ Kullanıcı oluşturuldu:", user.email);
  console.log("  Şifre: admin123");
  console.log("  → Giriş yaptıktan sonra şifreyi değiştirin!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
