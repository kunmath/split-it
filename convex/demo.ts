import { ConvexError, v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { internalMutation, type MutationCtx } from "./_generated/server";
import { expirePendingGroupInvites } from "./lib/inviteHelpers";
import {
  EXPENSE_SPLIT_TYPE,
  GROUP_MEMBER_ROLE,
  MEMBERSHIP_STATUS,
  type ExpenseSplitType,
} from "./lib/constants";

const DEMO_GROUP_NAME = "Iceland Expedition";
const DEMO_GROUP_DESCRIPTION =
  "Seeded demo ledger for QA and handoff. Safe to archive and reseed.";

function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();

  if (!email) {
    throw new ConvexError("Owner email is required");
  }

  return email;
}

type DemoCtx = MutationCtx;

async function findOrCreateDemoUser(
  ctx: DemoCtx,
  args: {
    email: string;
    clerkUserId: string;
    imageUrl?: string;
    name: string;
  },
) {
  const existingUser = await ctx.db
    .query("users")
    .withIndex("by_email", (q) => q.eq("email", args.email))
    .unique();

  if (existingUser !== null) {
    const patch: Partial<Pick<Doc<"users">, "name" | "clerkUserId" | "imageUrl">> = {};

    if (existingUser.name !== args.name) {
      patch.name = args.name;
    }

    if (existingUser.clerkUserId !== args.clerkUserId) {
      patch.clerkUserId = args.clerkUserId;
    }

    if (existingUser.imageUrl !== args.imageUrl) {
      patch.imageUrl = args.imageUrl;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(existingUser._id, patch);
    }

    return existingUser._id;
  }

  return ctx.db.insert("users", {
    name: args.name,
    email: args.email,
    clerkUserId: args.clerkUserId,
    imageUrl: args.imageUrl,
  });
}

async function archiveExistingDemoGroups(
  ctx: DemoCtx,
  ownerId: Id<"users">,
  now: number,
) {
  const existingGroups = await ctx.db
    .query("groups")
    .withIndex("by_created_by", (q) => q.eq("createdBy", ownerId))
    .collect();

  for (const group of existingGroups) {
    if (
      group.archivedAt === undefined &&
      group.description === DEMO_GROUP_DESCRIPTION
    ) {
      await ctx.db.patch(group._id, { archivedAt: now });
      await expirePendingGroupInvites(ctx, group._id);
    }
  }
}

async function insertExpense(
  ctx: DemoCtx,
  args: {
    amountCents: number;
    createdBy: Id<"users">;
    description: string;
    expenseAt: number;
    groupId: Id<"groups">;
    notes?: string;
    paidBy: Id<"users">;
    shares: Array<{
      shareCents: number;
      userId: Id<"users">;
    }>;
    splitType: ExpenseSplitType;
  },
) {
  const expenseId = await ctx.db.insert("expenses", {
    groupId: args.groupId,
    description: args.description,
    amountCents: args.amountCents,
    paidBy: args.paidBy,
    splitType: args.splitType,
    expenseAt: args.expenseAt,
    createdBy: args.createdBy,
    notes: args.notes,
  });

  for (const share of args.shares) {
    await ctx.db.insert("expenseShares", {
      expenseId,
      groupId: args.groupId,
      userId: share.userId,
      shareCents: share.shareCents,
    });
  }

  return expenseId;
}

export const seedForEmail = internalMutation({
  args: {
    ownerEmail: v.string(),
  },
  handler: async (ctx, args) => {
    const ownerEmail = normalizeEmail(args.ownerEmail);
    const owner = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", ownerEmail))
      .unique();

    if (owner === null) {
      throw new ConvexError("No synced user found for that owner email");
    }

    const now = Date.now();

    await archiveExistingDemoGroups(ctx, owner._id, now);

    const syntheticMembers = await Promise.all(
      [
        {
          name: "Sarah Jenkins",
          slug: "sarah",
        },
        {
          name: "Elena Rodriguez",
          slug: "elena",
        },
        {
          name: "James Chen",
          slug: "james",
        },
        {
          name: "Priya Nair",
          slug: "priya",
        },
      ].map((member) =>
        findOrCreateDemoUser(ctx, {
          name: member.name,
          email: `demo+${owner._id}-${member.slug}@split-it.local`,
          clerkUserId: `demo-${owner._id}-${member.slug}`,
        }),
      ),
    );

    const groupId = await ctx.db.insert("groups", {
      name: DEMO_GROUP_NAME,
      description: DEMO_GROUP_DESCRIPTION,
      currency: "INR",
      createdBy: owner._id,
      createdAt: now,
      iconKey: "plane",
    });

    await ctx.db.insert("groupMembers", {
      groupId,
      userId: owner._id,
      role: GROUP_MEMBER_ROLE.OWNER,
      status: MEMBERSHIP_STATUS.ACTIVE,
      joinedAt: now - 5 * 24 * 60 * 60 * 1000,
    });

    for (const memberId of syntheticMembers) {
      await ctx.db.insert("groupMembers", {
        groupId,
        userId: memberId,
        role: GROUP_MEMBER_ROLE.MEMBER,
        status: MEMBERSHIP_STATUS.ACTIVE,
        joinedAt: now - 4 * 24 * 60 * 60 * 1000,
      });
    }

    const allMemberIds = [owner._id, ...syntheticMembers];
    const editExpenseId = await insertExpense(ctx, {
      groupId,
      createdBy: owner._id,
      description: "Cabin reservation",
      amountCents: 288_000,
      paidBy: owner._id,
      splitType: EXPENSE_SPLIT_TYPE.EXACT,
      expenseAt: Date.UTC(2026, 3, 8, 12, 0, 0),
      notes: "Seeded by the Split-It demo helper for the edit route QA pass.",
      shares: [
        { userId: owner._id, shareCents: 64_000 },
        { userId: syntheticMembers[0]!, shareCents: 56_000 },
        { userId: syntheticMembers[1]!, shareCents: 56_000 },
        { userId: syntheticMembers[2]!, shareCents: 56_000 },
        { userId: syntheticMembers[3]!, shareCents: 56_000 },
      ],
    });

    await insertExpense(ctx, {
      groupId,
      createdBy: owner._id,
      description: "Golden Circle fuel refill",
      amountCents: 9_400,
      paidBy: syntheticMembers[2]!,
      splitType: EXPENSE_SPLIT_TYPE.EQUAL,
      expenseAt: Date.UTC(2026, 3, 9, 12, 0, 0),
      shares: allMemberIds.map((userId) => ({
        userId,
        shareCents: 1_880,
      })),
    });

    await insertExpense(ctx, {
      groupId,
      createdBy: owner._id,
      description: "Groceries at Bonus",
      amountCents: 12_650,
      paidBy: syntheticMembers[0]!,
      splitType: EXPENSE_SPLIT_TYPE.EQUAL,
      expenseAt: Date.UTC(2026, 3, 10, 12, 0, 0),
      notes: "Snacks, breakfast, and road-trip supplies.",
      shares: [
        { userId: owner._id, shareCents: 2_530 },
        { userId: syntheticMembers[0]!, shareCents: 2_530 },
        { userId: syntheticMembers[1]!, shareCents: 2_530 },
        { userId: syntheticMembers[2]!, shareCents: 2_530 },
        { userId: syntheticMembers[3]!, shareCents: 2_530 },
      ],
    });

    await insertExpense(ctx, {
      groupId,
      createdBy: owner._id,
      description: "Lagoon tickets",
      amountCents: 42_100,
      paidBy: owner._id,
      splitType: EXPENSE_SPLIT_TYPE.EXACT,
      expenseAt: Date.UTC(2026, 3, 11, 12, 0, 0),
      shares: [
        { userId: owner._id, shareCents: 8_420 },
        { userId: syntheticMembers[0]!, shareCents: 8_420 },
        { userId: syntheticMembers[1]!, shareCents: 8_420 },
        { userId: syntheticMembers[2]!, shareCents: 8_420 },
        { userId: syntheticMembers[3]!, shareCents: 8_420 },
      ],
    });

    return {
      groupId,
      groupName: DEMO_GROUP_NAME,
      expenseId: editExpenseId,
    };
  },
});
