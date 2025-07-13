"use client";

import { Session } from "next-auth";
import React, { useEffect, useRef, useState } from "react";
import YouTubePlayer from "youtube-player";
import { YT_REGEX } from "@/app/lib/utils";


interface video {
    id: string,
    type: string,
    url: string,
    extractedId: string,
    title: string,
    smallImg: string,
    bigImg: string,
    active: boolean,
    userId: string,
    upvotes: number,
    haveUpvoted: boolean,
    spaceId: string,
};

interface CustomSession extends Omit<Session, "user"> {
    user: {
        id: string,
        name?: string | null,
        email?: string | null,
        image?: string | null,
    };
};

const REFRESH_INTERVAL_MS = 10 * 1000;

export default function StreamView({ creatorId, playVideo = false, spaceId }: { creatorId: string, playVideo: boolean, spaceId: string }) {
    const [inputLink, setInputLink] = useState("");
    const [queue, setQueue] = useState<video[]>([]);
    const [currentVideo, setCurrentVideo] = useState<video | null>(null);
    const [loading, setLoading] = useState(false);
    const [playNextLoade, setPlayNextLoader] = useState(false);
    const videoPlayerRef = useRef<HTMLDivElement>(null);
    const [isCreator, setIsCreator] = useState(false);
    const [isEmptyQueueDialogOpen, setIsEmptyQueueDialogOpen] = useState(false);
    const [spaceName, setSpaceName] = useState("")
    const [isOpen, setIsOpen] = useState(false);

    async function refreshStreams() {
        try {
            const res = await fetch(`/api/streams/?spaceId=${spaceId}`, {
                credentials: "include",
            });

            const json = await res.json();

            if (json.streams && Array.isArray(json.streams)) {
                setQueue(
                    json.streams.length > 0 ? json.streams.sort((a: any, b: any) => b.upvotes - a.upvotes) : []
                );
            } else {
                setQueue([]);
            }

            setCurrentVideo((video) => {
                if (video?.id === json.activeStreams?.stream?.id) {
                    return video;
                } else {
                    return json.activeStreams?.stream || null;
                }
            });

            setIsCreator(json.creatorId);
            setSpaceName(json.spaceName);

        } catch (error) {
            console.error("ERROR retreiving streams", error);
            setQueue([]);
            setCurrentVideo(null);
        }
    };

    //now we constantly request the server or say we do polling 
    //to check if anything has changed in the streams 
    //if someone upvoted,added or removed a stream 

    useEffect(() => {
        refreshStreams(); // call immediately

        const interval = setInterval(() => {
            refreshStreams(); // call in interval
        }, REFRESH_INTERVAL_MS);

        return () => clearInterval(interval);
    }, [spaceId]);


    useEffect(() => {
        if (!videoPlayerRef.current || !currentVideo) {
            return;
        }

        const player = YouTubePlayer(videoPlayerRef.current);
        player.loadVideoById(currentVideo.extractedId);
        player.playVideo();

        const eventHandler = (event: { data: number }) => {
            if (event.data == 0) {
                playNext();
            }
        }

        player.on("stateChange", eventHandler);

        return () => {
            player.destroy();
        }
    }, [currentVideo, videoPlayerRef]);

    //this function is called when the user adds a song in the form 
    //it is used to add that song then to the queue 
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputLink.trim()) {
            console.log("YT link cannot be empty");
            return;
        }

        if (!inputLink.match(YT_REGEX)) {
            console.log("YT link format does not match");
            return;
        }

        setLoading(true);

        try {
            const res = await fetch(`/api/streams/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    creatorId,
                    url: inputLink,
                    spaceId: spaceId
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "An error occurred");
            }
            setQueue([...queue, data]);
            setInputLink("");
            console.log("Song added successfully");

        } catch (error) {
            if (error instanceof Error) {
                throw new Error(error.message);
            } else {
                throw new Error("An unexpected error occurred");
            }
        } finally {
            setLoading(false);
        }
    };

    //this will handle any kind of upvote or downvote
    const handleVote = (id: string, isUpvote: boolean) => {
        setQueue(
            queue
                .map((video) =>
                    video.id === id
                        ? {
                            ...video,
                            upvotes: isUpvote ? video.upvotes + 1 : video.upvotes - 1,
                            haveUpvoted: !video.haveUpvoted,
                        }
                        : video,
                )
                .sort((a, b) => b.upvotes - a.upvotes),
        );
        //searches the video in the queue with the given id
        //increases or decreases the upvotes count accordingly
        //sorts the queue in descending order according to upvotes

        fetch(`/api/streams/${isUpvote ? "upvote" : "downvote"}`, {
            method: "POST",
            body: JSON.stringify({
                streamId: id,
                spaceId: spaceId
            })
        })
        //backed api call to upvote or downvote a particular stream

    };

    //this function will get the next song from the backend 
    //remove any existence of this song from the queue
    const playNext = async () => {
        if (queue.length > 0) {
            try {
                setPlayNextLoader(true);
                const data = await fetch(`api/streams/next?spaceId=${spaceId}`, {
                    method: "GET",
                });

                const json = await data.json();

                setCurrentVideo(json.stream);
                setQueue((q) => q.filter((x) => x.id !== json.stream?.id));
            } catch (e) {
                console.error("Error playing next song:", e);
            } finally {
                setPlayNextLoader(false);
            }
        }
    };

    const handleShare = (platform: 'whatsapp' | 'twitter' | 'instagram' | 'clipboard') => {
        const shareableLink = `${window.location.hostname}/spaces/${spaceId}`;

        if (platform == "clipboard") {
            navigator.clipboard.writeText(shareableLink).then(() => {
                alert("Image copied successfully");
            })
        }
        else {
            let url
            switch (platform) {
                case 'whatsapp':
                    url = `https://wa.me/?text=${encodeURIComponent(shareableLink)}`
                    break
                case 'twitter':
                    url = `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareableLink)}`
                    break
                case 'instagram':
                    // Instagram doesn't allow direct URL sharing, so we copy the link instead
                    navigator.clipboard.writeText(shareableLink)
                    alert('Link copied for Instagram sharing!')
                    return
                default:
                    return
            }
            window.open(url, '_blank');
            //this will open the url in a new tab of browser
        }
    }

    const emptyQueue = async () => {
        try {
            const res = await fetch(`api/streams/empty-queue`, {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    spaceId: spaceId
                })
            });

            const data = await res.json();

            if (res.ok) {
                alert(data.message);
                refreshStreams();
                setIsEmptyQueueDialogOpen(false);
            } else {
                alert("Failed to empty the queue");
            }
        } catch (error) {
            console.error("Error occured while emptying the queue", error);
        }
    }

    const removeSong = async (streamId: string) => {
        try {
            const res = await fetch(`/api/streams/remove?streamId=${streamId}&spaceId=${spaceId}`, {
                method: "DELETE",
            });
            if (res.ok) {
                alert("Song removed successfully");
                refreshStreams();
            } else {
                alert("Failed to remove song");
            }
        } catch (error) {
            alert("An error occurred while removing the song");
        }
    };





}

