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
    hrHistory: number[];
    setHrHistory: React.Dispatch<React.SetStateAction<number[]>>;
    spo2History: number[];
    setSpo2History: React.Dispatch<React.SetStateAction<number[]>>;
    tempHistory: number[];
    setTempHistory: React.Dispatch<React.SetStateAction<number[]>>;
}

export const WatchContext = createContext<WatchContextType>({
    watchData: null,
    setWatchData: () => { },
    hrHistory: [],
    setHrHistory: () => { },
    spo2History: [],
    setSpo2History: () => { },
    tempHistory: [],
    setTempHistory: () => { },
});

export function WatchProvider({ children }: { children: ReactNode }) {
    const [watchData, setWatchData] = useState<WatchPacket | null>(null);
    const [hrHistory, setHrHistory] = useState<number[]>([0, 0, 0, 0, 0, 0]);
    const [spo2History, setSpo2History] = useState<number[]>([95, 95, 95, 95, 95, 95]);
    const [tempHistory, setTempHistory] = useState<number[]>([36.5, 36.5, 36.5, 36.5, 36.5, 36.5]);

    return (
        <WatchContext.Provider value={{
            watchData,
            setWatchData,
            hrHistory,
            setHrHistory,
            spo2History,
            setSpo2History,
            tempHistory,
            setTempHistory
        }}>
            {children}
        </WatchContext.Provider>
    );
}