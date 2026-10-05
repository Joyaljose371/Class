# ClassPilot PWA — Firebase setup

This build is offline-first and installable.

## One-time Firebase setup
1. In Firebase Console for project `classr-29e5f`, create a **Cloud Firestore** database.
2. In **Authentication → Sign-in method**, enable **Email/Password**.
3. Install Firebase CLI on your computer: `npm install -g firebase-tools`
4. From this folder run:
   - `firebase login`
   - `firebase deploy`
5. Open the HTTPS Hosting URL Firebase gives you.
6. In ClassPilot → Settings → Cloud Sync, create/sign in to your private account.
7. On Android/Chrome or supported desktop browsers use **Install App** / **Add to Home screen**.

## How data works
- Every edit is written to local browser storage immediately.
- If offline, the app keeps working and marks cloud sync as pending.
- When internet returns, it automatically syncs to your private Firebase user path.
- Firestore browser persistence is also enabled when supported.
- Each changed cloud state creates a restore-point version; the newest 30 are retained.
- Manual restore points can be created from Settings.

## Security
The included Firestore rules only allow an authenticated user to read/write their own `/users/{uid}/...` data. Do not replace these with public `allow read, write: if true` rules.

## Birthdays
Student DOBs are stored in Student Details. On every app open, birthdays occurring today or tomorrow appear as reminders. Birthday messages are copy/share ready.


## Firestore nested-array fix (v8.1)
ClassPilot stores practical groups locally as arrays of student-name arrays. Firestore does not accept arrays directly nested inside arrays. This build automatically converts groups to Firestore-safe objects during cloud upload and converts them back after download. No manual data migration is needed.


## Student View Portal (v9)
A read-only student page is available at `/student.html?t=UNIQUE_TOKEN`.

Admin → Settings → Student View Portal lets you:
- Publish/update all active student portals.
- Copy each student's individual link.
- Regenerate a link if it was shared accidentally.

Published data contains only:
- Student name and optional register number
- Weekly timetable
- Upcoming whole-class deadlines
- Important notices
- That student's subject-wise attendance totals and percentages

It does NOT publish DOB, phone, admission number, private notes, other students, raw attendance, admin controls, groups, backups, or Firebase account details.

Deploy after updating:
`firebase deploy --only firestore:rules,hosting`


### v9.1 Student portal network fix
The read-only student page now refreshes its published Firestore document every 10 seconds and when the tab regains focus, instead of using a persistent Firestore `onSnapshot()` WebChannel listener. This avoids `Listen/channel ... 400` errors seen in some localhost/Live Server and mobile environments.


### v9.2 Single shared student link
All students now use the same `/student.html` URL.

First visit:
1. Student opens the shared link.
2. Chooses their name from an alphabetical searchable list.
3. That selection is stored in browser `localStorage`.
4. Future visits automatically open that student's content.

A **Change student** button clears the saved selection.

Admin → Settings → Student View Portal now provides:
- Publish / Update All
- Copy Shared Link

Privacy note: because this is a shared public name-picker, anyone with the link can choose another listed student's name. Only sanitized read-only data is published. If stronger privacy is required, add per-student PIN verification.


## v10 — ClassSpace
The shared student portal now includes a collaborative ClassSpace.

Student features:
- Polls and live vote percentages
- Ask the Class + answers
- Anonymous/non-anonymous suggestions
- Study/resource sharing
- RSVP posts
- Same shared student identity saved locally

Admin features:
- New ClassSpace page in ClassPilot admin
- Joyal can post official announcements, polls, questions, resources and RSVPs
- Admin-created posts are visually highlighted as `★ Joyal · Admin`
- Admin can delete/moderate feed posts

Security:
- Student interaction requires Firebase Anonymous Authentication.
- Enable Firebase Console → Authentication → Sign-in method → Anonymous.
- Anonymous users can create normal student posts, vote and answer.
- Only the authenticated ClassPilot admin account can create `isAdmin: true` content or delete/moderate posts.
- `studentPortalDirectory/current.ownerUid` identifies the ClassPilot admin UID for Firestore Rules.

Deploy:
`firebase deploy --only firestore:rules,hosting`


## v10.1 — ClassSpace tab/cache fix
- Reasserts ClassSpace in both admin and student navigation.
- Student navigation is explicitly:
  Home · Timetable · Attendance · ClassSpace · Deadlines
- Service worker now uses network-first behavior for HTML/navigation requests.
- This prevents old cached `index.html` or `student.html` pages from hiding newly deployed UI.
- Student header shows `v10.1` so deployment can be verified visually.

After deployment, if an old installed PWA is still open, close it completely and reopen it once.


## v10.2 — ClassSpace permission fix
Student ClassSpace writes no longer evaluate the admin-owner lookup.

Rules now permit:
- Student post: signed-in anonymous user + `ownerUid == request.auth.uid` + `isAdmin == false`
- Student answer: same conditions
- Vote: user may create/update only their own UID vote document
- Admin-highlighted content: requires the authenticated ClassPilot owner and `authorName == "Joyal"`
- Delete/moderation: ClassPilot owner only (except students may delete their own answers)

IMPORTANT: deploy the updated Firestore rules, not only Hosting:
`firebase deploy --only firestore:rules,hosting`


## v10.3 — ClassSpace on Student Dashboard
The latest ClassSpace activity now appears directly on every student's Home dashboard.

Dashboard behavior:
- Shows the 6 newest ClassSpace posts.
- Includes polls, RSVP posts, questions, suggestions, resources and admin announcements.
- Polls/RSVPs are interactive directly from Home.
- Questions can open the answer view directly from Home.
- Resources can be opened from Home.
- `★ Joyal · Admin` content keeps the gold highlighted treatment.
- Full ClassSpace remains available as its own tab.
- Home and ClassSpace feeds refresh approximately every 12 seconds while visible.


## v10.4 — Poll identities, private question replies, tailored composers
- Polls and RSVPs now display exact vote counts and voter names to classmates.
- Every voter can choose **Hide my name from classmates when I vote**.
- Anonymous public votes display as `Anonymous`; Joyal/Admin still sees the real voter.
- Real voter identity is stored separately in protected `voteIdentities` documents readable only by the ClassPilot admin.
- Question replies now support:
  - Whole class
  - Joyal · Admin only
- Private question replies are stored under protected `adminAnswers` and appear in the admin ClassSpace reply viewer.
- Student ClassSpace composer now changes instructions, labels, placeholders and fields according to Poll, Question, Suggestion, Study Resource or RSVP.
- ClassSpace Live now appears above Attendance on the student Home dashboard.

Deploy both Hosting and Firestore rules:
`firebase deploy --only firestore:rules,hosting`


## v10.5 — Separate votes per selected student
Voting is now keyed by the selected student's `studentPortal` ID rather than the browser's anonymous Firebase UID.

Result:
- Multiple students using the same phone/browser can vote separately.
- Each selected student still has only one vote per poll/RSVP.
- Voting again as the same student changes that student's existing vote.
- Switching student and voting creates/updates that different student's vote.
- Anonymous-to-class behavior is unchanged.
- Joyal/Admin still sees the real student identity.

Deploy updated Hosting + Firestore rules:
`firebase deploy --only firestore:rules,hosting`


## v10.6 — Student access codes + Firebase auth diagnostics

### Student identity protection
- One shared `/student.html` link remains.
- Student selects their name.
- Student must enter a 4-digit code generated by the admin.
- Admin codes are managed in ClassPilot → Settings → Student View Portal.
- Codes are stored in protected `studentPortalSecrets` documents and are never included in the public student directory.
- A successful verification creates a Firebase `studentSessions/{anonymousUid}` document.
- Firestore permits that browser/session to read only the verified student's portal.
- The browser remembers the selection after successful verification.
- **Change student** clears the saved verification and requires the next selected student's code.

### Other-browser ClassSpace error
The previous generic “Class interaction is not enabled yet” message now shows the real Firebase Authentication cause:
- `auth/operation-not-allowed` → enable Anonymous sign-in.
- `auth/unauthorized-domain` → add the hostname under Firebase Authentication → Settings → Authorized domains.
- `auth/network-request-failed` → network/privacy/extension issue.

For local VS Code Live Server, if you use `127.0.0.1`, add `127.0.0.1` to Authorized domains if Firebase reports `auth/unauthorized-domain`. `localhost` may already be present.

Deploy both Firestore rules and Hosting:
`firebase deploy --only firestore:rules,hosting`


## v10.7 — ClassSpace DOM binding fix
Fixed `ReferenceError: csType is not defined` and similar browser-dependent issues.

Cause:
Older code relied on browsers automatically exposing DOM element IDs such as `csType` as global JavaScript variables. That behavior is inconsistent across browsers.

Fix:
All ClassSpace and student-verification elements are now explicitly bound using `document.getElementById(...)`.

Deploy Hosting after replacing the files:
`firebase deploy --only hosting`

Firestore rules do not need to change for this specific fix.


## v10.8 — Restore missing ClassSpace composer markup
Fixed:
`ClassSpace composer elements are missing from student.html`

Cause:
The JavaScript bindings existed, but the actual ClassSpace composer and answer-modal HTML had been removed during an earlier student login/verification layout update.

Restored:
- Poll composer
- Ask the Class composer
- Suggestion composer
- Study/resource composer
- RSVP composer
- Question answer modal
- Whole class / Joyal-only answer selector

This is a Hosting-only UI fix:
`firebase deploy --only hosting`
