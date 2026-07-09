"use client";

import { useState } from "react";
import { NearbyVenue, SelectedVenue } from "@/lib/checkin";
import CheckInVenuePicker from "@/components/CheckInVenuePicker";
import CheckInConfirmVenue from "@/components/CheckInConfirmVenue";
import CheckInForm from "@/components/CheckInForm";
import CheckInSuccess from "@/components/CheckInSuccess";

type Step =
  | { name: "entry" }
  | { name: "confirm"; venue: NearbyVenue }
  | { name: "form"; venue: SelectedVenue }
  | { name: "success"; venue: SelectedVenue };

export default function CheckInFlow() {
  const [step, setStep] = useState<Step>({ name: "entry" });

  return (
    <div className="flex flex-col gap-2 pb-12">
      {step.name === "entry" && (
        <CheckInVenuePicker
          onNearbyMatch={(venue) => setStep({ name: "confirm", venue })}
          onSelectVenue={(venue) => setStep({ name: "form", venue })}
        />
      )}

      {step.name === "confirm" && (
        <CheckInConfirmVenue
          venue={step.venue}
          onConfirm={() => setStep({ name: "form", venue: step.venue })}
          onNotThis={() => setStep({ name: "entry" })}
        />
      )}

      {step.name === "form" && (
        <CheckInForm
          venue={step.venue}
          onBack={() => setStep({ name: "entry" })}
          onSubmitted={() => setStep({ name: "success", venue: step.venue })}
        />
      )}

      {step.name === "success" && (
        <CheckInSuccess
          venue={step.venue}
          onRefresh={() => setStep({ name: "form", venue: step.venue })}
          onDone={() => setStep({ name: "entry" })}
        />
      )}
    </div>
  );
}
