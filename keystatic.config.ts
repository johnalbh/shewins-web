import { collection, config, fields, singleton } from '@keystatic/core';
import { wrapper } from '@keystatic/core/content-components';

// Local mode while developing (edits files on disk); Keystatic Cloud in production, so editors
// sign in with their email and every save becomes a commit that Vercel rebuilds.
const storage = import.meta.env.DEV ? ({ kind: 'local' } as const) : ({ kind: 'cloud' } as const);

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const time = (label: string, isRequired: boolean) =>
  fields.text({
    label,
    description: '24h format, for example 18:30',
    validation: { isRequired, pattern: { regex: /^$|^\d{1,2}:\d{2}$/, message: 'Use HH:MM, for example 18:30' } },
  });

// Blocks the article editor offers on top of normal text (they keep the brand styles).
const articleBlocks = {
  callout: wrapper({ label: 'Pink box', description: 'Highlighted box, for an invitation or a key idea', schema: {} }),
  checklist: wrapper({ label: 'Checklist', description: 'Put a bullet list inside: each item gets a red tick', schema: {} }),
  sources: wrapper({ label: 'Sources', description: 'Put a bullet list of links inside, shown at the end as "Sources"', schema: {} }),
};

const articleBody = (label: string) =>
  fields.markdoc({
    label,
    options: { image: false, table: false, codeBlock: false, code: false, heading: [2, 3] },
    components: articleBlocks,
  });

export default config({
  storage,
  cloud: { project: 'shewins/website' },
  ui: {
    brand: { name: 'SheWins' },
    navigation: { Content: ['posts', 'events'], Settings: ['authors', 'settings'] },
  },
  collections: {
    posts: collection({
      label: 'Blog articles',
      slugField: 'title',
      path: 'src/content/posts/*/',
      columns: ['title', 'publishedAt'],
      entryLayout: 'content',
      schema: {
        title: fields.slug({
          name: { label: 'Title (English)', validation: { isRequired: true } },
          slug: { label: 'Web address', description: 'Used in both languages: /blog/… and /es/blog/…. Do not change it once published.' },
        }),
        titleEs: fields.text({ label: 'Title (Spanish)', validation: { isRequired: true } }),
        excerptEn: fields.text({
          label: 'Summary (English)',
          description: 'One or two sentences, max 155 characters. Shown in the blog list and in Google.',
          multiline: true,
          validation: { isRequired: true, length: { max: 155 } },
        }),
        excerptEs: fields.text({
          label: 'Summary (Spanish)',
          description: 'Máx. 155 caracteres. Aparece en la lista del blog y en Google.',
          multiline: true,
          validation: { isRequired: true, length: { max: 155 } },
        }),
        author: fields.relationship({ label: 'Author', collection: 'authors', validation: { isRequired: true } }),
        publishedAt: fields.date({
          label: 'Publish date',
          description: 'Newest articles appear first.',
          defaultValue: { kind: 'today' },
          validation: { isRequired: true },
        }),
        bodyEn: articleBody('Article (English)'),
        bodyEs: articleBody('Article (Spanish)'),
      },
    }),
    events: collection({
      label: 'Events',
      slugField: 'title',
      path: 'src/content/events/*',
      columns: ['title', 'date'],
      schema: {
        title: fields.slug({
          name: { label: 'Title', description: 'As it appears on the poster. It is not translated.', validation: { isRequired: true } },
          slug: {
            label: 'File name',
            description: 'Internal only, not shown on the site.',
            generate: (name) => `${new Date().toISOString().slice(0, 10)}-${slugify(name)}`,
          },
        }),
        date: fields.date({ label: 'Date', validation: { isRequired: true } }),
        startTime: time('Start time', true),
        endTime: time('End time', false),
        language: fields.select({
          label: 'Language',
          options: [
            { label: 'Spanish (ESP)', value: 'es' },
            { label: 'English (ENG)', value: 'en' },
            { label: 'English + Spanish', value: 'both' },
          ],
          defaultValue: 'es',
        }),
        venue: fields.text({ label: 'Place', description: 'Name and address, for example: Niage Garage, Calle Ancha del Carmen 32', validation: { isRequired: true } }),
        host: fields.text({ label: 'Speaker or host', description: 'Leave empty for a community session.' }),
        hostRoleEn: fields.text({ label: 'Speaker role (English)', description: 'Optional, for example: Consultant & strategist' }),
        hostRoleEs: fields.text({ label: 'Speaker role (Spanish)', description: 'Opcional, por ejemplo: Consultora y estratega' }),
        topicEn: fields.text({ label: 'One line about the talk (English)', description: 'Optional. Shown in the "Next free event" box.' }),
        topicEs: fields.text({ label: 'One line about the talk (Spanish)', description: 'Opcional. Aparece en el recuadro "Próximo evento gratuito".' }),
        meetupUrl: fields.url({ label: 'Meetup link', description: 'If empty, the button goes to the SheWins Meetup page.' }),
        lumaUrl: fields.url({ label: 'Luma link', description: 'If empty, the button goes to the SheWins Luma page.' }),
        poster: fields.image({
          label: 'Poster',
          description: 'Portrait image (3:4). After the event it appears under "Past events".',
          directory: 'src/assets/events',
          publicPath: '/src/assets/events/',
        }),
        posterAlt: fields.text({ label: 'Poster description', description: 'Optional. What the poster shows, for people who cannot see it.' }),
        instagramUrl: fields.url({ label: 'Instagram post', description: 'Link of the post about this event. The poster links to it.' }),
      },
    }),
    authors: collection({
      label: 'Authors',
      slugField: 'name',
      path: 'src/content/authors/*',
      schema: {
        name: fields.slug({ name: { label: 'Name', validation: { isRequired: true } } }),
        roleEn: fields.text({ label: 'Role (English)', description: 'For example: Co-founder, SheWins' }),
        roleEs: fields.text({ label: 'Role (Spanish)', description: 'Por ejemplo: Cofundadora, SheWins' }),
        photo: fields.image({ label: 'Photo', directory: 'src/assets/team', publicPath: '/src/assets/team/' }),
      },
    }),
  },
  singletons: {
    settings: singleton({
      label: 'Contact and links',
      path: 'src/content/settings',
      schema: {
        email: fields.text({ label: 'Main email', validation: { isRequired: true } }),
        emailSecondary: fields.text({ label: 'Second email' }),
        instagram: fields.url({ label: 'Instagram', validation: { isRequired: true } }),
        linkedin: fields.url({ label: 'LinkedIn', validation: { isRequired: true } }),
        meetup: fields.url({ label: 'Meetup', validation: { isRequired: true } }),
        luma: fields.url({ label: 'Luma', validation: { isRequired: true } }),
      },
    }),
  },
});
