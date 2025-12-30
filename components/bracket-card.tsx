'use client';

import { Card } from '@/components/ui/card';
import Image from 'next/image';
import { Bracket } from '@/types';

export function BracketCard({ bracket }: {bracket: Bracket}) {

    return (
        <Card className="bg-green-800 m-2">
            <div className="text-lg font-bold text-center w-full leading-none m-0 p-0">{bracket.youthLevel}</div>
            <div className="text-lg font-semibold text-center w-full leading-none m-0 p-0">{bracket.name}</div>
            <div className='bg-white'>
                <div className="text-lg text-center w-full">{bracket.date}</div>
                {bracket.image && (
                    <div className="w-full flex justify-center ">
                        <Image
                            src={bracket.image}
                            alt={bracket.name}
                            width={600}
                            height={300}
                            className="object-contain w-full h-auto"
                            priority
                        />
                    </div>
                )}
            </div>
        </Card>
    )

}