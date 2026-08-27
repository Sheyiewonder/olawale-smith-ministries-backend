import bcrypt from "bcryptjs";

import { prisma } from "../../lib/prisma.js";

/* -------------------------------------------------------------------------- */
/* Find Admin                                                                 */
/* -------------------------------------------------------------------------- */

export async function findAdminByEmail(
  email: string,
) {
  const normalizedEmail = email
    .trim()
    .toLowerCase();

  return prisma.admin.findUnique({
    where: {
      email: normalizedEmail,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Find Admin By ID                                                           */
/* -------------------------------------------------------------------------- */

export async function findAdminById(
  id: string,
) {
  return prisma.admin.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Verify Password                                                            */
/* -------------------------------------------------------------------------- */

export async function verifyAdminPassword(
  password: string,
  hashedPassword: string,
) {
  return bcrypt.compare(
    password,
    hashedPassword,
  );
}

/* -------------------------------------------------------------------------- */
/* Hash Password                                                              */
/* -------------------------------------------------------------------------- */

export async function hashAdminPassword(
  password: string,
) {
  return bcrypt.hash(password, 12);
}

/* -------------------------------------------------------------------------- */
/* Create Admin                                                               */
/* -------------------------------------------------------------------------- */

export async function createAdmin({
  name,
  email,
  password,
  role = "ADMIN",
}: {
  name: string;
  email: string;
  password: string;
  role?: "ADMIN" | "SUPER_ADMIN";
}) {
  const normalizedName = name.trim();

  const normalizedEmail = email
    .trim()
    .toLowerCase();

  if (!normalizedName) {
    throw new Error(
      "Admin name is required",
    );
  }

  if (!normalizedEmail) {
    throw new Error(
      "Admin email is required",
    );
  }

  if (!password) {
    throw new Error(
      "Admin password is required",
    );
  }

  const existingAdmin =
    await prisma.admin.findUnique({
      where: {
        email: normalizedEmail,
      },
    });

  if (existingAdmin) {
    throw new Error(
      "An admin with this email already exists",
    );
  }

  const hashedPassword =
    await hashAdminPassword(password);

  return prisma.admin.create({
    data: {
      name: normalizedName,
      email: normalizedEmail,
      password: hashedPassword,
      role,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Update Admin                                                               */
/* -------------------------------------------------------------------------- */

export async function updateAdmin({
  id,
  name,
  email,
  role,
}: {
  id: string;
  name?: string;
  email?: string;
  role?: "ADMIN" | "SUPER_ADMIN";
}) {
  const data: {
    name?: string;
    email?: string;
    role?: "ADMIN" | "SUPER_ADMIN";
  } = {};

  if (name !== undefined) {
    const normalizedName = name.trim();

    if (!normalizedName) {
      throw new Error(
        "Admin name cannot be empty",
      );
    }

    data.name = normalizedName;
  }

  if (email !== undefined) {
    const normalizedEmail = email
      .trim()
      .toLowerCase();

    if (!normalizedEmail) {
      throw new Error(
        "Admin email cannot be empty",
      );
    }

    const existingAdmin =
      await prisma.admin.findFirst({
        where: {
          email: normalizedEmail,
          NOT: {
            id,
          },
        },
      });

    if (existingAdmin) {
      throw new Error(
        "An admin with this email already exists",
      );
    }

    data.email = normalizedEmail;
  }

  if (role !== undefined) {
    data.role = role;
  }

  return prisma.admin.update({
    where: {
      id,
    },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Update Admin Password                                                      */
/* -------------------------------------------------------------------------- */

export async function updateAdminPassword({
  id,
  password,
}: {
  id: string;
  password: string;
}) {
  if (!password) {
    throw new Error(
      "Password is required",
    );
  }

  const hashedPassword =
    await hashAdminPassword(password);

  return prisma.admin.update({
    where: {
      id,
    },
    data: {
      password: hashedPassword,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Set Admin Active Status                                                    */
/* -------------------------------------------------------------------------- */

export async function setAdminActiveStatus({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  return prisma.admin.update({
    where: {
      id,
    },
    data: {
      isActive,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      updatedAt: true,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* List Admins                                                                */
/* -------------------------------------------------------------------------- */

export async function listAdmins() {
  return prisma.admin.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/* -------------------------------------------------------------------------- */
/* Delete Admin                                                               */
/* -------------------------------------------------------------------------- */

export async function deleteAdmin(
  id: string,
) {
  return prisma.admin.delete({
    where: {
      id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });
}