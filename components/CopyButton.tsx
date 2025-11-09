import React, { useState } from 'react';
import { ClipboardIcon, CheckIcon } from './icons';

interface CopyButtonProps {
    text: string;
    onCopy: (message: string) => void;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text, onCopy }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            onCopy('Đã sao chép vào clipboard!');
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 bg-brand-light-gray/50 text-gray-300 rounded-md hover:bg-brand-light-gray/80 transition-colors"
            aria-label="Copy to clipboard"
        >
            {copied ? <CheckIcon className="w-4 h-4 text-green-400" /> : <ClipboardIcon className="w-4 h-4" />}
        </button>
    );
};