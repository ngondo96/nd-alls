import React from 'react';

interface StepCardProps {
    step: number;
    title: string;
    children: React.ReactNode;
}

export const StepCard: React.FC<StepCardProps> = ({ step, title, children }) => {
    return (
        <div className="bg-brand-gray border border-brand-light-gray rounded-lg p-5 shadow-lg h-full flex flex-col">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <span className="bg-brand-orange text-white rounded-full h-8 w-8 flex items-center justify-center mr-3 font-mono">{step}</span>
                {title}
            </h2>
            <div className="flex-grow flex flex-col space-y-4">
                {children}
            </div>
        </div>
    );
};