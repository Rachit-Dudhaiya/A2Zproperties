const WhatsAppIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.451-4.437-9.885-9.889-9.885-5.452 0-9.886 4.434-9.889 9.885.002 2.17.639 4.135 1.739 5.817l-1.192 4.355 4.462-1.173z" />
  </svg>
);

const WhatsAppButton = () => {
  const phoneNumber = "916353388626";
  const whatsappUrl = `https://wa.me/${phoneNumber}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-8 right-8 bg-[#25D366] text-white p-3 rounded-full shadow-lg z-50 flex items-center justify-center transition-transform hover:scale-110 animate-bounce"
      aria-label="Chat on WhatsApp"
    >
      <WhatsAppIcon />
    </a>
  );
};

export default WhatsAppButton;