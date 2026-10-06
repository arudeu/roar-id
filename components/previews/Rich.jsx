// Renders Sitecore HTML. The `rich` class (globals.css) restores the basic
// typography Tailwind's reset removes: paragraphs, lists, links, headings.
export default function Rich({ html, className = "", as: Tag = "div" }) {
  if (!html) return null;
  return <Tag className={`rich ${className}`} dangerouslySetInnerHTML={{ __html: html }} />;
}

export const getSrc = (html) => html?.replace(/.*src="([^&]+)".*/, "$1");
