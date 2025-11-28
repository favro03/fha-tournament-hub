"use client";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import {DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,} from "@/components/ui/dropdown-menu";

const UserButton = () => {
    const { data: session } = useSession();
    if (!session) {
        return (
            <Button asChild variant='ghost'>
                <Link href='/sign-in'>
                    <UserIcon /> Admin
                </Link>
            </Button>
        );
    }
    const firstInitial = session.user?.username?.charAt(0).toUpperCase() ?? '';
    return (
        <div className="flex gap-2 items-center">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <div className="flex items-center">
                        <Button variant='ghost' className="relative w-8 h-8 rounded-full ml-2 flex items-center justify-center bg-gray-200">{firstInitial}</Button>
                    </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                        <div className="flex flex-col space-y-1">
                            <div className="text-sm font-medium leading-none">
                                {session.user?.username}
                            </div>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuItem className="p-0 mb-1">
                        <Button
                            className="w-full py-4 px-2 h-4 justify-start"
                            variant='ghost'
                            onClick={() => signOut()}
                        >
                            Sign Out
                        </Button>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
};

export default UserButton;