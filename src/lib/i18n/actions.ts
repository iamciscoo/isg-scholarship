"use server";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { isLocale } from "./config";
export async function setLocale(value: string) {
  if (!isLocale(value)) return;
  (await cookies()).set("isg_locale", value, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 31536000,
    secure: process.env.NEXT_PUBLIC_SITE_URL?.startsWith("https://") ?? false,
  });
  revalidatePath("/", "layout");
}
