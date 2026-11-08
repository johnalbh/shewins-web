/* Vercel BotID: an invisible check that a form was sent from a real browser on this site, not by
   a script posting straight to the endpoint. initBotId wraps fetch: every POST to /api/form (sent
   by site.js) first solves a challenge in the background and carries the answer in its headers,
   and src/pages/api/form.ts verifies it with checkBotId(). Nothing is shown to the person, and
   the challenge script only loads when a form is sent, not on page view.
   Unlike the other scripts this one is a module, because the client comes from the botid
   package. It does nothing in `npm run dev`. */
import { initBotId } from 'botid/client/core';

initBotId({ protect: [{ path: '/api/form', method: 'POST' }] });
