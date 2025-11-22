"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Destination } from "@/types/destination";

export type DrawerType = "account" | "chat" | "login" | "destination" | "poi" | null;

export interface DrawerState {
    activeDrawer: DrawerType;
    drawerProps: any;
    history: { type: DrawerType; props: any }[];
}

interface DrawerContextType {
    activeDrawer: DrawerType;
    drawerProps: any;
    openDrawer: (type: DrawerType, props?: any) => void;
    closeDrawer: () => void;
    goBack: () => void;
}

const DrawerContext = createContext<DrawerContextType | undefined>(undefined);

export function DrawerProvider({ children }: { children: ReactNode }) {
    const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);
    const [drawerProps, setDrawerProps] = useState<any>({});
    const [history, setHistory] = useState<{ type: DrawerType; props: any }[]>([]);

    const openDrawer = useCallback((type: DrawerType, props: any = {}) => {
        setActiveDrawer((prev) => {
            if (prev && prev !== type) {
                // Push current to history if switching drawers
                setHistory((prevHistory) => [...prevHistory, { type: prev, props: drawerProps }]);
            }
            return type;
        });
        setDrawerProps(props);
    }, [drawerProps]);

    const closeDrawer = useCallback(() => {
        setActiveDrawer(null);
        setDrawerProps({});
        setHistory([]);
    }, []);

    const goBack = useCallback(() => {
        setHistory((prevHistory) => {
            const newHistory = [...prevHistory];
            const last = newHistory.pop();
            if (last) {
                setActiveDrawer(last.type);
                setDrawerProps(last.props);
                return newHistory;
            } else {
                setActiveDrawer(null);
                setDrawerProps({});
                return [];
            }
        });
    }, []);

    return (
        <DrawerContext.Provider value={{ activeDrawer, drawerProps, openDrawer, closeDrawer, goBack }}>
            {children}
        </DrawerContext.Provider>
    );
}

export function useDrawer() {
    const context = useContext(DrawerContext);
    if (context === undefined) {
        throw new Error("useDrawer must be used within a DrawerProvider");
    }
    return context;
}
