
import React from 'react';
import { ChatMessage as Message, MessageSender } from '../types';
import BotIcon from './icons/BotIcon';
import UserIcon from './icons/UserIcon';

interface ChatMessageProps {
  message: Message;
}

// AI 응답의 마크다운을 렌더링하기 위한 파서 함수
const parseMarkdownToHtml = (markdown: string): string => {
    if (!markdown) return '';

    const lines = markdown.split('\n');
    const htmlParts: string[] = [];
    let listType: 'ul' | 'ol' | null = null;

    // 굵은 글씨와 같은 인라인 형식 форматирования
    const formatInline = (text: string) => {
        return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    };
    
    lines.forEach(line => {
        const trimmedLine = line.trim();
        const unorderedMatch = trimmedLine.match(/^([*-])\s+(.*)/);
        const orderedMatch = trimmedLine.match(/^(\d+\.|\d+\)|[a-zA-Z][.)])\s+(.*)/);

        if (unorderedMatch) {
            if (listType !== 'ul') {
                if (listType === 'ol') htmlParts.push('</ol>');
                htmlParts.push('<ul>');
                listType = 'ul';
            }
            htmlParts.push(`<li>${formatInline(unorderedMatch[2])}</li>`);
        } else if (orderedMatch) {
            if (listType !== 'ol') {
                if (listType === 'ul') htmlParts.push('</ul>');
                htmlParts.push('<ol>');
                listType = 'ol';
            }
            htmlParts.push(`<li>${formatInline(orderedMatch[2])}</li>`);
        } else {
            if (listType) {
                htmlParts.push(`</${listType}>`);
                listType = null;
            }
            if (trimmedLine.length > 0) {
                 htmlParts.push(`<p>${formatInline(line)}</p>`);
            }
        }
    });

    if (listType) {
        htmlParts.push(`</${listType}>`);
    }

    return htmlParts.join('');
};


const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  if (message.sender === MessageSender.SYSTEM) {
    return (
      <div className="text-center my-4">
        <p className="text-xs text-slate-500 italic bg-slate-700/50 px-3 py-1 rounded-full inline-block">
          {message.text}
        </p>
      </div>
    );
  }

  const isUser = message.sender === MessageSender.USER;

  return (
    <div className={`flex items-start gap-3 my-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
          <BotIcon className="w-5 h-5 text-sky-400" />
        </div>
      )}
      <div
        className={`max-w-xl p-3 px-4 rounded-2xl text-white ${isUser ? 'bg-sky-600 rounded-br-lg' : 'bg-slate-700 rounded-bl-lg'}`}
      >
        {isUser ? (
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>
        ) : (
            <div 
                className="markdown-content text-sm"
                dangerouslySetInnerHTML={{ __html: parseMarkdownToHtml(message.text) }} 
            />
        )}
      </div>
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600">
          <UserIcon className="w-5 h-5 text-slate-400" />
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
