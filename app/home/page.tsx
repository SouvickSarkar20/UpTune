import { getServerSession } from "next-auth";
import { authOptions } from "../lib/auth-options";

export default async function Home() {
    const session = await getServerSession(authOptions);

    if (!session?.user.id) {
        return <h1>Please Log in...</h1>
    }
    return <HomeView></HomeView>
}