import { AccountProfileForm } from "@/components/profile/profile-form";
import { PageContainer } from "@/components/shell/page-container";

export default function AccountPage() {
  return (
    <PageContainer className="space-y-8">
      <AccountProfileForm />
    </PageContainer>
  );
}
