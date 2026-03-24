import PriorityQueue from "@/components/queue/PriorityQueue";

export default function QueuePage() {
  return (
    <div className="flex-1 bg-transparent p-6 md:p-10 space-y-10 max-w-7xl mx-auto w-full">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tighter uppercase transition-colors duration-500 dark:text-white text-black">Live Queue</h1>
          <p className="text-xs uppercase tracking-widest mt-2 font-bold transition-colors duration-500 dark:text-blue-300 text-gray-600">Real-time Emotion-Decay Ordering</p>
        </div>
      </div>

      <div className="rounded-3xl p-8 border transition-all duration-500
        dark:bg-black/80 dark:backdrop-blur-xl dark:border-white/10 dark:shadow-2xl
        bg-white border-gray-200 shadow-xl hover:border-black">
        <PriorityQueue />
      </div>
    </div>
  );
}
