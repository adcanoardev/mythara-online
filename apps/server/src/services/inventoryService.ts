import { prisma } from "./prisma.js";
import type { ItemType } from "@prisma/client";

export async function getInventory(userId: string) {
    return prisma.inventory.findMany({ where: { userId } });
}

export async function addItem(userId: string, item: ItemType, quantity: number) {
    return prisma.inventory.upsert({
        where: { userId_item: { userId, item } },
        update: { quantity: { increment: quantity } },
        create: { userId, item, quantity },
    });
}

export async function removeItem(userId: string, item: ItemType, quantity: number): Promise<boolean> {
    const entry = await prisma.inventory.findUnique({
        where: { userId_item: { userId, item } },
    });
    if (!entry || entry.quantity < quantity) return false;

    await prisma.inventory.update({
        where: { userId_item: { userId, item } },
        data: { quantity: { decrement: quantity } },
    });
    return true;
}

export async function hasItem(userId: string, item: ItemType, quantity = 1): Promise<boolean> {
    const entry = await prisma.inventory.findUnique({
        where: { userId_item: { userId, item } },
    });
    return (entry?.quantity ?? 0) >= quantity;
}
