"use client"
import {signIn, signOut, useSession} from "next-auth/react"

export function Auth(){
    const session = useSession();
    return <div>
        <div className="flex justify-between">
            <div>MUSIC</div>
            <div>
                {session.data?.user && <button className="m-2 p-2 bg-blue-400" onClick={()=>signOut()}>LOG OUT</button>}
                {!session.data?.user && <button className="m-2 p-2 bg-blue-400" onClick={()=>signIn()}>SIGN IN</button>}
            </div>
        </div>
    </div>
}