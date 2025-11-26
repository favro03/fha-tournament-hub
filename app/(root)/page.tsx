'use client';

import { useRouter } from 'next/navigation';

const Homepage = () => {
  const router = useRouter();

  const navigateToSection = (path: string) => {
    router.push(path);
  };

  return (
    <div className="hero min-h-[80vh] flex items-center justify-center">
      {/* Buttons for navigation */}
      <div className="container mx-auto px-4">
        <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-8 max-w-6xl mx-auto">
          {/* Bracket Button on the left */}
          <div className="flex justify-center lg:justify-center">
            <button 
              className="bg-cover bg-white bg-center bg-no-repeat hover:scale-105 text-black rounded-lg px-10 py-8 transition-all duration-200 shadow-lg min-h-[126px] w-full max-w-[320px] flex flex-col items-center justify-end space-y-3"
              style={{ backgroundImage: 'url(/images/bracketBtn.png)' }}
              onClick={() => navigateToSection('/bracket')}
            >
        
            </button>
          </div>
  
          {/* Hotels Button */}
          <div className="flex justify-center lg:hidden">
            <button 
              className="bg-contain bg-white bg-center bg-no-repeat hover:scale-105 text-black rounded-lg px-12 py-6 transition-all duration-200 shadow-lg min-h-[126px] w-full max-w-[320px] flex flex-col items-center justify-end"
              style={{ backgroundImage: 'url(/images/hotelPic.png)' }}
              onClick={() => navigateToSection('/hotels')}
            >
       
            </button>
          </div>

          {/* Restaurants Button */}
          <div className="flex justify-center lg:hidden">
            <button 
              className="bg-contain bg-white bg-center bg-no-repeat hover:scale-105 text-black rounded-lg px-12 py-6 transition-all duration-200 shadow-lg min-h-[126px] w-full max-w-[320px] flex flex-col items-center justify-end"
              style={{ backgroundImage: 'url(/images/restaurantPic.png)' }}
              onClick={() => navigateToSection('/restaurants')}
            >
           
            </button>
          </div>

          {/* Hotels and Restaurants buttons stacked in the center - Large screens only */}
          <div className="hidden lg:flex flex-col space-y-4">
            <button 
              className="bg-contain bg-white bg-center bg-no-repeat hover:scale-105 text-black rounded-lg px-12 py-6 transition-all duration-200 shadow-lg min-h-[126px] w-full min-w-[280px] flex flex-col items-center justify-end space-y-2"
              style={{ backgroundImage: 'url(/images/hotelPic.png)' }}
              onClick={() => navigateToSection('/hotels')}
            >
            
            </button>
            <button 
              className="bg-contain bg-white bg-center bg-no-repeat hover:scale-105 text-black rounded-lg px-12 py-6 transition-all duration-200 shadow-lg min-h-[126px] w-full min-w-[280px] flex flex-col items-center justify-end space-y-2"
              style={{ backgroundImage: 'url(/images/restaurantPic.png)' }}
              onClick={() => navigateToSection('/restaurants')}
            >
        
            </button>
          </div>
  
          {/* Rules Button on the right */}
          <div className="flex justify-center lg:justify-center">
            <button 
              className="bg-cover bg-center bg-no-repeat hover:scale-105 text-black rounded-lg px-10 pb-2 pt-8 transition-all duration-200 shadow-lg min-h-[126px] w-full max-w-[320px] flex flex-col items-center justify-end"
              style={{ backgroundImage: 'url(/images/rulesButton.png)' }}
              onClick={() => navigateToSection('/rules')}
            >
              <h3 className="text-xl font-bold text-white lg:text-black">Tournament Rules</h3>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
 
export default Homepage;