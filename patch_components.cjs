const fs = require('fs');

// Patch Header.tsx
let headerContent = fs.readFileSync('src/components/Header.tsx', 'utf8');
headerContent = headerContent.replace(/language === 'es' \? 'Buses Locales' : 'Local Buses'/g, "t('localBuses')");
headerContent = headerContent.replace(/language === 'es' \? 'Iniciar Sesión' : 'Sign In'/g, "t('signIn')");
headerContent = headerContent.replace(/language === 'es' \? 'Cotizar Paquete de Viaje' : 'Build Custom Trip Package'/g, "t('buildCustomTripTitle')");
headerContent = headerContent.replace(/language === 'es' \? 'Cotizar Paquete' : 'Build Package'/g, "t('buildCustomTrip')");
fs.writeFileSync('src/components/Header.tsx', headerContent);

// Patch TourCard.tsx
let tourCardContent = fs.readFileSync('src/components/TourCard.tsx', 'utf8');
tourCardContent = tourCardContent.replace(/language === 'es' \? 'Cancelación Gratis' : 'Free Cancellation'/g, "t('freeCancellation')");
tourCardContent = tourCardContent.replace(/tour\.tourType === 'private' \? \(language === 'es' \? 'Privado' : 'Private'\) : \(language === 'es' \? 'Grupal' : 'Group'\)/g, "tour.tourType === 'private' ? t('privateTour') : t('groupTour')");
tourCardContent = tourCardContent.replace(/language === 'es' \? 'Comparar tour' : 'Compare tour'/g, "t('compareTour')");
tourCardContent = tourCardContent.replace(/language === 'es' \? 'Desde ' : 'From '/g, "t('fromPrice')");
tourCardContent = tourCardContent.replace(/language === 'es' \? 'Consultar' : 'Check'/g, "t('checkDetails')");
tourCardContent = tourCardContent.replace(/language === 'es' \? 'Cerrar mapa' : 'Close map'/g, "t('closeMap')");
tourCardContent = tourCardContent.replace(/language === 'es' \? 'Cerrar' : 'Close'/g, "t('close')");
tourCardContent = tourCardContent.replace(/language === 'es' \? 'Recogida en Hoteles:' : 'Hotel Pickup:'/g, "t('hotelPickup')");
tourCardContent = tourCardContent.replace(/language === 'es' \? 'hoteles en zona' : 'hotels covered'/g, "t('hotelsCovered')");
tourCardContent = tourCardContent.replace(/language === 'es' \? 'Horarios Salida:' : 'Departure Times:'/g, "t('departureTimes')");
tourCardContent = tourCardContent.replace(/language === 'es' \? 'Reservar Tour' : 'Book Tour'/g, "t('bookTour')");
tourCardContent = tourCardContent.replace(/language === 'es' \? 'Salir del Mapa' : 'Exit Map'/g, "t('exitMap')");
fs.writeFileSync('src/components/TourCard.tsx', tourCardContent);

// Patch InteractiveMap.tsx
let mapContent = fs.readFileSync('src/components/InteractiveMap.tsx', 'utf8');
mapContent = mapContent.replace(/language === 'es' \? 'Haz clic en los marcadores para explorar detalles \\(Disponibles sin Internet\\)' : 'Click markers to explore details \\(Available Offline\\)'/g, "t('clickMarkersOffline')");
mapContent = mapContent.replace(/language === 'es' \? 'Precio Desde' : 'Price From'/g, "t('priceFrom')");
mapContent = mapContent.replace(/language === 'es' \? 'Ver Detalles' : 'View Details'/g, "t('viewDetails')");
mapContent = mapContent.replace(/language === 'es' \? 'Acceso Principal:' : 'Primary Access:'/g, "t('primaryAccess')");
mapContent = mapContent.replace(/language === 'es' \? 'Clima & Ropa:' : 'Weather & Packing:'/g, "t('weatherPacking')");
mapContent = mapContent.replace(/language === 'es' \? 'Salir del Mapa y Ver Todos los Tours' : 'Exit Map & View All Tours'/g, "t('exitMapViewAll')");
fs.writeFileSync('src/components/InteractiveMap.tsx', mapContent);

console.log('patched components');
