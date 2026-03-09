import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { TopNav } from "./TopNav";

export function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-[#F8F9FB]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 ml-16 md:ml-[240px] transition-all duration-300">
        <TopNav />
        <main className="flex-1 overflow-auto overflow-x-hidden mt-16 md:mt-[72px] p-4 md:p-8">
           <Outlet />
        </main>
      </div>
    </div>
  );
}
