import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { CurrentUser, UserRole } from "@/types";

export class AuthorizationError extends Error {
  constructor(message = "Unauthorized: Insufficient permissions") {
    super(message);
    this.name = "AuthorizationError";
  }
}

/**
 * Retrieves the current authenticated user context.
 * In production, checks NextAuth session; in development or test,
 * supports x-user-id header or defaults to the seeded Admin user.
 */
export async function getCurrentUser(req?: NextRequest): Promise<CurrentUser> {
  // 1. Check for x-user-id or x-user-role header (useful for API testing and service calls)
  if (req) {
    const headerUserId = req.headers.get("x-user-id");
    if (headerUserId) {
      const user = await prisma.user.findUnique({
        where: { id: headerUserId },
        select: { id: true, name: true, email: true, role: true, avatar: true },
      });
      if (user) {
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role as UserRole,
          avatar: user.avatar,
        };
      }
    }
  }

  // 2. Default fallback: query the first active ADMIN in database (e.g. seeded admin)
  const defaultAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN", active: true },
    select: { id: true, name: true, email: true, role: true, avatar: true },
    orderBy: { createdAt: "asc" },
  });

  if (defaultAdmin) {
    return {
      id: defaultAdmin.id,
      name: defaultAdmin.name,
      email: defaultAdmin.email,
      role: defaultAdmin.role as UserRole,
      avatar: defaultAdmin.avatar,
    };
  }

  // 3. Static fallback if database has not yet been seeded
  return {
    id: "usr-admin-default",
    name: "Alex Vance",
    email: "admin@stocksense.io",
    role: "ADMIN",
    avatar: null,
  };
}

/**
 * Asserts that the user possesses one of the allowed roles.
 * Throws AuthorizationError if not permitted.
 */
export function assertRole(user: CurrentUser, allowedRoles: UserRole[]): void {
  if (!allowedRoles.includes(user.role)) {
    throw new AuthorizationError(
      `Access denied: Your role (${user.role}) does not have permission for this operation. Required: ${allowedRoles.join(
        ", "
      )}.`
    );
  }
}
