import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client.ts";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Remove old default admin if exists
  await prisma.user.deleteMany({ where: { email: "admin@panel.com" } });

  const hash = await bcrypt.hash("954789h.", 12);
  const user = await prisma.user.upsert({
    where: { email: "halil@hgwebdesign.com.tr" },
    update: { password: hash, name: "Halil Güray Güler" },
    create: {
      email: "halil@hgwebdesign.com.tr",
      password: hash,
      name: "Halil Güray Güler",
    },
  });

  await prisma.settings.upsert({
    where: { id: "default" },
    update: {},
    create: { id: "default" },
  });

  console.log("✓ Kullanıcı hazır:", user.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
