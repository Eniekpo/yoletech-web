---
title: Building a Fast Client Booking Portal With Next.js and Supabase
date: 2026-10-30
category: Full-Stack Web Development
coverImage: /assets/blog/building-a-fast-client-booking-portal-with-next.js-and-supabase.jpg
summary: Service businesses lose up to 35 percent of prospective leads when
  clients must wait for manual email confirmations to schedule consultations.
  This guide shows you how to build a live booking portal using Next.js,
  TypeScript, and Supabase that validates availability and locks client slots in
  under two seconds.
featured: false
---
## How Slow Booking Workflows Cost Service Businesses Revenue

When a founder or operations manager visits your website to schedule a consultation, speed determines whether you secure the project. Making a prospect wait 12 to 24 hours for manual email scheduling causes up to a 35 percent drop in completed bookings. External scheduling widgets often add 1.8 seconds of blocking JavaScript to your page load time and keep your lead data trapped in a separate system.

At YOLETECH, we solve this bottleneck by engineering native booking interfaces directly inside client web platforms. By pairing a Next.js frontend with a Supabase PostgreSQL backend, you can display open time slots in under 400 milliseconds and prevent double bookings at the database level.

## Step 1: Setting Up Your Supabase Database Schema

Before writing frontend code, you need a relational table that enforces unique time slots. Open your Supabase project dashboard, navigate to the SQL Editor, and run the following query to create your `service_bookings` table:

```
sql
CREATE TABLE service_bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_email TEXT NOT NULL,
    booking_date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_date_slot UNIQUE (booking_date, time_slot)
);

CREATE INDEX idx_bookings_date ON service_bookings (booking_date);
```

The \`unique_date_slot\` constraint guarantees that even if two users click the same appointment slot at the exact same millisecond, PostgreSQL will accept the first request and reject the duplicate automatically.

### Step 2:

Installing Dependencies and Configuring Environment VariablesOpen your terminal inside an existing Next.js project (configured with the App Router and TypeScript) and install the official Supabase client library:

```
bash
npm install @supabase/supabase-js
```

Create a file named \`.env.local\` in the root directory of your project and add your Supabase project URL and anonymous public key:

```
NEXT_PUBLIC_SUPABASE_URL=[https://your-project-id.supabase.co](https://your-project-id.supabase.co)
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key
```

### Step 3:

Building the Next.js Booking ComponentCreate a new file at \`app/book/page.tsx\` and paste the complete working component below. This file initializes the Supabase client, queries already reserved slots for the selected date, and inserts new bookings when the client submits the form:

```
tsx
"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const AVAILABLE_SLOTS = ["09:00 AM", "11:00 AM", "02:00 PM", "04:00 PM"];

export default function BookingPage() {
  const [selectedDate, setSelectedDate] = useState<string>("2026-11-05");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");
  const [clientEmail, setClientEmail] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");

  useEffect(() => {
    async function fetchReservedSlots() {
      const { data, error } = await supabase
        .from("service_bookings")
        .select("time_slot")
        .eq("booking_date", selectedDate);

      if (!error && data) {
        setBookedSlots(data.map((row) => row.time_slot));
      }
    }
    fetchReservedSlots();
  }, [selectedDate]);

  async function handleBookingSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatusMessage("Confirming your slot...");

    const { error } = await supabase.from("service_bookings").insert([
      {
        client_name: clientName,
        client_email: clientEmail,
        booking_date: selectedDate,
        time_slot: selectedSlot,
      },
    ]);

    if (error) {
      setStatusMessage("This slot was just taken. Please pick another time.");
      return;
    }

    setBookedSlots([...bookedSlots, selectedSlot]);
    setSelectedSlot("");
    setClientName("");
    setClientEmail("");
    setStatusMessage("Booking confirmed! Our team will meet with you on schedule.");
  }

  return (
    <main className="max-w-xl mx-auto p-6 bg-white rounded-lg shadow">
      <h1 className="text-2xl font-bold mb-4">Schedule a Technical Consultation</h1>
      <form onSubmit={handleBookingSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Select Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full border p-2 rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Available Time Slots</label>
          <div className="grid grid-cols-2 gap-2">
            {AVAILABLE_SLOTS.map((slot) => {
              const isTaken = bookedSlots.includes(slot);
              return (
                <button
                  type="button"
                  key={slot}
                  disabled={isTaken}
                  onClick={() => setSelectedSlot(slot)}
                  className={`p-2 border rounded text-sm font-semibold ${
                    isTaken
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                      : selectedSlot === slot
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-800"
                  }`}
                >
                  {slot} {isTaken ? "(Booked)" : ""}
                </button>
              );
            })}
          </div>
        </div>

        <input
          type="text"
          placeholder="Your Full Name"
          value={clientName}
          onChange={(e) => setClientName(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />

        <input
          type="email"
          placeholder="Your Work Email"
          value={clientEmail}
          onChange={(e) => setClientEmail(e.target.value)}
          className="w-full border p-2 rounded"
          required
        />

        <button
          type="submit"
          disabled={!selectedSlot}
          className="w-full bg-green-600 text-white font-bold p-3 rounded disabled:opacity-50"
        >
          Confirm Appointment
        </button>

        {statusMessage && <p className="text-sm font-medium mt-2">{statusMessage}</p>}
      </form>
    </main>
  );
}
```



Start your local development server by running **\`npm run dev\`** in your terminal and open **\`http://localhost:3000/book\`** in your browser to test live slot locking.

### Launch Your Custom Web Platform With YOLETECH

Whether you need a high speed service platform, an interactive client portal, or automated backend workflows, YOLETECH builds production ready software tailored to your business goals.

Explore our portfolio and web development services: https://yolestica.com/services

Contact us directly: 

Email: yoletech@yolestica.com  |  WhatsApp: +234 802 552 6389
