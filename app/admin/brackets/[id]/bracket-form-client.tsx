"use client";

import BracketForm from "../create/bracket-form"; // adjust path if yours differs

export default function BracketFormClient({
  initial,
  mode,
}: {
  initial: any;
  mode: "update";
}) {
  return <BracketForm initial={initial} mode={mode} />;
}
