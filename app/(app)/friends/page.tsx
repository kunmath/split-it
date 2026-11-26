import { redirect } from "next/navigation";

// Person-to-person balances now live in the People section on Home.
export default function FriendsPage() {
  redirect("/dashboard#people");
}
