import { authOptions } from "@/app/lib/auth-options";
import { YT_REGEX } from "@/app/lib/utils";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import youtubesearchapi from "youtube-search-api";
import { prismaClient } from "@/app/lib/db";

const CreateStreamSchema = z.object({
    creatorId: z.string(),
    url: z.string(),
    spaceId: z.string()
})

const MAX_QUEUE_LEN = 20;

export async function POST(req: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user.id) {
            return NextResponse.json(
                {
                    message: "Unauthenticated",
                },
                {
                    status: 403,
                },
            );
        }

        const user = session.user;

        const data = CreateStreamSchema.parse(await req.json());

        if (!data.url.trim()) {
            return NextResponse.json(
                {
                    message: "YouTube link cannot be empty",
                },
                {
                    status: 400,
                },
            );
        }

        const isYt = data.url.match(YT_REGEX);
        const videoId = data.url ? data.url.match(YT_REGEX)?.[1] : null;
        if (!isYt || !videoId) {
            return NextResponse.json(
                {
                    message: "Invalid YouTube URL format",
                },
                {
                    status: 400,
                },
            );
        }

        const res = await youtubesearchapi.GetVideoDetails(videoId);

        if (user.id !== data.creatorId) {
            const ten = new Date(Date.now() - 10 * 60 * 1000);
            const two = new Date(Date.now() - 2 * 60 * 1000);

            const userRecentStreams = await prismaClient.stream.count({
                where: {
                    userId: data.creatorId,
                    addedBy: user.id,
                    createAt: {
                        gte: ten,
                    }
                }
            })

            //find if this user has added the same song in the last ten min
            const duplicateSong = await prismaClient.stream.findFirst({
                where: {
                    userId: data.creatorId,
                    extractedId: videoId,
                    createAt: {
                        gte: ten
                    }
                }
            })

            if (duplicateSong) {
                return NextResponse.json(
                    { message: "User cannot add duplicate songs within 10 mins" },
                    { status: 429 }
                )
            }

            //rate-limiting for the users -> one user can add only 2 songs within 2 min
            const songsAdded = await prismaClient.stream.count({
                where: {
                    userId: data.creatorId,
                    addedBy: user.id,
                    createAt: {
                        gte: two
                    }
                }
            })

            if (songsAdded >= 2) {
                return NextResponse.json(
                    { message: "You cannot add more than 2 songs within 2 minutes" },
                    { status: 404 }
                )
            };

            //the user should not add more than 5 songs within 10 mins -> one user
            if (userRecentStreams >= 5) {
                return NextResponse.json(
                    { message: 'One user can add only 5 songs within 10 mins' },
                    { status: 429 }
                )
            }

        }

        const thumbnails = res.thumbnail.thumbnails;
        thumbnails.sort((a: { width: number }, b: { width: number }) => a.width < b.width ? -1 : 1);

        const existingActiveStreams = await prismaClient.stream.count({
            where: {
                spaceId: data.spaceId,
                played: false,
            },
        });

        if (existingActiveStreams >= MAX_QUEUE_LEN) {
            return NextResponse.json(
                {
                    message: "Queue is full",
                },
                {
                    status: 429,
                },
            );
        }

        const stream = await prismaClient.stream.create({
            data: {
                userId: data.creatorId,
                addedBy: user.id,
                url: data.url,
                extractedId: videoId,
                type: "Youtube",
                title: res.title ?? "cannot find the video",
                smallImg: (thumbnails.length > 1) ? thumbnails[thumbnails.length - 2].url : thumbnails[thumbnails.length - 1] ?? "did not find anything",
                bigImg: thumbnails[thumbnails.length - 1] ?? "cannot find any thumbnail",
                spaceId: data.spaceId
            }
        });

        return NextResponse.json({
            ...stream,
            hasUpvoted: false,
            upvotes: 0,
        });


    } catch (e) {
        console.error(e);
        return NextResponse.json(
            {
                message: "Error while adding a stream",
            },
            {
                status: 500,
            },
        );
    }
}

export async function GET(req: NextRequest) {
    const spaceId = req.nextUrl.searchParams.get("spaceId");
    const session = await getServerSession(authOptions);

    if (!session?.user.id) {
        return NextResponse.json(
            {
                message: "Unauthenticated",
            },
            {
                status: 403,
            },
        );
    }
    const user = session.user;

    if (!spaceId) {
        return NextResponse.json({
            message: "Error"
        }, {
            status: 411
        })
    }

    const [space, activeStreams] = await Promise.all([
        prismaClient.space.findUnique({
            where: { id: spaceId },
            include: {
                streams: {
                    include: {
                        _count: {
                            select: { upvotes: true }
                        },
                        upvotes: {
                            where: { userId: session?.user.id }
                        }
                    },
                    where: { played: false }
                },
                _count: {
                    select: { streams: true }
                }
            }
        }),

        prismaClient.currentStream.findFirst({
            where: {spaceId : spaceId},
            include: { stream : true},
        })
    ]);

    const hostId = space?.hostId;
    const isCreator = hostId === session.user.id;

    return NextResponse.json({
        streams : space?.streams.map( ({_count,...rest}) => ({
            ...rest,
            upvotes :  _count.upvotes,
            haveUpvoted : rest.upvotes.length?true : false
        })),
        activeStreams,
        hostId,
        isCreator,
        spaceName : space?.name
    })
}