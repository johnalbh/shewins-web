# Testing the forms and their emails

The three forms (Letter, waitlist, contact) talk to MailerLite and MailerSend, and the real
"Newsletter" group has real subscribers. These checks never touch the real lists.

## Before you start

- **Test group.** `MAILERLITE_GROUP_TEST` holds the ID of the MailerLite group "Test". In
  `npm run dev` and on Vercel preview deployments, every signup goes to that group instead of
  Newsletter or Waitlist. Production ignores the variable, so a real visitor never lands in Test.
  The Letter and waitlist groups cannot be told apart in test mode; the endpoint code decides them.
- **Preview deployments** need `MAILERLITE_API_KEY` and `MAILERLITE_GROUP_TEST` in the Vercel
  *Preview* environment (and `MAILERSEND_API_KEY`, `FORM_FROM`, `FORM_TO` for notifications).
- **Addresses.** Use Gmail aliases: `you+sw-m1-1107@gmail.com`, `you+sw-m3-1107@gmail.com`… Each
  alias is a new MailerLite subscriber and all of them arrive in the same inbox.
- **Clean up** afterwards: MailerLite › Subscribers › filter by group Test › select all › Delete.
- Never run these against production with real addresses.

## 1. In the browser

Run each case on an English and a Spanish page (`/membership`, `/es/membership`, `/letter`,
`/es/letter`), at desktop and phone width.

| # | Do | Expect |
|---|----|--------|
| F1 | Letter: send with the email empty, then with `ana@` | Field marked invalid and focused, no dialog |
| F2 | Letter: valid email | Dialog opens and shows the email; the page language is preselected |
| F3 | Letter: send the dialog with the name empty | Name marked invalid, nothing sent |
| F4 | Letter: complete it | "Almost there" in the dialog; after closing, the form shows its thank-you |
| F5 | After F4, open other pages | The Letter invitation card never shows (localStorage `sw-letter` is `sub`) |
| F6 | Waitlist: open the dialog | Consent box **unticked**; Letter question with **no answer chosen** |
| F7 | Waitlist: send without the consent box, or without a Letter answer | That field marked invalid, nothing sent |
| F8 | Waitlist: consent, Letter "No, thanks" | Sent with `w-letter: "no"`; the invitation card still works on other pages |
| F9 | Waitlist: consent, Letter "Yes" | Sent with `w-letter: "yes"`; the invitation card stops, as in F5 |
| F10 | Contact (`/partners`): empty name, bad email, empty message | Each blocks the send |
| F11 | Any form with the network off (DevTools › Offline) | "Something went wrong…" shows, the button works again, a retry sends |
| F12 | Keyboard only: Tab through the dialog, Escape | Focus stays in the dialog; Escape closes it |

## 2. The endpoint (nothing is sent)

With `npm run dev` running (`B=http://localhost:4321`):

```bash
j='content-type: application/json'
curl -s -XPOST $B/api/form -H "origin: https://evil.example" -H "$j" -d '{}'          # 403
curl -s -XPOST $B/api/form -H "origin: $B" -H 'content-type: text/plain' -d '{}'       # 415
curl -s -XPOST $B/api/form -H "origin: $B" -H "$j" -d "{\"x\":\"$(head -c 17000 /dev/zero | tr '\0' a)\"}"  # 413
curl -s -XPOST $B/api/form -H "origin: $B" -H "$j" -d 'not json'                        # 400
curl -s -XPOST $B/api/form -H "origin: $B" -H "$j" -d '{"form":"waitlist","w-mail":"a@b.co","w-name":"A","w-lang":"en","w-ok":false}'  # 400 consent
curl -s -XPOST $B/api/form -H "origin: $B" -H "$j" -d '{"form":"letter","em-letter":"a@b","em-name":"A","em-lang":"en"}'               # 400 email
curl -s -XPOST $B/api/form -H "origin: $B" -H "$j" -d '{"form":"letter","em-letter":"a@b.co","em-name":"A","em-lang":"fr"}'            # 400 language
curl -s -XPOST $B/api/form -H "origin: $B" -H "$j" -d '{"form":"letter","em-website":"spam","em-letter":"a@b.co"}'                     # 200, nothing created (honeypot)
```

`w-letter` only counts when it is `"yes"` (or the JSON value `true`, from pages cached before the yes / no question); anything else is no.

## 3. MailerLite, with real emails (Test group)

| # | Do | Expect in MailerLite | Expect in the inbox |
|---|----|----------------------|---------------------|
| M1 | New Letter signup, emails in Spanish | Unconfirmed; name and `language: es` | One confirmation email |
| M2 | New waitlist signup, consent only, Spanish page | Unconfirmed; `stage` stored in English (e.g. "Changing career"); `opted_in_at` set | One confirmation email |
| M3 | New waitlist signup with the Letter box | Unconfirmed; in production: Waitlist **and** Newsletter | **One** confirmation email, not two |
| M4 | Open the confirmation link | Active; `opted_in_at` and `optin_ip` filled (proof of consent) | Thank-you page |
| M5 | M2's address again (still unconfirmed), another name | Name unchanged | The confirmation is sent again |
| M6 | M4's address again (active), another name | Name and status unchanged | Nothing |
| M7 | Set an address to unsubscribed, then sign up again | Stays unsubscribed | Nothing; the site shows "Something went wrong" (see open points) |
| M8 | Waitlist and contact with `MAILERSEND_API_KEY` set | — | Team email "[TEST] New waitlist form" with `letter: true/false`; replying goes to the sender |

## 4. Unsubscribing (must always work)

| # | Do | Expect |
|---|----|--------|
| U1 | Send a campaign to the Test group (Campaigns › Create › recipients: Test) | Footer has an unsubscribe link; Gmail shows "Unsubscribe" next to the sender |
| U2 | Click the footer link | Status becomes unsubscribed at once; no more campaigns |
| U3 | Use Gmail's "Unsubscribe" button instead | Same as U2 (one-click `List-Unsubscribe`) |
| U4 | After U2, sign up again on the site | Stays unsubscribed (M7) |

An unsubscribe in MailerLite covers the whole account: leaving the Letter also takes the person
off the waitlist. To let people leave one list only, add the preferences link to the footer of the
campaigns (see open points).

## 5. Reaching the inbox

| # | Check | Expect |
|---|-------|--------|
| D1 | Where each email lands in Gmail, Outlook.com/Hotmail and Yahoo | Inbox (Gmail: Primary or Updates), never Spam |
| D2 | Gmail › ⋮ › Show original | SPF PASS, DKIM PASS for `shewins.es`, DMARC PASS |
| D3 | Sign up `test-xxxx@srv1.mail-tester.com` (address from mail-tester.com) in test mode, confirm, check the score | 9/10 or more |
| D4 | `dig +short MX shewins.es` | The mailbox provider's MX records |
| D5 | `dig +short TXT _dmarc.shewins.es` | A `v=DMARC1` record |
| D6 | `dig +short TXT shewins.es` | One SPF record with `_spf.mlsend.com` |

Some networks answer port 53 themselves and keep old answers, so `dig` can show a record as missing
long after it is published. If `dig @192.0.2.1 example.com` answers, yours does: ask Google over
HTTPS instead, `curl -s 'https://dns.google/resolve?name=_dmarc.shewins.es&type=TXT'`.

## Results, 7 November 2026

Run locally against the real MailerLite account with Gmail aliases. The first three signups went to
the real groups before the Test group was wired in; they were deleted right after.

| Case | Result |
|------|--------|
| F6, F8, F9 (Chrome, 1280 and 390 px) | Pass |
| Endpoint validation, honeypot, `w-letter` as a string | Pass |
| M1–M3 | Pass. M3 put the address in Waitlist and Newsletter with a single email |
| M4 | Pass. Active, `optin_ip` and `opted_in_at` recorded |
| M5 | Pass. Name kept, confirmation sent again |
| M6 | Pass. Nothing changed, no email |
| M7 | MailerLite answers 422 "unsubscribed and cannot be imported"; the site shows a generic error |
| M8 | Pass once MailerSend was set up the same day: contact and waitlist notifications sent, "[TEST]" subject, Reply-To the sender; in Gmail: Inbox, SPF, DKIM (`ms1`) and DMARC pass, all for `shewins.es` |
| D1 | Pass for Gmail: every confirmation (9 that day) in Inbox, mostly Primary, marked important, within 2 seconds |
| D2 | SPF pass, DKIM pass signed by `shewins.es`. DMARC pass since the record was added the same day |
| D4, D5 | Failed in the morning (no MX, no DMARC). Fixed the same day: MX to Private Email, its DKIM (`privateemail._domainkey`) and `p=none` DMARC; a test email to `hola@` did not bounce |
| Vercel preview deployment (Preview variables, Test group) | Pass: Letter, waitlist with and without the Letter box, contact. Subscribers only in Test, one confirmation each in Gmail's Inbox, notifications sent with no errors in the logs |
| U1–U3, D3, Outlook, Yahoo | Not run yet |

## Open points

1. ~~No MX record~~. Done on 7 November: `mx1`/`mx2.privateemail.com`. Check that the mailboxes
   `hola@` and `agnieszka@` exist in Private Email.
2. ~~No DMARC record~~. Done on 7 November with `p=none`. Move to `p=quarantine` after a few weeks
   of clean reports in `hola@`, and only once MailerSend signs with DKIM for `shewins.es`.
3. **MailerSend in production.** The domain is verified (DKIM `ms1`/`ms2`, Return-Path `mta`) and
   the token works locally. Until `MAILERSEND_API_KEY` is in Vercel and production is redeployed,
   the contact form answers 503 there. The account is on a 14-day trial: switch it to the Free plan
   before it ends.
4. **Confirmation email.** One MailerLite template serves both lists. Its subject is
   "Confirmation email", it is in English only and it says "your interest in our newsletter" to
   waitlist signups too; the thank-you page is MailerLite's default. Edit it in MailerLite ›
   Settings › Subscribe settings (double opt-in for API): a bilingual subject and text that names
   SheWins and not one list, and a redirect to a page on shewins.es.
5. **Coming back after unsubscribing** (M7): today the person sees "Something went wrong". Either
   show a clear message ("this email unsubscribed earlier, write to us to come back"), or set the
   subscriber back to unconfirmed so MailerLite asks her to confirm again by email.
6. **Leaving one list only**: turn on the preferences link in the campaign footer so someone can
   stop the Letter and stay on the waitlist.
7. An address that is already active and joins the waitlist keeps its old fields (no `stage`), and
   the site still says "check your inbox" although no email comes. By design (fields are never
   overwritten), but worth knowing.
8. Old test records: `johnalbh@gmail.com` (unconfirmed, Newsletter and Waitlist) and
   `johnalbh@gmai.com` (typo, Waitlist). Delete them.
