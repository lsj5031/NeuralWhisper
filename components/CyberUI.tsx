import React, { InputHTMLAttributes, ButtonHTMLAttributes } from 'react';

export const CyberCard: React.FC<{ children?: React.ReactNode; className?: string, title?: string }> = ({ children, className = '', title }) => (
  <div className={`relative bg-cyber-panel border border-cyber-dim p-6 overflow-hidden group ${className}`}>
    {/* Decorative Corners */}
    <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-cyber-cyan transition-all duration-300 group-hover:w-4 group-hover:h-4" />
    <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-cyber-cyan transition-all duration-300 group-hover:w-4 group-hover:h-4" />
    <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-cyber-cyan transition-all duration-300 group-hover:w-4 group-hover:h-4" />
    <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-cyber-cyan transition-all duration-300 group-hover:w-4 group-hover:h-4" />
    
    {title && (
      <div className="absolute -top-3 left-6 px-2 bg-cyber-black text-cyber-cyan font-display text-sm tracking-widest uppercase border border-cyber-dim">
        {title}
      </div>
    )}
    
    {children}
  </div>
);

export const CyberInput = React.forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={`bg-cyber-black border border-cyber-dim text-cyber-cyan font-mono p-3 w-full focus:outline-none focus:border-cyber-cyan focus:shadow-[0_0_10px_rgba(0,240,255,0.3)] placeholder-gray-700 transition-all ${className}`}
    {...props}
  />
));

export const CyberSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(({ className, ...props }, ref) => (
  <select
    ref={ref}
    className={`bg-cyber-black border border-cyber-dim text-cyber-cyan font-mono p-3 w-full focus:outline-none focus:border-cyber-cyan focus:shadow-[0_0_10px_rgba(0,240,255,0.3)] transition-all appearance-none ${className}`}
    {...props}
  />
));

export const CyberButton = ({ children, variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) => {
  const baseStyle = "relative px-6 py-3 font-display font-bold text-lg uppercase tracking-wider transition-all duration-200 overflow-hidden group border";
  
  const variants = {
    primary: "border-cyber-cyan text-cyber-cyan hover:bg-cyber-cyan hover:text-cyber-black hover:shadow-[0_0_15px_rgba(0,240,255,0.6)]",
    secondary: "border-gray-600 text-gray-400 hover:border-white hover:text-white",
    danger: "border-cyber-pink text-cyber-pink hover:bg-cyber-pink hover:text-white hover:shadow-[0_0_15px_rgba(255,0,60,0.6)]",
  };

  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
      {/* Glitch effect on hover overlay */}
      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-75" />
    </button>
  );
};

export const CyberLabel = ({ children, htmlFor }: { children?: React.ReactNode; htmlFor?: string }) => (
  <label htmlFor={htmlFor} className="block text-xs font-display tracking-widest text-gray-500 mb-1 uppercase">
    {children}
  </label>
);

export const CyberToggle = ({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) => (
  <div className="flex items-center cursor-pointer group" onClick={() => onChange(!checked)}>
    <div className={`w-10 h-5 border border-cyber-dim relative transition-colors ${checked ? 'border-cyber-cyan bg-cyber-cyan/10' : 'bg-cyber-black'}`}>
      <div className={`absolute top-0.5 w-3.5 h-3.5 bg-current transition-all duration-300 ${checked ? 'left-[calc(100%-1.1rem)] text-cyber-cyan shadow-[0_0_8px_#00f0ff]' : 'left-0.5 text-gray-600'}`} />
    </div>
    <span className={`ml-3 font-mono text-sm ${checked ? 'text-cyber-cyan' : 'text-gray-500'}`}>{label}</span>
  </div>
);

export const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-8 border-b border-cyber-dim pb-4">
    <h2 className="text-3xl font-display font-black text-white uppercase tracking-tighter">
      <span className="text-cyber-cyan mr-2">//</span>
      {title}
    </h2>
    {subtitle && <p className="text-gray-500 font-mono text-sm mt-1 ml-6">{subtitle}</p>}
  </div>
);
