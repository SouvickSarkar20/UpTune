"use client"

import { useSocket } from "@/context/socket-context"
import { useEffect, useState } from "react";
import jwt from "jsonwebtoken";

export default function Component({ params: { spaceId } }: { params: { spaceId: string } }) {
    const { socket, user, setUser, loading, connectionError } = useSocket();

    const [creatorId, setCreatorId] = useState<string | null>(null);
    const [loading1, setLoading1] = useState(true);

    useEffect(() => {
        const fetchCreatorId = async () => {
            try {
                const response = await fetch(`api/spaces/?.spaceId=${spaceId}`, {
                    method: "GET"
                })

                const data = await response.json();
                if (!response.ok || !data.success) {
                    throw new Error(data.message || "Error in fetching the creatorId");
                }
                setCreatorId(data.hostId);
            } catch (error: any) {
                throw new Error(error);
            } finally {
                setLoading1(false);
            }
        }
        fetchCreatorId();
    }, [spaceId]);

    useEffect(() => {
        if (user && spaceId && creatorId) {
            const token = user.token || jwt.sign(
                {
                    creatorId: creatorId,
                    userId: user?.id,
                },
                process.env.NEXT_PUBLIC_WSS_URL || "", {
                // expiresIn : "24h"
            }
            );

            socket?.send(
                JSON.stringify({
                    type: "join-room",
                    data: {
                        token,
                        spaceId,
                    }
                })
            );

            if (!user.token) {
                setUser({ ...user, token });
            }
        }
    }, [user, spaceId, creatorId, socket]);

    if (connectionError) {
        return <ErrorScreen>Cannot connect tp socket server</ErrorScreen>
    }

    if (loading) {
        return <LoadingScreen />
    }

    if (!user) {
        return <ErrorScren>Please Log in...</ErrorScren>
    }

    if (loading1) {
        return <LoadingScreen></LoadingScreen>
    }

    if (user.id != creatorId) {
        return <ErrorScreen>You are not the creator of this space</ErrorScreen>
    }

    return <StreamView creatorId={creatorId as string} playVideo={true} spaceId={spaceId} />;
}

export const dynamin = "auto";
