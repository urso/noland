import ReactMarkdown from "react-markdown";

interface ReferenceContentsProps {
  content: string;
}

export default function ReferenceContents({ content }: ReferenceContentsProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8 overflow-auto max-h-[800px]">
      <article className="prose prose-slate md:prose-lg max-w-none 
        prose-headings:font-semibold prose-headings:text-gray-800 
        prose-h1:text-3xl prose-h1:border-b prose-h1:pb-4 prose-h1:border-gray-200
        prose-h2:text-2xl prose-h2:mt-10 prose-h2:mb-4
        prose-h3:text-xl prose-h3:mt-8 prose-h3:mb-3
        prose-p:text-gray-600 prose-p:leading-relaxed prose-p:my-4
        prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline 
        prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-700
        prose-ul:my-6 prose-li:my-2
        prose-code:bg-gray-100 prose-code:text-gray-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
        prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:p-4 prose-pre:rounded-md
        prose-img:rounded-md prose-img:mx-auto">
        <ReactMarkdown>{content}</ReactMarkdown>
      </article>
    </div>
  );
}
