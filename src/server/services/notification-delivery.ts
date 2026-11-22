import "server-only";
import { after } from "next/server";
import { publicUrl } from "@/config/site";
import { dispatchAdminAlerts } from "./admin-alerts";
import { dispatchNotifications } from "./notifications";

export function dispatchDelivery() {
  return Promise.allSettled([dispatchNotifications(publicUrl), dispatchAdminAlerts(publicUrl)]);
}

export function wakeNotifications() {
  after(async () => {
    for (const result of await dispatchDelivery()) {
      if (result.status === "rejected") console.error("notification_dispatch_unavailable");
    }
  });
}
