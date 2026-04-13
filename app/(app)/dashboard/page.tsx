import { DashboardScreen } from "@/components/dashboard/dashboard-screen";

type DashboardPageProps = {
  searchParams: Promise<{
    create?: string;
  }>;
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedSearchParams = await searchParams;

  return <DashboardScreen initialCreateOpen={resolvedSearchParams.create === "1"} />;
}
