'use client';

import React from 'react';

interface CodeDiffProps {
    oldCode: string;
    newCode: string;
}

// Simple line-by-line diff component
const CodeDiff: React.FC<CodeDiffProps> = ({ oldCode, newCode }) => {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');

    // Simple diff algorithm - compare line by line
    const computeDiff = () => {
        const result: { type: 'same' | 'added' | 'removed'; content: string; lineNum?: number }[] = [];

        const maxLen = Math.max(oldLines.length, newLines.length);
        let oldIdx = 0;
        let newIdx = 0;

        while (oldIdx < oldLines.length || newIdx < newLines.length) {
            const oldLine = oldLines[oldIdx] ?? null;
            const newLine = newLines[newIdx] ?? null;

            if (oldLine === newLine) {
                // Lines are the same
                result.push({ type: 'same', content: oldLine || '', lineNum: newIdx + 1 });
                oldIdx++;
                newIdx++;
            } else if (oldLine !== null && !newLines.slice(newIdx).includes(oldLine)) {
                // Old line was removed
                result.push({ type: 'removed', content: oldLine });
                oldIdx++;
            } else if (newLine !== null && !oldLines.slice(oldIdx).includes(newLine)) {
                // New line was added
                result.push({ type: 'added', content: newLine, lineNum: newIdx + 1 });
                newIdx++;
            } else if (oldLine !== null) {
                // Line was removed
                result.push({ type: 'removed', content: oldLine });
                oldIdx++;
            } else if (newLine !== null) {
                // Line was added
                result.push({ type: 'added', content: newLine, lineNum: newIdx + 1 });
                newIdx++;
            }
        }

        return result;
    };

    const diffLines = computeDiff();

    // Count changes
    const addedCount = diffLines.filter(d => d.type === 'added').length;
    const removedCount = diffLines.filter(d => d.type === 'removed').length;

    if (!oldCode && !newCode) {
        return (
            <div className="h-full flex items-center justify-center bg-gray-900 rounded-lg text-gray-400">
                <p>No code changes to display</p>
            </div>
        );
    }

    if (!oldCode && newCode) {
        return (
            <div className="h-full flex flex-col bg-gray-900 rounded-lg overflow-hidden">
                <div className="p-3 border-b border-gray-700 flex items-center gap-4">
                    <span className="text-green-400 text-sm font-medium">+ {newLines.length} lines (new file)</span>
                </div>
                <div className="flex-1 overflow-auto p-4 font-mono text-sm">
                    {newLines.map((line, i) => (
                        <div key={i} className="flex bg-green-900/30 border-l-2 border-green-500">
                            <span className="w-12 text-right pr-3 text-green-600 select-none">{i + 1}</span>
                            <span className="text-green-300 pl-2">+ {line || ' '}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-gray-900 rounded-lg overflow-hidden">
            {/* Header with stats */}
            <div className="p-3 border-b border-gray-700 flex items-center gap-4">
                <span className="text-green-400 text-sm font-medium">+ {addedCount} added</span>
                <span className="text-red-400 text-sm font-medium">- {removedCount} removed</span>
            </div>

            {/* Diff content */}
            <div className="flex-1 overflow-auto p-2 font-mono text-sm">
                {diffLines.map((line, i) => (
                    <div
                        key={i}
                        className={`flex ${line.type === 'added'
                                ? 'bg-green-900/30 border-l-2 border-green-500'
                                : line.type === 'removed'
                                    ? 'bg-red-900/30 border-l-2 border-red-500'
                                    : 'border-l-2 border-transparent'
                            }`}
                    >
                        <span
                            className={`w-10 text-right pr-2 select-none ${line.type === 'added'
                                    ? 'text-green-600'
                                    : line.type === 'removed'
                                        ? 'text-red-600'
                                        : 'text-gray-600'
                                }`}
                        >
                            {line.lineNum || ' '}
                        </span>
                        <span
                            className={`pl-2 ${line.type === 'added'
                                    ? 'text-green-300'
                                    : line.type === 'removed'
                                        ? 'text-red-300'
                                        : 'text-gray-300'
                                }`}
                        >
                            {line.type === 'added' ? '+ ' : line.type === 'removed' ? '- ' : '  '}
                            {line.content || ' '}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default CodeDiff;
