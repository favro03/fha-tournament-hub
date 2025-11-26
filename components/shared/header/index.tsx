
import Link from 'next/link';
import { APP_NAME } from '@/lib/constants';
import Image from 'next/image';
import Menu from './menu';
const Header = () => {
    return ( 
        <header className='w-full border-b bg-linear-to-r from-green-900 to-green-800/20'>
            <div className="wrapper flex-between">
                <div className="flex-start">
                    <Link href='/' className='flex-start'>
                        <Image src='/images/logo.png' alt={`${APP_NAME} logo`} height={60} width={60} priority={true} />
                        <span className="hidden font-bold text-2xl ml-3 lg:block text-white">{APP_NAME}</span>
                    </Link>
                </div>
                <div className="space-x-2">
                    
                </div>
                   <Menu />
            </div>
        </header>
     );
}
 
export default Header;
