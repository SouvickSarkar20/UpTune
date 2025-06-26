import { prismaClient } from "@/app/lib/db";
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import youtubesearchapi from "youtube-search-api";
import { log } from "console";


var urlRegex = /^(?:(?:https?:)?\/\/)?(?:www\.)?(?:m\.)?(?:youtu(?:be)?\.com\/(?:v\/|embed\/|watch(?:\/|\?v=))|youtu\.be\/)((?:\w|-){11})(?:\S+)?$/;
const createStreamSchema = z.object({
    creatorId: z.string(),
    url: z.string()
})

export async function POST(req: NextRequest) {
    try {
        const data = createStreamSchema.parse(await req.json());
        const isYt = data.url.match(urlRegex);
        if (!isYt) throw new Error("The url format for youtube is wrong");

        const extractedId = data.url.split("?v=")[1];
        const details = await youtubesearchapi.GetVideoDetails(extractedId);
        const thumbnails = details.thumbnail.thumbnails;
        thumbnails.sort((a: {width : number} , b: {width : number}) => a.width < b.width ? -1 : 1);
        const title = details.title;
        console.log(details.title);
        console.log(JSON.stringify(details.thumbnail.thumbnails));
        
        
        const stream = await prismaClient.stream.create({
            data: {
                userId: data.creatorId,
                url: data.url,
                extractedId,
                type: "Youtube",
                title : title ?? "cant find the video",
                smallImg : (thumbnails.length > 1) ?  thumbnails[thumbnails.length - 2].url : thumbnails[thumbnails.length - 1].url ?? "",
                bigImg : thumbnails[thumbnails.length - 1].url ?? ""
            }
        })

        return NextResponse.json({
            message: "Stream added successfully",
            streamId: stream
        })
    }
    catch (err) {
        return NextResponse.json({
            message: err
        }, {
            status: 404
        })
    }
}

export async function GET(req: NextRequest) {
    const request = req.nextUrl.searchParams.get("creatorId");
    const streams = await prismaClient.stream.findMany({
        where: {
            userId: request ?? ""
        }
    })

    return NextResponse.json({
        streams
    })
}