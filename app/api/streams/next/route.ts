import { authOptions } from "@/app/lib/auth-options";
import { prismaClient } from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { promise } from "zod";


export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json(
            { message: "Unauthenticated user" },
            { status: 404 }
        )
    }

    const user = session.user;
    const spaceId = req.nextUrl.searchParams.get("spaceId");

    try {
        const mostUpvotedStream = await prismaClient.stream.findFirst({
            where: {
                userId: user.id,
                played: false,
                spaceId: spaceId,
            },
            orderBy: {
                upvotes: {
                    _count: "desc"
                }
            }
        })
        //above i got the stream wwhich belongs to this user and in a specific space id 
        //i will take the stream that is unplayed till now and is the most upvoted one 

        await Promise.all([
            prismaClient.currentStream.upsert({
                where: {
                    spaceId: spaceId as string
                    //find the space in which this streams belong 
                },
                update: {
                    userId: user.id,
                    streamId: mostUpvotedStream?.id,
                    spaceId: spaceId,
                    //if i get it then i update the current stream to the most upvoted stream
                },
                create: {
                    userId: user.id,
                    streamId: mostUpvotedStream?.id,
                    spaceId: spaceId,
                    //if not present with this space id then create it 
                }
            }),
            prismaClient.stream.update({
                where: {
                    id: mostUpvotedStream?.id,
                },
                data: {
                    played: true,
                    playedTs: new Date()
                }
            })
        ])

        return NextResponse.json(
            { message: "Next stream fetched successfully", stream: mostUpvotedStream },
            { status: 200 }
        )
    }
    catch (error) {
        return NextResponse.json(
            { message: "Error in fetching the next stream", Error: error },
            { status: 404 }
        )
    }
}
