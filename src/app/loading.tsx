export default function Loading() {
    return (
        <div className="fixed inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-50">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-cyan-400"></div>
        </div>
    );
}
