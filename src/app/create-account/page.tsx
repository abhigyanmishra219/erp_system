import { redirect } from "next/navigation";

/**
 * Public Account Creation is disabled for production security.
 * All public navigation to this route is redirected to Sign In.
 * System administrator accounts can only be created from inside
 * the authenticated System Admin Dashboard.
 */
export default function CreateAccountPage() {
  redirect("/login");
}
