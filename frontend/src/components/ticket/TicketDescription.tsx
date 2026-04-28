import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  content: string | null
}

export function TicketDescription({ content }: Props) {
  if (!content) {
    return <p className="text-sm italic text-[#acb3b8]">Sin descripción</p>
  }

  return (
    <div className="prose prose-sm max-w-none text-[#0c0e10]">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}
