
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const Homepage = () => {
  return (
    <div className="hero min-h-[80vh] flex items-center justify-center">
      {/* Buttons for navigation */}
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-8 max-w-6xl mx-auto">
          {/* Bracket Button on the left */}
          <div className="flex justify-center lg:justify-center">
            <Link href="/bracket" className="w-full max-w-[320px]">
              <Button
                className="bg-cover bg-white bg-center bg-no-repeat hover:scale-105 text-black rounded-lg px-10 py-8 transition-all duration-200 shadow-lg min-h-[126px] w-full flex flex-col items-center justify-end space-y-3 lg:min-h-[272px]"
                style={{ backgroundImage: 'url(/images/bracketBtn.png)' }}
              >
                {/* Bracket Button Content */}
              </Button>
            </Link>
          </div>

          {/* Hotels Button */}
          <div className="flex justify-center lg:hidden">
            <Link href="/hotels" className="w-full max-w-[320px]">
              <Button
                className="bg-contain bg-white bg-center bg-no-repeat hover:scale-105 text-black rounded-lg px-12 py-6 transition-all duration-200 shadow-lg min-h-[126px] w-full flex flex-col items-center justify-end"
                style={{ backgroundImage: 'url(/images/hotelPic.png)' }}
              >
                {/* Hotels Button Content */}
              </Button>
            </Link>
          </div>

          {/* Restaurants Button */}
          <div className="flex justify-center lg:hidden">
            <Link href="/restaurants" className="w-full max-w-[320px]">
              <Button
                className="bg-contain bg-white bg-center bg-no-repeat hover:scale-105 text-black rounded-lg px-12 py-6 transition-all duration-200 shadow-lg min-h-[126px] w-full flex flex-col items-center justify-end"
                style={{ backgroundImage: 'url(/images/restaurantPic.png)' }}
              >
                {/* Restaurants Button Content */}
              </Button>
            </Link>
          </div>

          {/* Hotels and Restaurants buttons stacked in the center - Large screens only */}
          <div className="hidden lg:flex flex-col space-y-4">
            <Link href="/hotels" className="w-full min-w-[280px]">
              <Button
                className="bg-contain bg-white bg-center bg-no-repeat hover:scale-105 text-black rounded-lg px-12 py-6 transition-all duration-200 shadow-lg min-h-[126px] w-full flex flex-col items-center justify-end space-y-2"
                style={{ backgroundImage: 'url(/images/hotelPic.png)' }}
              >
                {/* Hotels Button Content */}
              </Button>
            </Link>
            <Link href="/restaurants" className="w-full min-w-[280px]">
              <Button
                className="bg-contain bg-white bg-center bg-no-repeat hover:scale-105 text-black rounded-lg px-12 py-6 transition-all duration-200 shadow-lg min-h-[126px] w-full flex flex-col items-center justify-end space-y-2"
                style={{ backgroundImage: 'url(/images/restaurantPic.png)' }}
              >
                {/* Restaurants Button Content */}
              </Button>
            </Link>
          </div>

          {/* Rules Button on the right */}
          <div className="flex justify-center lg:justify-center">
            <Link href="/rules" className="w-full max-w-[320px]">
              <Button
                className="bg-cover bg-center bg-no-repeat hover:scale-105 text-black rounded-lg px-10 pb-2 pt-8 transition-all duration-200 shadow-lg min-h-[126px] w-full flex flex-col items-center justify-end lg:min-h-[272px]"
                style={{ backgroundImage: 'url(/images/rulesButton.png)' }}
              >
                <h3 className="text-xl font-bold text-white lg:text-black">Tournament Rules</h3>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Homepage;