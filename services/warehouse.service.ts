import { prisma } from "@/lib/db";

export class WarehouseService {
  static async getAll() {
    return prisma.warehouse.findMany({
      where: { active: true },
      include: {
        locations: {
          where: { active: true },
          orderBy: { code: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });
  }

  static async getById(id: string) {
    return prisma.warehouse.findUnique({
      where: { id },
      include: {
        locations: {
          where: { active: true },
          orderBy: { code: "asc" },
        },
      },
    });
  }
}
