# Mobile UI follow-up

Continues the existing ISG platform without database or environment changes.

| Before | After | Why |
| --- | --- | --- |
| Long consultation introduction and setup banner | Heading, four clear progress cards and form fields | Keep the first step focused; existing submission guards remain |
| Small unstructured progress labels | Numbered cards with a distinct current step | Make progress easier to scan at 320px |
| Education and degree cards stacked vertically | Mobile scroll-snap rows with smaller degree cards | Show adjacent choices without making the page excessively long |
| Description beneath the study-path heading | Heading followed directly by choices | Remove the requested repetition |
| Mobile utility strip relied on sticky positioning | Whole public header fixed with reserved page space | Keep contact, language and navigation together while scrolling |
| Workspace controls occupied a separate tall row | Compact notification/language/sign-out controls beside the logo | Put navigation at the top and give content more room |

The final review step explains unavailable online submission briefly and links to contact support. Intake configuration, CAPTCHA, consent, draft saving and server authorization have not been weakened. No real consultation or account data was created for testing. Desktop layouts retain their existing grid and scroll behavior.

Validation: 61 unit tests, 37 isolated production browser checks, typecheck, lint and production Docker build passed. Independent code review found no blocking issues. Focused Docker browser checks cover mobile header persistence, horizontal card navigation, compact auth layouts and reduced-motion logo behavior. Signed-in consultation and workspace views were checked at 320px; the browser's current account was an applicant, so no claim is made that an administrator completed an authenticated flow in this pass.

Preview: http://localhost:3002. The public domain has not been redeployed. Existing GitHub Actions account billing restrictions are documented in DELIVERY-2026-11-19.md.
