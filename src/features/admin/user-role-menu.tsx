"use client";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { Check, MoreVertical } from "lucide-react";
import { useTransition } from "react";
import { setUserRole } from "./settings-actions";

const roles = [
  ["admin", "Admin"],
  ["advisor", "Advisor"],
  ["applicant", "Applicant"],
] as const;

export function UserRoleMenu({ id, role }: { id: string; role: string }) {
  const [pending, start] = useTransition();
  return (
    <Menu.Root>
      <Menu.Trigger className="row-menu-trigger" aria-label="Change account role" disabled={pending}>
        <MoreVertical size={18} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content className="row-menu" sideOffset={6} collisionPadding={12}>
          <Menu.Label className="row-menu-label">Change role</Menu.Label>
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
              Make {label}
            </Menu.Item>
          ))}
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}