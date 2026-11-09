/* Site behaviour, ported from the inline script of the original pages (html/*.html) and split by
   concern. Each part is a self-contained IIFE that reads the page it is on; none imports another.
   Vite bundles them into one file, in this order.
   Removed in the port: the hash router left over from the one-page prototype (every page is a
   real URL now) and the name tag, which no page has any more. */
import './navigation.js';
import './field-language.js';
import './forms.js';
import './event-status.js';
import './sticky-cta.js';
import './field-arrow.js';
