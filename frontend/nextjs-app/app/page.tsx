import Image from "next/image";
import Link from "next/link";
import { User, ShieldCheck } from "lucide-react";

export default function RootLandingPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col relative overflow-hidden">
      {/* Top section (white) */}
      <div className="flex-1 bg-white flex flex-col items-center pt-16 px-4 pb-32">
        <div className="mb-12 relative w-72 h-28 flex items-center justify-center">
          <Image 
            src="/crest_logo.png" 
            alt="CREST Logo" 
            fill 
            className="object-contain"
            priority
          />
        </div>

        {/* Cards container */}
        <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 z-10 relative mt-4">
          
          {/* Customer Portal Card */}
          <div className="bg-white rounded-xl shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden flex flex-col transition-transform hover:-translate-y-1 duration-300">
            <div className="p-8 flex-1">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-6 border border-blue-100">
                <User size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Customer Portal</h2>
              <p className="text-gray-500 leading-relaxed mb-6 text-sm">
                Access the UB Portal to submit complaints, track your ticket status, and securely view resolutions. The CREST system will keep a record of your progress and keep you apprised of the latest updates.
              </p>
            </div>
            <div className="p-8 pt-0 mt-auto">
              <Link 
                href="/ub_publicPortal" 
                className="inline-block bg-[#e50000] hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full transition-colors text-sm shadow-md"
              >
                Access Portal
              </Link>
            </div>
          </div>

          {/* Employee/Officer Portal Card */}
          <div className="bg-white rounded-xl shadow-2xl shadow-gray-200/50 border border-gray-100 overflow-hidden flex flex-col transition-transform hover:-translate-y-1 duration-300">
            <div className="p-8 flex-1">
              <div className="w-16 h-16 bg-gray-50 text-gray-800 rounded-full flex items-center justify-center mb-6 border border-gray-200">
                <ShieldCheck size={32} />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">UB CREST Staff Login</h2>
              <p className="text-gray-500 leading-relaxed mb-6 text-sm">
                For administrative staff and officers only. Login with your Officer credentials to manage the active queue, address complaints, and track policy-driven resolutions.
              </p>
            </div>
            <div className="p-8 pt-0 mt-auto">
              <Link 
                href="/ub_CREST/login" 
                className="inline-block bg-[#e50000] hover:bg-red-700 text-white font-bold py-3 px-8 rounded-full transition-colors text-sm shadow-md"
              >
                Login Now
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* Bottom section (red background styled after CUIMS) */}
      <div className="h-72 bg-[#e50000] absolute bottom-0 left-0 right-0 z-0 flex flex-col justify-end pb-8">
        <div className="container mx-auto px-4 w-full max-w-6xl flex justify-between items-end">
           <div className="text-white/90 text-sm font-bold tracking-wider uppercase">
             Union Bank of India • CREST Core
           </div>
           <div className="text-white/60 text-xs font-medium">
             Centralized Resolution & Escalation System
           </div>
        </div>
      </div>
    </div>
  );
}
