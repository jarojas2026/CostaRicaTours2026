import ReactMarkdown from 'react-markdown';

/**
 * Markdown renderer for the customer-intake reply. Lives in its own module so
 * App.tsx can lazy-load react-markdown (and micromark/unified) on first reply
 * instead of shipping it in the index chunk.
 */
export default function IntakeReplyMarkdown({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        h2: ({ children }) => <h2 className="text-base font-black text-white mb-3">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-black text-emerald-200 mt-4 mb-1.5">{children}</h3>,
        p: ({ children }) => <p className="text-sm leading-relaxed text-stone-100 mb-2.5">{children}</p>,
        strong: ({ children }) => <strong className="font-black text-white">{children}</strong>,
        ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 text-sm text-stone-100 mb-3">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 text-sm text-stone-100 mb-3">{children}</ol>,
        a: ({ href, children }) => <a href={href} target="_blank" rel="noreferrer" className="text-emerald-300 underline underline-offset-2 break-all">{children}</a>
      }}
    >
      {children}
    </ReactMarkdown>
  );
}
