"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export default function AuthButton() {
  const pathname = usePathname();

  const isLoginPage = pathname === "/auth/signin"
  const buttonText = isLoginPage ? "Sign Up" : "Sign In";
  const buttonLink = isLoginPage ? "/auth/signup" : "/auth/signin";

  return (
    <Link
      href={buttonLink}
      className={cn(
        buttonVariants({ variant: "ghost" }),
      )}
    >
      {buttonText}
    </Link>
  );
}
