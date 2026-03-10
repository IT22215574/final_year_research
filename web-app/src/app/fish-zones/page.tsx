"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Dynamically import map component to avoid SSR issues
const FishZoneMapView = dynamic(() => import("@/components/FishZoneMapView"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading Fish Zone Map...</p>
      </div>
    </div>
  ),
});

export default function FishZoneMapPage() {
  return (
    <div className="w-full h-screen">
      <FishZoneMapView />
    </div>
  );
}
