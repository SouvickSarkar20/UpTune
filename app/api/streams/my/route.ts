//we will return all the streams that are added by a particular user 
//each stream will show the no of upvotes that it got 
//Also if that stream is upvoted by the user itself or not 


import { authOptions } from "@/app/lib/auth-options";
import { prismaClient } from "@/app/lib/db";
import { NextApiRequest } from "next";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { use } from "react";

export async function GET(req: NextApiRequest) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json(
            { message: "Unauthenticated user" },
            { status: 404 }
        )
    }

    const user = session.user;

    try {
        const streams = await prismaClient.stream.findMany({
            where: { userId: user.id },
            include: {
                _count: {
                    select: { upvotes: true }
                },
                upvotes: {
                    where: { userId: user.id }
                },
            }
        })

        return NextResponse.json({
            streams: streams.map(({ _count, ...rest }) => ({
                ...rest,
                upvotes: _count.upvotes,
                hasUpvoted: rest.upvotes.length ? true : false
            }))
        })
    } catch (error) {
        return NextResponse.json(
            { message: "issue in finding the streams for this user", error: error },
            { status: 404 }
        )
    }
}