import Hero from "@/components/Hero";
import Numbers from "@/components/Numbers";
import Objects from "@/components/Objects";
import Telegram from "@/components/Telegram";
import Reels from "@/components/Reels";
import Contacts from "@/components/Contacts";
import Footer from "@/components/Footer";

export default function Page() {
  return (
    <>
      <main>
        <Hero />
        <Numbers />
        <Objects />
        <Telegram />
        <Reels />
        <Contacts />
      </main>
      <Footer />
    </>
  );
}
