import { APP_NAME } from "@/lib/constants";


const Footer = () => {
    const currentYear = new Date().getFullYear();
    return ( 
        <footer className="border-t bg-[#B7CBD5] text-white">
            <div className="p-5 flex-center">
                {currentYear} {APP_NAME} &copy; All rights reserved.
            </div>
        </footer>
     );
}
 
export default Footer;