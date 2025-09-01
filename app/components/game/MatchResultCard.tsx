'use client';

import React from 'react';
import Image from 'next/image';

type MatchResultCardProps = {
    match: {
        id: string;
        player_x?: string | null;
        player_o?: string | null;
        board: string;
        size: number;
        misere: boolean;
        blitz: 'off' | '7s' | '5s';
        winner?: string | null;
        created_at?: string;
    };
    playerId: string;
    opponentProfile?: { username?: string; pfpUrl?: string } | null;
    hostProfile?: { username?: string; displayName?: string; src?: string } | null;
};

export default function MatchResultCard({ match, playerId, opponentProfile, hostProfile }: MatchResultCardProps) {
    const boardArr: Array<string | null> = React.useMemo(() => {
        try { 
            return (match?.board ? JSON.parse(match.board) : Array(9).fill(null)) as Array<string | null>; 
        } catch { 
            return Array(9).fill(null); 
        }
    }, [match]);

    const myId = playerId.toLowerCase();
    const youAreX = match?.player_x?.toLowerCase() === myId;
    const youAreO = match?.player_o?.toLowerCase() === myId;
    const mySymbol: 'X' | 'O' | null = youAreX ? 'X' : youAreO ? 'O' : null;

    const getGameResult = () => {
        if (!match?.winner) return 'draw';
        if (match.winner === mySymbol) return 'win';
        return 'loss';
    };

    const getGameType = () => {
        let type = `${match.size}x${match.size}`;
        if (match.misere) type += ' Misère';
        if (match.blitz !== 'off') type += ` Blitz ${match.blitz}`;
        return type;
    };

    const getResultText = () => {
        const result = getGameResult();
        switch (result) {
            case 'win': return '🎉 Victory!';
            case 'loss': return '😔 Defeat';
            case 'draw': return '🎮 Draw';
            default: return 'Game Over';
        }
    };

    const getDate = () => {
        if (match.created_at) {
            return new Date(match.created_at).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
        return new Date().toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    const getPlayerName = (isX: boolean) => {
        if (isX && match.player_x) {
            if (match.player_x.toLowerCase() === myId) {
                return hostProfile?.username ? `@${hostProfile.username}` : 'You';
            }
            return opponentProfile?.username ? `@${opponentProfile.username}` : 'Opponent';
        }
        if (!isX && match.player_o) {
            if (match.player_o.toLowerCase() === myId) {
                return hostProfile?.username ? `@${hostProfile.username}` : 'You';
            }
            return opponentProfile?.username ? `@${opponentProfile.username}` : 'Opponent';
        }
        return 'Unknown';
    };

    const getPlayerAvatar = (isX: boolean) => {
        if (isX && match.player_x) {
            if (match.player_x.toLowerCase() === myId) {
                return hostProfile?.src || `https://api.dicebear.com/7.x/identicon/svg?seed=you`;
            }
            return opponentProfile?.pfpUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=opponent`;
        }
        if (!isX && match.player_o) {
            if (match.player_o.toLowerCase() === myId) {
                return hostProfile?.src || `https://api.dicebear.com/7.x/identicon/svg?seed=you`;
            }
            return opponentProfile?.pfpUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=opponent`;
        }
        return `https://api.dicebear.com/7.x/identicon/svg?seed=unknown`;
    };

    return (
        <div className="w-full max-w-sm mx-auto bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#70FF5A] to-[#b6f569] px-4 py-3">
                <div className="flex items-center justify-between text-black">
                    <div className="text-sm font-semibold">ZeroX Game Result</div>
                    <div className="text-xs opacity-80">{getDate()}</div>
                </div>
            </div>

            {/* Game Info */}
            <div className="px-4 py-3 border-b border-gray-100">
                <div className="text-center">
                    <div className="text-2xl font-bold text-gray-800 mb-1">
                        {getResultText()}
                    </div>
                    <div className="text-sm text-gray-600">
                        {getGameType()}
                    </div>
                </div>
            </div>

            {/* Players */}
            <div className="px-4 py-3 border-b border-gray-100">
                <div className="grid grid-cols-2 gap-4">
                    {/* Player X */}
                    <div className="text-center">
                        <div className="relative w-12 h-12 mx-auto mb-2">
                            <Image 
                                src={getPlayerAvatar(true)} 
                                alt="Player X" 
                                fill 
                                className="object-cover rounded-full ring-2 ring-black" 
                                sizes="48px"
                                unoptimized
                            />
                        </div>
                        <div className="text-xs font-medium text-gray-700 mb-1">
                            {getPlayerName(true)}
                        </div>
                        <div className="w-8 h-8 bg-black text-white text-lg font-bold rounded flex items-center justify-center mx-auto">
                            X
                        </div>
                    </div>

                    {/* Player O */}
                    <div className="text-center">
                        <div className="relative w-12 h-12 mx-auto mb-2">
                            <Image 
                                src={getPlayerAvatar(false)} 
                                alt="Player O" 
                                fill 
                                className="object-cover rounded-full ring-2 ring-[#70FF5A]" 
                                sizes="48px"
                                unoptimized
                            />
                        </div>
                        <div className="text-xs font-medium text-gray-700 mb-1">
                            {getPlayerName(false)}
                        </div>
                        <div className="w-8 h-8 bg-[#70FF5A] text-black text-lg font-bold rounded flex items-center justify-center mx-auto">
                            O
                        </div>
                    </div>
                </div>
            </div>

            {/* Final Board */}
            <div className="px-4 py-3">
                <div className="text-center mb-2">
                    <div className="text-xs text-gray-600 font-medium">Final Board</div>
                </div>
                <div className="grid grid-cols-3 gap-1 max-w-32 mx-auto">
                    {boardArr.map((cell, index) => (
                        <div 
                            key={index}
                            className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
                                cell === 'X' 
                                    ? 'bg-black text-white' 
                                    : cell === 'O' 
                                    ? 'bg-[#70FF5A] text-black' 
                                    : 'bg-gray-100'
                            }`}
                        >
                            {cell || ''}
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 text-center">
                <div className="text-xs text-gray-500">
                    Click to view full game details
                </div>
            </div>
        </div>
    );
}
