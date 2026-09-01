const fs = require('fs');
let content = fs.readFileSync('src/utils/i18n.ts', 'utf8');

const additions = `
  freeCancellation: { es: 'Cancelación Gratis', en: 'Free Cancellation', de: 'Kostenlose Stornierung', fr: 'Annulation Gratuite', zh: '免费取消', ja: 'キャンセル無料' },
  privateTour: { es: 'Privado', en: 'Private', de: 'Privat', fr: 'Privé', zh: '私人', ja: 'プライベート' },
  groupTour: { es: 'Grupal', en: 'Group', de: 'Gruppe', fr: 'Groupe', zh: '团体', ja: 'グループ' },
  compareTour: { es: 'Comparar tour', en: 'Compare tour', de: 'Tour vergleichen', fr: 'Comparer le tour', zh: '比较旅游', ja: 'ツアーを比較' },
  fromPrice: { es: 'Desde ', en: 'From ', de: 'Ab ', fr: 'À partir de ', zh: '起 ', ja: 'から ' },
  checkDetails: { es: 'Consultar', en: 'Check', de: 'Prüfen', fr: 'Vérifier', zh: '查看', ja: '確認する' },
  closeMap: { es: 'Cerrar mapa', en: 'Close map', de: 'Karte schließen', fr: 'Fermer la carte', zh: '关闭地图', ja: 'マップを閉じる' },
  close: { es: 'Cerrar', en: 'Close', de: 'Schließen', fr: 'Fermer', zh: '关闭', ja: '閉じる' },
  hotelPickup: { es: 'Recogida en Hoteles:', en: 'Hotel Pickup:', de: 'Hotelabholung:', fr: 'Prise en charge:', zh: '酒店接送:', ja: 'ホテル送迎:' },
  hotelsCovered: { es: 'hoteles en zona', en: 'hotels covered', de: 'Hotels abgedeckt', fr: 'hôtels couverts', zh: '覆盖的酒店', ja: '対象ホテル' },
  departureTimes: { es: 'Horarios Salida:', en: 'Departure Times:', de: 'Abfahrtszeiten:', fr: 'Heures de départ:', zh: '出发时间:', ja: '出発時間:' },
  bookTour: { es: 'Reservar Tour', en: 'Book Tour', de: 'Tour buchen', fr: 'Réserver', zh: '预订旅游', ja: 'ツアーを予約' },
  exitMap: { es: 'Salir del Mapa', en: 'Exit Map', de: 'Karte verlassen', fr: 'Quitter la carte', zh: '退出地图', ja: 'マップを終了' },
  priceFrom: { es: 'Precio Desde', en: 'Price From', de: 'Preis ab', fr: 'Prix à partir de', zh: '价格起', ja: '最低価格' },
  viewDetails: { es: 'Ver Detalles', en: 'View Details', de: 'Details ansehen', fr: 'Voir les détails', zh: '查看详情', ja: '詳細を表示' },
  primaryAccess: { es: 'Acceso Principal:', en: 'Primary Access:', de: 'Hauptzugang:', fr: 'Accès Principal:', zh: '主要通道:', ja: '主なアクセス:' },
  weatherPacking: { es: 'Clima & Ropa:', en: 'Weather & Packing:', de: 'Wetter & Kleidung:', fr: 'Météo & Vêtements:', zh: '天气与穿着:', ja: '天気と服装:' },
  exitMapViewAll: { es: 'Salir del Mapa y Ver Todos los Tours', en: 'Exit Map & View All Tours', de: 'Karte verlassen & alle Touren ansehen', fr: 'Quitter la carte & voir tous les tours', zh: '退出地图并查看所有旅游', ja: 'マップを終了してすべてのツアーを表示' },
  signIn: { es: 'Iniciar Sesión', en: 'Sign In', de: 'Anmelden', fr: 'Se connecter', zh: '登录', ja: 'サインイン' },
  buildCustomTrip: { es: 'Cotizar Paquete', en: 'Build Package', de: 'Paket erstellen', fr: 'Créer un forfait', zh: '定制行程', ja: 'パッケージを作成' },
  buildCustomTripTitle: { es: 'Cotizar Paquete de Viaje', en: 'Build Custom Trip Package', de: 'Individuelles Reisepaket erstellen', fr: 'Créer un voyage sur mesure', zh: '定制行程套餐', ja: 'カスタム旅行パッケージの作成' },
  localBuses: { es: 'Buses Locales', en: 'Local Buses', de: 'Lokale Busse', fr: 'Bus locaux', zh: '当地巴士', ja: 'ローカルバス' },
  clickMarkersOffline: { es: 'Haz clic en los marcadores para explorar detalles (Disponibles sin Internet)', en: 'Click markers to explore details (Available Offline)', de: 'Klicken Sie auf Markierungen, um Details zu sehen (Offline verfügbar)', fr: 'Cliquez sur les marqueurs pour explorer les détails (Disponible hors ligne)', zh: '点击标记以探索详细信息（可离线使用）', ja: 'マーカーをクリックして詳細を確認（オフラインでも利用可能）' },
`;

content = content.replace('};', additions + '\n};');
fs.writeFileSync('src/utils/i18n.ts', content);
console.log('patched i18n.ts');
