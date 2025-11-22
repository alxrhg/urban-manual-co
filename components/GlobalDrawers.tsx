"use client";

import React from "react";
import { useDrawer } from "@/contexts/DrawerContext";
import { AccountDrawer } from "@/components/AccountDrawer";
import { ChatDrawer } from "@/components/ChatDrawer";
import { LoginDrawer } from "@/components/LoginDrawer";
import { DestinationDrawer } from "@/components/DestinationDrawer";
import { POIDrawer } from "@/components/POIDrawer";

export function GlobalDrawers() {
    const { activeDrawer, drawerProps, closeDrawer, openDrawer } = useDrawer();

    // Helper to handle sub-drawer navigation from AccountDrawer
    const handleOpenChat = () => {
        openDrawer("chat");
    };

    return (
        <>
            <AccountDrawer
                isOpen={activeDrawer === "account"}
                onClose={closeDrawer}
                onOpenChat={handleOpenChat}
                initialSubpage={drawerProps?.initialSubpage}
            />

            <ChatDrawer
                isOpen={activeDrawer === "chat"}
                onClose={closeDrawer}
            />

            <LoginDrawer
                isOpen={activeDrawer === "login"}
                onClose={closeDrawer}
            />

            <DestinationDrawer
                isOpen={activeDrawer === "destination"}
                onClose={closeDrawer}
                destination={drawerProps?.destination || null}
                onSaveToggle={drawerProps?.onSaveToggle}
                onVisitToggle={drawerProps?.onVisitToggle}
            />

            <POIDrawer
                isOpen={activeDrawer === "poi"}
                onClose={closeDrawer}
                destination={drawerProps?.destination || null}
                onSave={drawerProps?.onSave}
            />
        </>
    );
}
