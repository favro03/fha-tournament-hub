import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { BadgeDollarSign, Barcode, CreditCard, Users } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import Charts from "./charts";

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