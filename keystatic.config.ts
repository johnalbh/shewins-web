import { collection, config, fields, singleton } from '@keystatic/core';
import { wrapper } from '@keystatic/core/content-components';

// Local mode while developing (edits files on disk); Keystatic Cloud in production, so editors
// sign in with their email and every save becomes a commit that Vercel rebuilds.
const storage = import.meta.env.DEV ? ({ kind: 'local' } as const) : ({ kind: 'cloud' } as const);

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
  // Project key from keystatic.cloud (team "shewins/website" → slug shewins-website).
  cloud: { project: 'shewins-website/shewins-web' },
  ui: {
    brand: { name: 'She Wins' },
    navigation: { Content: ['posts'], Settings: ['authors', 'settings'] },
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
    authors: collection({
      label: 'Authors',
      slugField: 'name',
      path: 'src/content/authors/*',
      schema: {
        name: fields.slug({ name: { label: 'Name', validation: { isRequired: true } } }),
        roleEn: fields.text({ label: 'Role (English)', description: 'For example: Co-founder, She Wins' }),
        roleEs: fields.text({ label: 'Role (Spanish)', description: 'Por ejemplo: Cofundadora, She Wins' }),
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
