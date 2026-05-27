export default function PostLoading() {
    return (
        <div className="mx-auto max-w-3xl pb-10">
            <div className="mb-5 h-9 w-24 animate-pulse rounded-token-button bg-surface" />
            <div className="space-y-4 py-8">
                <div className="h-4 w-20 animate-pulse rounded bg-surface" />
                <div className="h-8 w-3/4 animate-pulse rounded bg-surface" />
                <div className="flex gap-3">
                    <div className="h-5 w-16 animate-pulse rounded-token-badge bg-surface" />
                    <div className="h-5 w-24 animate-pulse rounded bg-surface" />
                    <div className="h-5 w-20 animate-pulse rounded bg-surface" />
                </div>
            </div>
            <div className="space-y-3 rounded-token-card border border-border bg-surface p-4 md:p-6">
                {Array.from({ length: 8 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-4 animate-pulse rounded bg-surface"
                        style={{ width: `${60 + Math.random() * 40}%` }}
                    />
                ))}
            </div>
        </div>
    );
}
