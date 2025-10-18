"use client";

import Home from "../comp/Home";
import { Navbar } from "../comp/Navbar";

export default function DashboardPage() {
    return (
        <>
            <main className="min-h-screen bg-gray-500 text-white p-4">
                <Home />
            </main>
        </>
    );
}