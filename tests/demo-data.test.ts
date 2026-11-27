import { describe, expect, it } from "vitest";

import { getMockEntryDetail, getMockGroupSceneData } from "@/components/groups/group-mock-data";
import { mockGroups, mockPeople } from "@/components/groups/group-list-data";

// The owner evaluates the app in demo mode, so every demo number must reconcile across screens.
describe("demo data reconciles across Home, Groups and group detail", () => {
  for (const listed of mockGroups) {
    it(`${listed.name}: ledger rows add up to every member's balance`, () => {
      const scene = getMockGroupSceneData(listed.id);
      const net = new Map<string, number>(scene.members.map((member) => [member.id, 0]));

      for (const row of scene.recentExpenses) {
        const detail = getMockEntryDetail(listed.id, row.id);
        expect(detail, row.description).not.toBeNull();
        net.set(detail!.paidBy.id, (net.get(detail!.paidBy.id) ?? 0) + detail!.amountCents);
        for (const share of detail!.shares) {
          net.set(share.userId, (net.get(share.userId) ?? 0) - share.shareCents);
        }
        expect(detail!.shares.reduce((sum, share) => sum + share.shareCents, 0)).toBe(detail!.amountCents);
      }

      for (const member of scene.members) {
        expect(net.get(member.id), member.name).toBe(member.balanceCents);
      }
    });

    it(`${listed.name}: viewer balance and member count match the Groups list`, () => {
      const scene = getMockGroupSceneData(listed.id);
      expect(scene.currentStanding.balanceCents).toBe(listed.balanceCents);
      expect(scene.memberCount).toBe(listed.memberCount);
    });
  }

  it("each person's per-group amount on Home matches that member in the group", () => {
    for (const person of mockPeople) {
      for (const group of person.groups) {
        const member = getMockGroupSceneData(group.id).members.find((item) => item.name === person.name);
        expect(member, `${person.name} in ${group.name}`).toBeDefined();
        // Person balance is from the viewer's side (positive = owes you); member balance is their own net.
        expect(member!.balanceCents).toBe(-group.balanceCents);
      }
    }
  });
});
