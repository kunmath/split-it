import { GroupScreen } from "@/components/groups/group-screen";

type GroupPageProps = {
  params: Promise<{ groupId: string }>;
  searchParams: Promise<{
    name?: string;
    description?: string;
  }>;
};

export default async function GroupPage({ params, searchParams }: GroupPageProps) {
  const { groupId } = await params;
  const resolvedSearchParams = await searchParams;

  return (
    <GroupScreen
      groupId={groupId}
      initialName={resolvedSearchParams.name?.trim()}
      initialDescription={resolvedSearchParams.description?.trim()}
    />
  );
}
