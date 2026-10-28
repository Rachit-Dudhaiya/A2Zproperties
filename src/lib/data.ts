export const VISIT_CHARGE = 200;
export const MAX_PROPERTIES_PER_VISIT = 3;
export const UPI_ID = "6353388626@amazonpay";
export const GOOGLE_SHEET_URL = "https://script.google.com/macros/s/AKfycbyplFjo_wcM_3yYOsTI07uQxrR7dPapOb8ttc-zSFdz1W48R0GLXui8aSbbHox1Y76y5Q/exec";

export const TIME_SLOTS_MORNING = [
  "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM", "12:00 PM", "12:30 PM", "1:00 PM"
];

export const TIME_SLOTS_EVENING = [
  "4:00 PM", "4:30 PM", "5:00 PM", "5:30 PM",
  "6:00 PM", "6:30 PM", "7:00 PM", "7:30 PM",
  "8:00 PM", "8:30 PM", "9:00 PM", "9:30 PM", "10:00 PM"
];

export const ALL_TIME_SLOTS = [...TIME_SLOTS_MORNING, ...TIME_SLOTS_EVENING];

export const MAIN_PHONE = "6353388626";
export const MAIN_PHONE_DISPLAY = "63533 88626";
export const SECONDARY_PHONE = "9824036457";
export const SECONDARY_PHONE_DISPLAY = "98240 36457";
export const PHONE_NUMBER = "6353388626";

export const OFFICE_ADDRESS = "Goverdhan chowk, 150 Feet Ring Rd, Madhav Park, Punit Nagar, Mavdi, Rajkot 360004";
export const OFFICE_HOURS = "Mon–Sun 10:00 AM – 10:00 PM";
export const OFFICE_MAP_URL = "https://maps.google.com/?cid=13291349262997318503";

export function formatPrice(price: number): string {
  if (!price && price !== 0) return "₹0";
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} Lac`;
  return `₹${price.toLocaleString("en-IN")}`;
}

export function cleanListingText(text: string): string {
  if (!text) return "";
  let clean = text
    .replace(/\bbunglow\b/gi, "Bungalow")
    .replace(/\bSami[\s-]furnished\b/gi, "Semi-Furnished")
    .replace(/\bsemi[\s-]furnished\b/gi, "Semi-Furnished")
    .replace(/\bterracetarrace\b/gi, "Terrace")
    .replace(/2\s*bhk\s*furnished\s*flat\s*at\s*new\s*jagnath/gi, "2 BHK Furnished Flat at New Jagnath");

  return clean;
}

export function toTitleCase(str: string): string {
  if (!str) return "";
  const cleaned = cleanListingText(str);
  return cleaned
    .toLowerCase()
    .split(" ")
    .map((word) => {
      if (word.toUpperCase() === "BHK") return "BHK";
      if (word.toUpperCase() === "RK") return "RK";
      if (word.toUpperCase() === "INR") return "INR";
      if (word.toUpperCase() === "KKV") return "KKV";
      if (word.toUpperCase() === "FT") return "Ft";
      if (word.length === 0) return "";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function getOptimizedCloudinaryUrl(url: string, width: number = 800): string {
  if (!url || typeof url !== "string") return url;
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  
  // Prevent duplicate transforms
  if (url.includes("/upload/f_auto") || url.includes("/upload/w_") || url.includes("/upload/q_auto")) {
    return url;
  }
  
  const parts = url.split("/upload/");
  if (parts.length === 2) {
    return `${parts[0]}/upload/f_auto,q_auto,w_${width}/${parts[1]}`;
  }
  return url;
}

