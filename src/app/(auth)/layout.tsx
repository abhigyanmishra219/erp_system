import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getUserFromCookies } from "@/lib/helper";
import UserProvider from "@/context/UserContext";

export default async function AuthProtectedLayout({
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
        {children}
      </div>
    </UserProvider>
  );
}
