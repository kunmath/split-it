import { ExpenseComposerScreen } from "@/components/expenses/expense-composer-screen";

type NewExpensePageProps = {
  params: Promise<{ groupId: string }>;
};

export default async function NewExpensePage({ params }: NewExpensePageProps) {
  const { groupId } = await params;

  return <ExpenseComposerScreen groupId={groupId} />;
}
