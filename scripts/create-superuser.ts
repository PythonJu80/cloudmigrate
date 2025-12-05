import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "info@anais.solutions";
  const password = "Password123456";
  const name = "Superuser";

  // Check if user exists
  const existing = await prisma.user.findUnique({ where: { email } });
  
  if (existing) {
    // Update to superuser
    await prisma.user.update({
      where: { email },
      data: { isSuperuser: true, role: "SUPERUSER" },
    });
    console.log(`✅ Updated ${email} to superuser`);
  } else {
    // Create tenant first
    let tenant = await prisma.tenant.findFirst({ where: { slug: "superadmin" } });
    
    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: "Superadmin",
          slug: "superadmin",
          plan: "ENTERPRISE",
          bytesLimit: BigInt(1099511627776), // 1TB
        },
      });
    }

    // Create superuser
    const passwordHash = await hash(password, 12);
    await prisma.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: "SUPERUSER",
        isSuperuser: true,
        tenantId: tenant.id,
      },
    });
    console.log(`✅ Created superuser: ${email}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
