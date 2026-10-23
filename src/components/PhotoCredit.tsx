import React from 'react';
import { photoCredit } from '../data/photoCatalog';

/** Atribución visible para fotos con licencia libre (Wikimedia Commons). No muestra nada si no aplica. */
export function PhotoCredit({ src, className = '', linked = true }: { src: string | undefined | null; className?: string; linked?: boolean }) {
  const credit = photoCredit(src);
  if (!credit) return null;
  // Dentro de botones/enlaces no se pueden anidar <a>: solo texto.
  if (!linked) return <p className={'text-[10px] leading-tight text-stone-300 ' + className} data-photo-credit>{credit.text}</p>;
  return (
    <p className={'text-[10px] leading-tight text-stone-400 ' + className} data-photo-credit>
      {credit.href ? (
        <a href={credit.href} target="_blank" rel="noopener noreferrer license" className="underline-offset-2 hover:underline">
          {credit.text}
        </a>
      ) : credit.text}
      {credit.licenseUrl ? (
        <>
          {' '}
          (<a href={credit.licenseUrl} target="_blank" rel="noopener noreferrer license" className="underline-offset-2 hover:underline">licencia</a>)
        </>
      ) : null}
    </p>
  );
}
