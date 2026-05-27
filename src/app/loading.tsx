export default function Loading() {
    return (
        <div className="flex min-h-[60vh] items-center justify-center">
            <div className="flex items-center gap-3 text-muted">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
                <span className="font-mono text-sm">loading...</span>
            </div>
        </div>
    );
}
