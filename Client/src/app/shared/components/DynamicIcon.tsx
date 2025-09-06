import { Suspense, useState, useEffect } from 'react';
import type { IconType } from 'react-icons';

interface DynamicIconProps {
  name: string;
  size?: string;
}

export default function DynamicIcon({ name, size = '20' }: DynamicIconProps) {
  const [IconComponent, setIconComponent] = useState<IconType | null>(null);

  useEffect(() => {
    // Reset IconComponent when name changes
    setIconComponent(null);

    // Dynamically import the react-icons/gi module
    import('react-icons/gi')
      .then((module) => {
        // Check if the icon exists in the module
        const icon = module[name as keyof typeof module] as IconType | undefined;
        if (icon && typeof icon === 'function') {
          setIconComponent(() => icon);
        } else {
          console.error(`Icon "${name}" not found in react-icons/gi.`);
          setIconComponent(null);
        }
      })
      .catch((err) => {
        console.error(`Failed to load icon "${name}":`, err);
        setIconComponent(null);
      });
  }, [name]);

  if (!IconComponent) { 
    return null; // Or fallback: <GiQuestionMark size={20} color="#8b3a3a" />
  }

  return (
    <Suspense fallback={<span>Loading...</span>}>
      <IconComponent size={size}  />
    </Suspense>
  );
}