import { useEffect, useState } from "react";

export function useGoogleMapsScript(apiKey: string): boolean {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.google?.maps) {
      setLoaded(true);
      return;
    }

    const callbackName = "initGoogleMapsCallback";
    (window as any)[callbackName] = () => {
      setLoaded(true);
    };

    const existingScript = document.getElementById("google-maps-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "google-maps-script";
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=${callbackName}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    } else {
      // If it exists but maps is not yet defined, wait for callback
      const checkInterval = setInterval(() => {
        if (window.google?.maps) {
          setLoaded(true);
          clearInterval(checkInterval);
        }
      }, 100);
      return () => clearInterval(checkInterval);
    }
  }, [apiKey]);

  return loaded;
}
