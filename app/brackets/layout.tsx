import Header from "@/components/shared/header";
import Footer from "@/components/footer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div >
      <Header />
      <main 
        className="flex-1 bg-cover bg-center bg-no-repeat" 
      >
        {children}
      </main>
      <Footer />
    </div>
  );
}