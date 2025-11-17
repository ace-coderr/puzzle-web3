"use client"

import React from "react";
import HomeComponent from "./components/home";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {Navbar} from "./components/navbar";


export default function Home() {

  return (
    <>
      <main>
        <HomeComponent />        
      </main>
    </>
  );
}