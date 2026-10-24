# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

**Primary: women in Málaga who want to move forward professionally.** Most are international women who have moved to Málaga: English is the community's common language and Spanish the second. Local women are part of the same community. Membership is defined by mindset, not by age, nationality or job title. The site names four situations:

- **Starting:** "I want to start a business."
- **Changing:** "I want to change my career or direction."
- **Growing:** "I already have a business. I want to scale it."
- **Connecting:** "I want to meet the right people and be part of Málaga's ecosystem."

Many arrive new to the city, not knowing anyone, and come to a first event alone.

**Second audience (a priority now): the organisations that fund, host and feed the community.**

- Sponsors and companies.
- Partners and institutions.
- Speakers, mentors and venues.
- Investors and founders.

**Site editors:** the founders, Agnieszka Fronia (Founder & Community Director) and Sophia Gruner (Co-founder · Learning & Development). They are non-technical and publish blog articles and events in English and Spanish through the Keystatic panel.

## Product Purpose

SheWins is a bilingual business community for women in Málaga, run by Asociación She Wins. The website explains the community and moves people along its ladder:

1. **Free event**, every month: the front door.
2. **Paid workshops**: practical learning on one specific challenge.
3. **Membership**, opening soon: the ongoing home.
4. **Academy**, coming next: deeper programmes for one change, such as changing career or starting a business.

**Priority for the next 6–12 months** (confirmed 2026-10-24):

- Win partners and sponsors.
- Grow the community base: subscribers to The SheWins Letter and followers.

Event attendance and the membership waitlist remain supporting goals.

**Success for members**, as the community states it: not "I went to a lot of events", but "I know my worth. I know how to price myself. I know what my next step is. I do not feel alone anymore."

## Positioning

- **A genuinely bilingual space where imperfection is welcome.** You can speak imperfect English or imperfect Spanish, ask the question and start again.
- **A bridge between what is usually apart:**
  - international women ↔ Málaga;
  - knowledge ↔ action;
  - talent ↔ opportunity;
  - belonging ↔ growth.
- **Community + education + action.** Members don't just meet people, they learn from them. Each month brings one thing learned, one useful connection and one concrete action.
- **Not for everyone, on purpose.** It is for women who want to learn, take action and contribute. Women who only want social events, or expect everything to be free, may suit another community better.

## Operating Context

- **Events:** an in-person event every month, free. Talks, workshops and open conversations, each in Spanish, English or both. Registration is on Meetup (`meetup.com/she_wins_malaga`) and Luma (`luma.com/user/SheWins`). Venues are partner coworking and innovation spaces in Málaga and Marbella. Event posters are shared on Instagram (`@shewins.es`).
- **Community channels:** The SheWins Letter ("One idea. One tool. One woman. One opportunity."), Instagram and LinkedIn.
- **Blog:** articles by the founders on confidence, perfectionism, self-talk, wellbeing, sleep and networking, each published in English and Spanish.
- **Website operations:**
  - Content is edited in Keystatic Cloud (project `shewins-website/shewins-web`). Each save is a commit to `johnalbh/shewins-web`, and Vercel rebuilds the site.
  - Hosting: Vercel project `agnieszka-fronias-projects/shewins-web`.
  - Domain: `www.shewins.es`.
  - The site rebuilds every night so past events move on.
  - Form delivery goes through Brevo (setup pending).

## Capabilities and Constraints

- **Languages:** every page exists in English (root URLs, the default) and Spanish (`/es/…`), with identical paths. There is no redirect by browser language, to protect indexing. The EN / ES button goes to the twin page.
- **Editable in the panel:**
  - blog articles (both languages in one entry);
  - events (date, times, language, venue, host, links, poster);
  - authors;
  - contact and social links.
- **Edited by the developer:** fixed page copy (home, about, membership, partners, legal).
- **Forms:**
  - membership waitlist;
  - partners and contact;
  - newsletter, with double opt-in.

  Consent and its timestamp are kept for the waitlist.
- **Legal:** Spanish GDPR / LSSI-CE. The cookie banner makes rejecting as easy as accepting. No analytics or marketing cookies run without consent, and none are installed today.
- **Open decisions:**
  - **Membership:** price, launch date and payment method are not decided. Keep "opening soon" and show no price. A members area with login and payments is planned for a later phase.
  - **Academy:** "coming next", with no details decided.
- **Missing data from the owners:**
  - the association's CIF and registry number;
  - the provider list for the privacy policy;
  - the links to the Instagram posts for past events;
  - the real publish dates of the eight migrated articles (provisional today).
- **Licensing:** the brand script font (Wonderful Branding, Din Studio) is listed as personal use only. The owners must confirm a commercial licence. The font file is never committed to the public repository.

## Brand Commitments

- **Name:** SheWins. Legal holder: Asociación She Wins, C/ Ancha del Carmen 32, 29002 Málaga (exact legal name to be confirmed from the statutes).
- **Tagline:** "Move forward. Together." / "Avanza. Juntas."
- **Design authority:** the brand book and the website design by Messin Virginia are the binding identity. Changes extend that work rather than replace it.
- **Voice, as written across the site:**
  - direct and warm;
  - short sentences, addressed to "you";
  - honest about what is and is not included;
  - practical outcomes over hype.
- **Assets:** logos (red, cream), founder photos, event posters and the social card, in `public/assets` and `src/assets`.

## Evidence on Hand

- **Community quotes**, published with first names only: Marta, Silvia, Sara, Anna and Mar (home page).
- **Partners:** Femtech Spain, Talentina, Inception Women's Lab.
- **Sponsor:** Memcyco.
- **Hosts:** Innovation Campus Málaga, Niage Garage, Workcafé Santander, Sharing Co·working.
- **Events:** the October 2026 programme (four events) and the posters of past events (`src/assets/events`).
- **Blog:** eight articles in English and Spanish (`src/content/posts`).
- **Absent, never to be invented:**
  - member or attendance numbers;
  - press;
  - case studies;
  - further testimonials;
  - membership pricing.

## Product Principles

1. **Belonging first, then growth.** A newcomer should feel she can walk in alone. Every page lowers the threshold to the next small step.
2. **Bilingual by default, English first.** Every text exists in both languages at equal quality. Imperfect language is welcome, and plain language is the norm.
3. **Practical over aspirational.** Each offer says what you can do differently afterwards, and states what is not included.
4. **An honest ladder.** Free is the front door. Never promise membership or Academy details that are not decided.
5. **Partners are co-builders.** Sponsors, institutions and venues are invited to build the community with it. The women's experience is never turned into a sales channel.

## Accessibility & Inclusion

- Content is read by many non-native speakers in both languages, so wording stays plain and concrete.
- **Baseline from the design handoff:**
  - keyboard navigation;
  - visible focus;
  - skip link;
  - checked colour contrast;
  - reduced motion respected.
- **Working target in audits so far:** WCAG 2.2 AA. Known gaps inherited from the design are the contrast of the inactive language button and the heading order in the footer.
