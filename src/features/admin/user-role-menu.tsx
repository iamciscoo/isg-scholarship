"use client";
import { Text, useWorkspaceText } from "@/lib/i18n/workspace-text";

import * as Menu from "@radix-ui/react-dropdown-menu";
import { Check, MoreVertical } from "lucide-react";
import { useTransition } from "react";
import { setUserRole } from "./settings-actions";

const roles = [
  ["admin", "Admin"],
  ["applicant", "Applicant"],
] as const;

export function UserRoleMenu({ id, role }: { id: string; role: string }) {
  const translate = useWorkspaceText();
  const [pending, start] = useTransition();
  return (
    <Menu.Root>
      <Menu.Trigger
        className="row-menu-trigger"
        aria-label={translate("Change account role")}
        disabled={pending}
      >
        <MoreVertical size={18} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className="row-menu" sideOffset={6} collisionPadding={12}>
          <Menu.Label className="row-menu-label">
            <Text>{"Change role"}</Text>
          </Menu.Label>
          {roles.map(([value, label]) => (
            <Menu.Item
              key={value}
              className="row-menu-item"
              disabled={role === value || pending}
              onSelect={() =>
                start(async () => {
                  const fd = new FormData();
                  fd.set("user", id);
                  fd.set("role", value);
                  await setUserRole(fd);
                })
              }
            >
              {role === value && <Check size={15} />}
              <Text>{"Make"}</Text> {<Text>{label}</Text>}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
