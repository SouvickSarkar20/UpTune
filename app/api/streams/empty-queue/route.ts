//here we will delete all the streams from a particular queue 
//pop all elements from a queue

import { authOptions } from "@/app/lib/auth-options";
import { prismaClient } from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json(
            { message: 'User is not authenticated' },
            { status: 404 }
        )
    }

    const user = session.user;
    const data = await req.json();

    try {
        await prismaClient.stream.updateMany({
            where: {
                userId: user.id,
                played: false,
                spaceId: data.spaceId,
            },
            data: {
                played: true,
                playedTs: new Date(),
            }
        })

        return NextResponse.json({
            message: "Queue emptied successfully",
        });
    } catch (error) {
        console.error("Error emptying queue:", error);
        return NextResponse.json(
            {
                message: "Error while emptying the queue",
            },
            {
                status: 500,
            },
        );
    }

}