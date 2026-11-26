import { GroupsIndexScreen } from "@/components/groups/groups-index-screen";

type GroupsPageProps = {
  searchParams: Promise<{
    create?: string;
  }>;
};

export default async function GroupsPage({ searchParams }: GroupsPageProps) {
  const resolvedSearchParams = await searchParams;

  return <GroupsIndexScreen initialCreateOpen={resolvedSearchParams.create === "1"} />;
}
