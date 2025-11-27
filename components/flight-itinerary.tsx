import React from 'react';

// Helper function to get a placeholder for the airline logo
const getAirlineLogo = (airlineCode: string) => {
  return `https://ui-avatars.com/api/?name=${airlineCode}&background=random&size=32&font-size=0.5&bold=true&color=fff`;
};

const flights = [
  {
    day: 'Day 1',
    date: 'November 26, 2025',
    segments: [
      {
        airline: 'United',
        airlineCode: 'UA',
        flightNumber: '1610',
        from: 'San Francisco',
        fromCode: 'SFO',
        to: 'New York',
        toCode: 'JFK',
        departureTime: '08:00 AM',
        arrivalTime: '04:30 PM',
        duration: '5h 30m',
      },
      {
        airline: 'American Airlines',
        airlineCode: 'AA',
        flightNumber: '220',
        from: 'New York',
        fromCode: 'JFK',
        to: 'London',
        toCode: 'LHR',
        departureTime: '08:30 PM',
        arrivalTime: '08:30 AM',
        duration: '7h 00m',
      },
    ],
    hotel: {
      name: 'The Grand Hotel',
      rating: 4.5,
      price: '$250/night',
      imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?q=80&w=2070&auto=format&fit=crop',
    },
  },
  {
    day: 'Day 8',
    date: 'December 3, 2025',
    segments: [
        {
            airline: 'British Airways',
            airlineCode: 'BA',
            flightNumber: '283',
            from: 'London',
            fromCode: 'LHR',
            to: 'San Francisco',
            toCode: 'SFO',
            departureTime: '11:00 AM',
            arrivalTime: '02:00 PM',
            duration: '11h 00m',
        },
    ],
    hotel: {
        name: 'The Ritz-Carlton',
        rating: 5,
        price: '$850/night',
        imageUrl: 'https://images.unsplash.com/photo-1542314831-068cd1dbb5eb?q=80&w=2070&auto=format&fit=crop',
      },
  }
];

const FlightItinerary = () => {
  return (
    <div className="bg-gray-100 dark:bg-gray-900 font-sans w-full">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Your Flight Itinerary</h1>
          <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M11.078 2.25c-.917 0-1.699.663-1.85 1.567L9.05 5.85c-.09.55.279 1.085.822 1.262l.244.078c.542.174 1.123.045 1.498-.332l.375-.375a1.875 1.875 0 012.652 0l.375.375c.375.375.956.507 1.498.332l.244-.078c.542-.177.912-.712.822-1.262l-.178-1.031a1.875 1.875 0 00-1.85-1.567h-3.033zM12 4.5a.75.75 0 01.75.75v.008c0 .414-.336.75-.75.75h-.008a.75.75 0 01-.75-.75v-.008c0-.414.336-.75.75-.75h.008zM12 9a.75.75 0 00-.75.75v.008a.75.75 0 00.75.75h.008a.75.75 0 00.75-.75v-.008a.75.75 0 00-.75-.75h-.008zM12 13.5a.75.75 0 01.75.75v.008c0 .414-.336.75-.75.75h-.008a.75.75 0 01-.75-.75v-.008c0-.414.336-.75.75-.75h.008zM14.25 9a.75.75 0 000 1.5h.75a.75.75 0 000-1.5h-.75zM15 11.25a.75.75 0 01.75-.75h.75a.75.75 0 010 1.5h-.75a.75.75 0 01-.75-.75zM14.25 13.5a.75.75 0 000 1.5h.75a.75.75 0 000-1.5h-.75zM15 15.75a.75.75 0 01.75-.75h.75a.75.75 0 010 1.5h-.75a.75.75 0 01-.75-.75zM11.25 9a.75.75 0 000 1.5h.75a.75.75 0 000-1.5h-.75zM12 11.25a.75.75 0 01.75-.75h.75a.75.75 0 010 1.5h-.75a.75.75 0 01-.75-.75zM11.25 13.5a.75.75 0 000 1.5h.75a.75.75 0 000-1.5h-.75zM12 15.75a.75.75 0 01.75-.75h.75a.75.75 0 010 1.5h-.75a.75.75 0 01-.75-.75zM14.25 9a.75.75 0 000 1.5h.75a.75.75 0 000-1.5h-.75zM15 11.25a.75.75 0 01.75-.75h.75a.75.75 0 010 1.5h-.75a.75.75 0 01-.75-.75zM14.25 13.5a.75.75 0 000 1.5h.75a.75.75 0 000-1.5h-.75zM15 15.75a.75.75 0 01.75-.75h.75a.75.75 0 010 1.5h-.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
            </svg>
            <span>Hotel Settings</span>
          </button>
        </div>

        {flights.map((flightDay, index) => (
          <div key={index} className="mb-8">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-2xl font-semibold text-gray-800 dark:text-white">{flightDay.day}</h2>
              <span className="text-gray-500 dark:text-gray-400">{flightDay.date}</span>
            </div>

            <div className="space-y-4">
              {flightDay.segments.map((flight, flightIndex) => (
                <div key={flightIndex} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4 items-center">
                      <img src={getAirlineLogo(flight.airlineCode)} alt={`${flight.airline} logo`} className="h-8 w-8 rounded-full" />
                      <div>
                        <div className="font-bold text-lg text-gray-900 dark:text-white">{flight.airlineCode}{flight.flightNumber}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{flight.airline}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-gray-800 dark:text-white">{flight.duration}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">Non-stop</div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-6">
                    <div className="text-center">
                      <div className="font-bold text-2xl text-gray-900 dark:text-white">{flight.fromCode}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{flight.from}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{flight.departureTime}</div>
                    </div>

                    <div className="flex-1 flex items-center mx-4">
                        <div className="w-full h-px bg-gray-300 dark:bg-gray-600 relative">
                            <div className="absolute left-0 top-1/2 -mt-1.5 h-3 w-3 rounded-full bg-gray-400 dark:bg-gray-500"></div>
                            <div className="absolute right-0 top-1/2 -mt-1.5 h-3 w-3 rounded-full bg-blue-500"></div>
                        </div>
                    </div>

                    <div className="text-center">
                      <div className="font-bold text-2xl text-gray-900 dark:text-white">{flight.toCode}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">{flight.to}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{flight.arrivalTime}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-4">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-gray-500 dark:text-gray-400">
                              <path fillRule="evenodd" d="M4.5 2.25a.75.75 0 00-.75.75v12.75a.75.75 0 00.75.75h15a.75.75 0 00.75-.75V3a.75.75 0 00-.75-.75h-15zM8.25 9a.75.75 0 000 1.5h.75a.75.75 0 000-1.5H8.25zM9 11.25a.75.75 0 01.75-.75h.75a.75.75 0 010 1.5H9.75a.75.75 0 01-.75-.75zM8.25 13.5a.75.75 0 000 1.5h.75a.75.75 0 000-1.5H8.25zM9 15.75a.75.75 0 01.75-.75h.75a.75.75 0 010 1.5H9.75a.75.75 0 01-.75-.75zM11.25 9a.75.75 0 000 1.5h.75a.75.75 0 000-1.5h-.75zM12 11.25a.75.75 0 01.75-.75h.75a.75.75 0 010 1.5h-.75a.75.75 0 01-.75-.75zM11.25 13.5a.75.75 0 000 1.5h.75a.75.75 0 000-1.5h-.75zM12 15.75a.75.75 0 01.75-.75h.75a.75.75 0 010 1.5h-.75a.75.75 0 01-.75-.75zM14.25 9a.75.75 0 000 1.5h.75a.75.75 0 000-1.5h-.75zM15 11.25a.75.75 0 01.75-.75h.75a.75.75 0 010 1.5h-.75a.75.75 0 01-.75-.75zM14.25 13.5a.75.75 0 000 1.5h.75a.75.75 0 000-1.5h-.75zM15 15.75a.75.75 0 01.75-.75h.75a.75.75 0 010 1.5h-.75a.75.75 0 01-.75-.75z" clipRule="evenodd" />
                              <path d="M4.5 20.25a.75.75 0 00.75.75h13.5a.75.75 0 00.75-.75V18a.75.75 0 00-.75-.75H5.25a.75.75 0 00-.75.75v2.25z" />
                            </svg>
                            <div>
                                <h3 className="font-bold text-lg text-gray-900 dark:text-white">Hotel for the night</h3>
                                <p className="text-sm text-gray-600 dark:text-gray-400">Recommended for you</p>
                            </div>
                        </div>
                        <button className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                            Book Now
                        </button>
                    </div>
                    <div className="mt-4 flex items-center gap-4">
                        <img src={flightDay.hotel.imageUrl} alt={flightDay.hotel.name} className="h-24 w-24 rounded-lg object-cover" />
                        <div>
                            <h4 className="font-semibold text-md text-gray-800 dark:text-white">{flightDay.hotel.name}</h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">Rating: {flightDay.hotel.rating} / 5</p>
                            <p className="text-lg font-bold text-gray-900 dark:text-white">{flightDay.hotel.price}</p>
                        </div>
                    </div>
                </div>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
};

export default FlightItinerary;
