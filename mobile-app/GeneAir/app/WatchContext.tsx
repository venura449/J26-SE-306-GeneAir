import React, { createContext, useState, useEffect, useContext, ReactNode } from 'react';

export interface WatchPacket {
    version: number;
    sequence: number;
    heartRate: number;
    steps: number;
    lightLux: number;
    gyroX: number;
    gyroY: number;
    gyroZ: number;
    spo2: number;
    bodyTemp: number;
}

interface WatchContextType {
    watchData: WatchPacket | null;
    setWatchData: (data: WatchPacket | null) => void;
}

export const WatchContext = createContext<WatchContextType>({
    watchData: null,
    setWatchData: () => { },
});

export function WatchProvider({ children }: { children: ReactNode }) {
    const [watchData, setWatchData] = useState<WatchPacket | null>(null);

    return (
        <WatchContext.Provider value={{ watchData, setWatchData }}>
            {children}
        </WatchContext.Provider>
    );
}