import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUserFromCookies } from "@/lib/helper";
import UserProvider from "@/context/UserContext";
import MandatoryPasswordChangeModal from "@/components/MandatoryPasswordChangeModal";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const userDoc = await getUserFromCookies();

  if (!userDoc) {
    redirect("/login");
  }

  // Convert Mongoose document to plain JSON-serializable object
  const user = JSON.parse(JSON.stringify(userDoc));

  return (
    <UserProvider user={user}>
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        {/* Enforces mandatory password change dialog for users with mustChangePassword=true */}
        <MandatoryPasswordChangeModal />
        {children}
      </div>
    </UserProvider>
  );
}
