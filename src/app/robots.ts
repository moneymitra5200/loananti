import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin/',
        '/company/',
        '/agent/',
        '/staff/',
        '/cashier/',
        '/customer/',
        '/accountant/',
      ],
    },
    sitemap: 'https://moneymitrafinancialadvisor.com/sitemap.xml',
  };
}
