# ISG — International Scholarship Gateway
## Master Development Prompt & Product Requirements Document

**Project:** ISG Scholarship Advisory & Application Management Platform  
**Existing website:** https://www.isgscholarship.com/  
**Project type:** Full-stack web application  
**Architecture:** Modular monolith  
**Primary market:** Tanzania, with potential international expansion  
**Development environment:** Codex  
**Status:** Initial specification — editable

---

# 1. ROLE AND MISSION

You are a senior full-stack software engineer, product architect, UI/UX designer, database engineer, and application security specialist.

Your task is to design and implement a modern, production-ready scholarship advisory and application management platform for **International Scholarship Gateway (ISG)**.

This is not merely a scholarship directory.

ISG is a business that helps students identify potential international education funding opportunities, assess their eligibility, prepare applications, manage documentation, and navigate scholarship application processes.

The platform must support the entire client lifecycle, from an anonymous website visitor to an applicant receiving their final application outcome.

Build a secure, professional, scalable system that can support the organization's operations as it grows.

**Core priorities:**
1. Protect ISG's confidential scholarship research and internal business methods.
2. Protect applicants' personal information and academic documents.
3. Convert interested website visitors into qualified leads.
4. Provide a straightforward, trustworthy experience for applicants.
5. Give administrators and advisors efficient application management tools.
6. Automate repetitive administrative processes where appropriate.
7. Maintain a clean, premium, responsive website.
8. Keep infrastructure costs reasonable.
9. Ensure the platform can grow without needing a complete rewrite.

Do not implement unnecessary complexity or expose internal business information publicly.

# 2. IMPORTANT DEVELOPMENT INSTRUCTIONS

Before writing code:

1. Inspect the existing repository and identify its current framework, file structure, dependencies, configuration, and functionality.
2. Identify what already works and what needs replacement.
3. Use the existing implementation where it meets the requirements.
4. Do not blindly overwrite working functionality or unrelated files.
5. Establish a clear, maintainable folder structure.
6. Build features incrementally.
7. Use strict TypeScript.
8. Ensure all code follows production-quality security practices.
9. Avoid mock functionality that looks operational but does not actually work.
10. Never hardcode credentials, private keys, payment secrets, or sensitive applicant information.
11. Use environment variables for secrets and configuration.
12. Create database migrations, not just schema descriptions.
13. Document important decisions and setup requirements.
14. Implement meaningful error handling and loading states.
15. Do not fabricate applicants, scholarship awards, institutional partnerships, success statistics, or testimonials.
16. Run relevant checks and tests after implementing features.
17. Explain any external configuration that requires administrator action.

If working inside an existing repository, first produce a concise implementation plan and then proceed with the agreed development scope.

Do not initiate destructive data migrations, production deployments, DNS changes, or deletion of live data without explicit authorization.

# 3. TECHNOLOGY STACK

Use the following preferred stack.

## 3.1 Frontend

- Next.js with App Router
- React
- TypeScript with strict typing
- Tailwind CSS
- shadcn/ui for reusable UI components
- Lucide React for icons
- React Hook Form for complex forms
- Zod for validation
- Server Components where appropriate
- Client Components only where interactivity requires them

Use stable, mutually compatible package versions supported at implementation time.

## 3.2 Backend

Use Next.js Server Actions, Route Handlers, and a structured server-side service layer.

There is no requirement for a separate backend framework initially.

Organize backend modules by business domain rather than placing all logic in API routes.

Required capabilities:
- Authentication and authorization
- Applicant profile management
- Eligibility assessments
- Advisor assignments
- Scholarship research management
- Application tracking
- Document management
- Consultations
- Notifications
- Payments and billing
- Administrative analytics
- Audit logging

Every protected operation must enforce permissions on the server.

## 3.3 Database

Use Supabase PostgreSQL.

Requirements:
- Relational schema with appropriate constraints
- Foreign keys and indexes
- Migration-managed schema
- Row-Level Security (RLS)
- Server-side authorization
- Proper data ownership
- Automatic timestamps
- Database-backed application statuses
- Audit trails for important actions

Keep confidential scholarship research in a separate private schema, accessible only through authorized server-side operations.

## 3.4 Authentication

Use Supabase Auth.

Initial methods:
- Email and password
- Email verification
- Password reset
- Secure session handling

Future method:
- Google OAuth

Implement:
- Staff MFA
- Session expiration and revocation
- Account suspension
- Role-based permissions
- Secure password recovery

Do not allow users to assign themselves administrative or advisor roles.

## 3.5 File Storage

Use Supabase Storage.

Store academic documents in private buckets, with authorization enforced before access.

Examples:
- Transcripts
- Certificates
- CVs
- Personal statements
- Passport copies, when necessary
- Recommendation documents
- Supporting application files

Never expose an entire applicant document bucket publicly.

## 3.6 Email

Use Resend.

Initial email events:
- Welcome and account verification
- Eligibility submission confirmation
- Consultation confirmation
- Document requests
- Application updates
- Deadline reminders
- Payment receipts
- Password reset notifications
- Advisor assignments and administrative alerts

Use professionally branded, responsive email templates.

## 3.7 WhatsApp

Preferred integration: Official Meta WhatsApp Cloud API.

Alternative under consideration: GREEN-API.

Build the notification system with a provider abstraction so WhatsApp implementations can be changed without rewriting application logic.

Requirements:
- Approved templates where required
- Explicit contact preferences
- Delivery status tracking
- Error handling and retries
- Message deduplication
- Secure webhook signature verification
- Respect provider messaging windows and applicable rules

Do not send sensitive documents through WhatsApp.

## 3.8 Hosting

Preferred hosting:
- Vercel for Next.js
- Supabase for database, authentication, and files

Additional services:
- Sentry for error monitoring
- Cloudflare Turnstile for abuse prevention
- Pexels for approved public marketing imagery
- PostHog or another privacy-conscious analytics solution

Use a background-job mechanism for reminders and asynchronous notifications, such as Supabase Queues and Cron where appropriate.

## 3.9 Payments

Initial implementation:
- Record consultations, invoices, and manually verified payments.
- Support configurable payment methods.
- Allow authorized administrators to reconcile and confirm received payments.
- Generate payment receipts after verification.

Future implementation:
- Tanzania-compatible payment gateway
- Mobile money
- Bank or card payments where supported
- Automated payment verification

Do not treat a user-submitted payment claim as verified payment.

---

# 4. BUSINESS MODEL AND PUBLIC INFORMATION POLICY

ISG's commercial value comes from its research, advisory expertise, eligibility assessment, application preparation, and ongoing assistance.

The website must not expose ISG's complete internal scholarship database or proprietary application strategy.

## Public information

Visitors may see:
- General international education opportunities
- Study destinations and regions
- Bachelor's, Master's, and PhD pathways
- Broad funding categories
- General eligibility criteria
- ISG services
- How the advisory process works
- Clearly disclosed service fees
- Frequently asked questions
- Verified testimonials, with consent
- General application preparation guidance

## Confidential information

Keep private:
- Curated scholarship inventory
- Internal funding-provider research
- Internal eligibility scoring
- Applicant–scholarship matching logic
- Advisor notes
- Internal deadlines and follow-up strategies
- Research sources and business contacts not intended for publication
- Internal application workflows
- Applicant personal data
- Financial and operational information

**Essential transparency rule:**

Confidentiality must not become misleading secrecy.

Before a student approves an actual application or authorizes information sharing, ISG must disclose the scholarship provider, relevant opportunity details, selection requirements, material costs, and where their information will be sent.

Applicants must understand which applications are being made in their names.

Never imply ISG is the scholarship-awarding institution unless that is factually true.

Never guarantee scholarship awards, admission, or visas.

# 5. USER ROLES

Implement four primary access levels.

## 5.1 Guest

Unauthenticated visitor.

Capabilities:
- Browse public pages
- View service details
- Read FAQs
- Explore general educational pathways
- Submit an initial eligibility assessment
- Contact ISG
- Start registration

Guests must not access private dashboards or confidential scholarship information.

## 5.2 Applicant

Authenticated student.

Capabilities:
- Manage personal profile
- Complete academic profile
- Submit eligibility information
- Upload necessary documents
- See assigned advisor information
- View consultation details
- Receive application updates
- View their application timelines
- Provide application authorization
- View payments and receipts
- Update communication preferences
- Request account deletion or personal data export

Applicants must only access records belonging to them or explicitly shared with them.

## 5.3 Advisor

Authorized ISG staff member.

Capabilities:
- View assigned applicants
- Review eligibility assessments
- Request missing documents
- Update assigned application records
- Access internal scholarship research as permitted
- Recommend suitable opportunities
- Manage application tasks
- Record consultations
- Communicate with assigned applicants
- Update application progress
- Request applicant approval before submission

Advisors must not automatically have access to all applicants or all financial and administrative information.

## 5.4 Administrator

Authorized management user.

Capabilities:
- Manage staff accounts and permissions
- Manage applicant records
- Assign advisors
- Manage the private scholarship database
- Oversee applications and deadlines
- Manage services and prices
- Review and verify payments
- Configure communications
- View aggregate analytics
- Manage public website content
- Review system audit logs
- Configure platform settings

Sensitive administrative actions must be logged.

---

# 6. PUBLIC WEBSITE

Build a modern, premium, responsive public website.

## 6.1 Visual direction

The design should communicate:
- Professionalism
- Credibility
- International education
- Trust
- Accessibility
- Clarity
- Modern technology
- Human-centered guidance

Use:
- Clean typography
- Generous whitespace
- Structured sections
- Consistent card components
- Subtle animations
- Professional photography
- Clear conversion buttons
- Cohesive colors
- Strong mobile responsiveness

Avoid:
- Overcrowded sections
- Excessive gradients
- Unnecessary animations
- Generic or misleading claims
- Fake statistics
- Unverified university logos
- Confusing navigation
- Overly long registration forms

Support responsive layouts from mobile to desktop.

Accessibility should target WCAG 2.2 AA.

## 6.2 Public pages

### Homepage

Sections:
1. Navigation
2. Hero with primary call to action
3. Short introduction to ISG
4. How ISG helps students
5. How the process works
6. Study levels and funding pathways
7. Reasons to choose ISG
8. Verified success stories, if available
9. Frequently asked questions
10. Final call to action
11. Footer

Suggested headline:

**Your Ambitions Deserve a Global Opportunity.**

Suggested subheadline:

International scholarship guidance and personalized application support for ambitious students.

Primary CTA: **Check My Eligibility**

Secondary CTA: **Speak With an Advisor**

The homepage must explain the value of ISG's service without publishing its confidential scholarship shortlist.

### About ISG

Explain:
- Mission
- Vision
- Core values
- Who ISG serves
- Approach to student support
- Relevant, verifiable experience
- Actual team details when approved

### Our Services

Present:
- Eligibility assessment
- Scholarship advisory
- Academic profile review
- Application preparation
- Document guidance
- Personal statement guidance
- Consultation services
- Application tracking
- Follow-up assistance

Differentiate included services from optional paid services.

### How It Works

Show a clear sequence:

1. Submit eligibility assessment
2. Receive an initial review
3. Attend consultation, where applicable
4. Complete applicant profile
5. Receive a proposed application plan
6. Authorize selected applications
7. Prepare and submit applications
8. Track outcomes

### Study Pathways

Present general information about:
- Undergraduate studies
- Master's degrees
- Doctoral studies
- Research opportunities
- International education funding

Do not automatically publish a searchable index of every ISG-managed scholarship.

### Pricing

Provide transparent information about ISG's service fees.

Use admin-managed service packages.

Do not confuse ISG fees with scholarship provider or university fees.

### Contact

Provide:
- Contact form
- Official email
- Approved phone or WhatsApp contact
- Verified business contact information
- Consultation CTA

### FAQs

Cover:
- What ISG does
- Who is eligible
- Whether scholarships are guaranteed
- When documents are required
- How applications are handled
- Service fees
- Expected communication process
- Privacy and data protection

### Legal Pages

Include:
- Privacy policy
- Terms of service
- Cookie information and consent where required
- Refund and cancellation policy, where applicable
- Personal data request instructions
- Application authorization terms

Do not use generic legal templates without reviewing them for the actual business and applicable laws.

---

# 7. INITIAL ELIGIBILITY ASSESSMENT

Create a short, mobile-friendly eligibility form.

Guests can complete it without registering.

## Step 1 — Personal Information

Collect:
- First name
- Last name
- Email address
- Phone or WhatsApp number
- Nationality
- Country of residence

## Step 2 — Academic Background

Collect:
- Highest completed qualification
- Current education status
- Field of study
- Academic performance range
- Graduation year or anticipated graduation year
- English-language proficiency status

## Step 3 — Study Preferences

Collect:
- Desired study level
- Preferred academic fields
- Preferred destinations, optional
- Intended intake
- Funding preference
- Relevant general funding constraints

## Step 4 — Submission

Display:
- Clear privacy notice
- Required consent for assessment processing
- Optional, separate marketing consent
- Submission confirmation
- Next-step information

Store the assessment securely.

Do not collect a passport copy, detailed family information, official transcripts, or extensive financial documentation during this preliminary stage.

## Assessment workflow

After submission:
1. Validate and sanitize all fields.
2. Verify abuse-prevention token.
3. Store submission.
4. Assign a unique reference number.
5. Create a lead record.
6. Notify the authorized ISG team.
7. Send the applicant a confirmation email.
8. Display a submission success page.
9. Allow an advisor to review the lead.

Prevent duplicate processing from repeated submissions.

Do not claim that applicants are eligible for specific scholarships based on an unverified automated assessment.

---

# 8. APPLICANT REGISTRATION AND ONBOARDING

After initial screening, interested or qualified students can create an account.

Support a controlled invitation or registration flow.

When an assessment email matches a newly verified account, link the assessment safely using verified ownership rather than trusting an unverified email address.

## Registration

Support:
- Email/password sign-up
- Email verification
- Password reset
- Terms acceptance
- Privacy acknowledgment

Google OAuth can be added later.

## First login

Display a personalized onboarding checklist.

Example:
- Confirm personal details
- Complete academic profile
- Select study preferences
- Review service information
- Upload requested documents
- Schedule a consultation

Show a profile-completion indicator.

Never make optional sensitive details mandatory without a legitimate business reason.

---

# 9. APPLICANT DASHBOARD

Design a clean, mobile-responsive student dashboard.

## Dashboard overview

Show:
- Welcome message
- Applicant reference
- Profile completion status
- Assigned advisor, if any
- Current application status
- Upcoming tasks
- Missing documents
- Scheduled consultation
- Recent notifications

## My Profile

Editable sections:
- Personal information
- Contact details
- Academic background
- Academic history
- Relevant experience
- Study preferences
- Language proficiency
- Additional application-specific information

## My Documents

Features:
- Upload documents
- See document requirements
- See review status
- Replace outdated documents
- Track upload timestamps
- View accepted file types
- Download permitted documents
- Delete documents when policy and workflow allow

Possible review states:
- Requested
- Uploaded
- Under review
- Accepted
- Needs correction

Only request required documents at the appropriate workflow stage.

## My Applications

Show applications that have been proposed, authorized, or started.

Possible statuses:
- Proposed
- Awaiting applicant approval
- Preparing
- Ready for submission
- Submitted
- Awaiting decision
- Additional information required
- Accepted
- Rejected
- Withdrawn

Clearly distinguish ISG's internal processing status from an official provider decision.

For each application, display information the applicant is entitled to know, including the named opportunity and provider before approval or submission.

## Messages and Notifications

Display:
- Advisor messages
- Document requests
- Consultation updates
- Application progress
- Important reminders

Support in-app notifications.

## Consultations

Allow applicants to:
- Request an appointment
- View confirmed appointments
- See consultation details
- Request cancellation or rescheduling

## Billing

Display:
- Service packages
- Invoices
- Verified payments
- Receipts
- Outstanding balances

---

# 10. ADMINISTRATOR DASHBOARD

Create a separate protected administrative interface.

Navigation:

- Overview
- Leads
- Applicants
- Advisors
- Scholarship Research
- Matches
- Applications
- Documents
- Consultations
- Communications
- Payments
- Analytics
- Website Content
- Audit Logs
- Settings

## 10.1 Overview

Include:
- Total new leads
- Leads awaiting review
- Active applicants
- Pending document reviews
- Active applications
- Applications awaiting client approval
- Upcoming deadlines
- Upcoming consultations
- Verified payments
- Recent activities

Charts should use real database values.

Provide useful filters by date, advisor, status, and study level.

## 10.2 Lead Management

Each lead contains:
- Contact information
- Initial assessment
- Submission date
- Lead source
- Review status
- Advisor assignment
- Internal notes
- Follow-up date
- Conversion status

Lead stages:
- New
- Under review
- Qualified
- Requires more information
- Not currently eligible
- Converted
- Closed

Allow authorized staff to change stages and record reasons.

## 10.3 Applicant Management

Capabilities:
- Search and filter applicants
- View complete applicant profiles with permission checks
- Assign or reassign advisors
- View documents
- Track profile completion
- Review application history
- Record internal notes
- Manage account status
- View audit history

## 10.4 Advisor Management

Capabilities:
- Create staff invitations
- Assign permissions
- Allocate applicants
- Monitor workloads
- Review active applications
- Track overdue tasks
- Deactivate access safely

## 10.5 Private Scholarship Research

Create an internal scholarship management module.

Fields:
- Internal scholarship ID
- Scholarship name
- Provider
- Country
- Institution
- Academic levels
- Eligible nationalities
- Eligible fields
- Academic requirements
- Language requirements
- Funding details
- Application period
- Application deadline
- Official source URL
- Internal research notes
- Verification status
- Last verified date
- Responsible advisor
- Active/inactive status

This module must be inaccessible to public visitors.

Do not include the confidential database in public static assets or frontend API responses.

Maintain a history of relevant changes.

## 10.6 Applicant Matching

Allow advisors to:
- Search internal opportunities
- Evaluate applicant eligibility
- Record potential matches
- Assign match confidence or review status
- Create an application recommendation
- Document eligibility gaps
- Request supervisor review where necessary

Start with transparent rule-based filtering and human review.

Do not introduce AI-generated eligibility conclusions as authoritative decisions.

## 10.7 Application Management

Allow authorized staff to:
- Create an application record
- Assign applicant and advisor
- Attach a scholarship reference
- Track required documents
- Record deadlines
- Maintain preparation tasks
- Request applicant authorization
- Record submission information
- Upload proof of submission
- Track provider responses
- Record official decisions

Applications must not be marked officially submitted without an actual submission record or authorized confirmation.

## 10.8 Communication Center

Create a unified view of:
- Email notifications
- WhatsApp notifications
- In-app messages
- Communication templates
- Failed deliveries
- Scheduled reminders

Track channel, recipient, template, delivery state and relevant timestamps.

## 10.9 Financial Management

Capabilities:
- Configure service packages
- Generate invoices
- Record payments
- Verify manual payments
- Issue receipts
- Track outstanding invoices
- Record refunds
- Export financial reports

Financial permissions must be restricted.

## 10.10 Website Content Management

Allow authorized admins to manage:
- FAQs
- Services
- Pricing information
- Approved testimonials
- General study pathways
- Public announcements

Every public-content edit should follow appropriate publication permissions.

---

# 11. ADVISOR DASHBOARD

Advisors should have a focused workspace rather than full administrative access.

Features:
- My assigned applicants
- New assessment reviews
- Applicant profiles
- Document review queue
- Recommended scholarships
- My active applications
- Upcoming deadlines
- Consultation schedule
- Messages
- Follow-up tasks

Use clear task priorities.

Where appropriate, allow advisors to prepare updates but require a more privileged approval for sensitive actions.

---

# 12. DATABASE DESIGN

Develop a normalized PostgreSQL schema.

Core tables:

## Identity and access
- profiles
- user_roles
- staff_invitations
- account_status_history

## Applicant management
- student_profiles
- academic_records
- study_preferences
- eligibility_assessments
- leads
- advisor_assignments

## Confidential research
- scholarships
- scholarship_requirements
- student_matches
- scholarship_research_history

## Application operations
- applications
- application_tasks
- application_status_history
- application_authorizations
- application_submissions
- application_decisions

## Documents
- documents
- document_requirements
- document_review_history

## Communication
- notifications
- notification_deliveries
- messages
- message_templates
- communication_preferences

## Business operations
- consultations
- service_packages
- invoices
- payments
- refunds

## System and compliance
- consent_records
- audit_logs
- data_access_requests
- retention_events
- system_settings

Use UUID primary keys where appropriate.

Add:
- Unique constraints
- Foreign-key constraints
- Appropriate indexes
- Created/updated timestamps
- Ownership references
- Status validation
- Soft deletion only when justified
- Database transactions for multi-step changes

Store operational timestamps in UTC and format them using the relevant user's or office's time zone.

Provide SQL migrations and clearly documented RLS policies.

# 13. SECURITY AND PRIVACY

Treat the following as mandatory.

## Authentication and access

- Secure session management
- MFA for staff
- Server-side role checks
- RLS for applicant data
- Least-privilege access
- Separation of applicant and staff permissions
- No client-controlled role escalation

## File security

- Private storage buckets
- Server-side upload authorization
- File size and type restrictions
- Content-type verification
- Malware scanning before files become available to staff
- Secure generated file paths
- Short-lived signed download URLs
- Access logging
- Deletion and retention controls

## API security

- Server-side input validation
- Rate limiting
- CSRF protection where applicable
- Webhook signature verification
- Idempotency for external events
- Safe error messages
- Secrets kept server-side
- Protection against unauthorized record enumeration

## Privacy

- Data minimization
- Explicit collection purposes
- Appropriate consent and lawful processing basis
- Separated marketing preferences
- Account data access requests
- Deletion request workflow
- Data retention schedule
- Third-party provider disclosure
- Appropriate international transfer controls
- Special handling of minors' data where applicable

Assess compliance with relevant Tanzanian data-protection requirements and any other applicable jurisdictional rules before collecting production applicant data.

## Operational security

- Audit sensitive activities
- Redact sensitive information from error logs
- Do not place applicant data in public analytics events
- Secure environment configuration
- Separate development and production resources
- Database backups
- Tested restoration procedures
- Dependency security checks
- Security-focused integration tests

All private scholarship and applicant data must remain confidential even if someone guesses a URL, modifies a request, or inspects the frontend JavaScript.

---

# 14. NOTIFICATION SYSTEM

Build a reusable event-driven notification service.

Support:
- Email
- In-app notifications
- WhatsApp when configured

Examples of events:
- New eligibility assessment
- New applicant registration
- Advisor assignment
- Requested document
- Document reviewed
- Upcoming consultation
- Consultation changed
- Application approval required
- Application submitted
- Application status changed
- Deadline approaching
- Invoice created
- Payment verified

Requirements:
- Reusable templates
- Delivery tracking
- Retry controls
- Idempotent processing
- Admin delivery history
- Communication preference checks
- Secure message content
- Graceful handling of unavailable providers

Use background workers or scheduled jobs for non-immediate operations.

Do not block essential user actions waiting for optional notifications.

---

# 15. CONSULTATIONS AND SCHEDULING

Develop an appointment system.

Features:
- Admin-managed consultation types
- Advisor availability
- Appointment requests
- Confirmation workflows
- Rescheduling
- Cancellation
- Email reminders
- Appointment notes
- Optional meeting links
- Appointment history

Prevent double bookings and respect different time zones.

Future integration with external calendars should remain possible without rewriting the module.

---

# 16. PAYMENTS AND BILLING

Support configurable service pricing.

Requirements:
- Named services
- Clear price and currency
- Service descriptions
- Invoice generation
- Applicant billing history
- Manual payment verification
- Receipt generation
- Refund recording
- Admin financial overview

Payment statuses:
- Draft
- Pending
- Awaiting verification
- Paid
- Failed
- Refunded
- Cancelled

Only authorized administrators can confirm manually verified payments.

Do not store card details.

Do not invent or hardcode service fees: obtain and configure actual approved ISG pricing.

---

# 17. PUBLIC CONTENT AND BRANDING

Suggested brand identity:

**Brand:** International Scholarship Gateway  
**Short name:** ISG  
**Primary focus:** International education advisory and application management  
**Tone:** Professional, trustworthy, ambitious, accessible

Suggested headline:

**Your Ambitions Deserve a Global Opportunity.**

Suggested subheadline:

Personalized scholarship guidance and international application support.

Primary CTA:

**Check My Eligibility**

Secondary CTA:

**Speak With an Advisor**

Avoid:
- Unverifiable student success numbers
- Fabricated award values
- False institutional affiliations
- Misleading guarantees
- Fake testimonials
- Unnecessary scholarship name-dropping
- Stock images represented as actual beneficiaries

Use real evidence and approved materials.

Brand colors, logo, contact information, legal entity details, official addresses, and approved service fees must be provided or verified before publication.

---

# 18. UI/UX REQUIREMENTS

Create a consistent design system.

Important components:
- Navigation and footer
- Buttons
- Cards
- Status badges
- Forms
- Inputs and selects
- Progress indicators
- Tables
- Pagination
- Search and filtering
- Modals
- Confirmation dialogs
- Toast notifications
- Empty states
- Loading skeletons
- Document upload areas
- Timeline components
- Dashboard widgets
- Mobile navigation

UX standards:
- Mobile-first
- Keyboard accessible
- Semantic HTML
- Appropriate labels
- Strong color contrast
- Clear validation errors
- Responsive tables
- Consistent spacing
- Fast page loading
- Accessible confirmation dialogs
- Reduced-motion support

Support light mode initially.

Dark mode may be added later.

Use optimized images.

Pexels can supply appropriate marketing imagery, but select and store approved public assets rather than requiring repeated runtime calls for static visuals.

---

# 19. ANALYTICS AND BUSINESS REPORTING

Track useful operational metrics.

## Lead generation
- Website visits
- Eligibility assessment starts
- Assessment completions
- Lead source
- Qualified lead rate
- Registration conversion
- Consultation conversion

## Applicants
- Active applicants
- Profile completion
- Average document review time
- Advisor assignment workload
- Applicant retention

## Applications
- Applications prepared
- Applications submitted
- Applications awaiting decisions
- Official acceptance outcomes
- Scholarship funding outcomes
- Missed deadlines
- Average processing time

## Financial
- Verified revenue
- Outstanding invoices
- Payment completion
- Refunds
- Revenue by service category

Avoid publishing aggregate outcome claims until the underlying data is accurate and approved for public use.

---

# 20. SEARCH ENGINE OPTIMIZATION

Implement:
- Descriptive page titles
- Meta descriptions
- Semantic headings
- Canonical URLs
- Sitemap
- Robots configuration
- Open Graph metadata
- Structured data where accurate
- Appropriate image alt text

Public educational content can be indexed.

Private dashboards, scholarship research, applicant records, document URLs, and internal API responses must not be indexed or exposed publicly.

Search-engine indexing restrictions are not an access-control mechanism.

---

# 21. EXISTING WEBSITE MIGRATION

Existing website:

https://www.isgscholarship.com/

If replacing the current implementation:

1. Review the existing public content.
2. Identify legitimate content worth preserving.
3. Identify information that should become private.
4. Audit existing data-collection forms.
5. Preserve legitimate records only through authorized, secure migration.
6. Remove obsolete exposed scholarship datasets from public deployments.
7. Review search-engine indexing of retired public pages.
8. Preserve useful URLs using redirects.
9. Update public policy documents.
10. Confirm production functionality before launch.
11. Prepare a rollback procedure.

Do not automatically copy existing unverified claims, biographies, testimonials, images, or statistics.

Never change live domain DNS or delete the old production system without explicit approval.

---

# 22. PROJECT STRUCTURE

Use a modular structure similar to:

src/
- app/
  - (public)/
  - (auth)/
  - (applicant)/
  - (advisor)/
  - (admin)/
  - api/
- components/
  - ui/
  - forms/
  - layout/
  - dashboard/
- features/
  - assessments/
  - applicants/
  - scholarships/
  - applications/
  - documents/
  - consultations/
  - payments/
  - notifications/
- lib/
  - auth/
  - supabase/
  - security/
  - validation/
  - email/
  - whatsapp/
- server/
  - services/
  - repositories/
  - permissions/
- hooks/
- types/
- config/

supabase/
- migrations/
- seed/

tests/
- unit/
- integration/
- e2e/

Use the repository's existing conventions when they are sound.

Keep business logic out of presentation components.

Use separate services for external integrations.

---

# 23. TESTING REQUIREMENTS

Implement meaningful automated tests.

## Unit tests

Cover:
- Form validation
- Eligibility-rule helpers
- Application status transitions
- Payment state transitions
- Permission utilities
- Notification formatting

## Integration tests

Cover:
- Applicant creation
- Assessment submissions
- Advisor assignments
- Document permissions
- Scholarship access restrictions
- Application authorization
- Payment verification
- Webhook processing

## End-to-end tests

Cover:
- Guest eligibility assessment
- Student registration
- Applicant onboarding
- Secure document upload
- Advisor review
- Application creation
- Applicant authorization
- Application status update
- Admin financial workflow

Include adversarial access tests to verify that one applicant cannot read or modify another applicant's data.

Use Playwright for browser-level tests where appropriate.

# 24. DEVELOPMENT PHASES

Implement incrementally.

## Phase 1 — Foundation and Public Website

Deliver:
- Repository setup
- Next.js architecture
- Design system
- Public website
- Responsive navigation
- About, services and FAQ pages
- Privacy and terms pages
- Supabase integration
- Authentication foundation
- Guest eligibility form
- Lead storage
- Resend email confirmation
- Basic administrative lead dashboard

**Completion criterion:** A visitor can submit an assessment, receive confirmation, and an authorized administrator can securely review it.

## Phase 2 — Applicant Management

Deliver:
- Student onboarding
- Academic profiles
- Secure document uploads
- Applicant dashboard
- Advisor assignment
- Advisor dashboard
- Document review
- Consultation management

**Completion criterion:** An applicant can safely provide additional information, and an assigned advisor can manage the case without accessing unrelated applicant records.

## Phase 3 — Scholarship and Application Management

Deliver:
- Private scholarship database
- Scholarship requirements
- Applicant matching
- Application creation
- Application tasks
- Applicant approvals
- Submission tracking
- Status history
- Deadline reminders

**Completion criterion:** Advisors can prepare and manage authorized applications using confidential internal research, while applicants receive transparent updates.

## Phase 4 — Business Operations

Deliver:
- Configurable services and pricing
- Invoice generation
- Payment verification
- Receipts
- Communication center
- WhatsApp integration
- Automated reminders
- Management reporting

**Completion criterion:** Core operational processes can be managed through ISG without uncontrolled spreadsheets or informal messaging.

## Phase 5 — Optimization

Deliver:
- Advanced analytics
- Performance improvements
- Enhanced matching filters
- Expanded accessibility testing
- Operational monitoring
- Search engine optimization
- Public content management
- Additional integrations, where justified

Avoid introducing AI matching until reliable eligibility rules, verified opportunity data, human review, and appropriate privacy protections exist.

---

# 25. IMPORTANT BUSINESS RULES

1. Applicants cannot view ISG's complete scholarship database.
2. Advisors only access applicants and records their permissions authorize.
3. Administrators control private research records.
4. Applicants must receive required scholarship details before authorizing an actual application.
5. Application submission must comply with provider requirements.
6. ISG must not impersonate applicants or collect official portal passwords.
7. ISG cannot guarantee funding, university admission, or visa approval.
8. Applicants can only view their own private information.
9. Payment status changes must have an auditable source.
10. Application decisions must reflect actual provider communications.
11. Sensitive documents must never be publicly accessible.
12. Client consent and application authorization must be recorded.
13. No public production data should be fabricated.
14. Marketing consent must be separate from essential service communications.
15. The system must remain functional if WhatsApp or another optional external provider is unavailable.

---

# 26. DEPLOYMENT REQUIREMENTS

Prepare the application for Vercel and Supabase deployment.

Include:
- Environment variable examples
- Supabase migration instructions
- Authentication redirect configuration
- Resend domain configuration
- Secure webhook configuration
- Deployment procedures
- Monitoring configuration
- Backup procedures
- Production readiness checklist
- Rollback guidance
- Development and production environment separation

Use GitHub for version control.

Do not commit `.env` files, credentials, applicant documents, or other sensitive production data.

Provide a complete README.

# 27. PROVISIONAL DECISIONS

The following decisions are currently proposed and can be edited:

| Decision | Current preference |
|---|---|
| Frontend | Next.js + React + TypeScript |
| Backend | Next.js modular server architecture |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| File storage | Supabase Storage |
| Email | Resend |
| WhatsApp | Official Meta Cloud API |
| Images | Pexels and approved owned assets |
| UI library | shadcn/ui + Tailwind CSS |
| Deployment | Vercel |
| Applicant entry | Guest assessment before optional registration |
| Staff roles | Advisor and Administrator |
| Payment MVP | Verified manual payments |
| Language | English initially |
| Additional language | Kiswahili in a future phase |
| AI matching | Future feature, not required for MVP |
| Public scholarship listings | No complete public scholarship directory |
| Confidential research | Private database with server-side authorization |

# 28. EXPECTED CODEX WORKFLOW

When this prompt is provided to Codex:

**Step 1 — Repository assessment**

Inspect the project structure, dependencies, configurations, and existing implementation.

Report any critical issues.

**Step 2 — Architecture**

Create a concise technical architecture document.

Define:
- Main modules
- Database relationships
- Authentication model
- Authorization boundaries
- External integrations
- Development phases

**Step 3 — Implementation plan**

Break the work into manageable tasks with dependencies and acceptance criteria.

**Step 4 — Build Phase 1**

Implement the functional public website, eligibility intake, authentication foundation, and administrative lead management.

Do not build all phases as one giant untested change.

**Step 5 — Verify**

Run:
- Type checks
- Lint checks
- Relevant automated tests
- Build checks
- Security and permission tests

**Step 6 — Documentation**

Document:
- What was implemented
- Which migrations are required
- Which environment variables must be configured
- How to run locally
- What was tested
- What remains incomplete
- Known risks and limitations

**Step 7 — Continue**

Proceed through subsequent phases while maintaining working functionality and avoiding regressions.

For missing integration credentials, implement a secure configuration boundary and document the setup process. Never fabricate successful external integrations.

# 29. SUCCESS CRITERIA

The completed ISG platform should:

- Look professional and trustworthy.
- Work well on phones and desktops.
- Convert visitors into qualified applicants.
- Collect only information needed at each stage.
- Protect sensitive academic and identity documents.
- Keep ISG's research and internal workflows confidential.
- Give students a clear application journey.
- Support transparent application authorization.
- Help advisors work efficiently.
- Give administrators operational visibility.
- Support secure messaging and billing.
- Be maintainable by a small development team.
- Be deployable to production.
- Be designed for future expansion.

# 30. FINAL INSTRUCTION TO CODEX

Treat this document as the master product specification for the ISG platform.

Prioritize correctness, privacy, usability, security, and maintainability over unnecessary features.

Begin by inspecting the existing repository and developing the implementation plan, then proceed with **Phase 1**.

Use realistic production architecture, actual database relationships, properly enforced permissions, and functional end-to-end workflows.

Do not prematurely implement speculative features.

Do not reveal ISG's confidential scholarship research through public interfaces.

Do not sacrifice applicant transparency or personal-data protection to preserve business secrecy.

**The goal is to build a complete, professional scholarship advisory business platform, not just an attractive website.**