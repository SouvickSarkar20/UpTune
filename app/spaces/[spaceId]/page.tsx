import { useSocket } from "@/context/socket-context";
import { log } from "console";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Jwt } from "jsonwebtoken";

export default function component({ params: { spaceId } }: { params: { spaceId: string } }) {
    const { socket, user, loading, setUser, connectionError } = useSocket();

    const [creatorId, setCreatorId] = useState<string>();
    const [loading1, setLoading1] = useState<boolean>(true);

    const router = useRouter();

    console.log(spaceId);

    useEffect(() => {
        async function fetchHosstId() {
            try {
                const response = await fetch(`/api/spaces/?spaceId=${spaceId}`, {
                    method: "GET"
                });
                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || "Failed to retreive the host Id of the space");
                }

                setCreatorId(data.hostId);

            } catch (error) {
                console.log(error);
            } finally {
                setLoading1(false);
            }
        }
        fetchHosstId();
    }, [spaceId]);


    useEffect(() => {
        if (user && creatorId && socket) {
            const token = user.token || jwt.sign(
                {
                    creatorId: creatorId,
                    userId: user?.id,
                },
                process.env.NEXTAUTH_SECRET || "",
                // {
                //     expiresIn  : "24h"
                // }
            );

            socket?.send(
                JSON.stringify({
                    type: "join-room",
                    data: {
                        token,
                        spaceId
                    }
                })
            )


            if (!user.token) {
                setUser({ ...user, token });
            }
        }
    }, [user, spaceId, creatorId, socket]);

    f(connectionError) {
        return <ErrorScreen>Cannot connect to socket server</ErrorScreen>;
    }

    if (loading) {
        return <LoadingScreen />;
    }

    if (!user) {
        return <ErrorScreen>Please Log in....</ErrorScreen>;
    }
    if (loading1) {
        return <LoadingScreen></LoadingScreen>
    }

    if (creatorId === user.id) {
        router.push(`/dashboard/${spaceId}`)
    }

    return <StreamView creatorId={creatorId as string} playVideo={false} spaceId={spaceId} />;

}

export const dynamic = "auto";