import React from 'react';

export const Slack = React.forwardRef<SVGSVGElement, React.ComponentPropsWithoutRef<'svg'>>(
  ({ className, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <rect x="13" y="2" width="3" height="8" rx="1.5" />
      <path d="M19 8.5a1.5 1.5 0 1 1-3 0V7a1.5 1.5 0 0 1 3 0Z" />
      <rect x="9" y="14" width="3" height="8" rx="1.5" />
      <path d="M5 15.5a1.5 1.5 0 1 1 3 0V17a1.5 1.5 0 0 1-3 0Z" />
      <rect x="2" y="9" width="8" height="3" rx="1.5" />
      <path d="M8.5 5a1.5 1.5 0 1 1 0 3H7a1.5 1.5 0 0 1 0-3Z" />
      <rect x="14" y="13" width="8" height="3" rx="1.5" />
      <path d="M15.5 19a1.5 1.5 0 1 1 0-3H17a1.5 1.5 0 0 1 0 3Z" />
    </svg>
  ),
);
Slack.displayName = 'Slack';
