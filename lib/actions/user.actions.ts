'use server';

import { signInFormSchema } from "../validators";
import { signIn, signOut } from "@/auth";
import { isRedirectError } from "next/dist/client/components/redirect-error";

//Sign in the user with credentials
export async function signInWithCredentials(prevState: unknown, formData: FormData) {
    try {
        const user = signInFormSchema.parse({
            username: formData.get('username'),
            password: formData.get('password'),
        })
        await signIn('credentials', user)

        return { success: true, message: 'Signed in successfully'}
    } catch (error) {
        if(isRedirectError(error))
            throw error;
    }
    return{success: false, message: 'Invalid username or password'}
}

//Sign user out
export async function signOutUser() {
    await signOut();
}