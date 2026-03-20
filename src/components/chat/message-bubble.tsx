import type { UIMessage } from 'ai';

export function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === 'user';

  // Extract text content from message parts
  const textContent = message.parts
    .filter(
      (part): part is Extract<typeof part, { type: 'text' }> =>
        part.type === 'text',
    )
    .map((part) => part.text)
    .join('');

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {textContent || '\u00A0'}
        </p>
      </div>
    </div>
  );
}
