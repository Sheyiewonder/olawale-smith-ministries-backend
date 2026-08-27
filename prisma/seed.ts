import {
  PrismaClient,
  ResourceType,
  AdminRole,
} from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  console.log("Seeding database...");

  /* ------------------------------------------------------------------------ */
  /* Admin                                                                    */
  /* ------------------------------------------------------------------------ */

  const adminPassword = process.env.ADMIN_SEED_PASSWORD;

  if (!adminPassword) {
    throw new Error(
      "ADMIN_SEED_PASSWORD is not configured in .env",
    );
  }

  const hashedPassword = await bcrypt.hash(
    adminPassword,
    12,
  );

  await prisma.admin.upsert({
    where: {
      email: "admin@example.com",
    },
    update: {
      name: "Super Administrator",
      password: hashedPassword,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
    },
    create: {
      name: "Super Administrator",
      email: "admin@example.com",
      password: hashedPassword,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
    },
  });

  /* ------------------------------------------------------------------------ */
  /* Categories                                                               */
  /* ------------------------------------------------------------------------ */

  const sermons = await prisma.category.upsert({
    where: {
      slug: "sermons",
    },
    update: {},
    create: {
      name: "Sermons",
      slug: "sermons",
      description:
        "Teachings and messages from Olawale Smith Ministries.",
    },
  });

  const ebooks = await prisma.category.upsert({
    where: {
      slug: "ebooks",
    },
    update: {},
    create: {
      name: "Ebooks",
      slug: "ebooks",
      description:
        "Written resources for spiritual growth and development.",
    },
  });

  const worship = await prisma.category.upsert({
    where: {
      slug: "worship",
    },
    update: {},
    create: {
      name: "Worship",
      slug: "worship",
      description:
        "Songs and worship resources.",
    },
  });

  const articles = await prisma.category.upsert({
    where: {
      slug: "articles",
    },
    update: {},
    create: {
      name: "Articles",
      slug: "articles",
      description:
        "Articles, reflections, teachings and insights.",
    },
  });

  /* ------------------------------------------------------------------------ */
  /* Resources                                                                */
  /* ------------------------------------------------------------------------ */

  await prisma.resource.upsert({
    where: {
      slug: "walking-in-purpose",
    },
    update: {},
    create: {
      title: "Walking in Purpose",
      slug: "walking-in-purpose",
      description:
        "A teaching exploring purpose, spiritual growth and kingdom impact.",
      content:
        "A teaching on discovering purpose, growing spiritually and living intentionally for kingdom impact.",
      type: ResourceType.SERMON,
      speaker: "Pastor Olawale Smith",
      featured: true,
      published: true,
      publishedAt: new Date(),

      categories: {
        create: {
          categoryId: sermons.id,
        },
      },
    },
  });

  await prisma.resource.upsert({
    where: {
      slug: "understanding-the-place-of-faith",
    },
    update: {},
    create: {
      title: "Understanding the Place of Faith",
      slug: "understanding-the-place-of-faith",
      description:
        "A written resource exploring the role of faith in the believer's journey.",
      content:
        "An introductory teaching on faith, spiritual growth and trusting God through every season.",
      type: ResourceType.EBOOK,
      speaker: "Pastor Olawale Smith",
      published: true,
      publishedAt: new Date(),

      categories: {
        create: {
          categoryId: ebooks.id,
        },
      },
    },
  });

  await prisma.resource.upsert({
    where: {
      slug: "songs-of-worship",
    },
    update: {},
    create: {
      title: "Songs of Worship",
      slug: "songs-of-worship",
      description:
        "A collection of worship resources from the ministry.",
      type: ResourceType.SONG,
      published: true,
      publishedAt: new Date(),

      categories: {
        create: {
          categoryId: worship.id,
        },
      },
    },
  });

  await prisma.resource.upsert({
    where: {
      slug: "walking-with-god-through-every-season",
    },
    update: {},
    create: {
      title: "Walking With God Through Every Season",
      slug: "walking-with-god-through-every-season",
      description:
        "A reflection on faith, growth and remaining grounded through every season of life.",
      content:
        "Faith invites us to walk with God not only in moments of clarity and celebration, but also through seasons of uncertainty, growth and waiting.",
      type: ResourceType.ARTICLE,
      featured: true,
      published: true,
      publishedAt: new Date(),

      categories: {
        create: {
          categoryId: articles.id,
        },
      },
    },
  });

  console.log("Database seeded successfully.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });