import { NextAuthOptions, Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { emailSchema, passwordSchema } from "../schema/credentials-schema";

import { prismaClient } from "./db";
import bcrypt from "bcryptjs";
import { PrismaClientInitializationError } from "@prisma/client/runtime/library";
import { log } from "console";
export const authOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID ?? "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
        }),
        Credentials({
            credentials: {
                email: { type: "email" },
                password: { type: "password" }
            },
            async authorize(credentials) {
                if (!credentials || !credentials.email || !credentials.password) {
                    return null;
                }

                const emailValidation = emailSchema.safeParse(credentials.email);

                if (!emailValidation.success) throw new Error("Invalid Email");

                const passwordValidation = passwordSchema.safeParse(credentials.password);
                if (!passwordValidation.success) throw new Error(passwordValidation.error.issues[0].message);

                try {
                    const user = await prismaClient.user.findUnique({
                        where: {
                            email: emailValidation.data ?? ""
                        }
                    });

                    if (!user) {
                        const hashedPassword = await bcrypt.hash(passwordValidation.data, 10);
                        const newUser = await prismaClient.user.create({
                            data: {
                                email: emailValidation.data,
                                password: hashedPassword,
                                provider: "Credentials"
                            }
                        })

                        return newUser;
                    }

                    if (!user.password) {
                        const hashed = await bcrypt.hash(passwordValidation.data, 10);
                        const authUser = await prismaClient.user.update({
                            where: {
                                email: emailValidation.data
                            },
                            data: {
                                password: hashed
                            }
                        });
                        return authUser;
                    }

                    const passwordVerification = await bcrypt.compare(passwordValidation.data, user.password);

                    if (!passwordVerification) {
                        throw new Error("Invalid Password");
                    }

                    return user;
                } catch (error) {
                    if (error instanceof PrismaClientInitializationError) {
                        throw new Error("Internal serval error");
                    }
                    console.log(error);
                    throw error;
                }
            }
        })
    ]
}