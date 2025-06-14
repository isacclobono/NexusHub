
import type { SVGProps } from 'react';
import { Share2, Network } from 'lucide-react'; // Using Network as a more fitting logo icon

export const Icons = {
  logo: (props: SVGProps<SVGSVGElement>) => (
    <Network {...props} /> // Changed to Network
  ),
  // Add other custom icons here if needed
};

export const NexusHubLogo = (props: { className?: string; size?: number }) => (
  <div className="flex items-center space-x-2">
    <Network className={props.className} size={props.size || 24} color="hsl(var(--primary))" />
    <span className="font-headline font-bold text-lg text-primary">NexusHub</span>
  </div>
);
