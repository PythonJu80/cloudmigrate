import { PrismaClient } from "@prisma/client";
import { threeTierWebTemplate } from "../src/lib/architecture/templates/three-tier-web";
import { dataPipelineTemplate } from "../src/lib/architecture/templates/data-pipeline";

const prisma = new PrismaClient();

async function main() {
  // Get the first user to seed architectures for
  const user = await prisma.user.findFirst({
    include: { tenant: true },
  });

  if (!user) {
    console.log("No user found. Please create a user first.");
    return;
  }

  console.log(`Seeding architectures for user: ${user.email}`);

  const templates = [threeTierWebTemplate, dataPipelineTemplate];

  for (const template of templates) {
    // Check if already exists
    const existing = await prisma.architecture.findFirst({
      where: {
        tenantId: user.tenantId,
        name: template.name,
      },
    });

    if (existing) {
      console.log(`Architecture "${template.name}" already exists, skipping...`);
      continue;
    }

    await prisma.architecture.create({
      data: {
        tenantId: user.tenantId,
        userId: user.id,
        name: template.name,
        description: template.description,
        nodes: JSON.stringify(template.nodes),
        edges: JSON.stringify(template.edges),
        estimatedCost: (template.estimatedCost.min + template.estimatedCost.max) / 2,
        status: "draft",
        isShared: false,
      },
    });

    console.log(`Created architecture: ${template.name}`);
  }

  console.log("Done seeding architectures!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
