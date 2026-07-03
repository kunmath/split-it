import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";

import { api, internal } from "../convex/_generated/api";
import schema from "../convex/schema";
import { modules } from "./convex-modules";

function makeTest() {
  return convexTest(schema, modules);
}

async function allUsers(t: ReturnType<typeof makeTest>) {
  return t.run(async (ctx) => ctx.db.query("users").collect());
}

describe("identity sync", () => {
  it("webhook then client sync resolves to a single user row", async () => {
    const t = makeTest();

    await t.mutation(internal.users.upsertFromClerk, {
      clerkUserId: "user_alice",
      email: "alice@example.com",
      name: "Alice",
    });

    const asAlice = t.withIdentity({
      subject: "user_alice",
      email: "alice@example.com",
      name: "Alice",
    });
    await asAlice.mutation(api.users.storeCurrentUser, {});

    const users = await allUsers(t);
    expect(users).toHaveLength(1);
    expect(users[0]!.clerkUserId).toBe("user_alice");
  });

  it("client sync then webhook resolves to a single user row", async () => {
    const t = makeTest();
    const asAlice = t.withIdentity({
      subject: "user_alice",
      email: "alice@example.com",
      name: "Alice",
    });

    await asAlice.mutation(api.users.storeCurrentUser, {});
    await t.mutation(internal.users.upsertFromClerk, {
      clerkUserId: "user_alice",
      email: "alice@example.com",
      name: "Alice",
    });

    const users = await allUsers(t);
    expect(users).toHaveLength(1);
  });

  it("updates the stored email when it changes in Clerk", async () => {
    const t = makeTest();

    await t.mutation(internal.users.upsertFromClerk, {
      clerkUserId: "user_alice",
      email: "alice@example.com",
      name: "Alice",
    });
    await t.mutation(internal.users.upsertFromClerk, {
      clerkUserId: "user_alice",
      email: "alice@new.example.com",
      name: "Alice",
    });

    const users = await allUsers(t);
    expect(users).toHaveLength(1);
    expect(users[0]!.email).toBe("alice@new.example.com");
  });

  it("never attaches a new Clerk account to a row claimed by another account", async () => {
    const t = makeTest();

    // Alice's row still holds alice@example.com even though she changed her
    // email in Clerk (we missed the update). Bob signs up with that email.
    await t.mutation(internal.users.upsertFromClerk, {
      clerkUserId: "user_alice",
      email: "alice@example.com",
      name: "Alice",
    });
    await t.mutation(internal.users.upsertFromClerk, {
      clerkUserId: "user_bob",
      email: "alice@example.com",
      name: "Bob",
    });

    const users = await allUsers(t);
    expect(users).toHaveLength(2);

    const alice = users.find((user) => user.clerkUserId === "user_alice")!;
    const bob = users.find((user) => user.clerkUserId === "user_bob")!;

    // Bob got a fresh row with the email; Alice's stale email was retired.
    expect(bob.email).toBe("alice@example.com");
    expect(alice.email).not.toBe("alice@example.com");
  });

  it("claims a demo placeholder row on first verified sign-in", async () => {
    const t = makeTest();

    const placeholderId = await t.run(async (ctx) =>
      ctx.db.insert("users", {
        name: "Sarah Jenkins",
        email: "sarah@example.com",
        clerkUserId: "demo-abc-sarah",
      }),
    );

    const asSarah = t.withIdentity({
      subject: "user_sarah",
      email: "sarah@example.com",
      name: "Sarah",
    });
    await asSarah.mutation(api.users.storeCurrentUser, {});

    const users = await allUsers(t);
    expect(users).toHaveLength(1);
    expect(users[0]!._id).toBe(placeholderId);
    expect(users[0]!.clerkUserId).toBe("user_sarah");
  });

  it("rejects linking via a client-supplied (unverified) email", async () => {
    const t = makeTest();

    await t.mutation(internal.users.upsertFromClerk, {
      clerkUserId: "user_alice",
      email: "alice@example.com",
      name: "Alice",
    });

    // Mallory's Clerk identity has no email; she passes Alice's email from the
    // client. This must not link her to (or displace) Alice's account.
    const asMallory = t.withIdentity({ subject: "user_mallory", name: "Mallory" });

    await expect(
      asMallory.mutation(api.users.storeCurrentUser, { email: "alice@example.com" }),
    ).rejects.toThrow();

    const users = await allUsers(t);
    expect(users).toHaveLength(1);
    expect(users[0]!.clerkUserId).toBe("user_alice");
  });

  it("group membership stays with the original account after an email collision", async () => {
    const t = makeTest();
    const asAlice = t.withIdentity({
      subject: "user_alice",
      email: "alice@example.com",
      name: "Alice",
    });

    const groupId = await asAlice.mutation(api.groups.create, { name: "Trip" });

    // Bob signs up with Alice's (stale) email.
    await t.mutation(internal.users.upsertFromClerk, {
      clerkUserId: "user_bob",
      email: "alice@example.com",
      name: "Bob",
    });

    const memberships = await t.run(async (ctx) =>
      ctx.db
        .query("groupMembers")
        .withIndex("by_group", (q) => q.eq("groupId", groupId))
        .collect(),
    );
    const users = await allUsers(t);
    const alice = users.find((user) => user.clerkUserId === "user_alice")!;

    expect(memberships).toHaveLength(1);
    expect(memberships[0]!.userId).toBe(alice._id);
  });
});
