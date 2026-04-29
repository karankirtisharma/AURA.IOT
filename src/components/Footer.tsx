export default function Footer() {
  return (
    <footer className="sticky bottom-0 w-full flex justify-center py-6 pb-8 z-50 mt-auto pointer-events-none">
      <div className="flex items-center gap-4 px-6 py-3 bg-card-bg/80 border border-card-border rounded-full backdrop-blur-xl pointer-events-auto shadow-md">
        <p className="text-[10px] text-muted-text uppercase tracking-[0.3em] font-medium">
          Made by 
          <span className="text-brand-text font-bold transition-all duration-300 ml-2">Karan</span>
          <span className="mx-2">and</span>
          <span className="text-brand-text font-bold transition-all duration-300">Paramnoor</span>
        </p>
      </div>
    </footer>
  );
}
