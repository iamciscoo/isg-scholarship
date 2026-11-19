import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ pathname: vi.fn(), menu: vi.fn() }));
vi.mock("next/navigation", () => ({ usePathname: mock.pathname }));
vi.mock("@/features/auth/actions", () => ({ signOut: vi.fn() }));
vi.mock("@/components/layout/language-selector", () => ({ LanguageSelector: () => null }));
vi.mock("@/features/notifications/bell", () => ({ NotificationBell: () => null }));
vi.mock("@/components/layout/workspace-profile-menu", () => ({ WorkspaceProfileMenu: mock.menu }));
import { Workspace, WorkspaceLayout } from "@/components/layout/workspace";
beforeEach(() => {
  vi.stubGlobal("React", React);
  mock.pathname.mockReturnValue("/dashboard/consultations");
  mock.menu.mockReset().mockReturnValue(null);
});
afterEach(() => vi.unstubAllGlobals());
function render(role: "applicant" | "admin" | "advisor") {
  renderToStaticMarkup(
    <Workspace role={role} email="fixture@example.invalid">
      Test content
    </Workspace>,
  );
  return mock.menu.mock.calls[0][0];
}
it("shares ordered applicant links and one current page with the mobile menu", () => {
  const { links, account } = render("applicant");
  expect(links.map((l: { label: string }) => l.label)).toEqual([
    "My overview",
    "My profile",
    "Consultations",
    "Application details",
    "Applications",
  ]);
  expect(links.filter((l: { current: boolean }) => l.current).map((l: { id: string }) => l.id)).toEqual([
    "consultations",
  ]);
  expect(account).toEqual({ name: "fixture@example.invalid", avatar: null });
});
it("keeps all admin destinations and puts profile after the first section", () => {
  mock.pathname.mockReturnValue("/admin/inbox");
  const { links } = render("admin");
  expect(links.slice(0, 2).map((l: { id: string }) => l.id)).toEqual(["overview", "profile"]);
  expect(links.map((l: { href: string }) => l.href)).toContain("/admin/inbox");
  expect(links.map((l: { href: string }) => l.href)).toContain("/admin/settings");
  expect(links.filter((l: { current: boolean }) => l.current)).toHaveLength(1);
});
it("excludes administrator menus for advisors", () => {
  mock.pathname.mockReturnValue("/advisor");
  const { links } = render("advisor");
  expect(links.map((l: { href: string }) => l.href)).toEqual([
    "/advisor",
    "/dashboard/profile",
    "/advisor/applications",
  ]);
});
it("renders a single persistent menu with the current profile photo", () => {
  const account = { name: "Fixture student", avatar: "/api/profile/avatar?v=fixture" };
  renderToStaticMarkup(
    <WorkspaceLayout role="applicant" email="fixture@example.invalid" account={account}>
      <Workspace role="applicant" email="fixture@example.invalid">
        Content
      </Workspace>
    </WorkspaceLayout>,
  );
  expect(mock.menu).toHaveBeenCalledTimes(1);
  expect(mock.menu.mock.calls[0][0].account).toEqual(account);
});
