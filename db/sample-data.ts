import { hashSync } from 'bcrypt-ts-edge';
const sampleData = {
  users: [
    {
      username: 'Admin',
      password: hashSync('fhaadmin', 10),
      role: 'admin',
    },
  ],
 restaurants: [
  { 
    name: 'Redemption', 
    address: '31 3rd St NE, Faribault, MN', 
    image: '/images/restaurantsImages/redemption.png', 
    website: 'https://get-redemption.com/',
    description: 'Craft burgers, sandwiches, smoked meats, and American comfort food'
  },
  { 
    name: 'Depot Bar and Grill', 
    address: '311 Heritage Pl, Faribault, MN', 
    image: '/images/restaurantsImages/depot-bar-and-grill.png', 
    website: 'https://faribaultdepotbarandgrill.com/', 
    description: 'Classic American grill—burgers, sandwiches, apps, and bar food'
  },
  { 
    name: 'Jannas Market Grill', 
    address: '129 Central Ave N, Faribault, MN', 
    image: '/images/restaurantsImages/jannas-market-grill.png', 
    website: 'https://www.jannasmarketgrill.com/',
    description: 'Fresh sandwiches, soups, salads, bakery items, and café-style eats'
  },
  { 
    name: 'Faribault Family Restaurant', 
    address: '2519 Lyndale Ave N, Faribault, MN', 
    image: '/images/restaurantsImages/faribault-family-restaurant.png', 
    website: 'https://faribaultfamilyrestaurant.com/',
    description: 'Traditional American diner—breakfast, lunch, and comfort food'
  },
  { 
    name: 'Crooked Pint', 
    address: '125 1st Ave NE, Faribault, MN', 
    image: '/images/restaurantsImages/crooked-pint.jpg', 
    website: 'https://www.crookedpint.com/locations/faribault-mn/',
    description: 'Pub-style food—burgers, flatbreads, pot pies, tater tot hotdishes'
  },
  { 
    name: 'Signature Bar and Grill', 
    address: '201 Central Ave N #5212, Faribault, MN', 
    image: '/images/restaurantsImages/signature-bar-and-grill.png', 
    website: 'http://www.sigbarandgrill.com/',
    description: 'American bar food—wings, burgers, wraps, sandwiches'
  },
  { 
    name: 'Boonies Bar & Grill', 
    address: '3301 Millersburg Blvd, Faribault, MN', 
    image: '/images/restaurantsImages/boonies-bar-grill.jpg', 
    website: 'https://booniesgrill.com/',
    description: 'American bar and grill—burgers, ribs, wings, sandwiches'
  },
  { 
    name: 'Mizuki Fusion', 
    address: '609 4th St NW, Faribault, MN', 
    image: '/images/restaurantsImages/mizuki-fusion.webp', 
    website: 'https://mizukifusionfaribault.org/',
    description: 'Asian fusion—sushi, hibachi, Chinese, Japanese, Thai dishes'
  },
  { 
    name: 'Joes Sports Café', 
    address: '1510 7th St NW, Faribault, MN', 
    image: '/images/restaurantsImages/joes-sports-cafe.png', 
    website: 'https://www.joessportscafe.com/',
    description: 'American comfort food—burgers, ribs, wings, sandwiches'
  },
  { 
    name: 'Crack of Dawn Bake House', 
    address: '09 Central Ave N, Faribault, MN', 
    image: '/images/restaurantsImages/crack-of-dawn-bake-house.jpg', 
    website: 'https://crackofdawnbakehouse.square.site/',
    description: 'Bakery and café—coffee, pastries, breakfast, sandwiches'
  },
  { 
    name: 'Taqueria El Jefe', 
    address: '318 Central Ave N, Faribault, MN', 
    image: '/images/restaurantsImages/taqueria-el-jefe.jpg', 
    website: 'https://taqueria-el-jefe.menu-world.com/',
    description: 'Authentic Mexican street food—tacos, burritos, tortas'
  },
  { 
    name: 'Carbones Pizza', 
    address: '1525 Division St W, Faribault, MN', 
    image: '/images/restaurantsImages/carbones-pizza.jpeg', 
    website: 'https://www.carbones.com/locations/faribault/',
    description: 'Classic thin-crust pizza, pasta, hoagies, and salads'
  },
  { 
    name: 'Perkins', 
    address: '333 Western Ave N, Faribault, MN', 
    image: '/images/restaurantsImages/perkins.jpg', 
    website: 'https://www.perkinsrestaurants.com/',
    description: 'Family diner—breakfast all day, comfort food, pies'
  },
  { 
    name: 'Our Place on Third', 
    address: '20 3rd St NW, Faribault, MN', 
    image: '/images/restaurantsImages/our-place-on-third.jpg', 
    website: 'https://www.ourplaceon3rd.com/',
    description: 'Homestyle American breakfast and lunch'
  },
  { 
    name: 'El Tequilla', 
    address: '951 Faribault Rd, Faribault, MN', 
    image: '/images/restaurantsImages/el-tequilla.jpg', 
    website: 'https://www.facebook.com/eltequilainfaribault/',
    description: 'Traditional Mexican cuisine—fajitas, enchiladas, margaritas'
  },
  { 
    name: 'Twisted Chicken', 
    address: '106 4th St NW, Faribault, MN', 
    image: '/images/restaurantsImages/twisted-chicken.webp', 
    website: 'https://www.twistedchickenmn.com/',
    description: 'Specialty chicken—sandwiches, tenders, wings, bowls'
  },
  { 
    name: 'Basilleos Pizza', 
    address: '108 4th St NW, Faribault, MN', 
    image: '/images/restaurantsImages/basilleos-pizza.jpg', 
    website: 'https://www.basilleospizza.com/faribault-pizza',
    description: 'Pizza, Italian dishes, pasta, sandwiches'
  },
  { 
    name: 'Boxers', 
    address: '429 Central Ave N, Faribault, MN', 
    image: '/images/restaurantsImages/boxers.png', 
    website: 'https://www.boxersbar.com/',
    description: 'American bar and grill—burgers, wings, sandwiches, late-night food'
  },
  { 
    name: 'The Lodge on Lake Mazaska', 
    address: '7170 153rd St W, Faribault, MN', 
    image: '/images/restaurantsImages/the-lodge-on-lake-mazaska.jpeg', 
    website: 'https://www.facebook.com/Sasquatch.SaloonAndRestaurant/',
    description: 'Cabin-style American food—burgers, fish, pizza, comfort food'
  },
  { 
    name: 'Gran Plaza', 
    address: '520 Central Ave N, Faribault, MN', 
    image: '/images/restaurantsImages/gran-plaza.jpeg', 
    website: 'http://www.granplazagrill.com/',
    description: 'Mexican grill—authentic entrees, tacos, fajitas, margaritas'
  },
  { 
    name: '10,000 Drops', 
    address: '28 4th St NE, Faribault, MN', 
    image: '/images/restaurantsImages/10000-drops.webp', 
    website: 'https://www.10000drops.com/',
    description: 'Distillery with cocktails—food trucks or small plates (varies)'
  },
  { 
    name: 'Corks & Pints', 
    address: '28 4th St NE, Faribault, MN', 
    image: '/images/restaurantsImages/corks-pints.png', 
    website: 'https://www.corksandpints.com/',
    description: 'Wine & craft beer bar—charcuterie, small plates'
  },
  { 
    name: 'A&W', 
    address: '404 Wilson Ave NW, Faribault, MN', 
    image: '/images/restaurantsImages/a-w.png', 
    website: 'https://awrestaurants.com/locations/minnesota/faribault/404-wilson-avenue/',
    description: 'Fast food—burgers, root beer floats, chicken, fries'
  }
],
  hotels: [
    {
      name: 'Grandstay Residential Suites',
      address: '1500 20th Street NW, Faribault, MN',
      phone: '(507) 334-2888',
      image: '/images/hotelImages/grandstay-faribault.jpg',
      website: 'https://www.grandstayhospitality.com/find-a-hotel/locations/faribault/overview'
    },
    {
      name: 'Days Inn by Wyndham',
      address: '1920 Cardinal Ln, Faribault, MN',
      phone: '(507) 334-6835',
      image: '/images/hotelImages/days-in.jpg',
      website: 'https://daysinnfaribault.bookonline.com/hotel/days-inn-by-wyndham-faribault?id2=124677684445&gad_source=1&gad_campaignid=14390331486&gbraid=0AAAAABov2Pbs_NaSErbfNuM1yY_P6RZEp&gclid=CjwKCAiA8vXIBhAtEiwAf3B-g3UsJYNebQd8wfh7m7oYBQaj5nPFpotI2HVwxcXtYPutxP1xwa73MxoC2GoQAvD_BwE'
    },
    {
      name: 'Boarders Inn and Suites',
      address: '1801 Lavender Dr, Faribault, MN',
      phone: '(507) 334-9464',
      image: '/images/hotelImages/borders-inn.jpg',
      website: 'https://www.guestreservations.com/boarders-inn-suites-faribault-mn/booking?utm_source=google&utm_medium=cpc&utm_campaign=23196289578&gad_source=1&gad_campaignid=23196289578&gbraid=0AAAAADiMQMa_r8_A8FB8_ipkLphnS_LGp&gclid=CjwKCAiA8vXIBhAtEiwAf3B-g9Ltk5KMt9OqkTXhT4lawlec6C1kQlBkZujTsN8en1J4q8bn_Xt-2xoCvGIQAvD_BwE&ctTriggered=true'
    }
  ],
  tournamentRules:{
    "Game Format": [
      "Teams need to be ready to skate 15-minutes prior to game time, as games may begin early in order to maximize schedule.",
      "Four (4) minute warm-up period.",
      "Three (3) – twelve (12) minute stop time periods for squirts/10U and fifteen (15) minute stop time Periods for Peewee, bantams, 12U and 15U",
      "One (1) minute rest between periods.",
      "2nd and 3rd period run time if team leads by 5 or more goals.  During running time, the clock will be stopped for injuries, when the puck leaves the ice, when the net is off, during ice repairs and while penalties are being assessed (not during penalties).",
      "Each team is allowed one (1) one-minute timeout per game.",

      "In the event of a tie at the end of regulation play, there will be a one (1) minute rest followed by a five (5) minute sudden-death, 4 on 4, stop time overtime period. If no goal is scored, there will be a one (1) minute rest followed by a shootout. Each team will choose five (5) skaters and they will alternate shots. If still tied, the shootout will continue in “Sudden Death” format, with one skater at a time from each team, until one team scores and the other doesn’t. No skater can participate in the shootout twice until each player on the team (excluding goalies), has participated",

      "For tournaments with round robin pool play, the games during the round robin or pool play rounds will have no overtime. The game will end in a tie."
    ],

    "Penalties": [
      "Minor (USA): 1:30 minutes for Squirts/10U, 2:00 minutes for Peewee, Bantam, 12U, and 14U.",
      "Major: 5 minutes.",
      "Misconduct: 10 minutes.",
      "Fighting: 5 minutes, plus disqualification from tournament.",
      "If a player receives 2 checking from behind penalties in a game, they will be ejected from the game and will be ineligible to participate in the next tournament game. If that player receives a 3rd checking from behind during the tournament, they will be removed from the tournament.",

      "The Minnesota Hockey penalty rule for boarding and checking from behind will be in effect.",
      "Boarding: 5 minute Major.",
      "Checking from behind: 5 Minute Major and 10 Minute Misconduct.",

      "Any abusive language or conduct unnecessary to the game officials by players, coaches, or managers will result in a 2:00 minute Minor penalty plus a Game Misconduct. That player or coach will be ejected from the game and out of the next game. Abusive spectators will be asked to leave the tournament and their team may be penalized by the Referee-in-charge or  Tournament Director."
    ],
    "Tournament Logistics": [
      "Tournament fee is $1,100.   All individuals will be welcome to Faribault tournaments and will not be required to pay an entry fee.",

      "USA Hockey approved officials will be used for all games. All decisions of the referees are final. No protests allowed.",

      "A Physician, Certified Athletic Trainer, or an Emergency Medical Technician will be present at each game.",

      "All games will be played according to USA Hockey rules as modified by Minnesota Hockey and District 9 or special rules established by Faribault Hockey Association Tournament Committee.",
      "All teams participating will be required to wear equipment prescribed by USA Hockey. Canadian teams must wear protective equipment as designated by CAHA. Minnesota age guidelines are different from USA hockey age guidelines so Minnesota sanctioned players may be up to 6 months older",

      "Properly certified team rosters and consent to treat forms must be submitted to the Tournament Director at registration check-in. The roster, once submitted, is final. No player may be rostered on more than one team in this tournament. Official rosters will be verified at check-in and in case any questions arise during tournament.Coaches certification numbers will be checked when the team registers with the Tournament Director.",

      "The Tournament, its’ officials, the Arena and all personnel connected with it shall not be held liable for any injuries sustained during the Tournament",

      "Teams must register with Tournament Officials at least 30 minutes prior to their first scheduled Tournament game at Faribault Ice Arena.  Please go to the conference room to your right when entering the arena.",

      "ll teams will be guaranteed three (3) games. Unless Tournament Director rules otherwise, games will not be made up due to inclement weather – Tournament Director will determine results."
    ],
    "Team and Player Guidelines": [
      "Twenty (20) players may be on the roster and dressed by each team for each game.",

      "No more than 4 coaches will be allowed in the player’s box while games are in progress.",

      "Home team will be the team listed on the top of the bracket and will wear WHITE, unless changed due to uniform limitations.",

      "Host team (if any) will always be the home team regardless of where team is listed on the bracket."
    ]
  }
}

export default sampleData;
