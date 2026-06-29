interface Window {
  google: any;
}

declare namespace google {
  namespace maps {
    class Map {
      constructor(element: HTMLElement, options: any);
      panTo(latLng: any): void;
      setZoom(zoom: number): void;
    }
    class Marker {
      constructor(options: any);
      setMap(map: Map | null): void;
      addListener(eventName: string, handler: () => void): void;
    }
    class InfoWindow {
      constructor(options?: any);
      open(map: Map, marker: Marker): void;
    }
    enum SymbolPath {
      CIRCLE = 0
    }
  }
}
