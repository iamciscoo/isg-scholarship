# Mobile workspace profile menu

| Before                                     | After                                                                                 | Why                                   |
| ------------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------- |
| Horizontal workspace tabs beneath the logo | Profile/avatar dropdown beside the bell and language selector                         | Keep the mobile header compact        |
| Separate mobile sign-out icon              | Log out as the final dropdown item                                                    | Keep account actions together         |
| My profile farther down the navigation     | Immediately after My overview for applicants and the first overview section for staff | Make personal settings easier to find |

The mobile menu and desktop sidebar use the same role-filtered links and current-page calculation. The menu uses the existing authenticated avatar endpoint, displaying the saved name or email and falling back to a person icon when no photo exists. All destination links retain prefetching and existing page/action authorization. Desktop sidebar and logout controls remain available above 900px; resizing to desktop closes the mobile menu.

Radix provides keyboard navigation and focus handling. The menu has 44px action targets, viewport-constrained height and internal scrolling, so the full administrator menu fits short screens and Log out stays reachable. Reduced-motion preferences are respected.

Verification: unit coverage includes all three role link sets, profile ordering, one current item and one persistent menu/profile-photo source. Live applicant checks covered opening, Escape/focus return and navigation to My profile. The existing administrator signed in through ngrok; the full menu scrolled at 320×568, keyboard End reached Log out, and the real local-session logout returned to the login page. The pre-existing applicant session was preserved. No new accounts, roles, business data, database migrations or environment-file changes were introduced. Independent code review passed.
