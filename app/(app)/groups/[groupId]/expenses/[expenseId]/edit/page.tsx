import { ExpenseComposerScreen } from "@/components/expenses/expense-composer-screen";

type EditExpensePageProps = {
  params: Promise<{ groupId: string; expenseId: string }>;
};

export default async function EditExpensePage({ params }: EditExpensePageProps) {
  const { groupId, expenseId } = await params;

  return <ExpenseComposerScreen groupId={groupId} expenseId={expenseId} />;
}
