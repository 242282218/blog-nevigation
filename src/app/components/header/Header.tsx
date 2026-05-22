import { TypewriterLogo } from './TypewriterLogo';
import { CommandInput } from './CommandInput';
import { StatusIndicator } from './StatusIndicator';
import { Navigation } from './Navigation';

export function Header() {
    return (
        <header className="sticky top-0 z-50 w-full border-b border-gray-200 bg-background/85 shadow-header backdrop-blur-xl">
            <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                <TypewriterLogo />
                
                <div className="hidden flex-1 justify-center lg:flex">
                    <CommandInput />
                </div>

                <div className="flex items-center gap-2 sm:gap-3">
                    <CommandInput compact className="lg:hidden" />
                    <StatusIndicator />
                    <Navigation />
                </div>
            </div>
        </header>
    );
}
