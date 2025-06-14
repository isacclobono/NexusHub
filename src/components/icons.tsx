import type { SVGProps } from 'react';
import { Share2 } from 'lucide-react'; // Using Share2 as a placeholder for a nexus-like icon

export const Icons = {
  logo: (props: SVGProps<SVGSVGElement>) => (
    <Share2 {...props} />
  ),
  // Add other custom icons here if needed
};

export const NexusHubLogo = (props: { className?: string; size?: number }) => (
  <div className="flex items-center space-x-2">
    <Share2 className={props.className} size={props.size || 24} color="hsl(var(--primary))" />
    <span className="font-headline font-bold text-lg text-primary">NexusHub</span>
  </div>
);
