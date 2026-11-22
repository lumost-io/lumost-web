// One place for the facts that appear in more than one spot on the page.
export const site = {
  url: 'https://lumost.id',
  name: 'Lumost',
  founder: { name: 'Moh. Sulton Hasanuddin', email: 'hasan@alimna.id' },
  whatsapp: { number: '6282232856363', display: '+62 822-3285-6363' },
  // Optional: a Formspree-style endpoint (POST JSON). Without it the form opens the visitor's mail app.
  formEndpoint: import.meta.env.PUBLIC_FORM_ENDPOINT as string | undefined,
} as const;

export const waLink = (text: string) => `https://wa.me/${site.whatsapp.number}?text=${encodeURIComponent(text)}`;
