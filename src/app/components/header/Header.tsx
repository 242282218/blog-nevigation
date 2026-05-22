import { TypewriterLogo } from './TypewriterLogo';
import { CommandInput } from './CommandInput';
import { StatusIndicator } from './StatusIndicator';
import { Navigation } from './Navigation';

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full bg-white/70 backdrop-blur-xl border-b border-gray-200 shadow-header">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
                <TypewriterLogo />
                
                <div className="hidden flex-1 justify-center lg:flex">
                    <CommandInput />
                </div>

                <div className="flex items-center gap-3">
                    <CommandInput compact className="lg:hidden" />
                    <StatusIndicator />
                    <Navigation />
                </div>
            </div>
        </header>
    );
}
