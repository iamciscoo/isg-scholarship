import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { isLocale } from "./config";
import { dictionaries } from "./messages";
export const getLocale = cache(async () => {
  const value = (await cookies()).get("isg_locale")?.value;
  return isLocale(value) ? value : "en";
});
export const getMessages = cache(async () => dictionaries[await getLocale()]);
