'use client';

import type { FormEvent } from 'react'
import { FlipCardDemo } from './components/FlipCardDemo'
import { Header } from './components/header';
import { Footer } from './components/footer';



export default function Home() {

  const handleClick = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("clicked")
  }

  return (
    <>
      <Header />
      <div style={{margin: '10px 0', height: 'calc(100vh - 100px)', position: 'relative' }}>
        <FlipCardDemo />
        <div className="bg-red-500 relative p-4">
          <h1 className="text-center text-2xl font-bold text-white">Welcome to the Home Page</h1>
          <p className="text-center text-white mt-2">This is the main content area of the home page.</p>
        </div>
      </div>
    <Footer />
    </>

  );
}
