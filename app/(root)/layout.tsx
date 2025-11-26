import Header from "@/components/shared/header";
import Footer from "@/components/footer";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex h-screen flex-col ">
      <Header />
      <main 
        className="flex-1 bg-cover bg-center bg-no-repeat" 
        style={{ backgroundImage: 'url(/images/fhaHero3.png)' }}
      >
        <div className="wrapper">
          {children}
        </div>
      </main>
      <Footer />
    </div>

  );
}