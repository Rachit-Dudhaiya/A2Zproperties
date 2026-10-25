import { useState } from "react";

const WhatsAppIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.451-4.437-9.885-9.889-9.885-5.452 0-9.886 4.434-9.889 9.885.002 2.17.639 4.135 1.739 5.817l-1.192 4.355 4.462-1.173z" />
  </svg>
);

const WhatsAppButton = () => {
  const phoneNumber = "916353388626";
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=Hello%20A%20TO%20Z%20Properties%2C%20I%20am%20interested%20in%20property%20consultation.`;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <aside aria-label="Quick WhatsApp assistance" className="fixed bottom-6 right-6 z-50">
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative flex items-center bg-[#25D366] hover:bg-[#20ba5a] text-white p-3.5 sm:p-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-400"
        aria-label="Chat with A TO Z Properties on WhatsApp"
      >
        {/* Soft pulse aura */}
        <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-30 animate-ping pointer-events-none" />

        <WhatsAppIcon />

        {/* Hover label pill */}
        <span
          className={`overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap text-sm font-semibold tracking-wide ${
            isHovered ? "max-w-xs ml-2 pr-2 opacity-100" : "max-w-0 opacity-0"
          }`}
        >
          Chat with Us
        </span>
      </a>
    </aside>
  );
};

export default WhatsAppButton;