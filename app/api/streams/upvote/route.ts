import { prismaClient } from "@/app/lib/db";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createDownVoteSchema = z.object({
    streamId : z.string()
})
export async function POST(req: NextRequest) {
    const session = await getServerSession();
    const user = await prismaClient.user.findFirst({
        where: {
            email: session?.user?.email || ""
        }
    })

    if (!user) {
        return NextResponse.json({
            message: "User could not be found in the database"
        }, {
            status: 404
        })
    }

    try{
        const data = createDownVoteSchema.parse(await req.json());
        await prismaClient.upvote.create({
            data : {
                userId : user.id,
                streamId : data.streamId
            }
        })
    }
    catch(err){
        return NextResponse.json({
            message : err
        },{
            status : 404
        })
    }
}