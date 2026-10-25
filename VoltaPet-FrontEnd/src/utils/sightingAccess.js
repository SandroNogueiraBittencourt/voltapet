/** O botão de avistamento só deve aparecer para pessoas que não publicaram o pet. */
export function canReportSighting(pet) {
  return pet?.status === "LOST" && pet?.isOwner === false;
}
