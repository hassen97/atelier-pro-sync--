import { useQuery } from "@tanstack/react-query";

interface AppleDevice {
  name: string;
  identifier: string;
  boardconfig: string;
  platform: string;
  cpid: number;
  bdid: number;
}

export function useAppleDevices() {
  return useQuery({
    queryKey: ["apple-devices"],
    queryFn: async () => {
      const response = await fetch("https://api.ipsw.me/v4/devices");
      if (!response.ok) throw new Error("Failed to fetch Apple devices");
      const devices: AppleDevice[] = await response.json();
      
      // Filter only iPhones and remove duplicates
      const iphones = devices
        .filter(d => d.name.startsWith("iPhone"))
        .map(d => d.name)
        .filter((name, index, self) => self.indexOf(name) === index)
        .sort((a, b) => {
          // Sort by version number (iPhone 16 before iPhone 15, etc.)
          const numA = parseInt(a.match(/iPhone (\d+)/)?.[1] || "0");
          const numB = parseInt(b.match(/iPhone (\d+)/)?.[1] || "0");
          if (numA !== numB) return numB - numA;
          // Secondary sort alphabetically for same number
          return a.localeCompare(b);
        });
      
      return iphones;
    },
    staleTime: 24 * 60 * 60 * 1000, // Cache 24h
    gcTime: 7 * 24 * 60 * 60 * 1000, // Keep in cache 7 days
  });
}
