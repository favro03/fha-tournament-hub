import { auth } from "@/auth";
import { Metadata } from "next";


export const metadata: Metadata = {
  title: 'Admin Dashboard',
}


const AdminOverviewPage = async() => {
  const session = await auth();

  if(session?.user?.role !== 'admin') {
    throw new Error('User is not authorized')
  }

  

    return (
  <>Overview</>
      );
}
 
export default AdminOverviewPage;