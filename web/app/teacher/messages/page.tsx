"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function TeacherMessagesPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/chat"); }, [router]);
  return null;
}
