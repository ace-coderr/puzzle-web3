"use client"

import React from "react";
import HomeComponent from "./comp/Home";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {Navbar} from "./comp/Navbar";


export default function Home() {

  return (
    <>
      <main>
        <HomeComponent />
      </main>
    </>
  );
}