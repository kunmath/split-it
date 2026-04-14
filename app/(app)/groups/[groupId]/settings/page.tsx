import { GroupSettingsScreen } from "@/components/groups/group-settings-screen";

type GroupSettingsPageProps = {
  params: Promise<{ groupId: string }>;
};

export default async function GroupSettingsPage({
  params,
}: GroupSettingsPageProps) {
  const { groupId } = await params;

  return <GroupSettingsScreen groupId={groupId} />;
}
