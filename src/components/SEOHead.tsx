import React, { useEffect } from 'react';
import { Language } from '../types';

interface SEOHeadProps {
  title?: string;
  description?: string;
  image?: string;
  url?: string;
  tourData?: {
    name: string;
    description: string;
    price: number;
    image: string;
    rating?: number;
    duration?: string;
  };
  language?: Language;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title = 'Costa Rica Tours | Official Sustainable Ecotourism & Travel Platform',
  description = 'Explore and book verified sustainable tours, volcanoes, rainforests, and wildlife adventures in Costa Rica with instant confirmation.',
  image = 'https://images.unsplash.com/photo-1651261932254-fd342bc4d999?auto=format&fit=crop&w=1200&q=85',
  url = window.location.href,
  tourData,
  language = 'es'
}) => {
  useEffect(() => {
    // Update Title
    document.title = title;

    // Update Meta Description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);

    // Open Graph Tags
    const ogTags = [
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: image },
      { property: 'og:url', content: url },
      { property: 'og:type', content: tourData ? 'product' : 'website' },
      { property: 'twitter:card', content: 'summary_large_image' },
      { property: 'twitter:title', content: title },
      { property: 'twitter:description', content: description },
      { property: 'twitter:image', content: image },
    ];

    ogTags.forEach(tag => {
      let element = document.querySelector(`meta[property="${tag.property}"], meta[name="${tag.property}"]`);
      if (!element) {
        element = document.createElement('meta');
        if (tag.property.startsWith('twitter:')) {
          element.setAttribute('name', tag.property);
        } else {
          element.setAttribute('property', tag.property);
        }
        document.head.appendChild(element);
      }
      element.setAttribute('content', tag.content);
    });

    // JSON-LD Structured Data
    let scriptTag = document.querySelector('#json-ld-schema');
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = 'json-ld-schema';
      scriptTag.setAttribute('type', 'application/ld+json');
      document.head.appendChild(scriptTag);
    }

    const schema = tourData ? {
      "@context": "https://schema.org/",
      "@type": "TouristTrip",
      "name": tourData.name,
      "description": tourData.description,
      "image": tourData.image,
      "offers": {
        "@type": "Offer",
        "price": tourData.price,
        "priceCurrency": "USD",
        "availability": "https://schema.org/InStock"
      },
      "touristType": ["Adventure", "Ecotourism", "Nature"]
    } : {
      "@context": "https://schema.org",
      "@type": "TravelAgency",
      "name": "Costa Rica Tours 2026",
      "image": image,
      "description": description,
      "url": "https://costaricatours.com",
      "address": {
        "@type": "PostalAddress",
        "addressCountry": "CR",
        "addressLocality": "San José"
      },
      "priceRange": "$$"
    };

    scriptTag.textContent = JSON.stringify(schema);

  }, [title, description, image, url, tourData, language]);

  return null;
};
