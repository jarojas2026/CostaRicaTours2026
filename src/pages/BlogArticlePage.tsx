import React from 'react';
import { PhotoCredit } from '../components/PhotoCredit';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, User, ExternalLink, MessageCircle } from 'lucide-react';
import type { Language } from '../types';
import { findBlogPost } from '../data/blogPosts';
import { directWhatsAppUrl } from '../utils/directWhatsApp';

interface BlogArticlePageProps {
  language: Language;
}

export const BlogArticlePage: React.FC<BlogArticlePageProps> = ({ language }) => {
  const { slug } = useParams<{ slug: string }>();
  const lang = language === 'es' ? 'es' : 'en';
  const post = findBlogPost(slug);

  if (!post) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-3xl font-black text-white">{lang === 'es' ? 'Artículo no encontrado' : 'Article not found'}</h1>
        <Link to="/blog" className="mt-6 inline-flex items-center gap-2 font-bold text-emerald-300 hover:text-amber-300">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {lang === 'es' ? 'Volver al blog' : 'Back to the blog'}
        </Link>
      </div>
    );
  }

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 sm:py-14 text-stone-200" aria-labelledby="blog-article-title">
      <Link to="/blog" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-emerald-300 hover:text-amber-300">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {lang === 'es' ? 'Volver al blog' : 'Back to the blog'}
      </Link>
      <img
        src={post.image}
        alt={post.imageAlt[lang]}
        className="h-64 w-full rounded-3xl object-cover sm:h-80"
        referrerPolicy="no-referrer"
      />
      <PhotoCredit src={post.image} className="mt-2 mb-8" />
      <header className="space-y-3">
        <h1 id="blog-article-title" className="text-3xl sm:text-4xl font-black tracking-tight text-white">{post.title[lang]}</h1>
        <div className="flex flex-wrap items-center gap-4 text-xs text-stone-400">
          <span className="inline-flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" aria-hidden="true" />{post.date[lang]}</span>
          <span className="inline-flex items-center gap-1.5"><User className="h-3.5 w-3.5" aria-hidden="true" />{post.author[lang]}</span>
        </div>
        <p className="text-lg leading-relaxed text-stone-300">{post.excerpt[lang]}</p>
      </header>

      <div className="mt-8 space-y-8">
        {post.sections.map(section => (
          <section key={section.heading.es} className="space-y-3">
            <h2 className="text-xl font-black text-white">{section.heading[lang]}</h2>
            {section.paragraphs[lang].map(paragraph => (
              <p key={paragraph} className="leading-7 text-stone-300">{paragraph}</p>
            ))}
          </section>
        ))}
      </div>

      <a
        href={directWhatsAppUrl(lang === 'es'
          ? `Hola, leí "${post.title.es}" y quiero ayuda para planificar.`
          : `Hi, I read "${post.title.en}" and would like help planning.`)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-10 inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 text-sm font-black text-stone-950 hover:bg-[#20bd5a]"
      >
        <MessageCircle className="h-4 w-4" aria-hidden="true" />
        {lang === 'es' ? 'Planificar por WhatsApp' : 'Plan on WhatsApp'}
      </a>

      <section className="mt-10 border-t border-emerald-500/20 pt-6">
        <h2 className="text-sm font-black uppercase tracking-widest text-emerald-400">{lang === 'es' ? 'Fuentes' : 'Sources'}</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {post.sources.map(source => (
            <li key={source.href}>
              <a href={source.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-emerald-300 underline underline-offset-2 hover:text-amber-300">
                {source.label}
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-xs text-stone-500">
          {lang === 'es'
            ? 'Horarios, tarifas y requisitos cambian: confírmalos en las fuentes oficiales antes de viajar.'
            : 'Hours, fees and requirements change: confirm them with official sources before you travel.'}
        </p>
      </section>
    </article>
  );
};

export default BlogArticlePage;
