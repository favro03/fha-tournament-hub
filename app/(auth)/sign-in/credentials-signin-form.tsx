'use client';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signIndefaultvalues } from "@/lib/constants";
import { signIn } from "next-auth/react";
import { useState } from "react";


const CredentialSignInForm = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        const formData = new FormData(e.currentTarget);
        const username = formData.get("username") as string;
        const password = formData.get("password") as string;
        const result = await signIn("credentials", {
            redirect: false,
            username,
            password,
        });
        setLoading(false);
        if (result?.error) {
            setError("Invalid username or password");
        } else {
            // Optionally redirect or reload to update UI
            window.location.href = "/";
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-1">
                <Label htmlFor='username'>Username</Label>
                <Input 
                  id='username'
                  name="username"
                  type="username"
                  required
                  defaultValue={signIndefaultvalues.username}
                />
            </div>
            <div className="space-y-1 mt-6">
                <Label htmlFor='password'>Password</Label>
                <Input 
                  id='password'
                  name="password"
                  type="password"
                  required
                  defaultValue={signIndefaultvalues.password}
                />
            </div>
            <div>
                <Button disabled={loading} className="w-full" variant='default'>
                    {loading ? 'Signing In...' : 'Sign In'}
                </Button>
            </div>
            {error && (
                <div className="text-center text-destructive">{error}</div>
            )}
        </form>
    );
};

export default CredentialSignInForm;