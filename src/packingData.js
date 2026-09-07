export const sourceCheckedDate = "7 September 2026";

export const sourceLinks = [
  {
    label: "Exact 17–24 October camp",
    href: "https://www.sacalobra.cc/cycling-camp/138/",
  },
  {
    label: "SCCC how-to-pack guide",
    href: "https://www.sacalobra.cc/how-to-pack/",
  },
  {
    label: "Official printable packing list",
    href: "https://www.sacalobra.cc/doc/packing-list.pdf",
  },
  {
    label: "SCCC trip-preparation FAQ",
    href: "https://www.sacalobra.cc/faq/",
  },
  {
    label: "SCCC taper-week guide",
    href: "https://www.sacalobra.cc/news/taper-week-220/",
  },
];

export const cabinEssentials = [
  {
    id: "cabin-pedals",
    icon: "pedals",
    label: "Pedals",
    note: "SCCC does not supply them.",
  },
  {
    id: "cabin-shoes",
    icon: "shoes",
    label: "Cycling shoes",
    note: "Keep your cleat system with you.",
  },
  {
    id: "cabin-saddle",
    icon: "saddle",
    label: "Preferred saddle",
    note: "Optional—but cabin-bag it if you bring it.",
  },
  {
    id: "cabin-personal",
    icon: "personal",
    label: "ID, meds & phone",
    note: "Keep the essentials on your person.",
  },
];

export const packingGroups = [
  {
    id: "bike",
    number: "01",
    icon: "bike",
    eyebrow: "The non-negotiables",
    title: "Bike essentials",
    description: "Protect the contact points and personal gear that make the rental bike yours.",
    items: [
      {
        id: "pedals",
        label: "Pedals",
        note: "Required; pack in your cabin bag.",
        tag: "Cabin",
      },
      {
        id: "cycling-shoes",
        label: "Cycling shoes",
        note: "With the cleats you already trust.",
        tag: "Cabin",
      },
      {
        id: "saddle",
        label: "Your own saddle",
        note: "Optional if the familiar fit matters to you.",
        tag: "Optional · cabin",
      },
      {
        id: "sunglasses",
        label: "Sunglasses",
        note: "Bring your preferred lens coverage.",
        tag: "Pack",
      },
      {
        id: "cycling-gloves",
        label: "Cycling gloves",
        note: "Add a full-finger option if the forecast turns cool.",
        tag: "Forecast call",
      },
      {
        id: "powermeter-batteries",
        label: "Fresh power-meter batteries",
        note: "Only if you're bringing your own pedal- or left-crank power meter.",
        tag: "If needed",
      },
    ],
  },
  {
    id: "layers",
    number: "02",
    icon: "layers",
    eyebrow: "For 10–22°C / 50–71°F",
    title: "October layers",
    description: "Build one flexible system for cool starts, exposed climbs, fast descents, wind, and rain.",
    items: [
      {
        id: "rain-wind-layer",
        label: "Rain/wind jacket or gilet",
        note: "Your most useful descent and weather layer.",
        tag: "Core layer",
      },
      {
        id: "arm-warmers",
        label: "Arm warmers",
        note: "Easy to remove and hand to the support car.",
        tag: "Core layer",
      },
      {
        id: "leg-warmers",
        label: "Leg warmers",
        note: "For the chilliest starts and descents.",
        tag: "Core layer",
      },
      {
        id: "base-layer",
        label: "Base layer",
        note: "Choose one that works under the supplied jersey.",
        tag: "Core layer",
      },
      {
        id: "thermal-layer",
        label: "Thermal vest or jacket",
        note: "Pack if you run cold or the forecast dips.",
        tag: "If needed",
      },
      {
        id: "headband-cap",
        label: "Headband or cycling cap",
        note: "Small warmth for very little luggage space.",
        tag: "If needed",
      },
      {
        id: "neck-warmer",
        label: "Neck warmer",
        note: "SCCC calls this a winter collar.",
        tag: "If needed",
      },
      {
        id: "shoe-covers",
        label: "Shoe covers",
        note: "Best decided from the live forecast.",
        tag: "Forecast call",
      },
      {
        id: "winter-tights",
        label: "Winter tights",
        note: "Conditional—not an automatic October pack.",
        tag: "Forecast call",
      },
    ],
  },
  {
    id: "off-bike",
    number: "03",
    icon: "off-bike",
    eyebrow: "Villa life",
    title: "Off-bike kit",
    description: "The villa has a pool and washing machine, and SCCC washes your cycling kit after each ride.",
    items: [
      {
        id: "casual-clothes",
        label: "A light casual wardrobe",
        note: "A few outfits are enough with laundry access.",
        tag: "Pack light",
      },
      {
        id: "underwear-sleepwear",
        label: "Underwear & sleepwear",
        note: "For seven nights at the villa.",
        tag: "Pack",
      },
      {
        id: "walking-shoes",
        label: "Walking shoes",
        note: "Your practical non-cycling pair.",
        tag: "Pack",
      },
      {
        id: "swimsuit",
        label: "Swimsuit",
        note: "The villa includes a pool; towels are supplied.",
        tag: "Optional fun",
      },
      {
        id: "toiletries",
        label: "Toiletries",
        note: "Bring the personal items you rely on.",
        tag: "Pack",
      },
      {
        id: "black-accessories",
        label: "Black accessories, if possible",
        note: "SCCC's photo-friendly preference—not a rule.",
        tag: "Style note",
      },
    ],
  },
  {
    id: "travel",
    number: "04",
    icon: "travel",
    eyebrow: "Keep these with you",
    title: "Travel & admin",
    description: "One compact document-and-power kit prevents the avoidable travel-day problems.",
    items: [
      {
        id: "passport-id",
        label: "Passport or required ID",
        note: "Check entry and return validity for your nationality.",
        tag: "Keep with you",
      },
      {
        id: "passport-copy",
        label: "Photocopy of passport",
        note: "Requested on SCCC's official list.",
        tag: "Pack",
      },
      {
        id: "medications",
        label: "Medications & prescriptions",
        note: "Keep them in your personal item.",
        tag: "Keep with you",
      },
      {
        id: "phone-charger",
        label: "Phone & charger",
        note: "SCCC uses WhatsApp during camp.",
        tag: "Keep with you",
      },
      {
        id: "plug-adapter",
        label: "Plug adapter",
        note: "Only if your plugs are not compatible in Spain.",
        tag: "If needed",
      },
      {
        id: "payment",
        label: "Payment card & a little euro cash",
        note: "Confirm the card works abroad; ATM fees may apply.",
        tag: "Pack",
      },
      {
        id: "insurance",
        label: "Travel & cycling insurance details",
        note: "Include rental-bike damage and personal injury cover.",
        tag: "Prepare",
      },
      {
        id: "flight-itinerary",
        label: "Flight & shuttle itinerary",
        note: "PMI arrival and departure details, available offline.",
        tag: "Keep with you",
      },
      {
        id: "staff-contact",
        label: "SCCC airport contact on paper",
        note: "Useful if your phone is flat or unavailable.",
        tag: "Keep with you",
      },
    ],
  },
];

export const providedGroups = [
  {
    icon: "bike",
    title: "Bike setup",
    items: [
      "Carbon rental bike",
      "Power meter",
      "Bike computer",
      "Heart-rate monitor",
      "Two water bottles",
      "Helmet",
    ],
  },
  {
    icon: "support",
    title: "On the road",
    items: [
      "Support vehicle",
      "Mechanical support & common spares",
      "Ride nutrition & drinks",
      "Extra-clothing storage",
      "First-aid equipment",
      "Daily bike maintenance",
    ],
  },
  {
    icon: "recovery",
    title: "Wear & recover",
    items: [
      "SCCC bib shorts, jersey & socks",
      "SCCC T-shirt & backpack",
      "Chamois cream & sunscreen",
      "Six post-ride massages",
      "Compression boots & Compex",
      "Laundry net",
    ],
  },
  {
    icon: "villa",
    title: "Villa & fuel",
    items: [
      "Meals and drinks",
      "Shower & pool towels",
      "Wi-Fi and swimming pool",
      "Cycling-kit wash after every ride",
      "Washing machine for personal clothes",
      "Triple USB charger",
    ],
  },
];

export const prepSteps = [
  {
    id: "prep-bike-fit",
    when: "By 26 Sep",
    title: "Lock the bike fit",
    detail:
      "Send SCCC your final height, inseam, saddle height, setback, and requested measurements at least three weeks before camp; confirm rental-bike sizing.",
  },
  {
    id: "prep-travel-admin",
    when: "Now",
    title: "Close the travel loops",
    detail:
      "Confirm PMI flights and shuttle details, insurance, card use abroad, phone roaming, WhatsApp, and any dietary or allergy needs with SCCC.",
  },
  {
    id: "prep-taper",
    when: "Final week",
    title: "Taper—do not cram",
    detail:
      "SCCC suggests cutting training volume 30–50%, keeping a little intensity, taking one or two full rest days, sleeping 7–9 hours, and testing shoes, cleats, and chargers.",
  },
  {
    id: "prep-forecast",
    when: "2–3 days out",
    title: "Make the final layer call",
    detail:
      "Check the live Pollença and Tramuntana forecast. The 10–22°C / 50–71°F figure is a planning range, not the 2026 forecast.",
  },
  {
    id: "prep-arrival",
    when: "Arrival day",
    title: "Protect Sunday's FTP test",
    detail:
      "Do not train before flying. Hydrate, settle onto local time, attend the evening briefing and bike fit, then arrive at the first ride rested.",
  },
];
