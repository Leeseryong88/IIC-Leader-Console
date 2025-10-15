
import React, { useEffect } from 'react';
import { SheetRow } from '../types';
import CloseIcon from './icons/CloseIcon';

interface CardModalProps {
  cardData: SheetRow;
  onClose: () => void;
}

const ModalSection: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className }) => {
    if (!children || (typeof children === 'string' && !children.trim())) return null;
    return (
        <div className={className}>
            <p className="text-sm font-semibold text-slate-400 mb-1">{title}</p>
            <div className="text-base text-slate-200 whitespace-pre-wrap">{children}</div>
        </div>
    );
};


const CardModal: React.FC<CardModalProps> = ({ cardData, onClose }) => {
  const hasBusinessTrip = !!(cardData['출장(시작일)'] || cardData['출장내용']);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 w-full max-w-2xl rounded-xl border border-slate-700 shadow-2xl flex flex-col animate-slide-up max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-5 flex justify-between items-center border-b border-slate-800 flex-shrink-0">
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-wider">작성자</p>
            <h2 className="text-xl font-bold text-sky-400">{cardData['작성자']}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-700 transition-colors">
            <CloseIcon className="w-6 h-6" />
          </button>
        </header>
        <div className="p-6 space-y-5 overflow-y-auto">
            
            <ModalSection title="기간">
                {cardData['시작일'] && cardData['종료일'] ? `${cardData['시작일']} ~ ${cardData['종료일']}` : null}
            </ModalSection>
            
            <ModalSection title="주요 일정">
                {cardData['주요일정']}
            </ModalSection>

            <ModalSection title="진행중인 핵심과제">
                {cardData['핵심과제(진행경과)']}
            </ModalSection>

            <ModalSection title="예정된 핵심과제">
                {cardData['핵심과제(예정)']}
            </ModalSection>
            
            {cardData['이슈'] && (
                <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
                    <p className="text-sm font-semibold text-amber-400 mb-1">주요 이슈</p>
                    <p className="text-base text-amber-300 whitespace-pre-wrap">{cardData['이슈']}</p>
                </div>
            )}
            
            {hasBusinessTrip && (
                <div className="p-4 bg-sky-500/10 rounded-lg border border-sky-500/20">
                    <p className="text-sm font-semibold text-sky-400 mb-1">출장 정보</p>
                    <p className="text-base text-sky-300 whitespace-pre-wrap">
                    {cardData['출장(시작일)']} ~ {cardData['출장(종료일)']}: {cardData['출장내용']}
                    </p>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};

export default CardModal;
