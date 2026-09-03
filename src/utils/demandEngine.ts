export function getDemandData(tourId: string) {
  // Use the tourId string to generate a deterministic pseudo-random number
  let hash = 0;
  for (let i = 0; i < tourId.length; i++) {
    hash = tourId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const viewing = Math.abs(hash % 10) + 1; // 1 to 10 people viewing
  const booked = Math.abs((hash * 31) % 15) + 5; // 5 to 20 booked recently
  const spotsLeft = Math.abs((hash * 17) % 5); // 0 to 4 spots left
  
  // Decide which badge to show based on hash
  const badgeType = Math.abs(hash % 3);
  
  if (badgeType === 0 && spotsLeft > 0 && spotsLeft <= 3) {
    return { type: 'scarcity', text: `⚡ Últimos ${spotsLeft} cupos`, color: 'text-orange-600 bg-orange-50 border-orange-200' };
  } else if (badgeType === 1) {
    return { type: 'popular', text: `🔥 ${viewing} personas viendo esto`, color: 'text-red-600 bg-red-50 border-red-200' };
  } else {
    return { type: 'booked', text: `✨ Reservado ${booked} veces hoy`, color: 'text-verde-selva bg-[#EDE6D9] border-[#1E4D2B]/20' };
  }
}
