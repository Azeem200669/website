const MainLayout = ({ children }) => {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-950 text-white bg-[radial-gradient(circle_at_top,_#0f172a,_#020617)]">

      {/* Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-white/10 bg-black/40 backdrop-blur-xl md:flex md:flex-col">
        {/* Sidebar content goes here */}
      </aside>

      {/* Main Content Area */}
      <main className="flex flex-1 flex-col overflow-y-auto">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;